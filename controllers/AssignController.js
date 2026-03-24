const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const Area = require("../models/Area");
const TreePlantation = require("../models/TreePlantation");
const { createNotification } = require("./NotificationController");
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
    const { treeName, count, country, state, city, area, group, address } =
      req.body;

    if (!treeName || !count || !country || !state || !city || !area) {
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
      state,
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
      { path: "state", select: "name" },
      { path: "city", select: "name" },
      { path: "area", select: "name" },
      { path: "assignedBy", select: "firstName lastName" },
    ]);

    // Create notification for group members
    try {
      const group = await Group.findById(assignedGroupId).populate("users");
      if (group?.users?.length > 0) {
        const treeName = assignment.treeName?.name || "Tree";
        const areaName = assignment.area?.name || "your area";
        const message = `New tree assignment: ${count} ${treeName}s assigned in ${areaName}`;
        const recipients = group.users.map((u) => u._id);

        await createNotification({
          group: assignedGroupId,
          message,
          recipients,
          relatedId: assignment._id,
          type: "assignTree",
        });
      }
    } catch (notifError) {
      console.error("Notification error:", notifError.message);
    }

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
    const {
      page = 1,
      limit = 10,
      treeName,
      country,
      state,
      city,
      area,
    } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query for all possible fields
    const filter = {};
    if (treeName) filter.treeName = treeName;
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (area) filter.area = area;

    const assignments = await TreeAssign.find(filter)
      .populate("treeName", "name")
      .populate("group", "name")
      .populate("country", "name")
      .populate("state", "name")
      .populate("city", "name")
      .populate("area", "name")
      .sort({ createdAt: -1 });

    // Filter by treeName (case-insensitive, partial match)
    if (search) {
      const searchLower = search.toLowerCase();
      assignments = assignments.filter(a =>
        a.treeName?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination after filtering
    const total = assignments.length;
    const paginatedAssignments = assignments.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      Status: 1,
      data: paginatedAssignments,
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
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await TreeAssign.findById(req.params.id)
      .populate("treeName", "name")
      .populate({
        path: "group",
        select: "name users",
        populate: { path: "users", select: "firstName lastName email mobile" },
      })
      .populate("country", "name")
      .populate("state", "name")
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

    if (!mongoose.Types.ObjectId.isValid(assignId)) {
      return res.status(400).json({
        Status: 0,
        Message: "Invalid assignment ID",
      });
    }

    const assignment = await TreeAssign.findById(assignId);
    if (!assignment) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    if (assignment.status === "cancelled") {
      return res.status(400).json({
        Status: 0,
        Message: "Assignment is already cancelled",
      });
    }

    // Get planted count before cancelling
    const plantations = await TreePlantation.find({ assign: assignId });
    const plantedCount = plantations.reduce(
      (sum, p) => sum + p.plantedCount,
      0,
    );

    // Detach plantations (make them independent)
    if (plantations.length > 0) {
      await TreePlantation.updateMany(
        { assign: assignId },
        { $set: { assign: null } },
      );
    }

    // Set status to cancelled
    assignment.status = "cancelled";
    await assignment.save();

    // Send notifications to all group users
    try {
      const populatedAssignment =
        await TreeAssign.findById(assignId).populate("treeName");
      const group = await Group.findById(assignment.group).populate("users");

      if (group?.users?.length > 0) {
        const treeName = populatedAssignment.treeName?.name || "Tree";
        const message = `${treeName} assignment has been cancelled. ${plantedCount > 0 ? `${plantedCount} trees already planted are saved as independent records.` : ""}`;
        const recipients = group.users.map((u) => u._id);

        await createNotification({
          group: group._id,
          message,
          recipients,
          relatedId: assignment._id,
          type: "cancelAssign",
        });
      }
    } catch (notifError) {
      console.error("Notification error:", notifError.message);
      // Don't fail cancellation if notification fails
    }

    return res.json({
      Status: 1,
      Message: `Assignment cancelled. ${plantedCount} trees saved as independent.`,
      Data: assignment,
    });
  } catch (error) {
    return res.status(500).json({
      Status: 0,
      Message: "Error cancelling assignment",
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
