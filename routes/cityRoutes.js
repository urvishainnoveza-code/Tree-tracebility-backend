const express = require("express");
const router = express.Router();

let ctrl = {};
try {
  ctrl = require("../controllers/CityController.js");
} catch (e) {
  console.warn("Warning: failed to load CityController:", e.message);
}

router.post(
  "/",
  ctrl.addCity ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "addCity placeholder" })),
);
router.get(
  "/",
  ctrl.getCities ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "getCities placeholder" })),
);
router.get(
  "/:id",
  ctrl.getCityById ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "getCityById placeholder" })),
);
router.put(
  "/:id",
  ctrl.updateCity ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "updateCity placeholder" })),
);
router.delete(
  "/:id",
  ctrl.deleteCity ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "deleteCity placeholder" })),
);

module.exports = router;
