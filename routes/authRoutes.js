const express = require("express");
const router = express.Router();

const {
  register,
  adminLogin,
  sendOtp,
  verifyOtp,
  getAllUsers,
  deleteUser,
  createUserByAdmin,
  getUserById
} = require("../controllers/authController");

const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/admin/create-user", authMiddleware, createUserByAdmin);

router.post("/register", register);
router.post("/login", adminLogin);
router.post("/user/send-otp", sendOtp);
router.post("/user/verify-otp", verifyOtp);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);

module.exports = router;
