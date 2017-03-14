module.exports = {
  up: (queryInterface, Sequelize) =>
  queryInterface.createTable('jobs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    name: {
      allowNull: false,
      type: Sequelize.STRING,
    },
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
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    deleted_at: { type: Sequelize.DATE, allowNull: true },
  }),
  down: queryInterface =>
    queryInterface.dropTable('jobs'),
};
