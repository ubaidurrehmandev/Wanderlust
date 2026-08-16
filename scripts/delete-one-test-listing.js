require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const targetId = "6a82331f6b0a1cb97c4a8744";

async function main() {
  await mongoose.connect(dbUrl);
  const candidate = await Listing.findById(targetId).select("title image createdAt");
  if (!candidate) {
    console.log("Listing already absent.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Deleting: ${candidate._id} :: ${candidate.title}`);
  await Listing.findByIdAndDelete(targetId);
  const after = await Listing.findById(targetId);
  console.log(`Exists after delete: ${Boolean(after)}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
