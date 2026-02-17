const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/tree_trace_backend";
  console.log("Connecting to", uri);
  await mongoose.connect(uri);

  // Use a loose model so we can inspect existing documents regardless of current schema
  const Country = mongoose.model(
    "Country",
    new mongoose.Schema({}, { strict: false }),
    "countries",
  );

  const nullDocs = await Country.find({ countryName: null }).lean();
  console.log("Documents with countryName:null ->", nullDocs.length);

  const cmd = process.argv[2];
  if (!cmd) {
    console.log("\nNo action specified. Actions: delete | update | fix-index");
    console.log("Examples:");
    console.log(
      "  node scripts/cleanCountries.js delete    # remove null countryName docs",
    );
    console.log(
      '  node scripts/cleanCountries.js update    # set countryName to "Unknown" for null docs',
    );
    console.log(
      "  node scripts/cleanCountries.js fix-index # drop and recreate partial unique index",
    );
    await mongoose.disconnect();
    return;
  }

  if (cmd === "delete") {
    const res = await Country.deleteMany({ countryName: null });
    console.log("deleteMany result:", res);
  } else if (cmd === "update") {
    const res = await Country.updateMany(
      { countryName: null },
      { $set: { countryName: "Unknown" } },
    );
    console.log("updateMany result:", res);
  } else if (cmd === "fix-index") {
    const db = mongoose.connection.db;
    try {
      // Drop existing index if present
      const indexes = await db.collection("countries").indexes();
      const hasIndex = indexes.find((i) => i.key && i.key.countryName === 1);
      if (hasIndex) {
        console.log("Dropping index:", hasIndex.name);
        await db.collection("countries").dropIndex(hasIndex.name);
      }

      // Create partial unique index for string countryName only
      await db
        .collection("countries")
        .createIndex(
          { countryName: 1 },
          {
            unique: true,
            partialFilterExpression: { countryName: { $type: "string" } },
          },
        );
      console.log("Created partial unique index on countryName");
    } catch (err) {
      console.error("Index operation failed:", err);
    }
  } else {
    console.log("Unknown action:", cmd);
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
