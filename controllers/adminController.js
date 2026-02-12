
const User = require("../models/User");

exports.addUser = async (req, res) => {
  try {
    const data = req.body;

    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(400).json({ message: "Email exists" });

    const user = await User.create({
      ...data,
      password: null,
      userType: "user",
      createdBy: "admin",
    });

    res.json({ message: "User created by admin", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

