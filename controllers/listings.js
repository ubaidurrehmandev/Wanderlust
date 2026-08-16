const Listing = require("../models/listing");
const ExpressError = require("../utils/expressError.js");
const { cloudinary } = require("../cloudinary/index.js");
const { CATEGORIES } = require("../config/constants.js");
const NodeGeocoder = require("node-geocoder");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
  userAgent: "WanderlustApp/1.0",
});

function getLocalImageData(file) {
  if (!file || !file.filename) return null;
  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    public_id: null,
  };
}

function isLocalUploadUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

async function deleteLocalUpload(url) {
  if (!isLocalUploadUrl(url)) return;
  const filePath = path.join(__dirname, "..", "public", url.replace(/^\//, ""));
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("Failed to delete local upload:", err.message);
    }
  }
}

// Index Route: Displays all listings with optional category & search filter
module.exports.index = async (req, res) => {
  const { category, search } = req.query;
  let query = {};

  if (category && category.trim() !== "") {
    const trimmedCategory = category.trim();
    if (CATEGORIES.includes(trimmedCategory)) {
      query.category = trimmedCategory;
    }
  }

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { title: searchRegex },
      { location: searchRegex },
      { country: searchRegex },
      { propertyType: searchRegex },
    ];
  }

  const allListings = await Listing.find(query).sort({ createdAt: -1 });
  res.render("listings/index.ejs", { allListings, category, search });
};

// Render New Listing Form
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// Show Listing Details
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    req.flash("error", "Invalid listing ID!");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id)
    .populate("owner")
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    });

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

// Create New Listing
module.exports.createListing = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ExpressError(401, "You must be logged in to create a listing.");
    }

    const payload = req.body.listing || {};
    delete payload.owner;
    const newListing = new Listing(payload);
    newListing.owner = req.user._id;

    // Handle local image upload first for localhost development
    if (req.file && req.file.filename) {
      newListing.image = getLocalImageData(req.file);
    } else if (payload.image && typeof payload.image === "object" && payload.image.url) {
      newListing.image = {
        url: payload.image.url,
        filename: "custom_image_url",
        public_id: null,
      };
    } else if (typeof payload.image === "string" && payload.image.trim() !== "") {
      newListing.image = {
        url: payload.image.trim(),
        filename: "custom_image_url",
        public_id: null,
      };
    }

    // Handle Geocoding (Safe OpenStreetMap)
    if (newListing.location && newListing.country) {
      try {
        const geoRes = await geocoder.geocode(
          `${newListing.location}, ${newListing.country}`
        );
        if (geoRes && geoRes.length > 0) {
          newListing.coordinates = {
            lat: geoRes[0].latitude,
            lng: geoRes[0].longitude,
          };
        }
      } catch (geoErr) {
        console.warn("Geocoding notice:", geoErr.message);
      }
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    next(err);
  }
};

// Render Edit Listing Form
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    req.flash("error", "Invalid listing ID!");
    return res.redirect("/listings");
  }

  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/edit.ejs", { listing });
};

// Update Listing
module.exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    const payload = req.body.listing || {};
    delete payload.owner;

    // Handle Image replacement
    if (req.file && req.file.filename) {
      if (listing.image && listing.image.public_id && cloudinary) {
        try {
          await cloudinary.uploader.destroy(listing.image.public_id);
        } catch (delErr) {
          console.warn("Could not delete old Cloudinary image:", delErr.message);
        }
      }
      await deleteLocalUpload(listing.image?.url);
      listing.image = getLocalImageData(req.file);
    } else if (payload.image && typeof payload.image === "object" && payload.image.url && payload.image.url !== listing.image?.url) {
      await deleteLocalUpload(listing.image?.url);
      listing.image = {
        url: payload.image.url,
        filename: "custom_image_url",
        public_id: null,
      };
    } else if (typeof payload.image === "string" && payload.image.trim() !== "" && payload.image.trim() !== listing.image?.url) {
      await deleteLocalUpload(listing.image?.url);
      listing.image = {
        url: payload.image.trim(),
        filename: "custom_image_url",
        public_id: null,
      };
    }

    // Update fields
    listing.title = payload.title || listing.title;
    listing.description = payload.description || listing.description;
    listing.price = payload.price !== undefined ? payload.price : listing.price;
    listing.category = payload.category || undefined;
    listing.propertyType = payload.propertyType || undefined;
    listing.maxGuests = payload.maxGuests || 1;
    listing.amenities = Array.isArray(payload.amenities) ? payload.amenities : [];

    const oldLocation = listing.location;
    const oldCountry = listing.country;
    listing.location = payload.location || listing.location;
    listing.country = payload.country || listing.country;

    // Re-geocode if location changed or coordinates missing
    if (
      (payload.location !== oldLocation || payload.country !== oldCountry) ||
      !listing.coordinates ||
      !listing.coordinates.lat
    ) {
      try {
        const geoRes = await geocoder.geocode(
          `${listing.location}, ${listing.country}`
        );
        if (geoRes && geoRes.length > 0) {
          listing.coordinates = {
            lat: geoRes[0].latitude,
            lng: geoRes[0].longitude,
          };
        }
      } catch (geoErr) {
        console.warn("Geocoding notice on update:", geoErr.message);
      }
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
};

// Delete Listing
module.exports.destroyListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Clean up stored image if present
    if (deletedListing.image && deletedListing.image.public_id && cloudinary) {
      try {
        await cloudinary.uploader.destroy(deletedListing.image.public_id);
      } catch (e) {
        console.warn("Failed to delete image from Cloudinary:", e.message);
      }
    }
    await deleteLocalUpload(deletedListing.image?.url);

    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};
