const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateListing, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const { uploadSingle } = require("../cloudinary/index.js");

// Index Route
router.get("/", wrapAsync(listingController.index));

// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Show Route
router.get("/:id", wrapAsync(listingController.showListing));

// Create Route
router.post(
  "/",
  isLoggedIn,
  uploadSingle("image"),
  validateListing,
  wrapAsync(listingController.createListing)
);

// Edit Route
router.get("/:id/edit", isLoggedIn, wrapAsync(isOwner), wrapAsync(listingController.renderEditForm));

// Update Route
router.put(
  "/:id",
  isLoggedIn,
  wrapAsync(isOwner),
  uploadSingle("image"),
  validateListing,
  wrapAsync(listingController.updateListing)
);

// Delete Route
router.delete("/:id", isLoggedIn, wrapAsync(isOwner), wrapAsync(listingController.destroyListing));

module.exports = router;