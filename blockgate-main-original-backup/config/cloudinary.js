const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

// Validate Cloudinary credentials
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('WARNING: Cloudinary credentials are not fully configured in .env file');
  console.warn('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
} else {
  // Check if API secret looks valid (should be 40+ characters)
  if (process.env.CLOUDINARY_API_SECRET.length < 20) {
    console.warn('WARNING: CLOUDINARY_API_SECRET seems too short. Cloudinary API secrets are typically 40+ characters.');
    console.warn('Please verify your API secret in Cloudinary Dashboard > Settings > Security');
  }
}

// Configure Cloudinary
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (error) {
  console.error('Error configuring Cloudinary:', error);
}

// Use memory storage for multer
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    // Convert buffer to base64 data URI with proper MIME type
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimetype || 'image/png'};base64,${base64Data}`;
    
    // Use upload method with data URI
    // Use object format for transformation (more reliable)
    cloudinary.uploader.upload(
      dataUri,
      {
        folder: 'drainer-swap/logos',
        resource_type: 'image',
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        // Apply transformation using object format
        width: 200,
        height: 200,
        crop: 'limit'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error details:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name
          });
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

module.exports = { cloudinary, upload, uploadToCloudinary };

