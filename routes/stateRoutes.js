const express = require("express");
const router = express.Router();

let ctrl = {};
try {
  ctrl = require("../controllers/StateController.js");
} catch (e) {
  console.warn("Warning: failed to load StateController:", e.message);
}

router.post(
  "/",
  ctrl.addState ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "addState placeholder" })),
);
router.get(
  "/",
  ctrl.getStates ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "getStates placeholder" })),
);
router.get(
  "/:id",
  ctrl.getStateById ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "getStateById placeholder" })),
);
router.put(
  "/:id",
  ctrl.updateState ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "updateState placeholder" })),
);
router.delete(
  "/:id",
  ctrl.deleteState ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "deleteState placeholder" })),
);

module.exports = router;
