const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary } = require('../config/cloudinary');
const { authenticateAdmin } = require('../middleware/auth');

// Upload logo to Cloudinary
router.post('/logo', authenticateAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
    }

    // Upload to Cloudinary using the buffer
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, req.file.mimetype);

    if (!result || !result.secure_url) {
      return res.status(500).json({ error: 'Upload succeeded but no URL was returned from Cloudinary.' });
    }

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    console.error('Error details:', {
      http_code: error.http_code,
      message: error.message,
      name: error.name
    });
    
    if (error.http_code === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return res.status(500).json({ 
        error: 'Cloudinary authentication failed. Please verify your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env file match your Cloudinary dashboard credentials.' 
      });
    }
    
    if (error.message && (error.message.includes('Invalid Signature') || error.message.includes('signature'))) {
      return res.status(500).json({ 
        error: 'Invalid Cloudinary API secret signature. Please verify your CLOUDINARY_API_SECRET in .env file is correct and has no extra spaces or quotes.' 
      });
    }
    
    if (error.http_code === 400) {
      return res.status(400).json({ error: 'Invalid request to Cloudinary: ' + (error.message || 'Bad request') });
    }
    
    res.status(500).json({ error: 'Upload failed: ' + (error.message || 'Unknown error') });
  }
});

module.exports = router;

