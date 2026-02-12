const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema(
  {
    areaname: { type: String, required: true, trim: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Area", areaSchema);
