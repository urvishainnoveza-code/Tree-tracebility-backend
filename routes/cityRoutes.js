const express = require("express");
const router = express.Router();
const { createCity, getAllCities, getCitiesByState, updateCity, deleteCity } = require("../controllers/cityController");

router.post("/", createCity);
router.get("/", getAllCities);
router.get("/state/:stateId", getCitiesByState);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);

module.exports = router;
