const router = require("express").Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// Add a new notification
router.post("/", auth, async (req, res) => {
  try {
    const notification = {
      type: req.body.type,
      message: req.body.message,
      metadata: req.body.metadata,
      createdAt: new Date(),
    };

    const userNotifications = await Notification.findOneAndUpdate(
      { userId: req.user.id },
      {
        $push: {
          notifications: {
            $each: [notification],
            $position: 0, // Add to start of array
          },
        },
      },
      {
        new: true,
        upsert: true, // Create if doesn't exist
      }
    );
    const newNotification = userNotifications.notifications[0];
    res.json(newNotification);
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user notifications
router.get("/", auth, async (req, res) => {
  try {
    const userNotifications = await Notification.findOne({
      userId: req.user.id,
    });
    res.json(userNotifications?.notifications || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all as read
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { userId: req.user.id },
      { "notifications.$[].read": true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark single notification as read
// Mark single notification as read
router.put("/:notificationId/read", auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }

    const result = await Notification.findOneAndUpdate(
      {
        userId: req.user.id,
        "notifications._id": notificationId
      },
      {
        $set: {
          "notifications.$.read": true
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notification = result.notifications.find(
      (n) => n._id.toString() === notificationId
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
