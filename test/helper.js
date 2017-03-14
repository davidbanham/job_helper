const chai = require('chai');
const { db } = require('../config');

global.expect = chai.expect;

process.nextTick(() => {
  before('clear database', async () => {
    await db.sync({ force: true });
  });
});
