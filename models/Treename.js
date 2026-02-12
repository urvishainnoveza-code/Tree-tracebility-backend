const mongoose = require("mongoose");
const treenameSchema = new mongoose.Schema(
  {
    treename: {
      type: String,
      require: true,
      trim: true,
    },
    status: { type: Boolean, default: true },
  },
  
  { timestamps: true },
);
module.exports = mongoose.model("Treename", treenameSchema);