const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },

    email: { type: String, unique: true, required: true },
    password: { type: String, select: false },

    phoneNo: { type: String, unique: true, sparse: true },

    birthDate: { type: Date },
    gender: { type: String },

    emailVerified: { type: Boolean, default: false },

    otp: { type: String, select: false },
    resetToken: { type: String },

    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area" },

    landmark: String,
    societyName: String,
    houseNo: String,

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
