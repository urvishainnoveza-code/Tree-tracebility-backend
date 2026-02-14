const express = require("express");
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    addCountry,
    getCountries,
    getCountryById,
    updateCountry,
    deleteCountry
} = require("../Controllers/countryController");

router.post("/", protect, addCountry);
router.get("/", protect, getCountries);
router.get("/:id", protect, getCountryById);
router.put("/:id", protect, updateCountry);
router.delete("/:id", protect, deleteCountry);

module.exports = router;
