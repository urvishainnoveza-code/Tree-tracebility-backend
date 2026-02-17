const mongoose = require("mongoose");
require("./Country");
require("./State");
require("./City");

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country" },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
    city: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    default: { type: Boolean, default: false },
  },
  { timestamps: true },
);

areaSchema.pre(/^find/, async function () {
  try {
    const Model = mongoose.models["Area"];
    const CityModel = mongoose.models["City"];
    const StateModel = mongoose.models["State"];
    const CountryModel = mongoose.models["Country"];

    const count = await Model.countDocuments();

    if (count === 0) {
      const country = await CountryModel.findOne({ default: true });
      const state = await StateModel.findOne({ default: true });
      const city = await CityModel.findOne({ default: true });

      if (!country || !state || !city) {
        console.log("⚠ Default country/state/city not found. Skipping area seed.");
        return;
      }

      await Model.insertMany([
        {
          name: "Nikol",
          country: country._id,
          state: state._id,
          city: city._id,
          default: true,
        },
      ]);

      console.log(" Default Area via pre-find hook.");
    }
  } catch (error) {
    console.error("Area pre-find error:", error);
  }
});

module.exports = mongoose.model("Area", areaSchema);
