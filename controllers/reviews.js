const Listing = require("../models/listing");
const Review = require("../models/review");
const ExpressError = require("../utils/expressError.js");

module.exports.createReview = async (req, res) => {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      throw new ExpressError(404, "Listing not found");
    }

    let newReview = new Review(req.body.review);

    newReview.owner = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    req.flash("success", "New Review Created!");
    res.redirect(`/listings/${listing._id}`);
  };

  module.exports.destroyReview = async (req, res) => {
        const { id, reviewId } = req.params;

        let listing = await Listing.findByIdAndUpdate(id, {
            $pull: { reviews: reviewId },
        });

        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }

        await Review.findByIdAndDelete(reviewId);

        req.flash("success", "Review Deleted!");
        res.redirect(`/listings/${id}`);
    };