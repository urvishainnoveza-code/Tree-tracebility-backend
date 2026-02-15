const mongoose = require("mongoose");

const treeNameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    default: { type: Boolean, default: false },
    
}, {
    timestamps: true,
});

treeNameSchema.pre(/^find/, async function (next) {
    const model = mongoose.models['TreeName'];
    const count = await model.countDocuments();

    if (count === 0) {
        await model.create({ name: "Neem", default: true });
    }

    next();
});
module.exports = mongoose.model("TreeName", treeNameSchema);

