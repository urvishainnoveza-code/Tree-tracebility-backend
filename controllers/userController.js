const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");
const Area = require("../models/Area");
const Group = require("../models/Group");
const generateToken = require("../middleware/generatetoken");
//create user
const createUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }

    const currentUserRole = await Role.findById(req.user.role).select("name");

    if (!currentUserRole || currentUserRole.name !== "superAdmin") {
      return res.status(403).json({
        Status: 0,
        Message: "Only superAdmin can create users",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phoneNo,
      birthDate,
      gender,
      area,
      landmark,
      societyName,
      houseNo,
      userType = "user",
    } = req.body;

    console.log("FILE:", req.file);
    console.log("FILE DATA:", req.file);

    if (!firstName || !lastName || !email || !area) {
      return res.status(400).json({
        Status: 0,
        Message: "Required fields missing",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        Status: 0,
        Message: "User with this email already exists",
      });
    }

    // Check for existing user by phoneNo
    if (phoneNo) {
      const existingUserByPhone = await User.findOne({ phoneNo });
      if (existingUserByPhone) {
        return res.status(400).json({
          Status: 0,
          Message: "User with this phone number already exists",
        });
      }
    }

    const [userRole, areaData] = await Promise.all([
      Role.findOne({ name: userType }).select("_id"),
      Area.findById(area).populate({
        path: "city",
        populate: {
          path: "state",
          populate: { path: "country" },
        },
      }),
    ]);

    if (!userRole || !areaData) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid role or area",
      });
    }

    if (
      !areaData.city ||
      !areaData.city.state ||
      !areaData.city.state.country
    ) {
      return res.status(400).json({
        Status: 0,
        Message: "Area location hierarchy incomplete",
      });
    }
    let profilePhoto = "";
    if (req.file) {
      profilePhoto = req.file.path || req.file.secure_url;
    }
    const newUser = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phoneNo,
      birthDate,
      gender,
      country: areaData.city.state.country._id,
      state: areaData.city.state._id,
      city: areaData.city._id,
      area: areaData._id,
      landmark,
      societyName,
      houseNo,
      role: userRole._id,
      addedBy: req.user._id,
      emailVerified: true,
      profilePhoto,
    });

    let group = await Group.findOne({ area: areaData._id });

    if (!group) {
      group = await Group.create({
        name: `Group - ${areaData.name}`,
        area: areaData._id,
        users: [newUser._id],
      });
    } else {
      // Use $addToSet to prevent duplicates at database level
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { users: newUser._id } },
      );
    }
    const populatedUser = await User.findById(newUser._id)
      .select("-password -otp -resetToken")
      .populate("country", "_id name")
      .populate("state", "_id name")
      .populate("city", "_id name")
      .populate("area", "_id name")
      .populate("role", "_id name")
      .populate({
        path: "addedBy",
        select: "_id firstName lastName role",
        populate: { path: "role", select: "name" },
      });

    group = await Group.findById(group._id);

    return res.status(201).json({
      Status: 1,
      Message: "User created successfully and added to group",
      Data: {
        user: populatedUser,
        group,
      },
    });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error",
      Error: error.message,
    });
  }
};

// Signup user
const signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNo, latitude, longitude, type } =
      req.body;

    if (!firstName || !lastName || !email || !phoneNo) {
      return res.status(400).json({
        Status: 0,
        Message: "All fields are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid email format",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        Status: 0,
        Message: "User already exists",
      });
    }

    const existingUserByPhone = await User.findOne({ phoneNo });
    if (existingUserByPhone) {
      return res.status(400).json({
        Status: 0,
        Message: "User with this phone number already exists",
      });
    }

    let roleToAssign;
    if (type === "donor") {
      roleToAssign = await Role.findOne({ name: "donor" });
    } else {
      roleToAssign = await Role.findOne({ default: true, name: "user" });
    }

    if (!roleToAssign) {
      return res.status(500).json({
        Status: 0,
        Message: "Role configuration error. Contact admin.",
      });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phoneNo,
      role: roleToAssign._id,
      userType: type || "user", // Save the type explicitly
      emailVerified: true, // Auto-verify on signup since they get token immediately
      location:
        latitude && longitude
          ? {
              type: "Point",
              coordinates: [Number(longitude), Number(latitude)],
            }
          : undefined,
    });

    const userToken = generateToken(newUser._id);

    // Fetch user again with populate
    const populatedUser = await User.findById(newUser._id).populate(
      "role",
      "name",
    );

    return res.status(201).json({
      Status: 1,
      Message: "User created successfully",
      Data: {
        user: populatedUser,
        UserToken: userToken,
      },
    });
  } catch (error) {
    console.error("signupUser error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error during signup",
      Error: error.message,
    });
  }
};
// Login User

