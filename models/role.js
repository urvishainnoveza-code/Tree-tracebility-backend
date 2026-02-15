const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    default: { type: Boolean, default: false },
    addedby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

function autoPopulateRole(next) {
  if (this.options && this.options.skipUserAutoPopulate) {
    return next();
  }

  this.populate({ path: "addedby", select: "firstName lastName email" });

  next();
}

roleSchema.pre(/^find/, autoPopulateRole);

module.exports = mongoose.model("Role", roleSchema);

