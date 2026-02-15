const express = require("express");
const router = express.Router();

let ctrl = {};
try {
  ctrl = require("../controllers/CountryController.js");
} catch (e) {
  console.warn("Warning: failed to load CountryController:", e.message);
}

router.post(
  "/",
  ctrl.addCountry ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "addCountry placeholder" })),
);
router.get(
  "/",
  ctrl.getCountries ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "getCountries placeholder" })),
);
router.get(
  "/:id",
  ctrl.getCountryById ||
    ((req, res) =>
      res
        .status(200)
        .json({ Status: 1, Message: "getCountryById placeholder" })),
);
router.delete(
  "/:id",
  ctrl.deleteCountry ||
    ((req, res) =>
      res
        .status(200)
        .json({ Status: 1, Message: "deleteCountry placeholder" })),
);

module.exports = router;
