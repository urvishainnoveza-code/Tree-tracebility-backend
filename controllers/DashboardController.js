const User = require("../models/User");
const TreePlantation = require("../models/TreePlantation");
const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const Notification = require("../models/Notification");

const getDashboard = async (req, res) => {
  try {
    // Validate user role and type
    const roleName = req.user.role?.name || req.user.role;
    const userType = req.user.type || null;
    if (!roleName) {
      return res.status(400).json({ error: "User role is missing or invalid" });
    }

    // SuperAdmin: Global stats
    if (roleName.toLowerCase() === "superadmin") {
      const [
        totalUsers,
        totalTreesPlanted,
        totalAssignedTrees,
        healthyTrees,
        deadTrees,
        diseasedTrees,
        recentActivities,
      ] = await Promise.all([
        User.countDocuments(),
        TreePlantation.aggregate([
          { $group: { _id: null, total: { $sum: "$plantedCount" } } }
        ]).then(r => r[0]?.total || 0),
        TreeAssign.aggregate([
          { $group: { _id: null, total: { $sum: "$count" } } },
        ]).then(r => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "healthy" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } }
        ]).then(r => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "dead" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } }
        ]).then(r => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "diseased" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } }
        ]).then(r => r[0]?.total || 0),
        Notification.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .select("message type createdAt")
          .populate("group", "name")
          .lean(),
      ]);
      return res.json({
        totalUsers,
        totalTreesPlanted,
        totalAssignedTrees,
        healthyTrees,
        deadTrees,
        diseasedTrees,
        recentActivities,
        mode: "superadmin"
      });
    }

    // User/Group dashboard
    const group = await Group.findOne({ users: req.user._id });
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Group members
    const groupMembers = group.users;

    // Assigned trees in this group
    const assignedTreesAgg = await TreeAssign.aggregate([
      { $match: { group: group._id } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalAssignedTrees = assignedTreesAgg[0]?.total || 0;

    // Planted trees in this group (sum plantedCount via $lookup)
    const plantedTreesAgg = await TreePlantation.aggregate([
      {
        $lookup: {
          from: "treeassigns",
          localField: "assign",
          foreignField: "_id",
          as: "assignObj"
        }
      },
      { $unwind: "$assignObj" },
      { $match: { "assignObj.group": group._id } },
      { $group: { _id: null, total: { $sum: "$plantedCount" } } }
    ]);
    const totalPlantedTrees = plantedTreesAgg[0]?.total || 0;

    // Health status counts for chart (sum plantedCount via $lookup)
    const healthStatuses = ["healthy", "dead", "diseased"];
    const healthChart = {};
    for (const status of healthStatuses) {
      const agg = await TreePlantation.aggregate([
        {
          $lookup: {
            from: "treeassigns",
            localField: "assign",
            foreignField: "_id",
            as: "assignObj"
          }
        },
        { $unwind: "$assignObj" },
        { $match: { "assignObj.group": group._id, healthStatus: status } },
        { $group: { _id: null, total: { $sum: "$plantedCount" } } }
      ]);
      healthChart[status] = agg[0]?.total || 0;
    }
    const notPlanted = totalAssignedTrees - totalPlantedTrees;
    healthChart.notPlanted = notPlanted;

    // Top 3 trees (by most recent plantation in this group, via $lookup)
    const topTrees = await TreePlantation.aggregate([
      {
        $lookup: {
          from: "treeassigns",
          localField: "assign",
          foreignField: "_id",
          as: "assignObj"
        }
      },
      { $unwind: "$assignObj" },
      { $match: { "assignObj.group": group._id } },
      { $sort: { plantationDate: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "treenames",
          localField: "assignObj.treeName",
          foreignField: "_id",
          as: "treeNameObj"
        }
      },
      { $unwind: "$treeNameObj" },
      {
        $project: {
          _id: 1,
          plantationDate: 1,
          healthStatus: 1,
          plantedCount: 1,
          "treeName": "$treeNameObj.name"
        }
      }
    ]);

    // Group member details
    const members = await User.find({ _id: { $in: groupMembers } })
      .select("firstName lastName email phoneNo isActive country state city area role addedBy")
      .lean();

    res.json({
      group: { name: group.name, area: group.area },
      totalGroupMembers: groupMembers.length,
      totalAssignedTrees,
      totalPlantedTrees,
      topTrees,
      healthChart,
      members,
      mode: "user"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

module.exports = { getDashboard };
