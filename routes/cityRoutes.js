const express = require("express");
const router = express.Router();
const {
  addCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
} = require("../controllers/CityController");
const { protect } = require("../middleware/auth");
router.post("/", protect, addCity);
router.get("/", protect, getAllCities);
router.get("/:id", protect, getCityById);
router.put("/:id", protect, updateCity);
router.delete("/:id", protect, deleteCity);

module.exports = router;
