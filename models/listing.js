const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
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
        v === ""
          ? "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60"
          : v,
    },
    public_id: String
  },
  coordinates: {
    lat: Number,
    lng: Number,
  },
  price: Number,
  location: String,
  country: String,
  category: {
    type: String,
    enum: [
      "Trending",
      "Rooms",
      "Iconic Cities",
      "Mountains",
      "Castle",
      "Amazing Pools",
      "Camping",
      "Farms",
      "Arctic",
      "Beach",
      "City",
      "Countryside",
      "Luxury",
      "Adventure",
      "Cultural",
      "Skiing",
      "Historical"
    ]
  },
  propertyType: {
    type: String,
    enum: [
      "Hotel",
      "Apartment",
      "House",
      "Villa",
      "Resort",
      "Cottage",
      "Studio",
      "Hostel",
      "Cabin",
      "Farmhouse",
      "Houseboat",
      "Chalet"
    ]
  },
  maxGuests: {
    type: Number,
    min: 1,
    max: 100
  },
  amenities: [
    {
      type: String,
      enum: [
        "WiFi",
        "Parking",
        "Pool",
        "Kitchen",
        "AC",
        "Heating",
        "Laundry",
        "Garden",
        "TV",
        "Gym",
        "Balcony",
        "Fireplace",
        "Washer",
        "Dryer",
        "Dishwasher",
        "Iron",
        "Hair Dryer"
      ]
    }
  ],
  reviews: [{
    type: Schema.Types.ObjectId,
    ref: "Review",
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  }
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
})

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
