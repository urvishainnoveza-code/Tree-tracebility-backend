const express = require("express");
const router = express.Router();
const { getDashboard } = require("../controllers/DashboardController");
const { protect } = require("../middleware/auth");

// Only allow authenticated users (add role check if needed)
router.get("/", protect, getDashboard);

module.exports = router;
