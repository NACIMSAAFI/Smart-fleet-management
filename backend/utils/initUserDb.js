const mysql = require('mysql2');

const initUserDb = (username) => {
  return new Promise((resolve, reject) => {
    const dbName = `smart_fleet_${username}`;
    const connection = mysql.createConnection({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD
    });

    connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`, (err) => {
      if (err) return reject(err);

      const userDB = mysql.createConnection({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: dbName
      });

      const tablesSQL = `
        CREATE TABLE IF NOT EXISTS vehicles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          brand VARCHAR(100),
          model VARCHAR(100),
          year INT,
          registration_number VARCHAR(100) UNIQUE
        );

        CREATE TABLE IF NOT EXISTS reservations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vehicle_id INT,
          user_name VARCHAR(100),
          start_date DATE,
          end_date DATE,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS maintenance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vehicle_id INT,
          description TEXT,
          maintenance_date DATE,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );
      `;

      userDB.query(tablesSQL, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

module.exports = initUserDb;
