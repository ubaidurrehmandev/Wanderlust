require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Review = require("../models/review");
const Listing = require("../models/listing");

const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const usernames = [
  "wander_user_1786918101933",
  "wander_user_1786917687313",
];

async function main() {
  await mongoose.connect(dbUrl);

  const users = await User.find({ username: { $in: usernames } }).select("_id username");
  console.log("Matched users:", users.map((u) => `${u._id}:${u.username}`).join(", ") || "none");

  const userIds = users.map((u) => u._id);

  const reviews = await Review.find({ author: { $in: userIds } }).select("_id author comment");
  console.log("Matched reviews:", reviews.map((r) => `${r._id}:${r.comment}`).join(", ") || "none");

  const reviewIds = reviews.map((r) => r._id);

  if (reviewIds.length > 0) {
    await Listing.updateMany(
      { reviews: { $in: reviewIds } },
      { $pull: { reviews: { $in: reviewIds } } }
    );
    await Review.deleteMany({ _id: { $in: reviewIds } });
  }

  if (userIds.length > 0) {
    await User.deleteMany({ _id: { $in: userIds } });
  }

  const remainingUsers = await User.find({ username: { $in: usernames } }).select("username");
  const remainingReviews = await Review.find({ author: { $in: userIds } }).select("_id");

  console.log(`Remaining users: ${remainingUsers.length}`);
  console.log(`Remaining reviews: ${remainingReviews.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
