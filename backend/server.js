// backend/server.js
const express = require('express');
const path = require('path');
const { authDB } = require('./config/db');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Test auth DB connection
authDB.getConnection((err, connection) => {
  if (err) {
    console.error('Failed to connect to auth database:', err);
    process.exit(1);
  }
  console.log('Connected to auth database');
  connection.release();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Protected routes with middleware chain
app.use('/api/vehicles', 
  require('./middleware/auth'),     // JWT verification
  require('./middleware/userDb'),   // Attach user-specific DB
  require('./routes/vehicleRoutes') // Vehicle endpoints
);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- POST /api/auth/login');
  console.log('- POST /api/auth/register');
  console.log('- GET /api/vehicles (protected)');
});