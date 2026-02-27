const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server start error:", error.message);
    process.exit(1);
  }
};

startServer();
/*if become a group then after i work 
if any person tell superAdmin mare 100 tree planation karava che nd ku tree vavavu and i tell you i have already master treename and area then i want to do?that time superAdmin decied which area plantation ketala vavava che and whcih area 
means tree name treeacount ,tree planation area how to manage it i have already tree name master and area master then i want to become it properly
after in UI assign button then click then decide area thewew superAdmin his group notification or mail in all users kif not in these area user then his nearest area assign group all user task 
how to manage easily  superAdmin decide module task assign module or both combine how to manage it
superadmin decide then in these time not assign only decide

if tree planation and assign task both differnt model? Assihgn
 worktree planation area and user group area match then his group all useer
  and if in these area no any ususer then neatrest area group all user assign*/
/*const Group = require("./Group");

userSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      await Group.updateMany(
        { users: doc._id },
        { $pull: { users: doc._id } }
      );
      console.log(`User ${doc._id} removed from all groups`);
    } catch (error) {
      console.error("Error removing user from groups:", error);
    }
  }
});*/