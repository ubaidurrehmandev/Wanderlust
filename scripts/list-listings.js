require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
  await mongoose.connect(dbUrl);
  const listings = await Listing.find({}).sort({ createdAt: -1 }).select("title location country image createdAt owner");
  for (const listing of listings) {
    console.log(JSON.stringify({
      id: String(listing._id),
      title: listing.title,
      location: listing.location,
      country: listing.country,
      imageUrl: listing.image?.url || null,
      createdAt: listing.createdAt,
      owner: listing.owner ? String(listing.owner) : null,
    }));
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
