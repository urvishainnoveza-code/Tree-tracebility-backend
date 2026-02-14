const express = require("express");
const cors = require("cors");

const userRoutes = require('./Routes/userRoutes.js');
const adminuserRoutes = require('./Routes/adminUserRoutes.js');
const roleRoutes = require('./Routes/roleRoutes.js');
const countryRoutes = require("./routes/countryRoutes");
const stateRoutes = require("./routes/stateRoutes");
const cityRoutes = require("./routes/cityRoutes");
// authRoutes removed - no authRoutes file present; use existing user/admin routes

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.get('/', (req, res) => { res.send('Welcome To Order'); res.end(); });
app.use('/admin/api/user', adminuserRoutes);
app.use('/admin/api/role', roleRoutes);
app.use('/api/user', userRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);

app.get("/", (req, res) => {
  res.send("Tree Traceability API is running 🌱");
});

module.exports = app;
