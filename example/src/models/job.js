const Sequelize = require('sequelize');
const { db } = require('../../../config');

const Job = db.define('job', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  name: {
    allowNull: false,
    type: Sequelize.STRING,
  },
  // If cron is null, this is a one-time job that will be run once and then destroyed
  cron: {
    allowNull: true,
    type: Sequelize.STRING,
  },
  next_run_at: {
    allowNull: false,
    type: Sequelize.DATE,
  },
  last_run_at: {
    allowNull: true,
    type: Sequelize.DATE,
  },
  unlock_at: {
    allowNull: true,
    type: Sequelize.DATE,
  },
  linger_ms: {
    allowNull: false,
    defaultValue: 60000,
    type: Sequelize.INTEGER,
  },
  queued: {
    defaultValue: false,
    allowNull: false,
    type: Sequelize.BOOLEAN,
  },
  failures: {
    defaultValue: 0,
    allowNull: false,
    type: Sequelize.INTEGER,
  },
  payload: {
    allowNull: true,
    type: Sequelize.JSONB,
  },
}, {
  paranoid: true,
  tableName: 'jobs',
  underscored: true,
});

module.exports = Job;
