const router = require('express').Router();
const Card = require('../models/Card');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Generate unique codes
const generateUniqueCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Initialize cards
router.post('/initialize', auth, async (req, res) => {
  try {
    // Check if there are already active cards
    const existingCards = await Card.find({ isActive: true });
    if (existingCards.length > 0) {
      return res.status(400).json({ message: 'Active cards already exist' });
    }

    // Generate 10 unique codes (will create 20 cards in total)
    const uniqueCodes = [];
    for (let i = 0; i < 10; i++) {
      let code;
      do {
        code = generateUniqueCode();
      } while (uniqueCodes.includes(code));
      uniqueCodes.push(code);
    }

    // Create two cards for each code
    const cards = [];
    uniqueCodes.forEach(code => {
      for (let i = 0; i < 2; i++) {
        cards.push({ code });
      }
    });

    // Save cards to database
    await Card.insertMany(cards);

    res.json({ message: 'Cards initialized successfully' });
  } catch (err) {
    console.error('Error initializing cards:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available cards
router.get('/available', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userGender = user.questionnaire.gender;
    let cards;

    cards = await Card.find({ isActive: true });

    // Process cards before sending
    const processedCards = cards.map(card => ({
      _id: card._id,
      code: userGender === 'Male' 
        ? (card.maleScratch.scratchedBy?.equals(user._id) ? card.code : null)
        : (card.femaleScratch.scratchedBy?.equals(user._id) ? card.code : null),
      isLocked: userGender === 'Male'
        ? (card.maleScratch.scratchedBy && !card.maleScratch.scratchedBy.equals(user._id))
        : (card.femaleScratch.scratchedBy && !card.femaleScratch.scratchedBy.equals(user._id)),
      canScratch: true, // Set this to true by default
      isScratched: userGender === 'Male'
        ? card.maleScratch.scratchedBy?.equals(user._id)
        : card.femaleScratch.scratchedBy?.equals(user._id)
    }));

    // Shuffle cards
    const shuffledCards = processedCards.sort(() => Math.random() - 0.5);
    res.json(shuffledCards);

  } catch (err) {
    console.error('Error getting cards:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Scratch a card
router.post('/scratch/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const userGender = user.questionnaire.gender;
    const scratchField = userGender === 'Male' ? 'maleScratch' : 'femaleScratch';
    const otherScratchField = userGender === 'Male' ? 'femaleScratch' : 'maleScratch';

    // Check if already scratched by this user
    if (card[scratchField].scratchedBy?.equals(user._id)) {
      return res.status(400).json({ message: 'You have already scratched this card' });
    }

    // Update scratch info
    card[scratchField] = {
      scratchedBy: user._id,
      scratchedAt: new Date()
    };

    // Check for match
    let matchedUser = null;
    if (card[otherScratchField].scratchedBy) {
      card.matched = true;
      matchedUser = await User.findById(card[otherScratchField].scratchedBy)
        .select('name questionnaire.age questionnaire.course questionnaire.year questionnaire.interests');
    }

    await card.save();

    res.json({
      code: card.code,
      matched: card.matched,
      matchedUser: matchedUser ? {
        name: matchedUser.name,
        age: matchedUser.questionnaire.age,
        course: matchedUser.questionnaire.course,
        year: matchedUser.questionnaire.year,
        interests: matchedUser.questionnaire.interests
      } : null
    });

  } catch (err) {
    console.error('Error scratching card:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;