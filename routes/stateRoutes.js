const express = require("express");
const router = express.Router();
const {
  addState,
  getAllState,
  getStateById,
  updateState,
  deleteState,
} = require("../controllers/StateController");
router.post("/", addState);
router.get("/", getAllState);
router.get("/:id", getStateById);
router.put("/:id", updateState);
router.delete("/:id", deleteState);

module.exports = router;
