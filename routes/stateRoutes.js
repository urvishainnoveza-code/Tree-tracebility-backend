const express = require("express");
const router = express.Router();
const {
  addState,
  getAllState,
  getStateById,
  updateState,
  deleteState,
} = require("../controllers/StateController");
const { protect } = require("../middleware/auth");
router.post("/", protect, addState);
router.get("/", protect, getAllState);
router.get("/:id", protect, getStateById);
router.put("/:id", protect, updateState);
router.delete("/:id", protect, deleteState);

module.exports = router;
