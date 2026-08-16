require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing');

const MONGO_URL = process.env.ATLASDB_URL || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/wanderlust';

// Helper function to infer category from listing data
function inferCategory(listing) {
  const text = `${listing.title} ${listing.description} ${listing.location}`.toLowerCase();
  
  if (text.includes('mountain') || text.includes('hill') || text.includes('trek')) return 'Mountains';
  if (text.includes('beach') || text.includes('sea') || text.includes('coast')) return 'Beach';
  if (text.includes('pool') || text.includes('swim')) return 'Amazing Pools';
  if (text.includes('city') || text.includes('urban')) return 'Iconic Cities';
  if (text.includes('castle') || text.includes('fort')) return 'Castle';
  if (text.includes('camp') || text.includes('tent')) return 'Camping';
  if (text.includes('farm') || text.includes('agri')) return 'Farms';
  if (text.includes('arctic') || text.includes('snow') || text.includes('cold')) return 'Arctic';
  if (text.includes('ski')) return 'Skiing';
  if (text.includes('historic') || text.includes('heritage') || text.includes('ancient')) return 'Historical';
  if (text.includes('culture') || text.includes('traditional')) return 'Cultural';
  if (text.includes('luxury') || text.includes('premium') || text.includes('resort')) return 'Luxury';
  if (text.includes('adventure') || text.includes('extreme')) return 'Adventure';
  if (text.includes('country') || text.includes('rural')) return 'Countryside';
  
  // Default based on other heuristics
  if (listing.price > 15000) return 'Luxury';
  if (listing.location && listing.location.includes('Valley')) return 'Mountains';
  if (listing.location && listing.location.includes('City')) return 'Iconic Cities';
  
  return 'Rooms'; // Default fallback
}

// Helper function to infer property type
function inferPropertyType(listing) {
  const text = `${listing.title} ${listing.description}`.toLowerCase();
  
  if (text.includes('villa')) return 'Villa';
  if (text.includes('apartment') || text.includes('apt')) return 'Apartment';
  if (text.includes('house')) return 'House';
  if (text.includes('resort')) return 'Resort';
  if (text.includes('hotel')) return 'Hotel';
  if (text.includes('cottage')) return 'Cottage';
  if (text.includes('hostel')) return 'Hostel';
  if (text.includes('cabin')) return 'Cabin';
  if (text.includes('farm')) return 'Farmhouse';
  if (text.includes('studio') || text.includes('studio')) return 'Studio';
  if (text.includes('boat') || text.includes('houseboat')) return 'Houseboat';
  if (text.includes('chalet')) return 'Chalet';
  
  return 'House'; // Default fallback
}

// Helper function to infer amenities
function inferAmenities(listing) {
  const text = `${listing.title} ${listing.description}`.toLowerCase();
  const amenities = [];
  
  if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet')) amenities.push('WiFi');
  if (text.includes('parking') || text.includes('garage')) amenities.push('Parking');
  if (text.includes('pool') || text.includes('swimming')) amenities.push('Pool');
  if (text.includes('kitchen') || text.includes('kitchenette')) amenities.push('Kitchen');
  if (text.includes('ac') || text.includes('air conditioning')) amenities.push('AC');
  if (text.includes('heating') || text.includes('heater')) amenities.push('Heating');
  if (text.includes('laundry') || text.includes('washing')) amenities.push('Laundry');
  if (text.includes('garden') || text.includes('yard')) amenities.push('Garden');
  if (text.includes('tv') || text.includes('television')) amenities.push('TV');
  if (text.includes('gym') || text.includes('fitness')) amenities.push('Gym');
  if (text.includes('balcony') || text.includes('terrace')) amenities.push('Balcony');
  if (text.includes('fireplace') || text.includes('fire place')) amenities.push('Fireplace');
  
  // Add common amenities by default if description is long (implies well-equipped)
  if (listing.description && listing.description.length > 200) {
    if (!amenities.includes('WiFi')) amenities.push('WiFi');
    if (!amenities.includes('Kitchen')) amenities.push('Kitchen');
  }
  
  return amenities.length > 0 ? amenities : ['WiFi', 'Kitchen'];
}

// Helper function to infer max guests
function inferMaxGuests(listing) {
  const text = `${listing.title} ${listing.description}`.toLowerCase();
  
  if (text.includes('6') || text.includes('large group')) return 8;
  if (text.includes('4') || text.includes('4 person')) return 4;
  if (text.includes('2') || text.includes('couple')) return 2;
  if (text.includes('family')) return 6;
  
  // Default heuristic: price often correlates with size
  if (listing.price > 10000) return 6;
  
  return 4; // Default
}

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');
    
    const listings = await Listing.find({});
    console.log(`Found ${listings.length} listings to update\n`);
    
    let updated = 0;
    
    for (let listing of listings) {
      let changed = false;
      
      // Update category if missing
      if (!listing.category) {
        listing.category = inferCategory(listing);
        changed = true;
        console.log(`[${listing._id}] Category set to: ${listing.category}`);
      }
      
      // Update propertyType if missing
      if (!listing.propertyType) {
        listing.propertyType = inferPropertyType(listing);
        changed = true;
        console.log(`[${listing._id}] Property type set to: ${listing.propertyType}`);
      }
      
      // Update amenities if missing
      if (!listing.amenities || listing.amenities.length === 0) {
        listing.amenities = inferAmenities(listing);
        changed = true;
        console.log(`[${listing._id}] Amenities set to: ${listing.amenities.join(', ')}`);
      }
      
      // Update maxGuests if missing
      if (!listing.maxGuests) {
        listing.maxGuests = inferMaxGuests(listing);
        changed = true;
        console.log(`[${listing._id}] Max guests set to: ${listing.maxGuests}`);
      }
      
      if (changed) {
        await listing.save();
        updated++;
        console.log(`✓ Updated listing ${listing._id}\n`);
      }
    }
    
    console.log(`\n✓ Successfully updated ${updated}/${listings.length} listings`);
    mongoose.connection.close();
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
