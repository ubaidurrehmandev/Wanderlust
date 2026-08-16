require("dotenv").config();
const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const DB_URL =
  process.env.ATLASDB_URL ||
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";

const CATEGORY_LIST = [
  "Trending", "Rooms", "Iconic Cities", "Mountains", "Castle",
  "Amazing Pools", "Camping", "Farms", "Arctic", "Beach",
  "City", "Countryside", "Luxury", "Adventure", "Cultural", "Skiing", "Historical"
];

const PROPERTY_TYPE_LIST = [
  "Hotel", "Apartment", "House", "Villa", "Resort", "Cottage",
  "Studio", "Hostel", "Cabin", "Farmhouse", "Houseboat", "Chalet"
];

const AMENITY_LIST = [
  "WiFi", "Parking", "Pool", "Kitchen", "AC", "Heating",
  "Laundry", "Garden", "TV", "Gym", "Balcony", "Fireplace"
];

async function seedDB() {
  try {
    await mongoose.connect(DB_URL);
    console.log("Connected to DB for seeding.");

    // Find or create default demo host
    let demoUser = await User.findOne({ username: "wanderhost" });
    if (!demoUser) {
      const newUser = new User({ email: "host@wanderlust.com", username: "wanderhost" });
      demoUser = await User.register(newUser, "wanderlust123");
      console.log("Created demo host user: wanderhost (password: wanderlust123)");
    }

    await Listing.deleteMany({});
    console.log("Cleared existing listings.");

    const enrichedData = initData.data.map((item, idx) => {
      const category = item.category || CATEGORY_LIST[idx % CATEGORY_LIST.length];
      const propertyType = item.propertyType || PROPERTY_TYPE_LIST[idx % PROPERTY_TYPE_LIST.length];
      const amenities = item.amenities && item.amenities.length > 0 
        ? item.amenities 
        : [AMENITY_LIST[idx % AMENITY_LIST.length], "WiFi", "Kitchen"];

      return {
        ...item,
        owner: demoUser._id,
        category,
        propertyType,
        amenities,
        maxGuests: item.maxGuests || (2 + (idx % 6)),
        coordinates: item.coordinates && item.coordinates.lat ? item.coordinates : {
          lat: 31.5204 + (idx * 0.05),
          lng: 74.3587 + (idx * 0.05)
        }
      };
    });

    await Listing.insertMany(enrichedData);
    console.log(`Successfully seeded ${enrichedData.length} listings!`);

    await mongoose.connection.close();
    console.log("Database connection closed.");
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedDB();