const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema({
    name: { type: String },
    default: { type: Boolean, default: false }
}, {
    timestamps: true,
});

countrySchema.pre(/^find/, async function (next) {
    const model = mongoose.models['Country'];
    const count = await model.countDocuments(); // FIXED

    if (count === 0) {
        await model.insertMany([
            { name: "India", default: true },
        ]);
    }

    next();
});

module.exports = mongoose.models.Country || mongoose.model("Country", countrySchema);
