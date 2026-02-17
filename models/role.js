const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    default: { type: Boolean, default: true },
    addedby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

roleSchema.pre(/^find/, function () {
  if (this.options && this.options.skipUserAutoPopulate) return;

  this.populate({
    path: "addedby",
    select: "firstName lastName email",
  });
});

module.exports = mongoose.model("Role", roleSchema);
