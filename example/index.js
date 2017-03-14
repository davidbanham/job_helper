const helper = require('job_helper');
const { logger, db } = require('../../config');
const Job = require('../../src/models/job.js');
const { someJobHandler } = require('./someJobHandler');

let inProgress = false;

const handlers = {
  'some job': someJobHandler,
};

const jobHelper = helper({
  db,
  Job,
});

const pollForJob = async (followOn) => {
  // If there's a job in progress or no jobs on the queue
  // just return. The external poll interval will
  // run it again soon
  if (inProgress) return;
  const job = await jobHelper.findAJob();

  if (!job) return;
  inProgress = true;

  logger.info('Starting work on job:', job);
  const handler = handlers[job.name];

  try {
    await handler(job);
    jobHelper.markComplete(job.id);
    logger.info('Job complete:', job);
  } catch (e) {
    jobHelper.markFailed(job.id);
    logger.error('Job failure', job, e);
  }

  inProgress = false;

  // See if there's another job ready to go right away
  if (followOn) return pollForJob(true);
};

module.exports = {
  pollForJob,
};
