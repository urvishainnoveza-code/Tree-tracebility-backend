const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const Area = require("../models/Area");

const getMemberCount = (group) => {
  if (!group || !group.users) {
    return 0;
  }

  return group.users.length;
};

// Get All Groups (with optional city filter)
const getAllGroups = async (req, res) => {
  try {
    const { city } = req.query;
    let filter = {};

    // If city filter provided, get all areas in that city
    if (city) {
      const areas = await Area.find({ city }).select("_id");
      const areaIds = areas.map((a) => a._id);

      if (areaIds.length > 0) {
        filter.area = { $in: areaIds };
      } else {
        return res.status(200).json({ Status: 1, data: [] });
      }
    }

    const groups = await Group.find(filter)
      .populate("area", "name")
      .populate({
        path: "users",
        select: "firstName lastName email phoneNo _id country state city area",
        populate: [
          { path: "country", select: "_id name" },
          { path: "state", select: "_id name" },
          { path: "city", select: "_id name" },
          { path: "area", select: "_id name" },
        ],
      });

    const data = groups.map((group) => ({
      ...group.toObject(),
      memberCount: getMemberCount(group),
    }));

    res.status(200).json({ Status: 1, data: data });
  } catch (error) {
    res.status(500).json({ Status: 0, Message: error.message });
  }
};

// Get Group By ID
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("area", "name")
      .populate({
        path: "users",
        select: "firstName lastName email phoneNo _id country state city area",
        populate: [
          { path: "country", select: "_id name" },
          { path: "state", select: "_id name" },
          { path: "city", select: "_id name" },
          { path: "area", select: "_id name" },
        ],
      });

    if (!group) {
      return res.status(404).json({ Status: 0, Message: "Group not found" });
    }

    res.status(200).json({
      Status: 1,
      Data: {
        ...group.toObject(),
        memberCount: getMemberCount(group),
      },
    });
  } catch (error) {
    res.status(500).json({ Status: 0, Message: error.message });
  }
};

// Remove User From Group
const removeUserFromGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    if (!group)
      return res.status(404).json({ Status: 0, Message: "Group not found" });

    group.users = group.users.filter((id) => id.toString() !== userId);
    await group.save();

    res.status(200).json({
      Status: 1,
      Message: "User removed successfully",
      Data: group,
    });
  } catch (error) {
    res.status(500).json({ Status: 0, Message: error.message });
  }
};

// Add User To Group (SuperAdmin only)
const addUserToGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Allow superAdmin to add any user, or allow user to add themselves
    const isUserAddingSelf = req.user._id.toString() === userId;
    const isSuperAdmin = req.user.role?.name === "superAdmin";

    if (!isUserAddingSelf && !isSuperAdmin) {
      return res.status(403).json({
        Status: 0,
        Message: "You can only add yourself to a group",
      });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid group ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid user ID",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ Status: 0, Message: "Group not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ Status: 0, Message: "User not found" });
    }

    // Check if user is already in group
    const userIds = group.users.map((id) => id.toString());
    if (userIds.includes(userId)) {
      return res.status(400).json({
        Status: 0,
        Message: "User is already a member of this group",
      });
    }

    // Use $addToSet to add user and prevent duplicates at database level
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { users: userId } },
      { new: true, runValidators: true },
    )
      .populate("area", "name")
      .populate({
        path: "users",
        select: "firstName lastName email phoneNo _id country state city area",
        populate: [
          { path: "country", select: "_id name" },
          { path: "state", select: "_id name" },
          { path: "city", select: "_id name" },
          { path: "area", select: "_id name" },
        ],
      });

    res.status(200).json({
      Status: 1,
      Message: "User added to group successfully",
      Data: {
        ...updatedGroup.toObject(),
        memberCount: getMemberCount(updatedGroup),
      },
    });
  } catch (error) {
    res.status(500).json({ Status: 0, Message: error.message });
  }
};

const getGroupByArea = async (req, res) => {
  try {
    const { areaId } = req.params;

    const group = await Group.findOne({ area: areaId })
      .populate("area", "name")
      .populate({
        path: "users",
        select: "firstName lastName email phoneNo _id country state city area",
        populate: [
          { path: "country", select: "_id name" },
          { path: "state", select: "_id name" },
          { path: "city", select: "_id name" },
          { path: "area", select: "_id name" },
        ],
      });

    if (!group) {
      return res.json({ Status: 0, group: null });
    }

    res.json({
      Status: 1,
      group: {
        ...group.toObject(),
        memberCount: getMemberCount(group),
      },
    });
  } catch (error) {
    res.status(500).json({ Status: 0, Message: "Server error" });
  }
};

module.exports = {
  getAllGroups,
  getGroupById,
  removeUserFromGroup,
  addUserToGroup,
  getGroupByArea,
};
