const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number },
    quantity: { type: Number, required: true, default: 1 },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeAssign",
    },
    cage: {
      type: Boolean,
      default: false,
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
  this.populate("donor", "firstName lastName email phoneNo").populate(
    "assignment",
    "treeName country state city area address status",
  );
});

module.exports = mongoose.model("Donation", donationSchema);
