const express = require("express");
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
    addRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole,
    getAllRoles
} = require("../Controllers/roleController");


router.post("/", protect, addRole);
// Save multiple responsibilities for a rol
router.get("/", getRoles);
router.get("/all", getAllRoles);
router.get("/:id", protect, getRoleById);
router.put("/:id", protect, updateRole);
router.delete("/:id", protect, deleteRole);


module.exports = router;
