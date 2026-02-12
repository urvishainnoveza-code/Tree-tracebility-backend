
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    houseNo: String,
    societyName: String,
    landmark: String,
   area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
  },
  { _id: false });

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, default: null }, 

    phoneNo: String,
    dob: Date,
    gender: { type: String, enum: ["Male", "Female"] },

    address: addressSchema,

    userType: {
      type: String,
      enum: ["superAdmin", "user"],
      default: "user",
    },

    createdBy: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },

    emailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

/*const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    houseNo: { type: String, trim: true },
    societyName: { type: String, trim: true },
    landmark: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: { type: String, default: null }, // only superAdmin

    phoneNo: {
      type: String,
      trim: true,
    },

    dob: Date,

    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    address: addressSchema,

    // 🔥 important fields
    userType: {
      type: String,
      enum: ["superAdmin", "user"],
      default: "user",
    },

    createdBy: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);*/


/*const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    houseNo: String,
    societyName: String,
    landmark: String,
    area: String,
    city: String,
    state: String,
    country: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    address: addressSchema,
    userType: {
      type: String,
      enum: ["superAdmin", "user"],
      default: "user",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);*/
