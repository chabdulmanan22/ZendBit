require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('Testing Cloudinary Configuration...\n');

// Check credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Cloud Name:', cloudName || 'NOT SET');
console.log('API Key:', apiKey || 'NOT SET');
console.log('API Secret:', apiSecret ? `${apiSecret.substring(0, 4)}...${apiSecret.substring(apiSecret.length - 4)} (${apiSecret.length} chars)` : 'NOT SET');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('\n❌ ERROR: Missing Cloudinary credentials in .env file');
  console.error('Please add:');
  console.error('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.error('CLOUDINARY_API_KEY=your_api_key');
  console.error('CLOUDINARY_API_SECRET=your_api_secret');
  process.exit(1);
}

if (apiSecret.length < 20) {
  console.warn('\n⚠️  WARNING: API Secret seems too short. Cloudinary API secrets are typically 40+ characters.');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Test connection by getting account info
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('\n❌ Cloudinary connection failed!');
    console.error('Error:', error.message);
    
    if (error.http_code === 401) {
      console.error('\nThis is an authentication error. Please check:');
      console.error('1. Your API Key is correct');
      console.error('2. Your API Secret is correct (should be 40+ characters)');
      console.error('3. No extra spaces or quotes in .env file');
      console.error('\nGet your credentials from: https://console.cloudinary.com/settings/security');
    }
    process.exit(1);
  } else {
    console.log('\n✅ Cloudinary connection successful!');
    console.log('Status:', result.status);
    process.exit(0);
  }
});

