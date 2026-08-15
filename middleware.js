const ExpressError = require("./utils/expressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

// ==============================
//   isLoggedIn Middleware
// ==============================

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in first!");
    return res.redirect("/login");
  }
  next();
};


// ==============================
//   Validate Listing Middleware
// ==============================

module.exports.validateListing = (req, res, next) => {
  // Ensure nested form fields from multipart (e.g., listing[title]) are reconstructed
  if (!req.body.listing) {
    const listingObj = {};
    for (let key of Object.keys(req.body)) {
      const parts = key.match(/[^\[\]]+/g); // matches listing, image, url, etc
      if (!parts) continue;
      if (parts[0] !== 'listing') continue;
      // build nested object at listingObj
      let cur = listingObj;
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          cur[part] = req.body[key];
        } else {
          cur[part] = cur[part] || {};
          cur = cur[part];
        }
      }
    }
    if (Object.keys(listingObj).length > 0) req.body.listing = listingObj;
  }

  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};


// ==============================
//   Validate Review Middleware
// ==============================

module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};


module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    let listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect(`/listings`);
  }

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit!");
    return res.redirect(`/listings/${id}`);
  }

    next();
};

module.exports.isReviewOwner = async (req, res, next) => {
    let { reviewId, id } = req.params;

    let review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to delete this review!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};