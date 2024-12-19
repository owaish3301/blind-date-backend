const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');
const CryptoJS = require("crypto-js");

// Sign Up Route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Decrypt password from client
    const decryptedPassword = CryptoJS.AES.decrypt(
      password,
      process.env.CRYPTO_ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    user = new User({ name, email });

    // Hash password once for storage
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(decryptedPassword, salt);

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sign In Route
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Decrypt received password
    const decryptedPassword = CryptoJS.AES.decrypt(
      password,
      process.env.CRYPTO_ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(decryptedPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/signin`,
    session: false
  }),
  (req, res) => {
    try {
      console.log('OAuth Callback - User:', req.user);
      
      if (!req.user || !req.user._id) {
        console.error('Invalid user object in callback');
        return res.redirect(`${process.env.FRONTEND_URL}/signin`);
      }

      const token = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      console.log('Generated token for OAuth user');
      res.redirect(`${process.env.FRONTEND_URL}/home?token=${token}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/signin`);
    }
  }
);

// Add verify token route
router.get('/verify', async (req, res) => {
  console.log('Verify token request');
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    res.json(user);
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
});

module.exports = router;