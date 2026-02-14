const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { sendResetPasswordEmail,
  sendOderManagementCreatedEmail } = require("../middleware/sendmail");
const ExcelJS = require('exceljs');
const bcrypt = require("bcryptjs");
const generateToken = require("../middleware/generatetoken.js");
const { deviceAddUpdate } = require("../middleware/addupdatedevicedata.js");
const path = require("path");
const fs = require("fs");
const { ObjectId } = require("mongoose").Types;
const Role = require("../Models/role");
const User = require("../Models/User.js");
const ShipTo = require("../Models/ShipTo.js");
const { uploadImageReturnUrl, deleteFromS3 } = require('./imageController');

// Create user
const createUser = asyncHandler(async (req, res) => {
  try {
    // Role-based access control - Check if current user has permission to create user
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access"
      });
    }

    // Fetch current user's role with permissions
    const currentUserRole = await Role.findById(currentUser.role)



    // Check if current user is SuperAdmin
    const isSuperAdmin = currentUserRole?.name === 'SuperAdmin';

    // Check if current user has "create_user" permission
    const hasCreatePermission = currentUserRole?.permissions?.some(
      permission => permission.name === 'create_user'
    );

    // Only SuperAdmin or users with create_user permission can create users
    if (!isSuperAdmin && !hasCreatePermission) {
      return res.status(403).json({
        Status: 0,
        Message: "You don't have permission to create users"
      });
    }

    // 2. Extract data from request body
    const {
      memberId,
      firstName,
      lastName,
      email,
      password,
      mobileNumber,
      phone_code,
      iso_code,
      birthDate,
      userType = 'Client',
      role,
      business,
      businessType,
      gstNumber,
      aadharNumber,
      pan_number,
      bankName,
      alternateMobileNumber,
      accountNumber,
      ifsc_Code,
      branchName,
      userStatus = 'Active',
      userCategory,
      accountStatus = 'Verified',
      note,
      // Billing address fields
      bill_houseNo,
      bill_societyName,
      bill_landmark,
      bill_area,
      bill_city,
      bill_state,
      bill_country,
      bill_pinCode,
      // Shipping addresses (can be multiple)
      shipTo
    } = req.body;

    // 3. Validation
    if (!firstName || !lastName || !email || !userType) {
      return res.status(200).json({
        Status: 0,
        Message: "Please fill all required fields"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(200).json({
        Status: 0,
        Message: "Please provide a valid email address"
      });
    }

    // 4. Check for existing user
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(200).json({
        Status: 0,
        Message: "User with this email already exists"
      });
    }

    // Check mobile number if provided
    if (mobileNumber) {
      const existingUserByMobile = await User.findOne({ mobileNumber });
      if (existingUserByMobile) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this mobile number already exists"
        });
      }
    }

    // Validate GST number if provided
    if (gstNumber) {
      const existingUserByGST = await User.findOne({ gstNumber });
      if (existingUserByGST) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this GST number already exists"
        });
      }
    }
    let assignedRole = role;

    // If role is not provided in request, assign default "Client" role
    if (!assignedRole) {
      // Find the Client role in the database
      const clientRole = await Role.findOne({ name: 'Client' });

      if (!clientRole) {
        return res.status(400).json({
          Status: 0,
          Message: "Default Client role not found in system"
        });
      }

      assignedRole = clientRole._id;
    } else {
      // Validate if the provided role exists
      const roleExists = await Role.findById(assignedRole);
      if (!roleExists) {
        return res.status(400).json({
          Status: 0,
          Message: "Invalid role provided"
        });
      }
    }

    // Set addedBy to current user
    // For SuperAdmin creating other SuperAdmins, you might want additional logic
    const addedBy = currentUser._id;

    //Prepare user data
    const userData = {
      memberId: memberId || req.userNumber || "",
      firstName,
      lastName,
      email,
      mobileNumber,
      phone_code: phone_code || "+91",
      iso_code: iso_code || "IN",
      birthDate: birthDate ? new Date(birthDate) : null,
      userType,
      role: assignedRole,
      alternateMobileNumber,
      business,
      businessType,
      gstNumber,
      aadharNumber,
      pan_number,
      bankName,
      accountNumber,
      ifsc_Code,
      branchName,
      userStatus,
      userCategory,
      accountStatus,
      note,
      addedBy,
    };

    // 7. Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(password, salt);
    }

    // 8. Add billing address if provided
    if (bill_houseNo || bill_city || bill_state || bill_country) {
      userData.bill = {
        houseNo: bill_houseNo,
        societyName: bill_societyName,
        landmark: bill_landmark,
        area: bill_area,
        city: bill_city,
        state: bill_state,
        country: bill_country,
        pinCode: bill_pinCode
      };
    }

    // 9. Handle file uploads using your provided image upload logic
    const uploadedFiles = req.uploadedFiles || {};
    const toUpload = [];

    // Profile Picture
    if (uploadedFiles.profilepic) {
      toUpload.push({
        key: 'profilepic',
        file: uploadedFiles.profilepic,
        prefix: 'profile'
      });
    }

    // GST Certificate
    if (uploadedFiles.gstCertificate) {
      toUpload.push({
        key: 'gst_certificate',
        file: uploadedFiles.gstCertificate,
        prefix: 'gst'
      });
    }

    // Aadhar Front
    if (uploadedFiles.aadharFront) {
      toUpload.push({
        key: 'aadharFront',
        file: uploadedFiles.aadharFront,
        prefix: 'aadhar_front'
      });
    }

    // Aadhar Back
    if (uploadedFiles.aadharBack) {
      toUpload.push({
        key: 'aadharBack',
        file: uploadedFiles.aadharBack,
        prefix: 'aadhar_back'
      });
    }

    // PAN Card
    if (uploadedFiles.panCard) {
      toUpload.push({
        key: 'panimage',
        file: uploadedFiles.panCard,
        prefix: 'pan'
      });
    }

    // Cancel Cheque
    if (uploadedFiles.cancelCheque) {
      toUpload.push({
        key: 'cancelCheque',
        file: uploadedFiles.cancelCheque,
        prefix: 'cheque'
      });
    }

    // Perform uploads
    if (toUpload.length > 0) {
      const uploadedResults = {};

      for (const entry of toUpload) {
        if (!entry || !entry.file) continue;

        try {
          const originalName = entry.file.originalname || `${entry.prefix}_${Date.now()}`;
          const folder = 'users';
          const s3name = `${folder}/${Date.now()}_${originalName}`;

          const uploadResult = await uploadImageReturnUrl(entry.file, s3name, { req });

          if (uploadResult && uploadResult.path) {
            uploadedResults[entry.key] = uploadResult.path;
          }
        } catch (uploadError) {
          console.error(`Upload failed for ${entry.key}:`, uploadError);
        }
      }

      // Apply uploaded paths to user data
      if (uploadedResults.profilepic) {
        userData.profilepic = uploadedResults.profilepic;
      }
      if (uploadedResults.gst_certificate) {
        userData.gst_certificate = uploadedResults.gst_certificate;
      }
      if (uploadedResults.aadharFront) {
        userData.aadharFront = uploadedResults.aadharFront;
      }
      if (uploadedResults.aadharBack) {
        userData.aadharBack = uploadedResults.aadharBack;
      }
      if (uploadedResults.panimage) {
        userData.panimage = uploadedResults.panimage;
      }
      if (uploadedResults.cancelCheque) {
        userData.cancelCheque = uploadedResults.cancelCheque;
      }
    }

    //  Create user
    const user = await User.create(userData);

    // Handle multiple shipping addresses
    let shipToIds = [];
    if (shipTo) {
      try {
        const addresses = Array.isArray(shipTo)
          ? shipTo
          : JSON.parse(shipTo);

        for (const address of addresses) {
          // Validate required shipping address fields
          if (!address.houseNo || !address.city || !address.state || !address.country || !address.pinCode) {
            continue; // Skip invalid addresses
          }

          const shipTo = await ShipTo.create({
            user: user._id,
            houseNo: address.houseNo,
            societyName: address.societyName,
            landmark: address.landmark,
            area: address.area,
            city: address.city,
            state: address.state,
            country: address.country,
            pinCode: address.pinCode,
            addedBy: currentUser._id
          });

          shipToIds.push(shipTo._id);
        }

        // Update user with shipping address references
        user.shipTo = shipToIds;
        await user.save();

      } catch (error) {
        console.error("Error creating shipping addresses:", error);
        // Don't fail the entire user creation if shipping addresses fail
      }
    }

    //  Fetch the created user with all populated fields
    const populatedUser = await User.findById(user._id)
      .populate('role')
      .populate('businessType')
      .populate('userCategory')
      .populate('bill.city')
      .populate('bill.state')
      .populate('bill.country')
      .populate('shipTo')
      .populate({
        path: "addedBy",
        select: "firstName lastName email"
      })
      .exec();

    //  Send response
    res.status(201).json({
      Status: 1,
      Message: "User created successfully",
      user: populatedUser
    });

  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      Status: 0,
      Message: "Server error while creating user",
      error: error.message
    });
  }
});

