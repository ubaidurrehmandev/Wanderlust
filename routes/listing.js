const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/expressError.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, validateListing, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const { parser } = require("../cloudinary/index.js");



//Index Route
router.get("/", wrapAsync(listingController.index));

//New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

//Show Route
router.get("/:id", wrapAsync(listingController.showListing));

//Create Route
router.post("/", isLoggedIn, parser.single('image'), validateListing, wrapAsync(listingController.createListing));

//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

//Update Route
router.put("/:id", isLoggedIn, isOwner, parser.single('image'), validateListing, wrapAsync(listingController.updateListing));

//Delete Route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

module.exports = router;