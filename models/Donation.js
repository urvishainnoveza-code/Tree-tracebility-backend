const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number }, // For money
    quantity: { type: Number, required: true, default: 1 }, // For trees/items
    treename: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeName",
      required: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeAssign",
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);
donationSchema.pre(/^find/, function () {
  this.populate("donor", "firstName lastName email phoneNo")
    .populate("treename", "name")
});



module.exports = mongoose.model("Donation", donationSchema);
