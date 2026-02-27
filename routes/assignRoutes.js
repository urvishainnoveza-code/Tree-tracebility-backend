const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  assignTree,
  completeTreeAssign,
  cancelTreeAssign,
  getAllAssignTree,
  getAssignTreeById,
} = require("../controllers/AssignController");

router.post("/", protect, assignTree);
router.get("/", protect, getAllAssignTree);
router.get("/:id", protect, getAssignTreeById);
router.put("/:id/complete", protect, completeTreeAssign);
router.put("/:id/cancel", protect, cancelTreeAssign);

module.exports = router;
