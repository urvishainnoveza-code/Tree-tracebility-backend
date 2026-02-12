const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/User");
const connectDB = require("../config/db");

dotenv.config({ path: "../.env" });

async function seedSuperAdmin() {
  try {
    await connectDB();
    console.log(" Connected to MongoDB");

    const email = "superadmin@gmail.com";
    const plainPassword = "123456";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const now = new Date();

    let superAdmin = await User.findOne({ email });

    if (!superAdmin) {
      superAdmin = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email,
        password: hashedPassword,
        userType: "superAdmin",
        emailVerified: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      console.log(" SuperAdmin created successfully");
      console.log("Email:", email);
      console.log("Password:", plainPassword);
    } else {
      superAdmin.password = hashedPassword;
      superAdmin.userType = "superAdmin";
      superAdmin.emailVerified = true;
      superAdmin.isActive = true;
      superAdmin.firstName = "Super";
      superAdmin.lastName = "Admin";
      superAdmin.updatedAt = now;

      await superAdmin.save();

      console.log(
        "SuperAdmin already existed. Password reset and details updated.",
      );
      console.log("Email:", email);
      console.log("Password reset to:", plainPassword);
    }

    await mongoose.connection.close();
    console.log(" MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("Seeding SuperAdmin failed:", err);
    try {
      await mongoose.connection.close();
      console.log(" MongoDB connection closed after error");
    } catch (e) {
      console.error("Error closing DB connection after failure:", e);
    }
    process.exit(1);
  }
}

seedSuperAdmin();
