const express = require("express");
const router = express.Router();
const {
  addCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
} = require("../controllers/CityController");
router.post("/", addCity);
router.get("/", getAllCities);
router.get("/:id", getCityById);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);

module.exports = router;
