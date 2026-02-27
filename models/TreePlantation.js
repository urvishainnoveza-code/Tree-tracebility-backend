const mongoose = require("mongoose");

const treePlantationSchema = new mongoose.Schema(
  {
    //treename, country, city, area, group (from assign model)
    assign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeAssign",
    },
    address: {
      type: String,
    },

    plantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    plantedCount: {
      type: Number,
      min: 1,
    },

    cage: {
      type: Boolean,
      required: true,
    },

    watering: {
      type: Boolean,
      required: true,
    },
    fertilizer: {
      type: Boolean,
    },

    fertilizerDetail: {
      type: String,
    },

    healthStatus: {
      type: String,
      enum: ["planted", "healthy", "diseased", "dead"],
      default: "planted",
    },

    age: {
      type: String,
      default: "0 day",
    },

    images: [
      {
        type: String,
      },
    ],

    plantationDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
treePlantationSchema.pre(/^find/, function () {
  this.populate({
    path: "assign",
    populate: [
      { path: "treeName", select: "name" },
      { path: "country", select: "name" },
      { path: "state", select: "name" },
      { path: "city", select: "name" },
      { path: "area", select: "name" },
      { path: "group", select: "name" },
      { path: "assignedBy", select: "firstName lastName" },
    ],
  }).populate({
    path: "plantedBy",
    select: "firstName lastName email",
  });
});

module.exports = mongoose.model("TreePlantation", treePlantationSchema);
