const Listing = require("../models/listing");
const { cloudinary, useLocal } = require("../cloudinary/index.js");
const fs = require('fs');
const path = require('path');
const ExpressError = require("../utils/expressError.js");
const NodeGeocoder = require("node-geocoder");

const geoOptions = {
  provider: "openstreetmap",
};
const geocoder = NodeGeocoder(geoOptions);

async function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'Wanderlust' }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(fileBuffer);
  });
}

module.exports.index = async (req, res) => {
  const { category, search } = req.query;
  let query = {};

  // Handle category filter
  if (category && category.trim() !== "") {
    query.category = category;
  }

  // Handle search by location or country
  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i"); // case-insensitive
    query.$or = [
      { location: searchRegex },
      { country: searchRegex }
    ];
  }

  const allListings = await Listing.find(query);
  res.render("listings/index.ejs", { allListings, category, search });
}; 

module.exports.renderNewForm =  (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "owner"
            }
        });
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings"); // return prevents further execution
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  try {
    const payload = req.body.listing || {};
    const newListing = new Listing(payload);
    if (req.user) newListing.owner = req.user._id;

    // If a file was uploaded but Cloudinary is NOT configured, fail loudly
    // If a file was uploaded AND Cloudinary is configured, upload buffer and store Cloudinary info
    if (req.file && cloudinary && req.file.buffer) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        newListing.image.url = result.secure_url || result.url || newListing.image.url;
        newListing.image.filename = result.public_id || newListing.image.filename;
        newListing.image.public_id = result.public_id || newListing.image.public_id;
      } catch (e) {
        console.warn('Cloudinary upload failed:', e.message);
      }
    } else if (req.file && useLocal) {
      // Save uploaded file to local disk under /upload and serve from /uploads
      try {
        const uploadsDir = path.join(__dirname, '..', 'upload');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        newListing.image.url = `/uploads/${filename}`;
        newListing.image.filename = filename;
        newListing.image.public_id = null;
      } catch (e) {
        console.warn('Local upload failed:', e.message);
      }
    }

    // Geocode location (only at creation)
    try {
      const geoRes = await geocoder.geocode(`${newListing.location}, ${newListing.country}`);
      if (geoRes && geoRes.length > 0) {
        newListing.coordinates = {
          lat: geoRes[0].latitude,
          lng: geoRes[0].longitude,
        };
      }
    } catch (e) {
      console.warn("Geocoding failed:", e.message);
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res, next) => {
  try {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      throw new Error("Listing not found");
    }

    // If a new image is uploaded and Cloudinary configured, remove old from Cloudinary and set new
    if (req.file && cloudinary && req.file.buffer) {
      if (listing.image && listing.image.public_id) {
        try {
          await cloudinary.uploader.destroy(listing.image.public_id);
        } catch (e) {
          console.warn("Failed to delete old image from Cloudinary:", e.message);
        }
      }
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        listing.image.url = result.secure_url || result.url || listing.image.url;
        listing.image.filename = result.public_id || listing.image.filename;
        listing.image.public_id = result.public_id || listing.image.public_id;
      } catch (e) {
        console.warn('Cloudinary upload failed on update:', e.message);
      }
    } else if (req.file && useLocal) {
      // Save uploaded file to local disk and remove old local file if exists
      try {
        const uploadsDir = path.join(__dirname, '..', 'upload');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        // delete old local file if present and stored in uploads
        if (listing.image && listing.image.filename && !listing.image.public_id) {
          const oldPath = path.join(uploadsDir, listing.image.filename);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) { console.warn('Failed to delete old local file:', e.message); }
          }
        }
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        listing.image.url = `/uploads/${filename}`;
        listing.image.filename = filename;
        listing.image.public_id = null;
      } catch (e) {
        console.warn('Local upload failed on update:', e.message);
      }
    }

    // Update basic fields
    listing.title = req.body.listing.title;
    listing.description = req.body.listing.description;
    listing.price = req.body.listing.price;
    listing.category = req.body.listing.category || null;
    listing.propertyType = req.body.listing.propertyType || null;
    listing.maxGuests = req.body.listing.maxGuests || null;
    listing.amenities = req.body.listing.amenities || [];
    const oldLocation = listing.location;
    listing.location = req.body.listing.location;
    listing.country = req.body.listing.country;

    // If location changed, re-geocode
    if (req.body.listing.location && req.body.listing.location !== oldLocation) {
      try {
        const geoRes = await geocoder.geocode(`${req.body.listing.location}, ${req.body.listing.country}`);
        if (geoRes && geoRes.length > 0) {
          listing.coordinates = {
            lat: geoRes[0].latitude,
            lng: geoRes[0].longitude,
          };
        }
      } catch (e) {
        console.warn("Geocoding failed on update:", e.message);
      }
    }

    await listing.save();
    req.flash("success", "Listing Updated");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.destroyListing = async (req, res, next) => {
  try {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
      throw new Error("Listing not found");
    }
    // delete image from Cloudinary if present
    if (deletedListing.image && deletedListing.image.public_id && cloudinary) {
      try {
        await cloudinary.uploader.destroy(deletedListing.image.public_id);
      } catch (e) {
        console.warn("Failed to delete image from Cloudinary on listing delete:", e.message);
      }
    }
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};

