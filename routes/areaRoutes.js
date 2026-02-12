const express = require("express");
const router = express.Router();

const {
  createArea,
  getAllAreas,
  getAreasByCity,
  updateArea,
  deleteArea,
} = require("../controllers/areaController");

router.post("/", createArea);               
router.get("/", getAllAreas);              
router.get("/city/:cityId", getAreasByCity); 
router.put("/:id", updateArea);            
router.delete("/:id", deleteArea);         

module.exports = router;
