/*import express from "express";
import { createCountry ,getAllCountry,getCountryById,updateCountry,deleteCountry} from "../controllers/countryController.js";

const router = express.Router();

router.post("/", createCountry);
router.get("/", getAllCountry);
router.get("/:id", getCountryById);
router.put("/:id", updateCountry);
router.delete("/:id", deleteCountry);

export default router;*/

const express = require("express");
const router = express.Router();

const {
  createCountry,
  getAllCountry,
  getCountryById,
  updateCountry,
  deleteCountry,
} = require("../controllers/countryController");

router.post("/", createCountry);
router.get("/", getAllCountry);
router.get("/:id", getCountryById);
router.put("/:id", updateCountry);
router.delete("/:id", deleteCountry);

module.exports = router;
