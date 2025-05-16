// middleware/userDb.js
const { getUserDB } = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Attach user-specific database to request
    req.userDB = getUserDB(req.user.id);

    // Verify connection
    await req.userDB.promise().query('SELECT 1');
    
    next();
  } catch (err) {
    console.error('User database connection error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to user database',
      error: err.message
    });
  }
};