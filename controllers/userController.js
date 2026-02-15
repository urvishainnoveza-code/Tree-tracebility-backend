const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const generateToken = require("../middleware/generatetoken");
const { sendResetPasswordEmail } = require("../middleware/sendmail");


const signupUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phoneNo } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ Status: 0, Message: "All fields required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ Status: 0, Message: "Email already exists" });
  }

  const defaultRole = await Role.findOne({ default: true });
  if (!defaultRole) {
    return res.status(400).json({ Status: 0, Message: "Default role not found" });
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phoneNo,
    role: defaultRole._id,
  });

  res.status(201).json({
    Status: 1,
    Message: "Signup successful",
    user,
    UserToken: generateToken(user._id),
  });
});


// ================= LOGIN =================
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({ Status: 0, Message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ Status: 0, Message: "Invalid credentials" });
  }

  res.json({
    Status: 1,
    Message: "Login successful",
    user,
    UserToken: generateToken(user._id),
  });
});


// ================= GET PROFILE =================
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -otp -resetToken")
    .populate("role");

  res.json({ Status: 1, user });
});


// ================= UPDATE USER =================
const updateUser = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (req.user._id.toString() !== id) {
    return res.status(403).json({ Status: 0, Message: "Forbidden" });
  }

  const user = await User.findByIdAndUpdate(id, req.body, { new: true });

  res.json({ Status: 1, Message: "User updated", user });
});

module.exports = {
  signupUser,
  loginUser,
  getUser,
  updateUser,
};
