require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const targetId = "6a82343e6b0a1cb97c4a8753";

async function main() {
  await mongoose.connect(dbUrl);
  const listing = await Listing.findById(targetId).select("title");
  if (!listing) {
    console.log("Listing already absent.");
  } else {
    console.log(`Deleting: ${listing._id} :: ${listing.title}`);
    await Listing.findByIdAndDelete(targetId);
  }
  const after = await Listing.findById(targetId);
  console.log(`Exists after delete: ${Boolean(after)}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
