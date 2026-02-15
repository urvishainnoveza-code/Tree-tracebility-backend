const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const connectDB = require("../config/db");

const User = require("../models/User");

const Role = require("../models/Role");

async function seedUser() {
  await connectDB(process.env.MONGODB_URI);

  let superAdminRole = await Role.findOne({ name: "superAdmin" });

  if (!superAdminRole) {
    superAdminRole = await Role.create({
      name: "superAdmin",
      default: false,
    });
  }

  const email = "superAdmin@gmail.com";

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      firstName: "Super",
      lastName: "Admin",
      email,
      password: "123456",
      emailVerified: true,
      role: superAdminRole._id,
    });

    console.log("✅ SuperAdmin Created");
  } else {
    user.role = superAdminRole._id;
    await user.save();
    console.log("🔄 Role Updated");
  }

  await mongoose.connection.close();
}

seedUser();
