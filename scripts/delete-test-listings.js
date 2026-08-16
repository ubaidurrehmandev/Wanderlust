require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const idsToDelete = [
  "6a8232276b0a1cb97c4a873c",
  "6a823159e0a480474febee5f",
  "6a823044e0a480474febee58",
  "6a82301fe0a480474febee55",
];

async function main() {
  await mongoose.connect(dbUrl);

  const candidates = await Listing.find({ _id: { $in: idsToDelete } }).select("title");
  console.log("Deleting listings:");
  for (const listing of candidates) {
    console.log(`${listing._id} :: ${listing.title}`);
  }

  for (const id of idsToDelete) {
    await Listing.findByIdAndDelete(id);
  }

  const remaining = await Listing.find({ _id: { $in: idsToDelete } }).select("title");
  console.log(`Remaining matched listings: ${remaining.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
