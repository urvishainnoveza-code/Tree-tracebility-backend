const Donation = require("../models/Donation");
const User = require("../models/User");
const Role = require("../models/Role");
const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
// Create Donation
const createDonation = async (req, res) => {
  try {
    const { amount, quantity, treename } = req.body;

    if (!treename) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Tree name is required." });
    }
    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ Status: 0, Message: "Quantity must be at least 1." });
    }

    const donorId = req.user._id; // From protect middleware

    const newDonation = await Donation.create({
      donor: donorId,
      amount,
      quantity,
      treename,
    });

    const populatedDonation = await Donation.findById(newDonation._id)
      .populate("donor", "firstName lastName email phoneNo")
      .populate("treename", "name");

    return res.status(201).json({
      Status: 1,
      Message: "Donation successful.",
      Data: populatedDonation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};

// Get My Donations (For Donor Dashboard)
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate("treename", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      Status: 1,
      Data: donations,
    });
  } catch (error) {
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};

// Get All Donations (For SuperAdmin)
const getAllDonations = async (req, res) => {
  const currentUserRole = await Role.findById(req.user.role).select("name");

  if (!currentUserRole || currentUserRole.name !== "superAdmin") {
    return res.status(403).json({
      Status: 0,
      Message: "Only superAdmin can create users",
    });
  }
  try {
    const donations = await Donation.find()
      .populate("donor", "firstName lastName email phoneNo")
      .populate("treename", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      Status: 1,
      Data: donations,
    });
  } catch (error) {
    return res.status(500).json({ Status: 0, Message: "Server error" });
  }
};
// Assign a donation to a group/area (SuperAdmin)


const assignDonation = async (req, res) => {
  try {
    const donationId = req.params.id;

    // 1. Find donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        Status: 0,
        Message: "Donation not found",
      });
    }

    // 2. Create assignment
    const { group, area, country, state, city, address } = req.body;

    const assignment = await TreeAssign.create({
      treeName: donation.treename,
      count: donation.quantity,
      country,
      state,
      city,
      area,
      group,
      address: address || "",
      status: "assigned",
      assignedBy: req.user._id,
    });

    // 3. 🔥 FORCE UPDATE DONATION (THIS IS FIX)
    const updatedDonation = await Donation.findByIdAndUpdate(
      donationId,
      {
        status: "assigned",
        assignment: assignment._id,
      },
      { new: true } // return updated doc
    );

    return res.status(200).json({
      Status: 1,
      Message: "Donation assigned",
      Data: updatedDonation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      Status: 0,
      Message: error.message,
    });
  }
};
// Mark a donation as planted (by group/member)

module.exports = {
  createDonation,
  getMyDonations,
  getAllDonations,
  assignDonation,
  
};
