const express = require("express");
const router = express.Router();

const protect = require("../middleware/auth");
const ctrl = require("../controllers/UserController");

router.post("/signup", ctrl.signupUser);
router.post("/login", ctrl.loginUser);
router.get("/me", protect, ctrl.getUser);
router.put("/:id", protect, ctrl.updateUser);

module.exports = router;
