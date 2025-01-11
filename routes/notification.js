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

    res.json(notification);
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
router.put("/:notificationId/read", auth, async (req, res) => {
  try {
    const result = await Notification.findOneAndUpdate(
      {
        userId: req.user.id,
        "notifications._id": req.params.notificationId,
      },
      {
        $set: {
          "notifications.$.read": true,
        },
      },
      { new: true }
    );

    const notification = result.notifications.find(
      (n) => n._id.toString() === req.params.notificationId
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
