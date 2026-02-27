const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const Area = require("../models/Area");
const mongoose = require("mongoose");

//get user group id
const getUserGroupIds = async (userId) => {
  const groups = await Group.find({ users: userId }).select("_id");
  return groups.map((g) => g._id.toString());
};

//check if user is superAdmin
const isSuperAdmin = (user) => {
  return user?.role?.name === "superAdmin";
};

//assign tree
const assignTree = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }

    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        Status: 0,
        Message: "Only superAdmin can assign trees",
      });
    }
    const { treeName, count, country, city, area, address, selectedGroup } =
      req.body;
    if (!treeName || !count || !country || !city || !area) {
      return res.status(400).json({
        Status: 0,
        Message: "All required fields must be provided",
      });
    }

    let group = await Group.findOne({ area });

    if (!group) {
      const groupsInCity = await Group.find().populate({
        path: "area",
        match: { city: city },
      });

      const validCityGroups = groupsInCity.filter((g) => g.area !== null);

      if (validCityGroups.length === 0) {
        return res.status(404).json({
          Status: 0,
          Message: "No group found in this city",
        });
      }

      if (validCityGroups.length === 1) {
        group = validCityGroups[0];
      } else if (!selectedGroup) {
        return res.status(200).json({
          Status: 2,
          Message: "Multiple groups found in this city. Please select one.",
          Groups: validCityGroups.map((g) => ({
            _id: g._id,
            name: g.name,
          })),
        });
      } else {
        group = await Group.findById(selectedGroup);

        if (!group) {
          return res.status(400).json({
            Status: 0,
            Message: "Selected group is invalid",
          });
        }
      }
    }

    //   assign create

    const newAssign = await TreeAssign.create({
      treeName,
      count,
      country,
      city,
      area,
      address,
      group: group._id,
      assignedBy: req.user._id,
    });

    const populatedAssign = await TreeAssign.findById(newAssign._id).populate(
      "group",
      "name users",
    );

    return res.status(201).json({
      Status: 1,
      Message: "Tree assigned successfully",
      Data: populatedAssign,
    });
  } catch (error) {
    console.error("assignTree error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error while assigning tree",
    });
  }
};
//get all assign tree
const getAllAssignTree = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }

    const isAdmin = isSuperAdmin(req.user);

    const { status, city, group, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (city) filter.city = city;
    if (group) filter.group = group;

    if (!isAdmin) {
      const groupIds = await getUserGroupIds(req.user._id);
      filter.group = { $in: groupIds };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const total = await TreeAssign.countDocuments(filter);

    const assignments = await TreeAssign.find(filter)
      .populate("group", "name users")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formattedData = assignments.map((assign) => ({
      ...assign.toObject(),
      group: assign.group
        ? {
            _id: assign.group._id,
            name: assign.group.name,
            userCount: assign.group.users ? assign.group.users.length : 0,
          }
        : null,
    }));

    return res.status(200).json({
      Status: 1,
      Message: "Assignments fetched successfully",
      TotalRecords: total,
      CurrentPage: Number(page),
      TotalPages: Math.ceil(total / limit),
      Data: formattedData,
    });
  } catch (error) {
    console.error("getAllAssignTree error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error while fetching assignments",
    });
  }
};
// get assign tree by id
const getAssignTreeById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized access",
      });
    }

    const assignId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(assignId)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid assignment ID",
      });
    }

    const assign = await TreeAssign.findById(assignId).populate(
      "group",
      "name users",
    );

    if (!assign) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    const isAdmin = isSuperAdmin(req.user);

    if (!isAdmin) {
      const groupIds = await getUserGroupIds(req.user._id);

      if (!assign.group || !groupIds.includes(assign.group._id.toString())) {
        return res.status(403).json({
          Status: 0,
          Message: "You can only view assignments for your group",
        });
      }
    }

    const formattedAssign = {
      ...assign.toObject(),
      group: assign.group
        ? {
            _id: assign.group._id,
            name: assign.group.name,
            userCount: assign.group.users ? assign.group.users.length : 0,
          }
        : null,
    };

    return res.status(200).json({
      Status: 1,
      Message: "Assignment fetched successfully",
      Data: formattedAssign,
    });
  } catch (error) {
    console.error("getAssignTreeById error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Server error while fetching assignment",
    });
  }
};
//complete tree assign
const completeTreeAssign = async (req, res) => {
  try {
    const assignId = req.params.id;

    const assignment = await TreeAssign.findById(assignId);

    if (!assignment) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    if (assignment.totalPlantedCount < assignment.count) {
      return res.status(400).json({
        Status: 0,
        Message: "Cannot complete assignment. Trees still remaining.",
      });
    }

    assignment.status = "completed";
    await assignment.save();

    return res.json({
      Status: 1,
      Message: "Tree assignment completed",
      Data: assignment,
    });
  } catch (error) {
    return res.status(500).json({
      Status: 0,
      Message: "Error updating assignment status",
    });
  }
};
//cancel tree assign
const cancelTreeAssign = async (req, res) => {
  try {
    const assignId = req.params.id;
    const updated = await TreeAssign.findByIdAndUpdate(
      assignId,
      { status: "cancelled" },
      { new: true },
    ).populate("treeName group");
    if (!updated) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }
    return res.json({
      Status: 1,
      Message: "Tree assignment cancelled",
      Data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      Status: 0,
      Message: "Error updating assignment status",
    });
  }
};

module.exports = {
  assignTree,
  getAllAssignTree,
  getAssignTreeById,
  completeTreeAssign,
  cancelTreeAssign,
};
