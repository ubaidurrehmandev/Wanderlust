require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Listing = require("../models/listing");
const Review = require("../models/review");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

async function inspect() {
  await mongoose.connect(dbUrl);

  const user = await User.findOne({ username: "ubaidurrehmandev" });
  console.log("User ubaidurrehmandev:", user ? user._id : "NOT FOUND");

  const total = await Listing.countDocuments({});
  const withOwner = user
    ? await Listing.countDocuments({ owner: user._id })
    : 0;
  const withoutOwner = await Listing.countDocuments({
    $or: [{ owner: null }, { owner: { $exists: false } }],
  });

  console.log("Listings total:", total);
  console.log("Owned by ubaidurrehmandev:", withOwner);
  console.log("Without owner:", withoutOwner);

  const listing = await Listing.findOne({});
  if (listing) {
    console.log("Sample listing:", listing._id, listing.title);
    const populated = await Listing.findById(listing._id)
      .populate("owner")
      .populate({ path: "reviews", populate: { path: "author" } });
    console.log("Reviews count:", populated.reviews.length);
    if (populated.reviews.length > 0) {
      console.log("Sample review:", populated.reviews[0]);
    }
  }

  const reviewCount = await Review.countDocuments({});
  console.log("Total reviews in DB:", reviewCount);

  await mongoose.disconnect();
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
