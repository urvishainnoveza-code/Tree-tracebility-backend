try {
  require("./controllers/UserController.js");
  console.log("UserController ok");
} catch (e) {
  console.error("UserController error:", e && e.message ? e.message : e);
}
try {
  require("./controllers/adminUserController.js");
  console.log("adminUserController ok");
} catch (e) {
  console.error("adminUserController error:", e && e.message ? e.message : e);
}
try {
  require("./models/Role.js");
  console.log("Role ok");
} catch (e) {
  console.error("Role error:", e && e.message ? e.message : e);
}
