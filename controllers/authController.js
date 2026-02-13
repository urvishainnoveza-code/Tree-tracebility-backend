/*const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.login = async (req, res) => {
  const { email, password } = req.body;

const user = await User.findOne({ email });
if (!user) {
  return res.status(400).json({ message: "Invalid credentials" });
}

const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
  return res.status(400).json({ message: "Invalid credentials" });
}


  const token = jwt.sign(
    { id: user._id, userType: user.userType },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      userType: user.userType,
    },
  });
};*/
/*const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const data = req.body;

    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(400).json({ message: "Email exists" });

    const user = await User.create({
      ...data,
      password: null, // important
      userType: "user",
      createdBy: "self",
      emailVerified: true,
    });

    res.json({ message: "Registered successfully", userId: user._id });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // OTP verification happens separately

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};*/
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const data = req.body;

    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(400).json({ message: "Email exists" });

    const user = await User.create({
      ...data,
      password: null,
      userType: "user",
      createdBy: "self", 
    });

    res.json({ message: "Registered successfully", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, userType: "superAdmin" });
    if (!user) return res.status(400).json({ message: "Admin not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const createUserByAdmin = async (req, res) => {
  try {
    const data = req.body;

    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(400).json({ message: "Email exists" });

    if (!req.user || req.user.userType !== "superAdmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.create({
      ...data,
      password: null,
      userType: "user",
      createdBy: "admin", 
    });

    res.json({ message: "User created by admin", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, userType: "user" });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    console.log("OTP:", otp);

    res.json({ message: "OTP sent" });
  } catch {
    res.status(500).json({ message: "OTP failed" });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < Date.now())
      return res.status(400).json({ message: "Invalid OTP" });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });
  } catch {
    res.status(500).json({ message: "OTP verify failed" });
  }
};
/*const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ userType: "user" }) // no filter on createdBy
      .populate("address.country", "countryname")
      .populate("address.state", "statename")
      .populate("address.city", "cityname")
      .populate("address.area", "areaname")
      .select("-password -otp -otpExpires");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};*/

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const searchFilter = search
      ? { firstName: { $regex: search, $options: "i" } }
      : {};

    const query = {
      userType: "user",
      ...searchFilter,
    };

    const totalCount = await User.countDocuments(query);

    const users = await User.find(query)
      .populate("address.country", "countryname")
      .populate("address.state", "statename")
      .populate("address.city", "cityname")
      .populate("address.area", "areaname")
      .select("-password -otp -otpExpires")
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      users,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("address.country", "countryname")
      .populate("address.state", "statename")
      .populate("address.city", "cityname")
      .populate("address.area", "areaname")
      .select("-password -otp -otpExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { register, adminLogin, sendOtp, verifyOtp,getAllUsers ,deleteUser,createUserByAdmin,getUserById};