const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/auth");

const {
  addTreeName,
  getAllTreeName,
  getTreeNameById,
  updateTreeName,
  deleteTreeName,
} = require("../controllers/TreeNameController");

router.post("/", protect, authorizeRoles("superAdmin"), addTreeName);
router.get("/", protect, getAllTreeName);
router.get("/:id", protect, getTreeNameById);
router.put("/:id", protect, authorizeRoles("superAdmin"), updateTreeName);
router.delete("/:id", protect, authorizeRoles("superAdmin"), deleteTreeName);

module.exports = router;
