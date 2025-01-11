const router = require('express').Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

router.post("/", auth, async (req, res) => {
  try {
    const notification = new Notification({
      userId: req.user.id,
      type: req.body.type,
      message: req.body.message,
      metadata: req.body.metadata,
    });
    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort(
      { createdAt: -1 }
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark single notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;