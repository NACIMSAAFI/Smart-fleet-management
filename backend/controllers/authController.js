// controllers/authController.js
const { authDB, initUserDatabase } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret';

// Enhanced registration with user database creation
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Username, email and password are required' 
    });
  }

  try {
    // Check for existing user
    const [existing] = await authDB.promise().query(
      'SELECT id FROM accounts WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in auth database
    const [result] = await authDB.promise().query(
      'INSERT INTO accounts (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Initialize user's personal database
    await initUserDatabase(result.insertId);

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: result.insertId, username, email }
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: err.message
    });
  }
};

// Enhanced login with user database verification
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Find user in auth database
    const [users] = await authDB.promise().query(
      'SELECT * FROM accounts WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: err.message
    });
  }
};

// Account deletion with database cleanup
exports.deleteAccount = async (req, res) => {
  const { userId } = req.user;

  try {
    // Delete user's personal database
    await deleteUserDatabase(userId);

    // Remove from auth database
    await authDB.promise().query(
      'DELETE FROM accounts WHERE id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Account and all data deleted successfully'
    });

  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: err.message
    });
  }
};