const Listing = require("../models/listing");
const Review = require("../models/review");
const ExpressError = require("../utils/expressError.js");
const mongoose = require("mongoose");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

module.exports.createReview = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ExpressError(404, "Listing not found");
  }

  const listing = await Listing.findById(id);

  if (!listing) {
    throw new ExpressError(404, "Listing not found");
  }

  const newReview = new Review(req.body.review);
  newReview.author = req.user._id;

  listing.reviews.push(newReview);

  await newReview.save();
  await listing.save();

  req.flash("success", "New Review Created!");
  res.redirect(`/listings/${listing._id}`);
};

module.exports.updateReview = async (req, res) => {
  const { id, reviewId } = req.params;

  if (!isValidObjectId(id) || !isValidObjectId(reviewId)) {
    throw new ExpressError(404, "Review not found");
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    throw new ExpressError(404, "Listing not found");
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ExpressError(404, "Review not found");
  }

  review.rating = req.body.review.rating;
  review.comment = req.body.review.comment;
  await review.save();

  req.flash("success", "Review Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyReview = async (req, res) => {
  const { id, reviewId } = req.params;

  if (!isValidObjectId(id) || !isValidObjectId(reviewId)) {
    throw new ExpressError(404, "Review not found");
  }

  const listing = await Listing.findByIdAndUpdate(id, {
    $pull: { reviews: reviewId },
  });

  if (!listing) {
    throw new ExpressError(404, "Listing not found");
  }

  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review Deleted!");
  res.redirect(`/listings/${id}`);
};