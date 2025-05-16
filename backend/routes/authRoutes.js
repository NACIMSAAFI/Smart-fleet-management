const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/auth');

// Route for user registration
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

router.get('/dashboard', verifyToken, (req, res) => {
    res.json({
      message: `Welcome ${req.user.username}! This is your dashboard.`,
      user: req.user
    });
  });
  
router.get('/verify', verifyToken, (req, res) => {
  res.json({ 
    user: req.user,
    database: `fleet_user_${req.user.id}`,
    message: "Token is valid"
  });
  console.log(`Serving request for user ${req.user.id} on database fleet_user_${req.user.id}`);
});
module.exports = router;
