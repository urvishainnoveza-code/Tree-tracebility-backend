const mongoose = require("mongoose");
const TreePlantation = require("../models/TreePlantation");
const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const cron = require("node-cron");

// Calculate distance between two coordinates (meters)
/*function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}*/
const calculateAgeReadable = (plantationDate) => {
  const now = new Date();
  const planted = new Date(plantationDate);
  let years = now.getFullYear() - planted.getFullYear();
  let months = now.getMonth() - planted.getMonth();
  let days = now.getDate() - planted.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0 || parts.length === 0)
    parts.push(`${days} day${days > 1 ? "s" : ""}`);
  return parts.join(" ");
};

// Cron job to update ages daily at night
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      const plantations = await TreePlantation.find(
        {},
        "_id plantationDate age",
      );

      const bulkOps = plantations
        .map((tree) => {
          const newAge = calculateAgeReadable(tree.plantationDate);
          if (newAge !== tree.age) {
            return {
              updateOne: {
                filter: { _id: tree._id },
                update: { $set: { age: newAge } },
              },
            };
          }
          return null;
        })
        .filter(Boolean);

      if (bulkOps.length > 0) {
        await TreePlantation.bulkWrite(bulkOps);
      }

      console.log(`Cron job completed: Updated ${bulkOps.length} tree ages`);
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  },
  { timezone: "Asia/Kolkata" },
);

