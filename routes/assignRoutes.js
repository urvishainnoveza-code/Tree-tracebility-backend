const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  createAssignment,
  completeTreeAssign,
  cancelTreeAssign,
  getAllAssignments,
  getAssignmentById,
} = require("../controllers/AssignController");

router.post("/", protect, createAssignment);
router.get("/", protect, getAllAssignments);
router.get("/:id", protect, getAssignmentById);
router.put("/:id/complete", protect, completeTreeAssign);
router.put("/:id/cancel", protect, cancelTreeAssign);

module.exports = router;
