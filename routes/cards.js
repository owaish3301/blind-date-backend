const router = require('express').Router();
const Card = require('../models/Card');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const Notification = require('../models/Notification');
const supabase = require('../supabase'); 

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
    const cards = await Card.find({ isActive: true });

    // Process cards before sending
    const processedCards = cards.map(card => {
      const isScratchedByMe = userGender === 'Male' 
        ? card.maleScratch.scratchedBy?.equals(user._id)
        : card.femaleScratch.scratchedBy?.equals(user._id);

      const isScratchedByOthers = userGender === 'Male'
        ? card.maleScratch.scratchedBy && !card.maleScratch.scratchedBy.equals(user._id)
        : card.femaleScratch.scratchedBy && !card.femaleScratch.scratchedBy.equals(user._id);

      return {
        _id: card._id,
        code: isScratchedByMe ? card.code : null,
        isLocked: isScratchedByOthers,
        isScratched: isScratchedByMe,
        scratchedAt: isScratchedByMe 
          ? (userGender === 'Male' ? card.maleScratch.scratchedAt : card.femaleScratch.scratchedAt)
          : null
      };
    });

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
      return res.json({ 
        code: card.code,
        matched: card.matched,
        alreadyScratched: true
      });
    }

    // Update scratch info if not already scratched
    if (!card[scratchField].scratchedBy) {
      card[scratchField] = {
        scratchedBy: user._id,
        scratchedAt: new Date()
      };

      // Emit update with gender information
      const emitCardUpdate = req.app.get('emitCardUpdate');
      if (emitCardUpdate) {
        emitCardUpdate(card._id.toString(), userGender, {
          isLocked: true,
          scratchedBy: user._id
        });
      }

      // Check for match
      let matchedUser = null;
      if (card[otherScratchField].scratchedBy) {
        card.matched = true;
        matchedUser = await User.findById(card[otherScratchField].scratchedBy)
          .select('_id name questionnaire.age questionnaire.course questionnaire.year questionnaire.interests');

        // Create chat relationship in Supabase
        try{
          // Check if relationship already exists
          const { data: existingChat } = await supabase
            .from('chat_relationships')
            .select()
            .or(`and(user1_id.eq.${req.user.id},user2_id.eq.${matchedUser._id}),and(user1_id.eq.${matchedUser._id},user2_id.eq.${req.user.id})`)
            .single();

          if (!existingChat) {
          // Insert new chat relationship
          const { data, error } = await supabase
            .from('chat_relationships')
            .insert([
              { 
                user1_id: req.user.id,
                user2_id: matchedUser._id.toString()
              }
            ]);

            if (error) throw error;

            // Broadcast new chat relationship
            await supabase.channel('chat-updates').send({
              type: 'broadcast',
              event: 'new-chat',
              payload: {
                user1_id: req.user.id,
                user2_id: matchedUser._id.toString()
              }
            });
          }
        } catch (err) {
          console.error('Error creating chat relationship:', err);
        }
        // Create notifications
        const notificationData = {
          type: 'match',
          message: `You matched with ${matchedUser.name}!`,
          metadata: {
            matchedUser: {
              _id: matchedUser._id,
              name: matchedUser.name,
              age: matchedUser.questionnaire.age,
              course: matchedUser.questionnaire.course,
              year: matchedUser.questionnaire.year,
              interests: matchedUser.questionnaire.interests
            },
            code: card.code
          }
        };

        const matchedUserNotificationData = {
          ...notificationData,
          message: `You matched with ${user.name}!`,
          metadata: {
            ...notificationData.metadata,
            matchedUser: {
              name: user.name,
              age: user.questionnaire.age,
              course: user.questionnaire.course,
              year: user.questionnaire.year,
              interests: user.questionnaire.interests
            }
          }
        };

        try {
          // Create notifications in database
          const [currentUserNotif, matchedUserNotif] = await Promise.all([
            Notification.findOneAndUpdate(
              { userId: req.user.id },
              {
                $push: {
                  notifications: {
                    $each: [notificationData],
                    $position: 0
                  }
                }
              },
              { upsert: true, new: true }
            ),
            Notification.findOneAndUpdate(
              { userId: card[otherScratchField].scratchedBy },
              {
                $push: {
                  notifications: {
                    $each: [matchedUserNotificationData],
                    $position: 0
                  }
                }
              },
              { upsert: true, new: true }
            )
          ]);

          // Send real-time notifications through Supabase
          await Promise.all([
            supabase.channel('notification-updates').send({
              type: 'broadcast',
              event: 'notification',
              payload: {
                userId: req.user.id.toString(),
                notification: currentUserNotif.notifications[0]
              }
            }),
            supabase.channel('notification-updates').send({
              type: 'broadcast',
              event: 'notification',
              payload: {
                userId: card[otherScratchField].scratchedBy.toString(),
                notification: matchedUserNotif.notifications[0]
              }
            })
          ]);
        } catch (err) {
          console.error('Error handling notifications:', err);
        }
      }

      await card.save();

      return res.json({
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
    }

    return res.status(400).json({ message: 'Card already scratched by someone else' });

  } catch (err) {
    console.error('Error scratching card:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;