const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      select: false,
    },

    phoneNo: {
      type: String,
      unique: true,
      sparse: true,
    },

    birthDate: { type: Date },

    gender: {
      type: String,
      enum: ["male", "female"],
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      select: false,
    },

    resetToken: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },

    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
    },

    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
    },

    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
    },

    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
    },

    landmark: String,
    societyName: String,
    houseNo: String,

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },

    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isdeleted: { type: Boolean, default: false },
    isdeletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: { type: Boolean, default: true },
  },

  { timestamps: true },
);
userSchema.pre(/^find/, function () {
  if (this.options && this.options.skipUserAutoPopulate) return;

  // Populate references with only 'name' for clean output
  this.populate("country", "name")
    .populate("state", "name")
    .populate("city", "name")
    .populate("area", "name")
    .populate("role", "name")
    .populate({ path: "addedBy", select: "firstName lastName" })
    .populate({ path: "isdeletedBy", select: "firstName lastName" });
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
