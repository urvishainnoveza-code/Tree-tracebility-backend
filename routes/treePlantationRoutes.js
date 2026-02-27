const express = require("express");
const router = express.Router();
const {
  createTreePlantation,
  getAllTreePlantations,
  getTreePlantationById,
  updateTreePlantation,
} = require("../controllers/TreePlantationController");

const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/", protect, upload.array("images",5), createTreePlantation);
router.get("/", protect, getAllTreePlantations);
router.get("/:id", protect, getTreePlantationById);
router.put("/:id", protect, upload.array("images", 5), updateTreePlantation);
module.exports = router;
