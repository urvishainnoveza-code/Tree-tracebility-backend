const express = require("express");
const router = express.Router();

const {
  addState,
  getStates,
  getStateById,
  updateState,
  deleteState
} = require("../Controllers/stateController");

router.post("/",  addState);
router.get("/",  getStates);
router.get("/:id",  getStateById);
router.put("/:id",  updateState);
router.delete("/:id",  deleteState);

module.exports = router;
