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

  this.populate("country", "_id name")
    .populate("state", "_id name")
    .populate("city", "_id name")
    .populate("area", "_id name")
    .populate("role", "_id name")
    .populate({ path: "addedBy", select: "_id firstName lastName" })
    .populate({ path: "isdeletedBy", select: "_id firstName lastName" });
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);








/*const assignTree = async (req, res) => {
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
        Message: "Only superAdmin can assign trees",
      });
    }

    const {
      treeName,
      count,
      country,
      state,
      city,
      area,
      address,
    } = req.body;

    if (!treeName || !count || !country || !state || !city || !area) {
      return res.status(400).json({
        Status: 0,
        Message: "All required fields must be provided",
      });
    }
    let group = await Group.findOne({ area });

    
    if (!group) {
      const groupsInCity = await Group.find()
        .populate({
          path: "area",
          match: { city: city },
        });

      group = groupsInCity.find(g => g.area !== null);
    }

    if (!group) {
      return res.status(404).json({
        Status: 0,
        Message: "No group found for selected area or city",
      });
    }

    const newAssign = await TreeAssign.create({
      treeName,
      count,
      country,
      state,
      city,
      area,
      address,
      group: group._id,
      assignedBy: req.user._id,
    });

    const populatedAssign = await TreeAssign.findById(newAssign._id)
      .populate("treeName", "name")
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .populate("area", "name")
      .populate("group", "name")
      .populate("assignedBy", "firstName lastName");

    return res.status(201).json({
      Status: 1,
      Message: "Tree assigned successfully",
      Data: populatedAssign,
    });

  } catch (error) {
    console.error("assignTree error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error while assigning tree",
    });
  }
};*/