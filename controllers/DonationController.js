const Donation = require("../models/Donation");
const User = require("../models/User");
const Role = require("../models/Role");
const TreeAssign = require("../models/TreeAssign");
const Group = require("../models/Group");
// Create Donation (flexible: auto-calculate amount or quantity based on cage and input)
const createDonation = async (req, res) => {
  try {
    const { amount, quantity, cage } = req.body;

    // Set your prices here
    const CAGE_PRICE = 100; // example price for caged tree
    const NO_CAGE_PRICE = 50; // example price for non-caged tree
    const pricePerTree = cage ? CAGE_PRICE : NO_CAGE_PRICE;

    let finalAmount = amount;
    let finalQuantity = quantity;

    // If both are missing, error
    if ((!amount || amount < 1) && (!quantity || quantity < 1)) {
      return res.status(400).json({
        Status: 0,
        Message: "Please provide either amount or quantity",
      });
    }

    // If only quantity is provided, calculate amount
    if (quantity && quantity > 0 && (!amount || amount < 1)) {
      finalAmount = quantity * pricePerTree;
    }
    // If only amount is provided, calculate quantity
    if (amount && amount > 0 && (!quantity || quantity < 1)) {
      finalQuantity = Math.floor(amount / pricePerTree);
      if (finalQuantity < 1) {
        return res.status(400).json({
          Status: 0,
          Message: `Amount is too low for at least 1 tree (min: ${pricePerTree})`,
        });
      }
    }
    // If both are provided, validate
    if (amount && amount > 0 && quantity && quantity > 0) {
      if (amount !== quantity * pricePerTree) {
        return res.status(400).json({
          Status: 0,
          Message: `Amount and quantity do not match the selected price per tree (${pricePerTree})`,
        });
      }
    }

    const donorId = req.user._id; // From protect middleware

    const newDonation = await Donation.create({
      donor: donorId,
      amount: finalAmount,
      quantity: finalQuantity,
      cage: !!cage,
    });

    const populatedDonation = await Donation.findById(newDonation._id)
      .populate("donor", "firstName lastName email phoneNo")
      .populate(
        "assignment",
        "treeName country state city area address status",
      );
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
      .populate("assignment", "treeName country state city area address status")
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
      .populate("assignment", "treeName country state city area address status")
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

    // 2. Create assignment (require treeName from SuperAdmin)
    const { group, area, country, state, city, address, treeName } = req.body;

    if (!treeName) {
      return res.status(400).json({
        Status: 0,
        Message: "treeName is required for assignment",
      });
    }

    const assignment = await TreeAssign.create({
      treeName, // required
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
      { new: true }, // return updated doc
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
