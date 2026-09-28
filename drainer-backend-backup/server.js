require('dotenv').config();

// Verify required environment variables
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set in .env file!');
  console.error('Please add JWT_SECRET=your_secret_key to your .env file');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const walletPresetRoutes = require('./routes/walletPresets');
const adminSettingsRoutes = require('./routes/adminSettings');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files disabled - port 5000 is API only
// app.use('/', express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet-presets', walletPresetRoutes);
app.use('/api/admin-settings', adminSettingsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  
  // Cloudinary errors
  if (err.message && err.message.includes('Cloudinary')) {
    return res.status(500).json({ error: 'Cloudinary error: ' + err.message });
  }
  
  // Generic errors
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

