const express = require("express");
const router = express.Router();
const {
  addArea,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea,
} = require("../controllers/AreaController");
const { protect } = require("../middleware/auth");
router.post("/", protect, addArea);
router.get("/", protect, getAllAreas);
router.get("/:id", protect, getAreaById);
router.put("/:id", protect, updateArea);
router.delete("/:id", protect, deleteArea);

module.exports = router;
