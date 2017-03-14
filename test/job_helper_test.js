const Helper = require('../src/job_helper');
const Job = require('../example/models/job');
const { db } = require('../config');

const helper = Helper({
  Job,
  db,
  timeout: 3,
});

const valid = {
  name: 'good deeds',
  cron: '0 0 * * *',
};

const oneoff = {
  name: 'just the one',
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const done = {
  name: 'not ready yet',
  cron: '0 0 * * *',
  last_run_at: tomorrow,
};

describe.only('job helper', () => {
  afterEach(async () => {
    await Job.truncate();
  });
  after(() => {
    clearInterval(helper.reaper);
  });

  describe('create', () => {
    it('should create a job', async () => {
      const job = await helper.create(valid);
      expect(job.id).to.exist;
    });

    it('should create a job that is scheduled immediately', async () => {
      const job = await helper.create(valid);
      const now = new Date();

      expect(job.next_run_at).to.be.lt(now);
    });

    it('should schedule a future job for the future', async () => {
      const job = await helper.create(done);
      const now = new Date();

      expect(job.next_run_at).to.be.gt(now);
    });
  });

  describe('findAJob', () => {
    beforeEach(async () => {
      await helper.create(done);
      await helper.create(valid);
    });

    it('should return a job', async () => {
      const job = await helper.findAJob();
      expect(job).to.exist;
    });

    it('should return a job whose next_run_at time is in the past', async () => {
      const job = await helper.findAJob();
      const now = new Date();

      expect(job.next_run_at).to.be.lt(now);
      expect(job.name).to.equal('good deeds');
    });
  });

  describe('markComplete', () => {
    let job;

    beforeEach(async () => {
      await helper.create(valid);
      job = await helper.findAJob();
    });

    it('should mark a job as complete', async () => {
      const marked = await helper.markComplete(job.id);
      expect(marked.queued).to.equal(false);
    });

    it('should populate the next run time', async () => {
      const marked = await helper.markComplete(job.id);
      expect(marked.next_run_at.toISOString()).to.not.equal(job.next_run_at.toISOString());
    });

    it('should set the failure count to 0', async () => {
      await helper.markFailed(job.id);
      const marked = await helper.markComplete(job.id);
      expect(marked.failures).to.equal(0);
    });
  });

  describe('markComplete', () => {
    let job;

    beforeEach(async () => {
      await helper.create(oneoff);
      job = await helper.findAJob();
    });

    it('should destroy a completed one shot job', async () => {
      await helper.markComplete(job.id);
      const found = await Job.findById(job.id);
      expect(found).is.null;
    });
  });

  describe('markFailed', () => {
    let job;

    beforeEach(async () => {
      await helper.create(valid);
      job = await helper.findAJob();
    });

    it('should set queued to false', async () => {
      await helper.markFailed(job.id);
      const newJob = await helper.findAJob();
      expect(newJob.id).to.equal(job.id);
    });

    it('should increment the failure count', async () => {
      const newJob = await helper.markFailed(job.id);
      expect(newJob.failures).to.equal(1);
      const newJob2 = await helper.markFailed(job.id);
      expect(newJob2.failures).to.equal(2);
    });

    it('should backoff exponentially', async () => {
      await helper.markFailed(job.id);
      const newJob = await helper.findAJob();
      const returned = await helper.markFailed(newJob.id);
      expect(returned.next_run_at).to.be.gt(new Date());
    });
  });

  describe('delete', () => {
    let job;

    beforeEach(async () => {
      job = await helper.create(valid);
    });

    it('should delete a job', async () => {
      await helper.destroy(job.id);
      const nope = await helper.findAJob();
      expect(nope).to.be.undefined;
    });
  });

  describe('reap', async () => {
    it('should release a queued job', async () => {
      const quickie = Object.assign({
        linger_ms: 1,
      }, valid);
      const job = await helper.create(quickie);
      await helper.findAJob();
      await helper.reapFactory(Job)();
      const found = await helper.findAJob();
      expect(found.id).to.equal(job.id);
    });

    it('should not release a queued job with a long linger', async () => {
      const quickie = Object.assign({
        linger_ms: 1000000,
      }, valid);
      await helper.create(quickie);
      await helper.findAJob();
      await helper.reapFactory(Job)();
      const found = await helper.findAJob();
      expect(found).to.equal(undefined);
    });
  });
});
