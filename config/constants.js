/**
 * Centralized configuration for listing enums
 * This single source of truth prevents inconsistencies across the application
 */

const PROPERTY_TYPES = [
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
];

const CATEGORIES = [
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
];

const AMENITIES = [
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
];

module.exports = {
  PROPERTY_TYPES,
  CATEGORIES,
  AMENITIES
};
