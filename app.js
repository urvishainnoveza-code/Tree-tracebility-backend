const express = require("express");
const cors = require("cors");

const countryRoutes = require("./routes/countryRoutes");
const stateRoutes = require("./routes/stateRoutes");
const cityRoutes = require("./routes/CityRoutes");
const areaRoutes = require("./routes/areaRoutes");
const userRoutes = require("./routes/userRoutes");
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
module.exports = app;
