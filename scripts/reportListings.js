require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/wanderlust';

async function main(){
  await mongoose.connect(MONGO_URL);
  const listings = await Listing.find({});
  console.log(`Found ${listings.length} listings`);
  for (let l of listings){
    console.log('---');
    console.log('id:', l._id.toString());
    console.log('title:', l.title);
    console.log('location:', l.location, l.country);
    console.log('image.url:', l.image && l.image.url);
    console.log('image.filename:', l.image && l.image.filename);
    console.log('image.public_id:', l.image && l.image.public_id);
    console.log('coordinates:', l.coordinates);
  }
  mongoose.connection.close();
}

main().catch(err => { console.error(err); process.exit(1); });
