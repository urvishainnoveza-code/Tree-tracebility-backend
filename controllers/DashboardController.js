const User = require("../models/User");
const TreePlantation = require("../models/TreePlantation");
const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
const Notification = require("../models/Notification");
const Donation = require("../models/Donation");

const getDashboard = async (req, res) => {
  try {
    // Validate user role and type
    const roleName = req.user.role?.name || req.user.role;
    const userType = req.user.type || null;
    if (!roleName) {
      return res.status(400).json({ error: "User role is missing or invalid" });
    }

    // Donor: Donation stats and recent donations
    if (roleName === "donor") {
      const userId = req.user._id;
      // Get all donations of this donor
      const donations = await Donation.find({ donor: userId }).lean();
      // Sum total trees and amount
      const totalTrees = donations.reduce(
        (sum, d) => sum + (d.quantity || 0),
        0,
      );
      const totalAmount = donations.reduce(
        (sum, d) => sum + (d.amount || 0),
        0,
      );
      // Find all assignments from donations
      const assignments = donations
        .filter((d) => d.assignment)
        .map((d) => d.assignment);
      // Find all plantations linked to these assignments, include images
      const plantations =
        assignments.length > 0
          ? await TreePlantation.find({ assign: { $in: assignments } })
              .populate({
                path: "assign",
                populate: { path: "treeName", select: "name" },
              })
              .select(
                "_id assign plantationDate healthStatus plantedCount images",
              )
              .lean()
          : [];
      const totalPlanted = plantations.reduce(
        (sum, p) => sum + (p.plantedCount || 0),
        0,
      );
      // Tree health overview (percentages)
      const healthCounts = { healthy: 0, growing: 0, diseased: 0 };
      plantations.forEach((p) => {
        if (p.healthStatus === "healthy")
          healthCounts.healthy += p.plantedCount || 0;
        else if (p.healthStatus === "growing")
          healthCounts.growing += p.plantedCount || 0;
        else if (p.healthStatus === "diseased")
          healthCounts.diseased += p.plantedCount || 0;
      });
      const healthTotal =
        healthCounts.healthy + healthCounts.growing + healthCounts.diseased;
      const healthOverview = {
        healthy: healthTotal
          ? Math.round((healthCounts.healthy / healthTotal) * 100)
          : 0,
        growing: healthTotal
          ? Math.round((healthCounts.growing / healthTotal) * 100)
          : 0,
        diseased: healthTotal
          ? Math.round((healthCounts.diseased / healthTotal) * 100)
          : 0,
      };

      // Donation activity (monthly bar chart)
      const donationActivity = {};
      donations.forEach((d) => {
        const date = new Date(d.createdAt);
        const month = date.toLocaleString("default", { month: "short" });
        const year = date.getFullYear();
        const key = `${month} ${year}`;
        donationActivity[key] =
          (donationActivity[key] || 0) + (d.quantity || 0);
      });
      // Sort by month/year (last 6 months)
      const months = Object.keys(donationActivity)
        .map((k) => ({
          key: k,
          date: new Date(
            k.split(" ")[1],
            new Date(Date.parse(k.split(" ")[0] + " 1, 2000")).getMonth(),
          ),
        }))
        .sort((a, b) => a.date - b.date)
        .slice(-6)
        .map((m) => ({ month: m.key, value: donationActivity[m.key] }));

      return res.json({
        mode: "donor",
        totalTrees,
        totalAmount,
        totalPlanted,
        myTrees: plantations, // all trees planted for this donor
        healthOverview,
        donationActivity: months,
      });
    }
    // SuperAdmin: Global stats
    if (roleName === "superAdmin") {
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
          { $group: { _id: null, total: { $sum: "$plantedCount" } } },
        ]).then((r) => r[0]?.total || 0),
        TreeAssign.aggregate([
          { $group: { _id: null, total: { $sum: "$count" } } },
        ]).then((r) => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "healthy" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } },
        ]).then((r) => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "dead" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } },
        ]).then((r) => r[0]?.total || 0),
        TreePlantation.aggregate([
          { $match: { healthStatus: "diseased" } },
          { $group: { _id: null, total: { $sum: "$plantedCount" } } },
        ]).then((r) => r[0]?.total || 0),
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
        mode: "superAdmin",
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
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);
    const totalAssignedTrees = assignedTreesAgg[0]?.total || 0;

    // Planted trees in this group (sum plantedCount via $lookup)
    const plantedTreesAgg = await TreePlantation.aggregate([
      {
        $lookup: {
          from: "treeassigns",
          localField: "assign",
          foreignField: "_id",
          as: "assignObj",
        },
      },
      { $unwind: "$assignObj" },
      { $match: { "assignObj.group": group._id } },
      { $group: { _id: null, total: { $sum: "$plantedCount" } } },
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
            as: "assignObj",
          },
        },
        { $unwind: "$assignObj" },
        { $match: { "assignObj.group": group._id, healthStatus: status } },
        { $group: { _id: null, total: { $sum: "$plantedCount" } } },
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
          as: "assignObj",
        },
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
          as: "treeNameObj",
        },
      },
      { $unwind: "$treeNameObj" },
      {
        $project: {
          _id: 1,
          plantationDate: 1,
          healthStatus: 1,
          plantedCount: 1,
          treeName: "$treeNameObj.name",
          images: 1, // Include images field
        },
      },
    ]);

    // Group member details
    const members = await User.find({ _id: { $in: groupMembers } })
      .select(
        "firstName lastName email phoneNo isActive country state city area role addedBy",
      )
      .lean();

    res.json({
      group: { name: group.name, area: group.area },
      totalGroupMembers: groupMembers.length,
      totalAssignedTrees,
      totalPlantedTrees,
      topTrees,
      healthChart,
      members,
      mode: "user",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

module.exports = { getDashboard };
