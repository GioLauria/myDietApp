const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'server/database.sqlite'),
  logging: false
});

async function check() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("PRAGMA table_info(tblFood);");
    console.log('tblFood Schema:', results);
  } catch (error) {
    console.error('Error:', error);
  }
}

check();
