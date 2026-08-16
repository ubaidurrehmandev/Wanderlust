const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const { PROPERTY_TYPES, CATEGORIES, AMENITIES } = require("../config/constants.js");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    filename: {
      type: String,
      default: "listingimage",
    },
    url: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60",
      set: (v) =>
        !v || v === ""
          ? "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60"
          : v,
    },
    public_id: {
      type: String,
      default: null,
    },
  },
  coordinates: {
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  location: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: CATEGORIES,
    set: (v) => (v === "" ? undefined : v),
  },
  propertyType: {
    type: String,
    enum: PROPERTY_TYPES,
    set: (v) => (v === "" ? undefined : v),
  },
  maxGuests: {
    type: Number,
    min: 1,
    max: 100,
    default: 1,
  },
  amenities: [
    {
      type: String,
      enum: AMENITIES,
    },
  ],
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing && listing.reviews && listing.reviews.length > 0) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
