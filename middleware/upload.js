// npm install cloudinary multer multer-storage-cloudinary
//https://console.cloudinary.com/app/c-39bba9077f5b1c6d383e9c4ffcc1e4/settings/api-keys
//https://console.cloudinary.com/app/c-39bba9077f5b1c6d383e9c4ffcc1e4/settings/api-keys

require("dotenv").config();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//cloudinary storage 
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "plantations",      
    allowed_formats: ["jpg", "jpeg", "png", "webp"], 
    //transformation: [{ width: 400, height: 400, crop: "limit" }],
  },
});

//multer 
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
    if (allowedTypes.test(file.mimetype) && ext) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpg, jpeg, png, webp)"));
    }
  },
});

module.exports = upload;
/*const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Create folder if not exists
const uploadPath = "uploads/plantations";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ✅ Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// ✅ File Filter (Only Images Allowed)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid =
    allowedTypes.test(file.mimetype) &&
    allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, webp)"));
  }
};

// ✅ Multer Upload Instance
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

module.exports = upload;*/
