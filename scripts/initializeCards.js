const mongoose = require('mongoose');
const Card = require('../models/Card');
require('dotenv').config();

const generateCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const initializeCards = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await Card.deleteMany({});
    console.log('Cleared existing cards');
    
    const uniqueCodes = new Set();
    const totalCodes = 10;
    
    while (uniqueCodes.size < totalCodes) {
      const code = generateCode();
      if (!uniqueCodes.has(code)) {
        uniqueCodes.add(code);
        const card = new Card({
          code,
          isActive: true,
          maleScratch: { scratchedBy: null, scratchedAt: null },
          femaleScratch: { scratchedBy: null, scratchedAt: null },
          matched: false
        });
        await card.save();
        console.log(`Generated card with code: ${code}`);
      }
    }

    const count = await Card.countDocuments();
    console.log(`Successfully created ${count} cards`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

initializeCards();