const signupUser = asyncHandler(async (req, res) => {
  try {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log(req.body)
    const {
      firstName,
      lastName,
      email,
      mobileNumber,
      phone_code,
      iso_code,
      business,
      gstNumber,
      // Device info
      devicetoken,
      deviceId,
      devicetype,
      state,
      memberId
    } = req.body;

    // 1. Validate required fields
    if (!firstName || !lastName || !email || !mobileNumber) {
      return res.status(200).json({
        Status: 0,
        Message: "Please fill all required fields"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(200).json({
        Status: 0,
        Message: "Please provide a valid email address"
      });
    }

    // Check for existing user
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(200).json({
        Status: 0,
        Message: "User with this email already exists"
      });
    }

    const existingUserByMobile = await User.findOne({ mobileNumber });
    if (existingUserByMobile) {
      return res.status(200).json({
        Status: 0,
        Message: "User with this mobile number already exists"
      });
    }

    // Check GST number if provided
    if (gstNumber) {
      const existingUserByGST = await User.findOne({ gstNumber });
      if (existingUserByGST) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this GST number already exists"
        });
      }
    }



    //  Find default role for Client
    const defaultRole = await Role.findOne({ default: true });
    if (!defaultRole) {
      return res.status(200).json({
        Status: 0,
        Message: "No default role found in system"
      });
    }

    //  Prepare user data
    let userData = {
      firstName,
      lastName,
      email,
      mobileNumber,
      Status: "New",
      phone_code: phone_code || "+91",
      iso_code: iso_code || "IN",
      memberId,
      userType: "Client",
      role: defaultRole._id,
      accountStatus: 'Pending',
      userStatus: 'Active',
      state
    };
    if (business) {
      // Since business is now a string, just store it directly
      userData.business = business; // Store as string
      userData.gstNumber = gstNumber;
    }
    //  Create user
    const user = await User.create(userData);

    // Handle device information
    if (devicetoken && deviceId && devicetype) {
      try {
        console.log("Device info received. Updating device info...");
        const deviceData = {
          devicetoken,
          deviceId,
          devicetype,
          userid: user._id,
        };

        const device = await deviceAddUpdate(deviceData);
        console.log("Device update result:", device);

        if (!device.status) {
          console.log("Device update failed");
        }
      } catch (deviceError) {
        console.error("Error updating device info:", deviceError);
      }
    } else {
      console.log("Device info not fully provided, skipping device update");
    }

    // Generate OTP for email verification
    const otp = Math.floor(1000 + Math.random() * 9000);
    const verification = "confirm your email";

    try {
      await sendResetPasswordEmail(email, otp, verification, user, req);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }

    // Update user with OTP
    user.emailverified = false;
    user.otp = otp;
    await user.save();

    // Send welcome/order management email
    // try {
    //   await sendOderManagementCreatedEmail(email, user, req);
    // } catch (welcomeEmailError) {
    //   console.error("Error sending welcome email:", welcomeEmailError);
    // }

    console.log("SignUp OTP", otp);
    // Fetch populated user without sensitive data
    const populatedUser = await User.findById(user._id).exec();

    // Generate JWT token
    const userToken = generateToken(user._id);

    //  Send response
    return res.status(200).json({
      Status: 1,
      Message: "Signup successful. OTP sent to email for verification.",
      user: populatedUser,
      UserToken: userToken,
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error during signup",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    console.log("Login request body:", req.body);
    const { email, password, devicetoken, deviceId, devicetype } = req.body;
    // Check if email is provided
    if (!email) {
      return res.status(200).json({
        Status: 0,
        Message: "Please fill all the fields",
      });
    }
    console.log("Finding user with email:", email);
    // Find user
    const user = await User.findOne({ email }).select("+password").populate({ path: "role" });

    // If user not exists
    if (!user) {
      return res.status(200).json({
        Status: 0,
        Message: "Email is not Registered. Please register it first",
      });
    }

    let device;
    if (email && !password) {
      const otp = Math.floor(1000 + Math.random() * 9000);
      const verification = "confirm your email";
      await sendResetPasswordEmail(email, otp, verification, user, req);
      user.otp = otp;
      user.emailverified = false;
      await user.save();
    }

    if (email && password) {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(200).json({
          Status: 0,
          Message: "Password is not correct",
        });
      }
    }
    if (user.userStatus === 'Inactive') {
      return res.status(200).json({
        Status: 0,
        Message: "Your account is inactive. Please contact support.",
      });
    }

    if (devicetoken && deviceId && devicetype) {
      console.log("Device info received. Updating device info...");
      const deviceData = {
        devicetoken,
        deviceId,
        devicetype,
        userid: user._id,
      };

      device = await deviceAddUpdate(deviceData);
      console.log("Device update result:", device);
      if (!device.Status) {
        console.log("Device update failed");
        return res.status(200).json({
          Status: 0,
          Message: "Something went wrong with device update",
        });
      }
    } else {
      console.log("Device info not fully provided, skipping device update");
    }
    const populatedUser = await User.findById(user._id).select('-emailverified -otp');

    // Remove null/undefined fields
    Object.keys(populatedUser).forEach((key) => {
      if (populatedUser[key] === null || populatedUser[key] === undefined) {
        delete populatedUser[key];
      }
    });

    return res.status(200).json({
      Status: 1,
      Message: password ? "Login successful" : "OTP sent to your email for verification",
      user: populatedUser,
      UserToken: generateToken(user._id),
      accountStatus: user.accountStatus,
      userType: user.userType,
      role: user.role?.name || 'Client'
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error during login",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

});


const updateUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    // Check if current user has permission to update users
    if (!currentUser) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access"
      });
    }

    // Fetch current user's role with permissions
    const currentUserRole = await Role.findById(currentUser.role)

    const isSuperAdmin = currentUserRole?.name === 'SuperAdmin';
    const hasUpdatePermission = currentUserRole?.permissions?.some(
      permission => permission.name === 'update_user'
    );

    // Only SuperAdmin, users with update permission, or user updating their own profile can update
    const isSelfUpdate = currentUser._id.toString() === userId;

    if (!isSelfUpdate && !isSuperAdmin && !hasUpdatePermission) {
      return res.status(403).json({
        Status: 0,
        Message: "You don't have permission to update users"
      });
    }

    //  Extract data from request body
    const {
      firstName,
      lastName,
      email,
      mobileNumber,
      phone_code,
      iso_code,
      birthDate,
      userType,
      role,
      business,
      businessType,
      gstNumber,
      aadharNumber,
      pan_number,
      bankName,
      accountNumber,
      alternateMobileNumber,
      ifsc_Code,
      branchName,
      userStatus,
      userCategory,
      accountStatus,
      note,
      // Billing address fields
      bill_houseNo,
      bill_societyName,
      bill_landmark,
      bill_area,
      bill_city,
      bill_state,
      bill_country,
      bill_pinCode,
      // Shipping addresses
      shipTo,
      // Only allow SuperAdmin to update these fields
      addedBy,

    } = req.body;

    // Find the user to update
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json({
        Status: 0,
        Message: "User not found"
      });
    }

    //  Check for duplicate email (if email is being changed)
    if (email && email !== user.email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this email already exists"
        });
      }
    }

    //  Check for duplicate mobile number (if mobile is being changed)
    if (mobileNumber && mobileNumber !== user.mobileNumber) {
      const existingUserByMobile = await User.findOne({ mobileNumber });
      if (existingUserByMobile) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this mobile number already exists"
        });
      }
    }

    //  Check for duplicate GST number (if GST is being changed)
    if (gstNumber && gstNumber !== user.gstNumber) {
      const existingUserByGST = await User.findOne({ gstNumber });
      if (existingUserByGST) {
        return res.status(200).json({
          Status: 0,
          Message: "User with this GST number already exists"
        });
      }
    }

    // 7 Prepare update data
    const updateData = {};

    // Basic information
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (phone_code !== undefined) updateData.phone_code = phone_code;
    if (iso_code !== undefined) updateData.iso_code = iso_code;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (note !== undefined) updateData.note = note;

    // User type and role (only SuperAdmin or users with permission can update)
    if ((isSuperAdmin || hasUpdatePermission) && userType !== undefined) {
      updateData.userType = userType;
    }

    if ((isSuperAdmin || hasUpdatePermission) && role !== undefined) {
      updateData.role = role;
    }

    // Business information
    if (business !== undefined) updateData.business = business;
    if (businessType !== undefined) updateData.businessType = businessType;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (aadharNumber !== undefined) updateData.aadharNumber = aadharNumber;
    if (pan_number !== undefined) updateData.pan_number = pan_number;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (alternateMobileNumber !== undefined) updateData.alternateMobileNumber = alternateMobileNumber;
    if (ifsc_Code !== undefined) updateData.ifsc_Code = ifsc_Code;
    if (branchName !== undefined) updateData.branchName = branchName;

    // User category and status
    if (userCategory !== undefined) updateData.userCategory = userCategory;

    // Handle user status update
    if (userStatus !== undefined) {
      updateData.userStatus = userStatus;
    }

    //  Handle account status change
    if (accountStatus !== undefined) {
      updateData.accountStatus = accountStatus;

      // If account status changes from 'Pending' to anything else
      if (user.accountStatus === 'Pending' && accountStatus !== 'Pending') {
        // Convert status field from 'New' or null to null
        if (user.Status === 'New' || user.Status === null || user.Status === undefined) {
          updateData.Status = null;
        }
      }

    }

    // Only SuperAdmin can update addedBy 
    if (isSuperAdmin) {
      if (addedBy !== undefined) updateData.addedBy = addedBy;
    }

    // 8. Handle file uploads
    const uploadedFiles = req.uploadedFiles || {};
    const toUpload = [];
    const filesToDelete = []; // Track old files for deletion

    // Profile Picture
    if (uploadedFiles.profilepic) {
      toUpload.push({
        key: 'profilepic',
        file: uploadedFiles.profilepic,
        prefix: 'profile'
      });
      // Store old profile pic for deletion
      if (user.profilepic && user.profilepic !== "generaluserpic.png") {
        filesToDelete.push(user.profilepic);
      }
    }

    // GST Certificate
    if (uploadedFiles.gstCertificate) {
      toUpload.push({
        key: 'gst_certificate',
        file: uploadedFiles.gstCertificate,
        prefix: 'gst'
      });
      if (user.gst_certificate) {
        filesToDelete.push(user.gst_certificate);
      }
    }

    // Aadhar Front
    if (uploadedFiles.aadharFront) {
      toUpload.push({
        key: 'aadharFront',
        file: uploadedFiles.aadharFront,
        prefix: 'aadhar_front'
      });
      if (user.aadharFront) {
        filesToDelete.push(user.aadharFront);
      }
    }

    // Aadhar Back
    if (uploadedFiles.aadharBack) {
      toUpload.push({
        key: 'aadharBack',
        file: uploadedFiles.aadharBack,
        prefix: 'aadhar_back'
      });
      if (user.aadharBack) {
        filesToDelete.push(user.aadharBack);
      }
    }

    // PAN Card
    if (uploadedFiles.panCard) {
      toUpload.push({
        key: 'panimage',
        file: uploadedFiles.panCard,
        prefix: 'pan'
      });
      if (user.panimage) {
        filesToDelete.push(user.panimage);
      }
    }

    // Cancel Cheque
    if (uploadedFiles.cancelCheque) {
      toUpload.push({
        key: 'cancelCheque',
        file: uploadedFiles.cancelCheque,
        prefix: 'cheque'
      });
      if (user.cancelCheque) {
        filesToDelete.push(user.cancelCheque);
      }
    }

    // Perform uploads
    if (toUpload.length > 0) {
      const uploadedResults = {};

      for (const entry of toUpload) {
        if (!entry || !entry.file) continue;

        try {
          const originalName = entry.file.originalname || `${entry.prefix}_${Date.now()}`;
          const folder = 'users';
          const s3name = `${folder}/${Date.now()}_${originalName}`;

          const uploadResult = await uploadImageReturnUrl(entry.file, s3name, { req });

          if (uploadResult && uploadResult.path) {
            uploadedResults[entry.key] = uploadResult.path;
          }
        } catch (uploadError) {
          console.error(`Upload failed for ${entry.key}:`, uploadError);
        }
      }

      // Apply uploaded paths to update data
      if (uploadedResults.profilepic) {
        updateData.profilepic = uploadedResults.profilepic;
      }
      if (uploadedResults.gst_certificate) {
        updateData.gst_certificate = uploadedResults.gst_certificate;
      }
      if (uploadedResults.aadharFront) {
        updateData.aadharFront = uploadedResults.aadharFront;
      }
      if (uploadedResults.aadharBack) {
        updateData.aadharBack = uploadedResults.aadharBack;
      }
      if (uploadedResults.panimage) {
        updateData.panimage = uploadedResults.panimage;
      }
      if (uploadedResults.cancelCheque) {
        updateData.cancelCheque = uploadedResults.cancelCheque;
      }
    }

    // Handle billing address update
    if (bill_houseNo !== undefined || bill_city !== undefined || bill_state !== undefined || bill_country !== undefined) {
      updateData.bill = {};
      if (bill_houseNo !== undefined) updateData.bill.houseNo = bill_houseNo;
      if (bill_societyName !== undefined) updateData.bill.societyName = bill_societyName;
      if (bill_landmark !== undefined) updateData.bill.landmark = bill_landmark;
      if (bill_area !== undefined) updateData.bill.area = bill_area;
      if (bill_pinCode !== undefined) updateData.bill.pinCode = bill_pinCode;
      if (bill_city !== undefined) { updateData.bill.city = bill_city.trim() !== "" ? bill_city : null; }
      if (bill_state !== undefined) { updateData.bill.state = bill_state.trim() !== "" ? bill_state : null; }
      if (bill_country !== undefined) { updateData.bill.country = bill_country.trim() !== "" ? bill_country : null; }
    }

    //  Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    //  Handle shipping addresses update
    if (shipTo !== undefined) {
      try {
        // First, remove existing shipping addresses
        await ShipTo.deleteMany({ user: userId });

        // Create new shipping addresses
        const addresses = Array.isArray(shipTo)
          ? shipTo
          : JSON.parse(shipTo);

        const shipToIds = [];

        for (const address of addresses) {
          if (!address.houseNo || !address.city || !address.state || !address.country || !address.pinCode) {
            continue;
          }

          const shipTo = await ShipTo.create({
            user: userId,
            houseNo: address.houseNo,
            societyName: address.societyName,
            landmark: address.landmark,
            area: address.area,
            city: address.city,
            state: address.state,
            country: address.country,
            pinCode: address.pinCode,
            addedBy: currentUser._id
          });

          shipToIds.push(shipTo._id);
        }

        // Update user with new shipping address references
        updatedUser.shipTo = shipToIds;
        await updatedUser.save();

      } catch (error) {
        console.error("Error updating shipping addresses:", error);
        // Continue even if shipping address update fails
      }
    }

    // Delete old files from S3 after successful update
    if (filesToDelete.length > 0) {
      try {
        await Promise.all(
          filesToDelete.map(filePath =>
            deleteFromS3(filePath).catch(err =>
              console.error(`Failed to delete file ${filePath}:`, err)
            )
          )
        );
      } catch (deleteError) {
        console.error("Error deleting old files:", deleteError);
        // Continue even if file deletion fails
      }
    }

    //  Fetch updated user with populated data
    const populatedUser = await User.findById(updatedUser._id)
      .populate('role')
      .populate('businessType')
      .populate('userCategory')
      .populate('bill.city')
      .populate('bill.state')
      .populate('bill.country')
      .populate('shipTo')
      .populate({
        path: "addedBy",
        select: "firstName lastName email"
      })
      .exec();

    // 14. Remove sensitive fields from response
    const userResponse = populatedUser.toObject();
    delete userResponse.password;
    delete userResponse.otp;
    delete userResponse.resettoken;

    // Remove null/undefined fields
    Object.keys(userResponse).forEach(key => {
      if (userResponse[key] === null || userResponse[key] === undefined) {
        delete userResponse[key];
      }
    });

    // 15. Send response
    return res.status(200).json({
      Status: 1,
      Message: "User updated successfully",
      user: userResponse
    });

  } catch (error) {
    console.error("Update user error:", error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(200).json({
        Status: 0,
        Message: "Validation error",
        errors: messages
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(200).json({
        Status: 0,
        Message: `${field} already exists`
      });
    }

    return res.status(500).json({
      Status: 0,
      Message: "Server error while updating user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// verifyOTP
const verifyOtp = asyncHandler(async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(200).json({
        Status: 0,
        Message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email }).select('+otp');

    if (!user) {
      return res.status(200).json({
        Status: 0,
        Message: "User not found"
      });
    }

    console.log("Verifying OTP:", { providedOtp: otp, userOtp: user.otp });
    if (user.otp !== otp) {
      return res.status(200).json({
        Status: 0,
        Message: "Invalid OTP"
      });
    }

    // Update user
    user.emailverified = true;
    user.otp = null; // Clear OTP after successful verification
    await user.save();

    // Generate new token
    const userToken = generateToken(user._id);

    // Fetch user without sensitive data
    const populatedUser = await User.findById(user._id)
      .select('-password -otp -resettoken -resettokentime')
      .exec();

    return res.status(200).json({
      Status: 1,
      Message: "Email verified successfully",
      user: populatedUser,
      UserToken: userToken
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error during OTP verification"
    });
  }

});


const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // fetch as plain object so adding non-schema fields (like billings) will be serialized
  const user = await User.findById(id).lean();

  // ensure user exists before attempting to use user._id
  if (!user) {
    return res.status(200).json({ Status: 0, Message: 'User not found' });
  }

  return res.status(200).json({
    Status: 1,
    Message: 'User fetched successfully',
    user,
  });
});


const getSuperAdminRoleId = async () => {
  const superAdminRole = await Role.findOne({ name: 'SuperAdmin' });
  return superAdminRole ? superAdminRole._id : null;
};

// getUsers all
const getUsers = asyncHandler(async (req, res) => {

  try {
    const currentUser = req.user;

    // Check if current user has permission to view users
    if (!currentUser) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access"
      });
    }

    // Get query parameters
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      userType,
      userStatus,
      accountStatus,
      business,
      businessType,
      userCategory,
      role,
      addedBy,
      startDate,
      endDate,
      emailVerified,
      // Field-specific searches
      firstName,
      lastName,
      email,
      mobileNumber,
      gstNumber,
      memberId
    } = req.query;

    // Build filter object
    const filter = {};

    // Apply filters based on query parameters
    if (userType) filter.userType = userType;
    if (userStatus) filter.userStatus = userStatus;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (business) filter.business = business;
    if (businessType) filter.businessType = businessType;
    if (userCategory) filter.userCategory = userCategory;
    if (role) filter.role = role;
    if (addedBy) filter.addedBy = addedBy;
    if (emailVerified !== undefined) {
      filter.emailverified = emailVerified === 'true' || emailVerified === true;
    }

    // Field-specific filters
    if (firstName) {
      filter.firstName = { $regex: firstName, $options: 'i' };
    }
    if (lastName) {
      filter.lastName = { $regex: lastName, $options: 'i' };
    }
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }
    if (mobileNumber) {
      filter.mobileNumber = { $regex: mobileNumber, $options: 'i' };
    }
    if (gstNumber) {
      filter.gstNumber = { $regex: gstNumber, $options: 'i' };
    }
    if (memberId) {
      filter.memberId = { $regex: memberId, $options: 'i' };
    }
    if (business) {
      filter.business = { $regex: business, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // General search across multiple fields
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { memberId: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } }
      ];
    }

    const currentUserRole = await Role.findById(currentUser.role);
    const isSuperAdmin = currentUserRole?.name === 'SuperAdmin';

    if (!isSuperAdmin && currentUser.business) {
      filter.business = currentUser.business;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);

    // Fetch users with pagination, sorting, and population
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('role')
      .populate('businessType')
      .populate('userCategory')
      .populate('bill.city')
      .populate('bill.state')
      .populate('bill.country')
      .populate('shipTo')
      .populate({
        path: "addedBy",
        select: "firstName lastName email"
      })
      .exec();

    // Remove sensitive information from users
    const sanitizedUsers = users.map(user => {
      const userObj = user.toObject ? user.toObject() : user;

      // Remove sensitive fields
      delete userObj.password;
      delete userObj.otp;
      delete userObj.resettoken;
      delete userObj.resettokentime;

      // Remove null/undefined fields
      Object.keys(userObj).forEach(key => {
        if (userObj[key] === null || userObj[key] === undefined) {
          delete userObj[key];
        }
      });

      return userObj;
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Get filter options for frontend (optional)
    const filterOptions = {
      userTypes: await User.distinct('userType'),
      userStatuses: await User.distinct('userStatus'),
      accountStatuses: await User.distinct('accountStatus')
    };

    // Send response
    return res.status(200).json({
      Status: 1,
      Message: "Users fetched successfully",
      data: {
        totalUsers,
        users: sanitizedUsers,
      }
    });

  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error while fetching users",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// deleteUser
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        Status: 0,
        Message: "user not found"
      });
    }

    
    // Collect all image paths to delete from S3
    const oldPaths = [];

    if (user.profilepic && user.profilepic !== "generaluserpic.png") {
      oldPaths.push(user.profilepic);
    }
    if (user.gst_certificate) oldPaths.push(user.gst_certificate);
    if (user.aadharFront) oldPaths.push(user.aadharFront);
    if (user.aadharBack) oldPaths.push(user.aadharBack);
    if (user.panimage) oldPaths.push(user.panimage);
    if (user.cancelCheque) oldPaths.push(user.cancelCheque);

    // Delete user from database
    await User.findByIdAndDelete(userId);

    // Delete images from S3
    if (oldPaths.length > 0) {
      for (const oldPath of oldPaths) {
        try {
          await deleteFromS3(oldPath);
        } catch (deleteError) {
          console.error('Failed to delete image during user deletion:', oldPath, deleteError);
        }
      }
    }

    res.status(200).json({
      Status: 1,
      Message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({
      Status: 0,
      Message: "Server error",
      error: error.message
    });
  }
});