const loginUser = async (req, res) => {
  try {
    const { email, password, latitude, longitude } = req.body;

    if (!email) {
      return res.status(400).json({ Status: 0, Message: "Email is required" });
    }

    const user = await User.findOne({ email })
      .select("+password +otp")
      .populate("role");
    // Update user location if provided
    if (
      latitude != null &&
      longitude != null &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      await User.updateOne(
        { email },
        {
          location: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
        },
      );
    }

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

    //if user then generate otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    await user.save();

    console.log("OTP for testing:", otp);

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
      country,
      state,
      city,
      area,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const filter = {};
    //   if (email) filter.email = email;
    // if (firstName) filter.firstName = { $regex: firstName, $options: "i" };
    // if (phoneNo) filter.phoneNo = phoneNo;
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (area) filter.area = area;

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

    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }
    const user = await User.findById(id)
      .select("-password -otp -resetToken -resetTokenTime")
      .populate("role", "name")
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .populate("area", "name")
      .populate("addedBy", "firstName lastName");

    if (!user) {
      return res.status(404).json({
        Status: 0,
        Message: "User not found",
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
      Message: "Server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.user)
      return res
        .status(401)
        .json({ Status: 0, Message: "Unauthorized access" });

    const currentUserRole = await Role.findById(req.user.role).select("name");
    if (!currentUserRole || currentUserRole.name !== "superAdmin")
      return res
        .status(403)
        .json({ Status: 0, Message: "Only superAdmin can delete users" });

    if (userId === req.user._id.toString())
      return res
        .status(400)
        .json({ Status: 0, Message: "You cannot delete your own account" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ Status: 0, Message: "User not found" });
    if (user.isdeleted) {
      return res
        .status(400)
        .json({ Status: 0, Message: "User already deleted" });
    }
    const deletedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isdeleted: true,
          deletedAt: new Date(),
          isdeletedBy: req.user._id,
          isActive: false,
        },
      },
      { new: true },
    );
    return res.status(200).json({
      Status: 1,
      Message:
        "User deleted successfully (removed from all groups automatically)",
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res
      .status(500)
      .json({ Status: 0, Message: "Server error", Error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }

    const currentUserRole = await Role.findById(currentUser.role);

    if (!currentUserRole) {
      return res.status(403).json({
        Status: 0,
        Message: "Role not found",
      });
    }

    const isSuperAdmin = currentUserRole.name === "superAdmin";
    const hasUpdatePermission = currentUserRole?.permission?.some(
      (permission) => permission.name === "update_user",
    );

    const isSelfUpdate = currentUser._id.toString() === userId;

    if (!isSelfUpdate && !isSuperAdmin && !hasUpdatePermission) {
      return res.status(403).json({
        Status: 0,
        Message: "You don't have permission to update this user",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        Status: 0,
        Message: "User not found",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phoneNo,
      birthDate,
      gender,
      area,
      landmark,
      societyName,
      houseNo,
      userStatus,
      addedBy,
    } = req.body;

    const updateData = {};

    // Update basic fields
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phoneNo !== undefined) updateData.phoneNo = phoneNo;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (gender !== undefined) updateData.gender = gender;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (societyName !== undefined) updateData.societyName = societyName;
    if (houseNo !== undefined) updateData.houseNo = houseNo;
    // Handle profile photo upload
    if (req.file) {
      updateData.profilePhoto = req.file.path || req.file.secure_url;
    }

    // Email change validation
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          Status: 0,
          Message: "Email already exists",
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    // SuperAdmin only fields
    if (isSuperAdmin) {
      if (userStatus !== undefined) updateData.userStatus = userStatus;
      if (addedBy !== undefined) updateData.addedBy = addedBy;
    }

    // Handle area change and group assignment
    if (area) {
      const areaData = await Area.findById(area).populate({
        path: "city",
        populate: {
          path: "state",
          populate: { path: "country" },
        },
      });

      if (
        !areaData ||
        !areaData.city ||
        !areaData.city.state ||
        !areaData.city.state.country
      ) {
        return res.status(400).json({
          Status: 0,
          Message: "Area location hierarchy incomplete",
        });
      }

      // Update location fields
      updateData.area = areaData._id;
      updateData.city = areaData.city._id;
      updateData.state = areaData.city.state._id;
      updateData.country = areaData.city.state.country._id;

      // Remove user from old group if area is changing
      if (user.area && user.area.toString() !== areaData._id.toString()) {
        await Group.updateMany({ users: userId }, { $pull: { users: userId } });
      }

      // Add user to new group using $addToSet to prevent duplicates
      let group = await Group.findOne({ area: areaData._id });

      if (!group) {
        group = await Group.create({
          name: `Group - ${areaData.name}`,
          area: areaData._id,
          users: [user._id],
        });
      } else {
        await Group.updateOne(
          { _id: group._id },
          { $addToSet: { users: user._id } },
        );
      }
    }

    // Update user in database
    await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { runValidators: true },
    );

    // Fetch updated user with populated fields
    const updatedUser = await User.findById(userId)
      .select("-password -otp -resetToken")
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .populate("area", "name")
      .populate("role", "name")
      .populate({
        path: "addedBy",
        select: "_id firstName lastName role",
        populate: { path: "role", select: "name" },
      });

    return res.status(200).json({
      Status: 1,
      Message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  signupUser,
  verifyOtp,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
};