//create plantation
const createTreePlantation = async (req, res) => {
  try {
    const {
      assign,
      address,
      plantedCount,
      cage,
      watering,
      fertilizer,
      fertilizerDetail,
      healthStatus,
      age,
      latitude,
      longitude,
    } = req.body;

    // Validate location
    if (
      latitude == null ||
      longitude == null ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res.status(400).json({
        Status: 0,
        Message: "Latitude and longitude are required and must be numbers",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        Status: 0,
        Message: "Unauthorized. Please login first.",
      });
    }

    // validate assign  id
    if (!assign || !mongoose.Types.ObjectId.isValid(assign)) {
      return res.status(400).json({
        Status: 0,
        Message: "Valid Assignment ID is required",
      });
    }

    const plantCountNumber = Number(plantedCount);
    if (!plantCountNumber || plantCountNumber <= 0) {
      return res.status(400).json({
        Status: 0,
        Message: "Planted count must be greater than 0",
      });
    }

    //check assign tree is exist
    const assignment = await TreeAssign.findById(assign);
    if (!assignment) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    if (!assignment) {
      return res.status(404).json({
        Status: 0,
        Message: "Assignment not found",
      });
    }

    // Check if assignment is cancelled
    if (assignment.status === "cancelled") {
      return res.status(400).json({
        Status: 0,
        Message: "Cannot plant trees for a cancelled assignment",
      });
    }

    // Authorization Check
    if (req.user.role?.name !== "superAdmin") {
      const userGroups = await Group.find({ users: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g) => g._id.toString());

      if (!assignment.group) {
        return res.status(403).json({
          Status: 0,
          Message: "This assignment has no group assigned",
        });
      }

      const assignmentGroupId =
        assignment.group._id?.toString() || assignment.group.toString();

      if (!userGroupIds.includes(assignmentGroupId)) {
        return res.status(403).json({
          Status: 0,
          Message: "You are not authorized to plant trees for this group",
        });
      }
    }
    // Round coordinates to 6 decimals for GPS stability
    const lat = Number(parseFloat(latitude).toFixed(6));
    const lng = Number(parseFloat(longitude).toFixed(6));

    // Prevent duplicate plantation at same spot (any user, any assignment)
    const TREE_MIN_DISTANCE = 3; // meters
    const nearbyTrees = await TreePlantation.find({
      assign: assignment._id,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: TREE_MIN_DISTANCE,
        },
      },
    });
    if (nearbyTrees.length > 0) {
      return res.status(400).json({
        Status: 0,
        Message: `A tree already exists within ${TREE_MIN_DISTANCE} meters of this location`,
      });
    }

    // Check plantation limit
    if (assignment.totalPlantedCount + plantCountNumber > assignment.count) {
      return res.status(400).json({
        Status: 0,
        Message: "Planted count exceeds assigned limit",
      });
    }

    // Convert Boolean Properly
    const cageValue = Boolean(cage === "true" || cage === true);
    const wateringValue = Boolean(watering === "true" || watering === true);
    const fertilizerValue = Boolean(
      fertilizer === "true" || fertilizer === true,
    );

    // Handle multiple images
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((file) => file.path);
    } else if (req.file) {
      imagePaths.push(req.file.path);
    }

    // Create Plantation
    const plantationDate = new Date();

    const plantation = await TreePlantation.create({
      assign: assignment._id,
      address,
      plantedBy: req.user._id,
      plantedCount: plantCountNumber,
      cage: cageValue,
      watering: wateringValue,
      fertilizer: fertilizerValue,
      fertilizerDetail: fertilizerValue ? fertilizerDetail : "",
      healthStatus: healthStatus || "planted",
      images: imagePaths,
      plantationDate,
      age: calculateAgeReadable(plantationDate),
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
    });

    // Update Assignment Count
    assignment.totalPlantedCount += plantCountNumber;
    assignment.status =
      assignment.totalPlantedCount >= assignment.count
        ? "completed"
        : "assigned";

    await assignment.save();

    const populatedPlantation = await TreePlantation.findById(plantation._id);
    return res.status(201).json({
      Status: 1,
      Message: "Tree plantation created successfully",
      Plantation: populatedPlantation,
      Location: {
        latitude,
        longitude,
      },
    });
  } catch (error) {
    console.error("Tree Plantation Error:", error.message);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
      Error: error.message,
    });
  }
};
//get all
const getAllTreePlantations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ Status: 0, Message: "Unauthorized" });
    }

    const { treeName, user } = req.query;

    let plantations;
    if (req.user.role?.name === "superAdmin") {
      // SuperAdmin: show all plantations
      plantations = await TreePlantation.find()
        .populate({
          path: "assign",
          populate: [
            { path: "treeName", select: "name" },
            { path: "country", select: "name" },
            { path: "state", select: "name" },
            { path: "city", select: "name" },
            { path: "area", select: "name" },
            { path: "address", select: "address" },
            { path: "group", select: "_id name" },
            { path: "assignedBy", select: "firstName lastName" },
          ],
        })
        .populate({
          path: "plantedBy",
          select: "firstName lastName email",
        })
        .sort({ plantationDate: -1 });
    } else {
      // Regular user: show plantations for their group(s)
      const userGroups = await Group.find({ users: req.user._id }).select(
        "_id",
      );
      const groupIds = userGroups.map((g) => g._id);
      const assignments = await TreeAssign.find({
        group: { $in: groupIds },
      }).select("_id");
      const assignmentIds = assignments.map((a) => a._id);
      plantations = await TreePlantation.find({
        assign: { $in: assignmentIds },
      })
        .populate({
          path: "assign",
          populate: [
            { path: "treeName", select: "name" },
            { path: "country", select: "name" },
            { path: "state", select: "name" },
            { path: "city", select: "name" },
            { path: "area", select: "name" },
            { path: "group", select: "_id name" },
            { path: "assignedBy", select: "firstName lastName" },
          ],
        })
        .populate({
          path: "plantedBy",
          select: "firstName lastName email",
        })
        .sort({ plantationDate: -1 });
    }

    // filter by tree name
    if (treeName) {
      plantations = plantations.filter(
        (p) =>
          p.assign?.treeName?._id &&
          p.assign.treeName._id.toString() === treeName,
      );
    }
    //search by user name
    if (user) {
      plantations = plantations.filter(
        (p) =>
          p.plantedBy &&
          (p.plantedBy.firstName?.toLowerCase().includes(user.toLowerCase()) ||
            p.plantedBy.lastName?.toLowerCase().includes(user.toLowerCase())),
      );
    }
    //grop filter for regular users
    if (req.user.role?.name !== "superAdmin") {
      const userGroups = await Group.find({ users: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g) => g._id.toString());

      plantations = plantations.filter(
        (p) =>
          p.assign?.group &&
          userGroupIds.includes(p.assign.group._id.toString()),
      );
    }

    //age calculation
    plantations = plantations.map((p) => ({
      ...p.toObject(),
      age: calculateAgeReadable(p.plantationDate),
    }));

    return res.status(200).json({
      Status: 1,
      Message: "Tree plantations fetched successfully",
      Count: plantations.length,
      Plantation: plantations,
    });
  } catch (error) {
    console.error("Get Tree Plantations Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
      Error: error.message,
    });
  }
};
const getTreePlantationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ Status: 0, Message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Invalid Plantation ID" });
    }

    // Find plantation by ID with populate
    let plantation = await TreePlantation.findById(id)
      .populate({
        path: "assign",
        populate: [
          { path: "treeName", select: "name" },
          { path: "country", select: "name" },
          { path: "state", select: "name" },
          { path: "city", select: "name" },
          { path: "area", select: "name" },
          { path: "group", select: "_id name" },
          { path: "assignedBy", select: "firstName lastName" },
        ],
      })
      .populate({
        path: "plantedBy",
        select: "firstName lastName email country state city area role addedBy",
      });

    if (!plantation) {
      return res
        .status(404)
        .json({ Status: 0, Message: "Plantation not found" });
    }

    // If regular user, check group access
    if (req.user.role?.name !== "superAdmin") {
      const userGroups = await Group.find({ users: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g) => g._id.toString());

      const plantationGroupId = plantation.assign?.group?._id?.toString();
      if (!plantationGroupId || !userGroupIds.includes(plantationGroupId)) {
        return res.status(403).json({ Status: 0, Message: "Access denied" });
      }
    }
    plantation = {
      ...plantation.toObject(),
      age: calculateAgeReadable(plantation.plantationDate),
    };

    return res.status(200).json({
      Status: 1,
      Message: "Tree plantation fetched successfully",
      Plantation: plantation,
    });
  } catch (error) {
    console.error("Get Tree Plantation By ID Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
      Error: error.message,
    });
  }
};

