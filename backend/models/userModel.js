const db = require('../config/db');

const findUser = (username, email, callback) => {
  const sql = 'SELECT * FROM accounts WHERE username = ? OR email = ?';
  db.query(sql, [username, email], callback);
};

const createUser = (username, email, hashedPassword, callback) => {
  const sql = 'INSERT INTO accounts (username, email, password) VALUES (?, ?, ?)';
  db.query(sql, [username, email, hashedPassword], callback);
};

module.exports = { findUser, createUser };
