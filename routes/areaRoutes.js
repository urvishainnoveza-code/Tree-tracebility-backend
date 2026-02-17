const express = require("express");
const router = express.Router();
const {
  addArea,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea,
} = require("../controllers/AreaController");
router.post("/", addArea);
router.get("/", getAllAreas);
router.get("/:id", getAreaById);
router.put("/:id", updateArea);
router.delete("/:id", deleteArea);

module.exports = router;
