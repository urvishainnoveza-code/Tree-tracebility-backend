const express = require("express");
const cors = require("cors");

const countryRoutes = require("./routes/countryRoutes");
const stateRoutes = require("./routes/stateRoutes");
const cityRoutes = require("./routes/cityRoutes");
const areaRoutes = require("./routes/areaRoutes");
const treenameRoutes = require("./routes/treenameRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/treename", treenameRoutes);

app.get("/", (req, res) => {
  res.send("Tree Traceability API is running 🌱");
});

module.exports = app;
