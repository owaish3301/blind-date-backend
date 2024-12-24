const mongoose = require('mongoose');

const ScratchSchema = {
  scratchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  scratchedAt: {
    type: Date,
    default: null
  }
};

const CardSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maleScratch: ScratchSchema,
  femaleScratch: ScratchSchema,
  matched: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Card', CardSchema);