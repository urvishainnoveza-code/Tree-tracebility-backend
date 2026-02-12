/*import express, { Router } from "express";
import {
  createState,
  getStateByCountry,
  getAllState,
  updateState,
  deleteState,
} from "../controllers/stateController.js";
const router = express.Router();

router.post("/", createState);
router.get("/", getAllState);
router.get("/country/:countryId", getStateByCountry);
router.put("/:id", updateState);
router.delete("/:id", deleteState);
export default router;*/
const express = require("express");
const router = express.Router();

const {
  createState,
  getAllState,
  getStateByCountry,
  updateState,
  deleteState,
} = require("../controllers/stateController");

router.post("/", createState);
router.get("/", getAllState);
router.get("/country/:countryId", getStateByCountry);
router.put("/:id", updateState);
router.delete("/:id", deleteState);

module.exports = router;
