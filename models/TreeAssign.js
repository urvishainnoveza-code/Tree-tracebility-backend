const mongoose = require("mongoose");

const TreeAssignSchema = new mongoose.Schema(
  {
    treeName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeName",
      required: true,
    },
    count: { type: Number, min: 1, required: true },
    totalPlantedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    state: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
    },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },

    address: { type: String },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },

    status: {
      type: String,
      enum: ["assigned", "completed", "cancelled"],
      default: "assigned",
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    assignDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
TreeAssignSchema.pre(/^find/, function () {
  this.populate("treeName", "name")

    .populate("country", "name")
    .populate("state", "name")
    .populate("city", "name")
    .populate("area", "name")
    .populate({
      path: "group",
      select: "name",
      options: { skipUserPopulate: true },
    })
    .populate("assignedBy", "firstName lastName");
});

module.exports = mongoose.model("TreeAssign", TreeAssignSchema);
