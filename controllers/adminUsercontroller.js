const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const generateToken = require("../middleware/generatetoken");

const User = require("../models/User");
const Role = require("../models/Role");

const createSuperUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      Status: 0,
      Message: "User not found",
    });
  }

  const superAdminRole = await Role.findOne({ name: "superAdmin" });

  user.password = password;
  user.role = superAdminRole._id;

  await user.save();

  res.status(200).json({
    Status: 1,
    Message: "SuperAdmin role assigned",
  });
});

module.exports = {
  createSuperUser,
};