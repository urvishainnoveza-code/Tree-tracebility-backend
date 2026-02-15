const express = require("express");
const router = express.Router();

let RoleModel;
try {
  RoleModel = require("../models/Role.js");
} catch (e) {
  console.warn("Warning: failed to load Role model:", e.message);
}

router.get("/", async (req, res) => {
  if (!RoleModel)
    return res.status(200).json({ Status: 0, Message: "Roles unavailable" });
  const roles = await RoleModel.find();
  res.json({ Status: 1, roles });
});

router.post("/", async (req, res) => {
  if (!RoleModel)
    return res.status(200).json({ Status: 0, Message: "Roles unavailable" });
  const role = await RoleModel.create(req.body);
  res.json({ Status: 1, role });
});

module.exports = router;
