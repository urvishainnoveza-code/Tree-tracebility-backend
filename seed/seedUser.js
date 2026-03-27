const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const connectDB = require("../config/db");

const User = require("../models/User");
const Role = require("../models/Role");

async function seedsuperAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in .env");
    }

    await connectDB(process.env.MONGODB_URI);

    console.log(" Checking superAdmin role...");

    let superAdminRole = await Role.findOne({ name: "superAdmin" });

    if (!superAdminRole) {
      superAdminRole = await Role.create({ name: "superAdmin" });
      console.log("superAdmin role created");
    } else {
      console.log(" superAdmin role already exists");
    }

    let userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      userRole = await Role.create({
        name: "user",
        default: true,
        description: "Field Staff",
      });
      console.log("user role created");
    } else {
      console.log("user role already exists");
    }

    let donorRole = await Role.findOne({ name: "donor" });
    if (!donorRole) {
      donorRole = await Role.create({
        name: "donor",
        default: false,
        description: "Donor who donates money or items",
      });
      console.log("Donor role created");
    } else {
      console.log("Donor role already exists");
    }

    const email = "superAdmin@gmail.com";

    console.log("Checking superAdmin user...");

    let superAdminUser = await User.findOne({ email }).select("+password");

    if (!superAdminUser) {
      superAdminUser = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email,
        password: "123456",
        emailVerified: true,
        role: superAdminRole._id,
      });

      console.log("superAdmin user created");
    } else {
      if (
        !superAdminUser.role ||
        superAdminUser.role.toString() !== superAdminRole._id.toString()
      ) {
        superAdminUser.role = superAdminRole._id;
        await superAdminUser.save();
        console.log(" superAdmin role updated");
      } else {
        console.log("superAdmin user already exists");
      }
    }

    await mongoose.connection.close();
    console.log("DB connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}
seedsuperAdmin();
