const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  createDonation,
  getMyDonations,
  getAllDonations,
  assignDonation,
  
} = require("../controllers/DonationController");

router.post("/", protect, createDonation);
router.get("/my-donations", protect, getMyDonations);
router.get("/all", protect, getAllDonations);
router.post("/:id/assign", protect, assignDonation); // SuperAdmin assigns donation

module.exports = router;
