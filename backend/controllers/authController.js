const db = require('../config/db');  // Ensure db is required
const bcrypt = require('bcrypt'); // Include bcrypt for secure password hashing
const jwt = require('jsonwebtoken');

// Handle user registration
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  // Validate that all required fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if username or email already exists
  const checkQuery = 'SELECT * FROM accounts WHERE username = ? OR email = ?';
  
  try {
    // Use async/await to handle the query in a cleaner way
    const [results] = await db.promise().query(checkQuery, [username, email]);

    if (results.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Securely hash the password before inserting
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const insertQuery = 'INSERT INTO accounts (username, email, password) VALUES (?, ?, ?)';
    
    // Insert new user
    await db.promise().query(insertQuery, [username, email, hashedPassword]);

    return res.status(201).json({ message: 'User registered successfully' });
    
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ message: 'Database error during registration' });
  }
};
const JWT_SECRET = 'your_jwt_secret_key'; // Replace this with process.env.JWT_SECRET later

exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const findUserQuery = 'SELECT * FROM accounts WHERE email = ?';
  db.query(findUserQuery, [email], async (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Database error during login' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  });
};