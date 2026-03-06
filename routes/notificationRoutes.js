const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllRead,
} = require("../controllers/NotificationController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markAsRead);

module.exports = router;
