const Notification = require("../models/Notification");
const mongoose = require("mongoose");

//create notification
const createNotification = async ({
  group,
  message,
  type,
  recipients,
  relatedId = null,
}) => {
  try {
    if (!group || !message || !type || !recipients?.length) {
      console.log("Notification missing required fields");
      return null;
    }
    const notification = await Notification.create({
      group,
      message,
      type,
      recipients,
      readBy: [],
      relatedId,
    });
    return notification;
  } catch (error) {
    console.log("Notification Error:", error.message);
    return null;
  }
};
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const notifications = await Notification.find({
      recipients: req.user._id,
      readBy: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments({
      recipients: req.user._id,
    });

    const unreadCount = await Notification.countDocuments({
      recipients: req.user._id,
      readBy: { $ne: req.user._id },
    });

    res.status(200).json({
      Status: 1,
      notifications,
      unreadCount,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};

// MARK AS READ
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid notification id",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipients: req.user._id },
      { $addToSet: { readBy: req.user._id } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        Status: 0,
        Message: "Notification not found",
      });
    }

    res.status(200).json({
      Status: 1,
      Message: "Marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipients: req.user._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } },
    );

    res.status(200).json({
      Status: 1,
      Message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllRead,
};
