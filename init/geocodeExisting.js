require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing');
const NodeGeocoder = require('node-geocoder');

const geoOptions = { provider: 'openstreetmap' };
const geocoder = NodeGeocoder(geoOptions);

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/wanderlust';

async function main(){
  await mongoose.connect(MONGO_URL);
  const listings = await Listing.find({ $or: [ { 'coordinates.lat': { $exists: false } }, { 'coordinates.lng': { $exists: false } } ] });
  console.log(`Found ${listings.length} listings without coordinates`);
  for (let l of listings){
    try{
      const geoRes = await geocoder.geocode(`${l.location}, ${l.country}`);
      if (geoRes && geoRes.length>0){
        l.coordinates = { lat: geoRes[0].latitude, lng: geoRes[0].longitude };
        await l.save();
        console.log(`Updated ${l._id} -> ${l.coordinates.lat},${l.coordinates.lng}`);
      } else {
        console.log(`No geocode for ${l._id} (${l.location})`);
      }
    }catch(e){
      console.error('Geocode error for', l._id, e.message);
    }
  }
  mongoose.connection.close();
}

main().catch(err => { console.error(err); process.exit(1); });
