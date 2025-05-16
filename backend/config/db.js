const mysql = require('mysql2');

const authDB = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || 'nacim',
  database: process.env.AUTH_DATABASE || 'smart_fleet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Add this debug connection test
authDB.getConnection((err, conn) => {
  if (err) {
    console.error('DEBUG - DB Connection Failed:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.AUTH_DATABASE,
      error: err.message
    });
  } else {
    console.log('DEBUG - DB Connection Successful');
    conn.release();
  }
});

// Cache for user database connections
const userDBs = new Map();

// Function to get user-specific database connection
const getUserDB = (userId) => {
  if (!userDBs.has(userId)) {
    userDBs.set(userId, mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: `fleet_user_${userId}`,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    }));
  }
  return userDBs.get(userId);
};

// Initialize a new user database with all required tables
const initUserDatabase = async (userId) => {
  const adminConn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    // Create the database
    await adminConn.promise().query(
      `CREATE DATABASE IF NOT EXISTS fleet_user_${userId}`
    );

    // Switch to the new database
    await adminConn.promise().query(`USE fleet_user_${userId}`);

    // Create vehicles table
    await adminConn.promise().query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plate_number VARCHAR(20) UNIQUE,
        chassis_number VARCHAR(50) UNIQUE,
        brand VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        year INT,
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create rental_durations table
    await adminConn.promise().query(`
      CREATE TABLE IF NOT EXISTS rental_durations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_maintenance BOOLEAN DEFAULT FALSE,
        is_reservation BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        CONSTRAINT date_check CHECK (end_date >= start_date)
      )
    `);

    // Create vehicle_statuses table
    await adminConn.promise().query(`
      CREATE TABLE IF NOT EXISTS vehicle_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        status_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        client_name VARCHAR(100),
        client_phone VARCHAR(20),
        rental_price DECIMAL(10,2),
        cause TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        UNIQUE KEY (vehicle_id, status_date)
      )
    `);

    console.log(`Database fleet_user_${userId} initialized successfully`);
  } catch (err) {
    console.error(`Error initializing database for user ${userId}:`, err);
    throw err;
  } finally {
    adminConn.end();
  }
};

// Cleanup function to remove user database
const deleteUserDatabase = async (userId) => {
  const adminConn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await adminConn.promise().query(
      `DROP DATABASE IF EXISTS fleet_user_${userId}`
    );
    userDBs.delete(userId);
    console.log(`Database fleet_user_${userId} deleted successfully`);
  } catch (err) {
    console.error(`Error deleting database for user ${userId}:`, err);
    throw err;
  } finally {
    adminConn.end();
  }
};

module.exports = {
  authDB,
  getUserDB,
  initUserDatabase,
  deleteUserDatabase
};