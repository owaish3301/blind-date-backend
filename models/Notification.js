const mongoose = require('mongoose');

const NotificationItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['match', 'card', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One document per user
  },
  notifications: [NotificationItemSchema]
});

module.exports = mongoose.model('Notification', NotificationSchema);