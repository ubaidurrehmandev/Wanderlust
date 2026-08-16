const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const hasCloudinaryCredentials = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_KEY &&
  process.env.CLOUDINARY_SECRET
);

if (hasCloudinaryCredentials) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
}

const uploadsDirectory = path.join(__dirname, "..", "public", "uploads");

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeBaseName = path
      .basename(file.originalname || "image", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "image";
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  },
});

const parser = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

function uploadSingle(fieldName) {
  return (req, res, next) => {
    parser.single(fieldName)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  };
}

module.exports = {
  cloudinary: hasCloudinaryCredentials ? cloudinary : null,
  parser,
  uploadSingle,
  isCloudinaryConfigured: hasCloudinaryCredentials,
};
