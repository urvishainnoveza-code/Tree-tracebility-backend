const mongoose = require("mongoose");
const NotificationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["assignTree", "cancelAssign"],
      required: true,
    },

    recipients: [
      //Users who will receive notification
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],  

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);
NotificationSchema.pre(/^find/, function () {
  this.populate("group", "name")
    .populate("recipients", "name")
    .populate("readBy", "name");
});
module.exports = mongoose.model("Notification", NotificationSchema);
