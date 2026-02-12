const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    countryname: { type: String, required: true, trim: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Country", countrySchema);
