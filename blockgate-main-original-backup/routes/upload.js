const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');

// Setup memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper to check if Cloudinary is configured
function hasCloudinaryConfig() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET.length >= 10
  );
}

// Upload logo endpoint
router.post('/logo', authenticateAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
    }

    // Try Cloudinary first if configured
    if (hasCloudinaryConfig()) {
      try {
        const { uploadToCloudinary } = require('../config/cloudinary');
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, req.file.mimetype);
        if (result && result.secure_url) {
          return res.json({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      } catch (cloudErr) {
        console.warn('[CLOUDINARY FAILED, FALLING BACK TO LOCAL DISK STORAGE]', cloudErr.message);
      }
    }

    // Fallback: Save to local /uploads/logos/ directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'logos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    // Return URL accessible via /uploads/logos/<filename>
    const relativeUrl = `/uploads/logos/${filename}`;
    
    return res.json({
      url: relativeUrl,
      filename: filename,
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + (error.message || 'Unknown error') });
  }
});

module.exports = router;
