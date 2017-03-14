const parser = require('cron-parser');

const reapFactory = (Job) => () =>
  Job.update({
    queued: false,
  }, {
    where: {
      queued: true,
      unlock_at: {
        $lt: new Date(),
      },
    },
  });

const calculateNextRun = (cron, lastRun) => {
  if (!cron) return new Date();
  const interval = parser.parseExpression(cron, { currentDate: lastRun });
  return interval.next();
};

const finderFactory = (db, Job) => async () => {
  const transactionOpts = {
    isolationLevel: db.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  };
  const j = await db.transaction(transactionOpts, transaction => Job.findOne({
    where: {
      queued: false,
      next_run_at: {
        $lt: new Date(),
      },
    },
  }, { transaction }));
  if (!j) {
    return Promise.resolve();
  }
  j.set({
    queued: true,
    unlock_at: new Date(new Date().getTime() + j.dataValues.linger_ms),
  });
  return j.save();
};

const createFactory = (Job) => async (input) => {
  const jobSpec = Object.assign({}, input);
  if (!jobSpec.last_run_at) jobSpec.last_run_at = new Date(0);
  jobSpec.next_run_at = calculateNextRun(jobSpec.cron, jobSpec.last_run_at);
  return await (Job.create(jobSpec));
};

const completionMarkerFactory = (Job) => async (jobId) => {
  const job = await Job.findById(jobId);

  if (!job.dataValues.cron) {
    return job.destroy();
  }

  job.set({
    queued: false,
    next_run_at: calculateNextRun(job.cron, new Date()),
    failures: 0,
  });
  return job.save();
};

const destroyFactory = (Job) => async (jobId) => {
  const job = await Job.findById(jobId);
  return await job.destroy();
};

const failureMarker = (Job, backoffMs) => async (jobId) => {
  const job = await Job.findById(jobId);
  const { failures } = job.dataValues;
  const backoff = backoffMs * failures;
  const nextRun = new Date(new Date().getTime() + backoff);
  job.set({
    queued: false,
    failures: failures + 1,
    next_run_at: nextRun,
  });
  return job.save();
};

module.exports = (opts) => {
  const options = Object.assign({
    reapInterval: 60000,
    backoffMs: 60000,
  }, opts);

  const Job = options.Job;
  const db = options.db;

  const reaper = setInterval(reapFactory(Job), options.reapInterval);

  return {
    findAJob: finderFactory(db, Job),
    markComplete: completionMarkerFactory(Job),
    markFailed: failureMarker(Job, options.backoffMs),
    create: createFactory(Job),
    destroy: destroyFactory(Job),
    reapFactory,
    reaper,
  };
};
