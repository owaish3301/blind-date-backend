const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CryptoJS = require("crypto-js");
const auth = require('../middleware/auth');

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

    // Create new user without questionnaire data
    user = new User({
      name,
      email,
      questionnaire: { questionnaireCompleted: false } // Initialize with empty questionnaire
    });

    // Hash password once for storage
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(decryptedPassword, salt);

    const savedUser = await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      token,
      userId: savedUser._id.toString(), // Add this line
    });
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

    res.json({
      token,
      userId: user._id.toString(), // Add this line
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Add verify token route
router.get('/verify', async (req, res) => {
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

router.get("/user/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name questionnaire"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add questionnaire route
router.post('/questionnaire', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate required fields
    const { gender, interestedIn } = req.body;
    if (!gender || !interestedIn) {
      return res.status(400).json({ 
        message: 'Gender and interested in preferences are required' 
      });
    }

    // Update questionnaire data
    user.questionnaire = {
      ...req.body,
      questionnaireCompleted: true
    };

    await user.save();
    res.json({ message: 'Questionnaire completed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;