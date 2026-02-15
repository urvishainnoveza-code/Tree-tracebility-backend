const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/adminUserController.js");

router.post(
  "/create-super",
  ctrl.createSuperUser ||
    ((req, res) =>
      res
        .status(200)
        .json({ Status: 1, Message: "createSuperUser placeholder" })),
);
router.post(
  "/login",
  ctrl.loginUser ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "admin login placeholder" })),
);
router.post(
  "/verify-otp",
  ctrl.verifyOtp ||
    ((req, res) =>
      res.status(200).json({ Status: 1, Message: "verifyOtp placeholder" })),
);
router.get(
  "/me",
  ctrl.getUser ||
    ((req, res) =>
      res
        .status(200)
        .json({ Status: 1, Message: "admin getUser placeholder" })),
);

module.exports = router;
