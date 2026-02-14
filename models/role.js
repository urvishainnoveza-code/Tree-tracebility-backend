const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, }, // e.g., "Manager"
  description: String,
  default: { type: Boolean, default: false },
  addedby: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  permissionGroups: [
    {
      group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PermissionGroup',
      },
      permissions: [
        {
          permission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission',
          },
          allowedActions: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Action',
            },
          ],
        },
      ],
    },
  ],
});

// autopopulate nested permissionGroups -> group, permissions.permission, permissions.allowedActions
function autoPopulateRole() {
  if (this.options && this.options.skipUserAutoPopulate) {
    return;
  }
  this.populate({
    path: 'permissionGroups.group',
    select: 'name',
  });
  this.populate({
    path: 'permissionGroups.permissions.permission',
    select: 'name',
  });
  this.populate({
    path: 'permissionGroups.permissions.allowedActions',
    select: 'name',
  });
}

roleSchema.pre(/^find/, autoPopulateRole);



module.exports = mongoose.models.Role || mongoose.model("Role", roleSchema);
