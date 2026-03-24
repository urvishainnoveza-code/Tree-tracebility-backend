const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  createUser,
  loginUser,
  signupUser,
  getAllUsers,
  verifyOtp,
  getUserById,
  deleteUser,
  updateUser,
} = require("../controllers/UserController");
const multer = require("multer");
const upload = multer();

router.post("/", protect, upload.none(), createUser);
router.post("/login", loginUser);
router.post("/signup", signupUser);
router.get("/", protect, getAllUsers);
router.get("/:id", protect, getUserById);
router.post("/verifyOtp", verifyOtp);
router.delete("/:id", protect, deleteUser);
router.put("/:id", protect, updateUser);

module.exports = router;
