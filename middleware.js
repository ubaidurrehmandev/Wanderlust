const mongoose = require("mongoose");
const ExpressError = require("./utils/expressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

// ==============================
//   isLoggedIn Middleware
// ==============================
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in first!");
    return res.redirect("/login");
  }
  next();
};

// ==============================
//   saveRedirectUrl Middleware
// ==============================
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
    delete req.session.redirectUrl;
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
      const parts = key.match(/[^\[\]]+/g);
      if (!parts || parts[0] !== "listing") continue;
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
    if (Object.keys(listingObj).length > 0) {
      req.body.listing = listingObj;
    } else {
      req.body.listing = {};
    }
  }

  // Normalize amenities: convert string to array, handle empty
  if (req.body.listing.amenities) {
    if (typeof req.body.listing.amenities === "string") {
      req.body.listing.amenities = req.body.listing.amenities.trim() !== ""
        ? [req.body.listing.amenities]
        : [];
    }
  } else {
    req.body.listing.amenities = [];
  }

  // Normalize empty strings for optional fields
  if (req.body.listing.propertyType === "") {
    delete req.body.listing.propertyType;
  }
  if (req.body.listing.category === "") {
    delete req.body.listing.category;
  }
  if (req.body.listing.maxGuests === "" || req.body.listing.maxGuests === null) {
    delete req.body.listing.maxGuests;
  } else if (req.body.listing.maxGuests !== undefined) {
    req.body.listing.maxGuests = Number(req.body.listing.maxGuests);
  }

  if (req.body.listing.price !== undefined && req.body.listing.price !== "") {
    req.body.listing.price = Number(req.body.listing.price);
  }

  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(", ");
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

// ==============================
//   isOwner Middleware
// ==============================
module.exports.isOwner = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "You must be logged in first!");
      return res.redirect("/login");
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      req.flash("error", "Invalid listing ID!");
      return res.redirect("/listings");
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    if (!listing.owner || !listing.owner.equals(req.user._id)) {
      req.flash("error", "You don't have permission to do that!");
      return res.redirect(`/listings/${id}`);
    }

    next();
  } catch (err) {
    next(err);
  }
};

// ==============================
//   isReviewOwner Middleware
// ==============================
module.exports.isReviewOwner = async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error", "You must be logged in first!");
      return res.redirect("/login");
    }

    const { reviewId, id } = req.params;

    if (!isValidObjectId(reviewId)) {
      req.flash("error", "Invalid review ID!");
      return res.redirect(`/listings/${id}`);
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      req.flash("error", "Review not found!");
      return res.redirect(`/listings/${id}`);
    }

    if (!review.author || !review.author.equals(req.user._id)) {
      req.flash("error", "You don't have permission to modify this review!");
      return res.redirect(`/listings/${id}`);
    }

    next();
  } catch (err) {
    next(err);
  }
};