//update plantation

const updateTreePlantation = async (req, res) => {
  const { latitude, longitude } = req.body;
  const edit_field = [
    "cage",
    "watering",
    "fertilizer",
    "fertilizerDetail",
    "images",
  ];
  const isProximityEdit = edit_field.some(
    (field) => req.body[field] !== undefined,
  );
  try {
    const plantationId = req.params.id;

    if (!req.user) {
      return res.status(401).json({ Status: 0, Message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(plantationId)) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Invalid Plantation ID" });
    }
    const plantation = await TreePlantation.findById(plantationId).populate({
      path: "assign",
      populate: { path: "group", select: "_id name" },
    });

    if (!plantation) {
      return res
        .status(404)
        .json({ Status: 0, Message: "Plantation not found" });
    }

    // GPS proximity validation (after plantation is defined)
    if (isProximityEdit && (!latitude || !longitude)) {
      return res.status(400).json({
        Status: 0,
        Message: "Current location required to update plantation",
      });
    }
    if (isProximityEdit) {
      // Use MongoDB $near for proximity check
      const nearbyTree = await TreePlantation.findOne({
        _id: plantationId,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(longitude), Number(latitude)],
            },
            $maxDistance: 30,
          },
        },
      });
      if (!nearbyTree) {
        return res.status(403).json({
          Status: 0,
          Message:
            "You must be within 30 meters of the tree to update these details",
        });
      }
    }

    const isSuperAdmin = req.user.role?.name === "superAdmin";

    // Authorization
    if (!isSuperAdmin) {
      const userGroups = await Group.find({ users: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g) => g._id.toString());

      const plantationGroupId = plantation.assign?.group?._id?.toString();

      if (!plantationGroupId || !userGroupIds.includes(plantationGroupId)) {
        return res.status(403).json({
          Status: 0,
          Message: "Not authorized to update this plantation",
        });
      }
    }
    const assign = plantation.assign;
    const oldPlantedCount = plantation.plantedCount;
    const allowedFields = [
      "plantedCount",
      "cage",
      "watering",
      "fertilizer",
      "fertilizerDetail",
      "healthStatus",
      "address",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        plantation[field] = ["cage", "watering", "fertilizer"].includes(field)
          ? req.body[field] === "true" || req.body[field] === true
          : req.body[field];

        // Set lastWateredDate if watering is updated
        if (
          field === "watering" &&
          (req.body[field] === "true" || req.body[field] === true)
        ) {
          plantation.lastWateredDate = new Date();
        }
        // Set lastFertilizerDate if fertilizer is updated
        if (
          field === "fertilizer" &&
          (req.body[field] === "true" || req.body[field] === true)
        ) {
          plantation.lastFertilizerDate = new Date();
        }
      }
    });

    // Validate plantedCount
    if (req.body.plantedCount !== undefined) {
      const newPlantedCount = Number(req.body.plantedCount);

      if (newPlantedCount <= 0) {
        return res.status(400).json({
          Status: 0,
          Message: "Planted count must be greater than 0",
        });
      }

      const updatedAssignPlantedCount =
        assign.totalPlantedCount - oldPlantedCount + newPlantedCount;

      if (updatedAssignPlantedCount > assign.count) {
        return res.status(400).json({
          Status: 0,
          Message: "Planted count exceeds assigned limit",
        });
      }

      assign.totalPlantedCount = updatedAssignPlantedCount;
      assign.status =
        assign.totalPlantedCount >= assign.count ? "completed" : "assigned";

      await assign.save();

      plantation.plantedCount = newPlantedCount;
    }

    // replace images if uploaded
    if (req.files && req.files.length > 0) {
      plantation.images = req.files.map((file) => file.path);
    }
    await plantation.save();
    const updatedPlantation = await TreePlantation.findById(plantation._id);

    return res.status(200).json({
      Status: 1,
      Message: "Plantation updated successfully",
      Plantation: updatedPlantation,
    });
  } catch (error) {
    console.error("Update Plantation Error:", error);
    return res.status(500).json({
      Status: 0,
      Message: "Internal Server Error",
      Error: error.message,
    });
  }
};
module.exports = {
  createTreePlantation,
  getAllTreePlantations,
  getTreePlantationById,
  updateTreePlantation,
};
