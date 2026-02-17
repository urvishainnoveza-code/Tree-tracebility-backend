const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createUser,
  loginUser,
  signupUser,
  getAllUsers,
  verifyOtp,
  getUserById,
  deleteUser,

} = require("../controllers/UserController");
router.post("/", protect, createUser);
router.post("/login", loginUser);
router.post("/signup", signupUser);
router.get("/", protect, getAllUsers);
router.get("/:id", protect, getUserById);
router.post('/verifyOtp', verifyOtp);
router.delete('/:id', protect, deleteUser);



module.exports = router;
