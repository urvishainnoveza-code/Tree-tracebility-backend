const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    cityname: { type: String, required: true, trim: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("City", citySchema);