const deleteUserAll = asyncHandler(async (req, res) => {
  const { userType, userId } = req.body;

  if (userId) {
    console.log("Finding user by ID:", userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).json({
        Status: 0,
        Message: "User not found"
      });
    }

    const deletedAssociations = {
      wife: null,
      children: [],
      business: [],
      asks: [],
      c2cTransactions: [],
      references: [],
      testimonials: [],
      thankYouSlips: [],
      attendance: [],
      contributionTeam: [],
      purchasePlans: [],
      billings: [],
      transferRequests: []
    };

    if (user.wife) {
      console.log("Deleting wife with ID:", user.wife);
      await Wife.deleteOne({ _id: user.wife });
      deletedAssociations.wife = user.wife;
    }

    if (user.children && user.children.length > 0) {
      console.log("Deleting children:", user.children);
      await Child.deleteMany({ _id: { $in: user.children } });
      deletedAssociations.children = user.children;
    }

    if (user.business && user.business.length > 0) {
      console.log("Deleting businesses:", user.business);
      try {
        const bizIds = Array.isArray(user.business) ? user.business : [user.business];
        const businessesToDelete = await Business.find({ _id: { $in: bizIds } }).select('logo');
        const logoKeys = businessesToDelete.map(b => b && b.logo).filter(Boolean);
        await Business.deleteMany({ _id: { $in: bizIds } });
        deletedAssociations.business = bizIds;
        for (const key of logoKeys) {
          try {
            await deleteFromS3(key);
          } catch (e) {
            console.error('Failed to delete business logo from S3 for key', key, e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        console.error('Error deleting businesses or logos in deleteUserAll (single):', e && e.message ? e.message : e);
      }
    }

    const asks = await Ask.find({ given: userId });
    if (asks.length > 0) {
      console.log("Deleting asks:", asks.map(ask => ask._id));
      await Ask.deleteMany({ given: userId });
      deletedAssociations.asks = asks.map(ask => ask._id);
    }

    const c2cTransactions = await C2CTransaction.find({
      $or: [{ given: userId }, { receiver: userId }]
    });
    if (c2cTransactions.length > 0) {
      console.log("Deleting C2C transactions:", c2cTransactions.map(tx => tx._id));
      await C2CTransaction.deleteMany({
        $or: [{ given: userId }, { receiver: userId }]
      });
      deletedAssociations.c2cTransactions = c2cTransactions.map(tx => tx._id);
    }

    const references = await Reference.find({
      $or: [{ given: userId }, { receiver: userId }]
    });
    if (references.length > 0) {
      console.log("Deleting references:", references.map(ref => ref._id));
      await Reference.deleteMany({
        $or: [{ given: userId }, { receiver: userId }]
      });
      deletedAssociations.references = references.map(ref => ref._id);
    }

    const testimonials = await Testimonial.find({
      $or: [{ given: userId }, { receiver: userId }]
    });
    if (testimonials.length > 0) {
      console.log("Deleting testimonials:", testimonials.map(t => t._id));
      await Testimonial.deleteMany({
        $or: [{ given: userId }, { receiver: userId }]
      });
      deletedAssociations.testimonials = testimonials.map(t => t._id);
    }

    const thankYouSlips = await ThankYouSlip.find({
      $or: [{ given: userId }, { receiver: userId }]
    });
    if (thankYouSlips.length > 0) {
      console.log("Deleting thank you slips:", thankYouSlips.map(slip => slip._id));
      await ThankYouSlip.deleteMany({
        $or: [{ given: userId }, { receiver: userId }]
      });
      deletedAssociations.thankYouSlips = thankYouSlips.map(slip => slip._id);
    }

    const attendance = await Attendance.find({ member: userId });
    if (attendance.length > 0) {
      console.log("Deleting attendance records:", attendance.map(a => a._id));
      await Attendance.deleteMany({ member: userId });
      deletedAssociations.attendance = attendance.map(a => a._id);
    }

    const contributionTeamHead = await ContributionTeam.find({ head: userId });
    const contributionTeamPartner = await ContributionTeam.find({ partner: userId });

    if (contributionTeamHead.length > 0 || contributionTeamPartner.length > 0) {
      console.log("Deleting contribution team records where user is head:", contributionTeamHead.map(ct => ct._id));
      console.log("Deleting contribution team records where user is partner:", contributionTeamPartner.map(ct => ct._id));

      // Remove user from head and partner arrays
      await ContributionTeam.updateMany(
        { head: userId },
        { $pull: { head: userId } }
      );
      await ContributionTeam.updateMany(
        { partner: userId },
        { $pull: { partner: userId } }
      );

      deletedAssociations.contributionTeam = [
        ...contributionTeamHead.map(ct => ct._id),
        ...contributionTeamPartner.map(ct => ct._id)
      ];
    }

    // Delete associated billings (previously stored in PurchasePlan)
    const billings = await Billing.find({ user: userId });
    if (billings.length > 0) {
      console.log("Deleting billings:", billings.map(b => b._id));
      await Billing.deleteMany({ user: userId });
      deletedAssociations.purchasePlans = billings.map(b => b._id);
      deletedAssociations.billings = billings.map(b => b._id);
    }

    // Delete associated transfer requests
    const transferRequests = await TransferRequest.find({ user: userId });
    if (transferRequests.length > 0) {
      console.log("Deleting transfer requests:", transferRequests.map(req => req._id));
      await TransferRequest.deleteMany({ user: userId });
      deletedAssociations.transferRequests = transferRequests.map(req => req._id);
    }

    await User.deleteOne({ _id: userId });

    // delete user's profilepic from S3 (best-effort)
    try {
      const userProfilePic = user.profilepic;
      if (userProfilePic && !userProfilePic.includes('generaluserpic.png')) {
        await deleteFromS3(userProfilePic);
      }
    } catch (e) {
      console.error('Failed to delete user profilepic from S3 in deleteUserAll (single):', e && e.message ? e.message : e);
    }

    return res.status(200).json({
      Status: 1,
      Message: "User and all associated records deleted successfully",
      deletedAssociations
    });
  }

  console.log("User Type to delete:", userType);
  const users = await User.find({ "userType": userType });
  const deletedRecords = [];

  for (const user of users) {
    console.log("Deleting user:", user);
    const userDeleted = {
      userId: user._id,
      wife: user.wife,
      children: user.children,
      business: user.business,
      asks: [],
      c2cTransactions: [],
      references: [],
      testimonials: [],
      thankYouSlips: [],
      attendance: [],
      contributionTeam: [],
      purchasePlans: [],
      billings: [],
      transferRequests: []
    };

    if (user.wife) {
      await Wife.deleteOne({ _id: user.wife });
    }
    if (user.children && user.children.length > 0) {
      await Child.deleteMany({ _id: { $in: user.children } });
    }
    if (user.business && user.business.length > 0) {
      try {
        const bizIds = Array.isArray(user.business) ? user.business : [user.business];
        const businessesToDelete = await Business.find({ _id: { $in: bizIds } }).select('logo');
        const logoKeys = businessesToDelete.map(b => b && b.logo).filter(Boolean);
        await Business.deleteMany({ _id: { $in: bizIds } });
        // delete business logos from S3 (best-effort)
        for (const key of logoKeys) {
          try {
            await deleteFromS3(key);
          } catch (e) {
            console.error('Failed to delete business logo from S3 for key', key, e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        console.error('Error deleting businesses or logos in bulk delete:', e && e.message ? e.message : e);
      }
    }

    const asks = await Ask.find({ given: user._id });
    if (asks.length > 0) {
      await Ask.deleteMany({ given: user._id });
      userDeleted.asks = asks.map(ask => ask._id);
    }

    const c2cTransactions = await C2CTransaction.find({
      $or: [{ given: user._id }, { receiver: user._id }]
    });
    if (c2cTransactions.length > 0) {
      await C2CTransaction.deleteMany({
        $or: [{ given: user._id }, { receiver: user._id }]
      });
      userDeleted.c2cTransactions = c2cTransactions.map(tx => tx._id);
    }

    const references = await Reference.find({
      $or: [{ given: user._id }, { receiver: user._id }]
    });
    if (references.length > 0) {
      await Reference.deleteMany({
        $or: [{ given: user._id }, { receiver: user._id }]
      });
      userDeleted.references = references.map(ref => ref._id);
    }

    const testimonials = await Testimonial.find({
      $or: [{ given: user._id }, { receiver: user._id }]
    });
    if (testimonials.length > 0) {
      await Testimonial.deleteMany({
        $or: [{ given: user._id }, { receiver: user._id }]
      });
      userDeleted.testimonials = testimonials.map(t => t._id);
    }

    const thankYouSlips = await ThankYouSlip.find({
      $or: [{ given: user._id }, { receiver: user._id }]
    });
    if (thankYouSlips.length > 0) {
      await ThankYouSlip.deleteMany({
        $or: [{ given: user._id }, { receiver: user._id }]
      });
      userDeleted.thankYouSlips = thankYouSlips.map(slip => slip._id);
    }

    const attendance = await Attendance.find({ member: user._id });
    if (attendance.length > 0) {
      await Attendance.deleteMany({ member: user._id });
      userDeleted.attendance = attendance.map(a => a._id);
    }

    const contributionTeamHead = await ContributionTeam.find({ head: user._id });
    const contributionTeamPartner = await ContributionTeam.find({ partner: user._id });

    if (contributionTeamHead.length > 0 || contributionTeamPartner.length > 0) {
      await ContributionTeam.updateMany(
        { head: user._id },
        { $pull: { head: user._id } }
      );
      await ContributionTeam.updateMany(
        { partner: user._id },
        { $pull: { partner: user._id } }
      );

      userDeleted.contributionTeam = [
        ...contributionTeamHead.map(ct => ct._id),
        ...contributionTeamPartner.map(ct => ct._id)
      ];
    }


    const billings = await Billing.find({ user: user._id });
    if (billings.length > 0) {
      await Billing.deleteMany({ user: user._id });
      userDeleted.purchasePlans = billings.map(b => b._id);
      userDeleted.billings = billings.map(b => b._id);
    }

    const transferRequests = await TransferRequest.find({ user: user._id });
    if (transferRequests.length > 0) {
      await TransferRequest.deleteMany({ user: user._id });
      userDeleted.transferRequests = transferRequests.map(req => req._id);
    }

    // Delete the user
    await User.deleteOne({ _id: user._id });
    // delete user's profilepic from S3 (best-effort)
    try {
      const userProfilePic = user.profilepic;
      if (userProfilePic && !userProfilePic.includes('generaluserpic.png')) {
        await deleteFromS3(userProfilePic);
      }
    } catch (e) {
      console.error('Failed to delete user profilepic from S3 in bulk delete:', e && e.message ? e.message : e);
    }
    deletedRecords.push(userDeleted);
  }

  const userscount = await User.find({ "userType": userType }).countDocuments();

  return res.status(200).json({
    Status: 1,
    Message: "Users and all associated records deleted successfully",
    userCount: userscount,
    deletedRecords
  });
});

// logout
const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  console.log(user);

  if (user) {
    const device = await Device.findById(user.deviceid);
    if (device) {
      console.log(device);
      await Device.deleteOne({ _id: device._id });

      return res.status(200).json({
        Status: 1,
        Message: "Logout successful",
      });
    } else {
      return res.status(200).json({
        Status: 1,
        Message: "Logout successful",
      });
    }
  }

  // If user not found, still send logout successful with Status 0
  return res.status(200).json({
    Status: 0,
    Message: "Logout successful",
  });
});


const importUsersFromExcel = async (req, res) => {
  console.log("Import Users from Excel initiated");
  try {
    if (!req.file) {
      return res.status(200).json({ Status: 0, Message: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
      raw: false,
    });

    const { userType } = req.query;
    if (!userType || !["Member", "Family", "Guest"].includes(userType)) {
      return res.status(200).json({
        Status: 0,
        Message: "Invalid or missing userType. Allowed values: Member, Family, Guest",
      });
    }

    const importedUsers = [];
    const failedUsers = [];

    for (const row of sheetData) {
      const errors = [];
      const {
        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,
        joiningDate,
        businessName,
        businessCategory,
        businessSubCategory,
      } = row;

      const srNo = row["Sr.No"];

      // Business category required for all
      if (!firstName || !lastName || !email || !mobileNumber || !businessCategory || !businessSubCategory || !joiningDate) {
        errors.push("Missing mandatory user fields.");
        failedUsers.push({
          srNo,
          firstName,
          middleName,
          lastName,
          email,
          mobileNumber,
          joiningDate,
          businessName,
          businessCategory,
          businessSubCategory,
          errors: errors.join("; "),
        });
        continue;
      }

      let businessId = null;

      // --- Validate Category from DB ---
      const categoryDoc = await BusinessCategory.findOne({
        name: businessCategory.trim(),
      });
      console.log(
        "Business Category Lookup:",
        businessCategory,
        "->",
        categoryDoc ? "Found" : "Not Found"
      );

      if (!categoryDoc) {
        errors.push(`Invalid businessCategory name: ${businessCategory}`);
      }

      let subCategoryIds = [];
      if (businessSubCategory) {
        const subCategoryNames = businessSubCategory
          .toString()
          .split(",")
          .map((n) => n.trim());

        const subCategoryDocs = await BusinessSubCategory.find({
          name: { $in: subCategoryNames },
        });

        if (subCategoryDocs.length !== subCategoryNames.length) {
          errors.push(
            `Invalid businessSubCategory names: ${businessSubCategory}`
          );
        } else {
          subCategoryIds = subCategoryDocs.map((doc) => doc._id);
        }
      }

      if (errors.length > 0) {
        failedUsers.push({
          srNo,
          firstName,
          middleName,
          lastName,
          email,
          mobileNumber,
          joiningDate,
          businessName,
          businessCategory,
          businessSubCategory,
          errors: errors.join("; "),
        });
        continue;
      }

      const query = { category: categoryDoc._id };

      // if (subCategoryIds.length > 0) {
      //     const existingBusinesses = await Business.find({
      //       category: categoryDoc._id,
      //       subCategory: { $in: subCategoryIds },
      //     });

      //     if (existingBusinesses.length > 0) {
      //       if (userType === "Member") {
      //         const usedSubCategories = await BusinessSubCategory.find({
      //           _id: {
      //             $in: existingBusinesses
      //               .flatMap((b) => b.subCategory)
      //               .filter((id) => subCategoryIds.includes(id)),
      //           },
      //         });
      //         const usedNames = usedSubCategories.map((sc) => sc.name).join(", ");
      //         errors.push(
      //           `Business category '${businessCategory}' with subcategories '${usedNames}' is already in use`
      //         );
      //       } else {
      //         businessId = existingBusinesses[0]._id; // Family/Guest use existing
      //       }
      //     } else {
      //         if (userType === "Member") {
      //             errors.push(
      //               `Business category '${businessCategory}' with subcategories '${businessSubCategory}' does not exist for Member.`
      //             );
      //         } else {
      //         const newBusiness = new Business({
      //           name: businessName,
      //           category: categoryDoc._id,
      //           subCategory: subCategoryIds,
      //         });
      //         await newBusiness.save();
      //         businessId = newBusiness._id;
      //       }
      //     }
      // } else {
      //     const existingBusiness = await Business.findOne(query);
      //     if (existingBusiness) {
      //       errors.push(`Business category '${businessCategory}' is already in use`);
      //     } else {
      //       const newBusiness = new Business({
      //         name: businessName,
      //         category: categoryDoc._id,
      //       });
      //       await newBusiness.save();
      //       businessId = newBusiness._id;
      //     }
      // }

      if (subCategoryIds.length > 0) {
        // Find business with EXACT category and ALL the given subcategories (no more, no less)
        const existingBusiness = await Business.findOne({
          category: categoryDoc._id,
          subCategory: { $all: subCategoryIds, $size: subCategoryIds.length },
        });

        if (userType === "Member") {
          if (existingBusiness) {
            // For Member: Error if exact business already exists
            const usedSubCategories = await BusinessSubCategory.find({
              _id: { $in: subCategoryIds },
            });
            const usedNames = usedSubCategories.map((sc) => sc.name).join(", ");
            errors.push(
              `Business category '${businessCategory}' with subcategories '${usedNames}' is already in use`
            );
          } else {
            // For Member: Create new business if not found
            const newBusiness = new Business({
              name: businessName,
              category: categoryDoc._id,
              subCategory: subCategoryIds,
            });
            await newBusiness.save();
            businessId = newBusiness._id;
          }
        } else {
          // For Family/Guest
          if (existingBusiness) {
            businessId = existingBusiness._id;
          } else {
            const newBusiness = new Business({
              name: businessName,
              category: categoryDoc._id,
              subCategory: subCategoryIds,
            });
            await newBusiness.save();
            businessId = newBusiness._id;
          }
        }
      } else {
        // No subcategory
        const existingBusiness = await Business.findOne(query);
        if (userType === "Member") {
          if (existingBusiness) {
            errors.push(`Business category '${businessCategory}' is already in use`);
          } else {
            const newBusiness = new Business({
              name: businessName,
              category: categoryDoc._id,
            });
            await newBusiness.save();
            businessId = newBusiness._id;
          }
        } else {
          if (existingBusiness) {
            businessId = existingBusiness._id;
          } else {
            const newBusiness = new Business({
              name: businessName,
              category: categoryDoc._id,
            });
            await newBusiness.save();
            businessId = newBusiness._id;
          }
        }
      }

      if (errors.length > 0) {
        failedUsers.push({
          srNo,
          firstName,
          middleName,
          lastName,
          email,
          mobileNumber,
          joiningDate,
          businessName,
          businessCategory,
          businessSubCategory,
          errors: errors.join("; "),
        });
        continue;
      }

      // create user
      const newUser = new User({
        srNo,
        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,
        joiningDate,
        userType,
        inviteBy: "import",
        business: businessId ? [businessId] : [],
      });

      try {
        await newUser.save();
        importedUsers.push(newUser);
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.email) {
          failedUsers.push({
            srNo,
            firstName,
            middleName,
            lastName,
            email,
            mobileNumber,
            joiningDate,
            businessName,
            businessCategory,
            businessSubCategory,
            errors: `Duplicate email found: ${email}`,
          });
        } else {
          failedUsers.push({
            srNo,
            firstName,
            middleName,
            lastName,
            email,
            mobileNumber,
            joiningDate,
            businessName,
            businessCategory,
            businessSubCategory,
            errors: err.message,
          });
        }
      }
    }

    // ---- Export Failed Users Only ----
    const finalWorkbook = new ExcelJS.Workbook();
    const failedSheet = finalWorkbook.addWorksheet("FailedUsers");
    failedSheet.columns = [
      { header: "Sr No", key: "srNo", width: 10 },
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Middle Name", key: "middleName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Mobile Number", key: "mobileNumber", width: 20 },
      { header: "Joining Date", key: "joiningDate", width: 20 },
      { header: "Business Name", key: "businessName", width: 25 },
      { header: "Business Category", key: "businessCategory", width: 25 },
      { header: "Business SubCategory", key: "businessSubCategory", width: 40 },
      { header: "Errors", key: "errors", width: 50 },
    ];

    failedUsers.forEach((u, i) =>
      failedSheet.addRow({ ...u, srNo: u.srNo || i + 1 })
    );

    const fileName = `import_failed_${Date.now()}.xlsx`;
    const filePath = path.join("uploads", fileName);
    await finalWorkbook.xlsx.writeFile(filePath);

    const exportExcelUrl = "/" + filePath.replace(/\\/g, "/");

    fs.unlink(req.file.path, () => { });

    res.status(200).json({
      Status: 1,
      Message: "Excel processed successfully",
      importedCount: importedUsers.length,
      failedCount: failedUsers.length,
      exportExcelUrl,
      importedUsers,
    });
  } catch (error) {
    console.error("Error importing Excel:", error);
    res
      .status(200)
      .json({
        Status: 0,
        Message: "Failed to import Excel",
        error: error.message,
      });
  }
};

const exportUsers = async (req, res) => {
  try {
    const {
      search,
      name,
      email,
      mobileNumber,
      business,
      userCategory,
      userStatus,
      accountStatus
    } = req.query;


    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { business: { $regex: search, $options: 'i' } }
      ];
    }

    if (name && !search) {
      filter.$or = [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } }
      ];
    }

    if (business) filter.business = { $regex: business, $options: 'i' };
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (mobileNumber) filter.mobileNumber = { $regex: mobileNumber, $options: 'i' };
    if (business) filter.business = { $regex: business, $options: 'i' };
    if (userCategory) filter.userCategory = userCategory;
    if (userStatus) filter.userStatus = userStatus;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // include the entire end date
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      filter.createdAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // include the entire end date
      filter.createdAt = { $lte: end };
    }

    // Fetch all users (no pagination for export)
    const users = await user.find(filter)
      .populate('businessType')
      .popualate('userCategory')
      .populate('bill.city')
      .populate('bill.state')
      .populate('bill.country')
      .sort({ createdAt: -1 });

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('users');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
      { header: 'Company Name', key: 'business', width: 20 },
      { header: 'Company Type', key: 'businessType', width: 15 },
      { header: 'GST Number', key: 'gstNumber', width: 20 },
      { header: 'Aadhar Number', key: 'aadharNumber', width: 20 },
      { header: 'PAN Number', key: 'pan_number', width: 15 },
      { header: 'Bank Name', key: 'bankName', width: 20 },
      { header: 'Account Number', key: 'accountNumber', width: 20 },
      { header: 'IFSC Code', key: 'ifsc_Code', width: 15 },
      { header: 'Branch Name', key: 'branchName', width: 20 },
      { header: 'User Status', key: 'userStatus', width: 12 },
      { header: 'User Category', key: 'userCategory', width: 12 },
      { header: 'Account Status', key: 'accountStatus', width: 12 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 10 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' } // Blue color
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    users.forEach(user => {
      worksheet.addRow({
        id: user._id.toString(),
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        mobileNumber: user.mobileNumber || '',
        business: user.business || '',
        businessType: user.businessType || '',
        gstNumber: user.gstNumber || '',
        aadharNumber: user.aadharNumber || '',
        pan_number: user.pan_number || '',
        bankName: user.bankName || '',
        accountNumber: user.accountNumber || '',
        ifsc_Code: user.ifsc_Code || '',
        branchName: user.branchName || '',
        userStatus: user.userStatus || '',
        userCategory: user.userCategory || '',
        accountStatus: user.accountStatus || '',
        address: user.bill ?
          `${user.bill.houseNo || ''} ${user.bill.societyName || ''} ${user.bill.area || ''}`.trim() : '',
        city: user.bill?.city?.name || user.bill?.city || '',
        state: user.bill?.state?.name || user.bill?.state || '',
        country: user.bill?.country?.name || user.bill?.country || '',
        pincode: user.bill?.pinCode || '',
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString() : '',
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ''
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 0, column.header.length + 2);
    });

    // Add a title row
    worksheet.insertRow(1, ['user List - ' + new Date().toLocaleDateString()]);
    worksheet.mergeCells('A1:Y1');
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Set response headers for Excel file download
    const fileName = `users_export_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exporting users to Excel:", error);
    res.status(500).json({
      Status: 0,
      Message: "Error exporting users to Excel",
      error: error.message
    });
  }
};


module.exports = {
  signupUser,
  createUser,
  updateUser,
  getUsers,
  getUserById,
  deleteUser,
  loginUser,
  verifyOtp,
  logout,
  importUsersFromExcel,
  exportUsers,
  deleteUserAll
};

