const jobHelper = require('../lib/job_helper');
const { logger } = require('../../config');
const { someJobHandler } = require('./someJobHandler');

let inProgress = false;

const handlers = {
  'some job': someJobHandler,
};

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
