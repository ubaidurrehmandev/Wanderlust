require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const titles = [
  "Review Listing 1786918101933",
  "Review Listing 1786917687313",
];

async function main() {
  await mongoose.connect(dbUrl);

  const listings = await Listing.find({ title: { $in: titles } }).select("_id title");
  console.log("Matched listings:", listings.map((l) => `${l._id}:${l.title}`).join(", ") || "none");

  if (listings.length > 0) {
    await Listing.deleteMany({ _id: { $in: listings.map((l) => l._id) } });
  }

  const remaining = await Listing.find({ title: { $in: titles } }).select("title");
  console.log(`Remaining listings: ${remaining.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
