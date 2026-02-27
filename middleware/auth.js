const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (!req.headers.authorization) {
    return res.status(401).json({
      Status: 0,
      Message: "Token not provided",
    });
  }

  try {
    if (req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else {
      token = req.headers.authorization;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate("role");

    if (!user) {
      return res.status(401).json({
        Status: 0,
        Message: "User not found",
      });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    return res.status(401).json({
      Status: 0,
      Message: "Not authorized",
    });
  }
});

const authorizeRoles = (...roles) => {
  return async (req, res, next) => {
    const user = await User.findById(req.userId).populate("role");

    if (!roles.includes(user.role.name)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };
