const mongoose = require("mongoose");
require('./Country');
require('./State');


const citySchema = new mongoose.Schema({
    name: { type: String, required: false },
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
    default : {type: Boolean, default: false}
}, { timestamps: true });


citySchema.pre(/^find/, async function () {
  try {
    const Model = mongoose.models["City"];
    const StateModel = mongoose.models["State"];
    const CountryModel = mongoose.models["Country"];

    const count = await Model.countDocuments();

    if (count === 0) {
      const country = await CountryModel.findOne({ default: true });
      const state = await StateModel.findOne({ default: true });

      if (!country || !state) {
        console.log("⚠ Default country or state not found. Skipping city seed.");
        return;
      }

      await Model.insertMany([
        {
          name: "Ahmedabad",
          country: country._id,
          state: state._id,
          default: true,
        },
      ]);

      console.log("Default City via pre-find hook.");
    }
  } catch (error) {
    console.error("City pre-find error:", error);
  }
});

module.exports = mongoose.model("City", citySchema);
