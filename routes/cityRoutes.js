const express = require("express");
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity
} = require("../Controllers/cityController");

router.post("/", protect, addCity);
router.get("/", protect, getCities);
router.get("/:id", protect, getCityById);
router.put("/:id", protect, updateCity);
router.delete("/:id", protect, deleteCity);

module.exports = router;
