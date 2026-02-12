const express = require("express");
const router = express.Router();

const {
  createTreename,
  getAllTreename,
  getTreenameById,
  updateTreename,
  deleteTreename,
} = require("../controllers/treenameController");

router.post("/", createTreename);
router.get("/", getAllTreename);
router.get("/:id", getTreenameById);
router.put("/:id", updateTreename);
router.delete("/:id", deleteTreename);

module.exports = router;
