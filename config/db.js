const mongoose = require("mongoose");

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI;
  try {
    if (!mongoUri) throw new Error("MONGODB_URI is not defined");
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
