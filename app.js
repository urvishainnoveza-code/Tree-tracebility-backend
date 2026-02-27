const express = require("express");
const cors = require("cors");

const countryRoutes = require("./routes/countryRoutes");
const stateRoutes = require("./routes/stateRoutes");
const cityRoutes = require("./routes/CityRoutes");
const areaRoutes = require("./routes/areaRoutes");
const userRoutes = require("./routes/userRoutes");
const treenameRoutes = require("./routes/treenameRoutes");
const groupRoutes = require("./routes/groupRoutes");
const assignRoutes = require("./routes/assignRoutes");
const treePlantationRoutes = require("./routes/treePlantationRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Tree Traceability API is running 🌱");
});

app.use("/api/countries", countryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/treename", treenameRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/assign", assignRoutes);
app.use("/api/plantation", treePlantationRoutes);
app.use((req, res) => {
  res.status(404).json({
    Status: 0,
    Message: "Requested resource could not be found.",
    Path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    Status: 0,
    Message: err.message || "Internal Server Error",
  });
});

module.exports = app;
