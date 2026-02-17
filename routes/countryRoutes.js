const express = require("express");
const router = express.Router();

const {
  addCountry,
  getCountries,
  getCountryById,
  deleteCountry,
} = require("../controllers/CountryController");

router.post("/", addCountry);
router.get("/", getCountries);
router.get("/:id", getCountryById);
router.delete("/:id", deleteCountry);

module.exports = router;
