const helper = require('job_helper');
const Job = require('../models/job.js');
const { db } = require('../../config');

module.exports = helper({
  db,
  Job,
});

