const Sequelize = require('sequelize');

module.exports = {
  db: new Sequelize(process.env.DATABASE_URI),
}
