const cloudinaryLib = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

let cloudinary = null;
let parser = null;
let useLocal = false;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
  cloudinary = cloudinaryLib;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
  });

  // Use memory storage for consistent handling; controller will upload to Cloudinary
  const fileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  };
  parser = multer({ storage: multer.memoryStorage(), fileFilter });
} else {
  // No Cloudinary credentials — use multer memory storage to parse multipart fields
  useLocal = true;
  const fileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  };
  parser = multer({ storage: multer.memoryStorage(), fileFilter });
}

module.exports = { cloudinary, parser, useLocal };
