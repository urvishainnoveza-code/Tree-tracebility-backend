const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
  {
    statename: { type: String, required: true, trim: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("State", stateSchema);
