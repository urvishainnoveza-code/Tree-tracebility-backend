const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const generateToken = require("../middleware/generatetoken");

//Superadmin create user

const createUser = async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ Status: 0, Message: "Unauthorized access" });
    }

    const currentUserRole = await Role.findById(req.user.role);
    if (!currentUserRole || currentUserRole.name !== "superAdmin") {
      return res
        .status(403)
        .json({ Status: 0, Message: "Only superAdmin can create users" });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      country,
      state,
      city,
      area,
      landmark,
      societyName,
      houseNo,
      userType = "user",
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ Status: 0, Message: "All required fields must be provided" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ Status: 0, Message: "User already exists" });
    }

    const userRole = await Role.findOne({ name: userType });
    if (!userRole) {
      return res.status(400).json({ Status: 0, Message: "Invalid user type" });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      country,
      state,
      city,
      area,
      landmark,
      societyName,
      houseNo,
      role: userRole._id,
      addedBy: req.user._id,
      emailVerified: true,
    });

    return res
      .status(201)
      .json({ Status: 1, Message: "User created successfully", Data: newUser });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};
// Signup user
const signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res
        .status(400)
        .json({ Status: 0, Message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ Status: 0, Message: "User already exists" });
    }

    const defaultRole = await Role.findOne({ default: true });
    if (!defaultRole) {
      return res
        .status(500)
        .json({ Status: 0, Message: "No default role found. Contact admin." });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      role: defaultRole._id,
      userStatus: "Active",
      emailVerified: false,
    });

    const userToken = generateToken(newUser._id);
    return res.status(201).json({
      Status: 1,
      Message: "Signup successful",
      user: newUser,
      UserToken: userToken,
    });
  } catch (error) {
    console.error("signupUser error:", error);
    return res
      .status(500)
      .json({ Status: 0, Message: "Server error during signup" });
  }
};

// Login User

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ Status: 0, Message: "Email is required" });
    }

    const user = await User.findOne({ email })
      .select("+password +otp")
      .populate("role");

    if (!user) {
      return res.status(400).json({ Status: 0, Message: "User not found" });
    }

    if (user.role.name === "superAdmin") {
      if (!password) {
        return res.status(400).json({
          Status: 2,
          Message: "Password required for SuperAdmin",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          Status: 0,
          Message: "Incorrect password",
        });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        Status: 1,
        Message: "SuperAdmin login successful",
        UserToken: token,
        user,
      });
    }

    // 🔹 If Normal User → Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    await user.save();

    console.log("OTP for testing:", otp); // remove in production

    return res.status(200).json({
      Status: 3,
      Message: "OTP sent to your email",
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        Status: 0,
        Message: "Email and OTP required",
      });
    }

    const user = await User.findOne({ email }).select("+otp").populate("role");

    if (!user || user.otp !== otp) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid OTP",
      });
    }

    user.otp = null;
    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      Status: 1,
      Message: "Login successful",
      UserToken: token,
      user,
    });
  } catch (error) {
    console.error("OTP error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error",
    });
  }
};
//get all users

const getAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser)
      return res
        .status(401)
        .json({ Status: 0, Message: "Unauthorized access" });

    const currentUserRole = await Role.findById(currentUser.role);
    if (!currentUserRole)
      return res.status(403).json({ Status: 0, Message: "Role not found" });

    let {
      page = 1,
      limit = 10,
      search = "",
      addedBy,
      role,
      firstName,
      email,
      phoneNo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const filter = {};
    if (email) filter.email = email;
    if (firstName) filter.firstName = { $regex: firstName, $options: "i" };
    if (phoneNo) filter.phoneNo = phoneNo;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (currentUserRole.name !== "superAdmin") {
      filter.addedBy = currentUser._id;
    } else {
      if (addedBy) filter.addedBy = addedBy;
      if (role) filter.role = role;
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .populate("area", "name")
      .populate("role", "name")
      .populate("addedBy", "firstName lastName email")
      .populate("isdeletedBy", "firstName lastName email");

    const sanitizedUsers = users.map((user) => {
      const obj = user.toObject();
      delete obj.password;
      delete obj.otp;
      delete obj.resetToken;
      return obj;
    });

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      Status: 1,
      Message: "Users fetched successfully",
      data: { totalUsers, totalPages, page, limit, users: sanitizedUsers },
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access"
      });
    }

    // Get current user role
    const currentUserRole = await Role.findById(req.user.role);

    if (!currentUserRole) {
      return res.status(403).json({
        Status: 0,
        Message: "Role not found"
      });
    }

    // Only superAdmin can view any user
    if (currentUserRole.name !== "superAdmin") {
      return res.status(403).json({
        Status: 0,
        Message: "Only superAdmin can view user details"
      });
    }

    // Find user
    const user = await User.findById(id)
      .select("-password -otp -resetToken -resetTokenTime")
      .populate("role", "name")
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .lean();

    if (!user) {
      return res.status(404).json({
        Status: 0,
        Message: "User not found"
      });
    }

    return res.status(200).json({
      Status: 1,
      Message: "User fetched successfully",
      user,
    });

  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error"
    });
  }
};
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // 🔐 Check authentication
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access"
      });
    }

    // 🔐 Check role
    const currentUserRole = await Role.findById(req.user.role);

    if (!currentUserRole) {
      return res.status(403).json({
        Status: 0,
        Message: "Role not found"
      });
    }

    if (currentUserRole.name !== "superAdmin") {
      return res.status(403).json({
        Status: 0,
        Message: "Only superAdmin can delete users"
      });
    }

    // 🔍 Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        Status: 0,
        Message: "User not found"
      });
    }

    // ❌ Prevent superAdmin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        Status: 0,
        Message: "You cannot delete your own account"
      });
    }

    // 🗑 Hard Delete
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      Status: 1,
      Message: "User deleted successfully"
    });

  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error",
      error: error.message
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        Status: 0,
        Message: "unauthorized access"
      });
    }
    const currentUserRole = await Role.findById(currentUser.role)
    const issuperAdmin = currentUserRole?.name == 'superAdmin';
    const hasUpdatePermission=currentUserRole?.permission?.some(
    permission => permission.name === 'update_user'
  );

       const isSelfUpdate = currentUser._id.toString() === userId;

    if (!isSelfUpdate && !isSuperAdmin && !hasUpdatePermission) {
      return res.status(403).json({
        Status: 0,
        Message: "You don't have permission to update users"
      });
    }
    const { firstName,
      lastName,
      email,
      phoneNo,
      country,
      state,
      city,
      landmark,
      societyName,
      houseNo,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json({
        Status: 0,
        Message:"user not found"
      })
    }

  }
  catch (error)
  {

  }
}

module.exports = {
  createUser,
  loginUser,
  signupUser,
  verifyOtp,
  getAllUsers,
  getUserById,
  deleteUser,
};
