const mysql = require('mysql2');
require('dotenv').config();

const mainDB = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

mainDB.connect(err => {
  if (err) throw err;
  console.log('Connected to smart_fleet database');
});

module.exports = mainDB;
