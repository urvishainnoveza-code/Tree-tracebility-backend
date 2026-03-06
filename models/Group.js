const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// Auto-populate area and users when calling find/findOne
groupSchema.pre(/^find/, function () {
  const options = this.getOptions ? this.getOptions() : {};

  this.populate("area", "name");

  if (options && options.skipUserPopulate) {
    return;
  }

  this.populate({
    path: "users",
    match: { isdeleted: false }, // filter out deleted users
    select: "firstName lastName email _id phoneNo",
  });
});

module.exports = mongoose.model("Group", groupSchema);
