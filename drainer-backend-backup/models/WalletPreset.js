const mongoose = require('mongoose');

const walletPresetSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum wallet address format'
    }
  },
  token: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    symbol: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    usdValue: {
      type: Number,
      required: true,
      min: 0
    },
    logo: {
      type: String,
      required: true
    },
    address: {
      type: String,
      default: null,
      trim: true
    },
    decimals: {
      type: Number,
      default: 18,
      min: 0,
      max: 18
    }
  },
  swapCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

walletPresetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WalletPreset', walletPresetSchema);

