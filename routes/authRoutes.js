const express = require("express");
const router = express.Router();
const { loginAdmin } = require("../controllers/adminUserController");
const {  loginUser,
  verifyOtp,} = require("../controllers/UserController");
router.post("/login", loginAdmin);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOtp);

module.exports = router;
