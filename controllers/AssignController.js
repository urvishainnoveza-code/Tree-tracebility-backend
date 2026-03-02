const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const Area = require("../models/Area");
const mongoose = require("mongoose");

const getUserGroupIds = async (userId) => {
  const groups = await Group.find({ users: userId }).select("_id");
  return groups.map((g) => g._id.toString());
};

const isSuperAdmin = (user) => {
  return user?.role?.name === "superAdmin";
};

const createAssignment = async (req, res) => {
  try {
    const { treeName, count, country, city, area, group, address } = req.body;

    if (!treeName || !count || !country || !city || !area) {
      return res.status(400).json({
        Status: 0,
        Message: "Missing required fields",
      });
    }


    let assignedGroupId = group;

    if (!assignedGroupId) {
      const areaGroup = await Group.findOne({ area }).select("_id");
      if (areaGroup) {
        assignedGroupId = areaGroup._id;
      }
    }

    // Validate that we have a group
    if (!assignedGroupId) {
      return res.status(400).json({
        Status: 0,
        Message: "No group found. Please select a group.",
      });
    }

    // Create assignment with the correct group
    const assignment = new TreeAssign({
      treeName,
      count,
      country,
      city,
      area,
      group: assignedGroupId, // ← SAVE THE SELECTED GROUP HERE
      address: address || "",
      status: "assigned",
      assignedBy: req.user._id,
    });

    await assignment.save();

    // Populate all fields including the group
    await assignment.populate([
      { path: "treeName", select: "name" },
      { path: "group", select: "name" }, // ← POPULATE GROUP NAME
      { path: "country", select: "name" },
      { path: "city", select: "name" },
      { path: "area", select: "name" },
      { path: "assignedBy", select: "firstName lastName" },
    ]);

    res.status(201).json({
      Status: 1,
      Message: "Tree assigned successfully",
      data: assignment, // ← lowercase 'data'
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};
// GET ALL ASSIGNMENTS
const getAllAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const assignments = await TreeAssign.find()
      .populate("treeName", "name")
      .populate("group", "name") // ← POPULATE GROUP NAME
      .populate("country", "name")
      .populate("city", "name")
      .populate("area", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await TreeAssign.countDocuments();

    res.status(200).json({
      Status: 1,
      data: assignments, // ← lowercase 'data'
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};
// GET ASSIGNMENT BY ID
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await TreeAssign.findById(req.params.id)
      .populate("treeName", "name")
      .populate({
        path: "group",
        select: "name users",
        populate: { path: "users", select: "firstName lastName email mobile" },
      }) // ← POPULATE GROUP WITH USERS
      .populate("country", "name")
      .populate("city", "name")
      .populate("area", "name")
      .populate("assignedBy", "firstName lastName");

    if (!assignment) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    res.status(200).json({
      Status: 1,
      data: assignment, // ← lowercase 'data'
    });
  } catch (error) {
    res.status(500).json({
      Status: 0,
      Message: error.message,
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
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  completeTreeAssign,
  cancelTreeAssign,
};
