const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    default: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

countrySchema.pre(/^find/, async function () {
  const Model = mongoose.models["Country"];
  const count = await Model.countDocuments();
  if (count === 0) {
    await Model.insertMany([{ name: "India", default: true }]);
    console.log("Default Country inserted via pre-find hook.");
  }
});

module.exports = mongoose.model("Country", countrySchema);
