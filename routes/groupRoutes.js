const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getAllGroups,
  getGroupById,
  removeUserFromGroup,
  addUserToGroup,
  getGroupByArea,
} = require("../controllers/GroupController");

// All routes protected
router.use(protect);

router.get("/", getAllGroups);
router.get("/:id", getGroupById);
router.get("/area/:areaId", getGroupByArea);
router.post("/add-user/:groupId/:userId", addUserToGroup);
router.delete("/remove-user/:groupId/:userId", removeUserFromGroup);

module.exports = router;
