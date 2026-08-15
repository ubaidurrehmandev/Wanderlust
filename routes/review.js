const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const {isLoggedIn, validateReview, isReviewOwner} = require("../middleware.js");
const reviewController = require("../controllers/reviews.js");

// Reviews
// Post Review Route
router.post(
  "/",
  isLoggedIn,
  validateReview,
  wrapAsync(reviewController.createReview));

// Delete Review Route
router.delete(
    "/:reviewId",
    isLoggedIn,
    isReviewOwner,
    wrapAsync(reviewController.destroyReview));

module.exports = router;
