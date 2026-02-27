const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  addCountry,
  getCountries,
  getCountryById,
  deleteCountry,
} = require("../controllers/CountryController");

router.post("/", protect, addCountry);
router.get("/", protect, getCountries);
router.get("/:id", protect, getCountryById);
router.delete("/:id", protect, deleteCountry);

module.exports = router;
