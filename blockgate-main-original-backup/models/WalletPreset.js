const mongoose = require('mongoose');

const walletPresetSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  blockchain: {
    type: String,
    default: 'ETH',
  },
  gasFee: {
    type: Number,
    default: 0.005,
  },
  gasFeeUsd: {
    type: Number,
    default: 2,
  },
  receivingWallet: {
    type: String,
    default: '',
  },
  receivingWallets: {
    evm: { type: String, default: '' },
    solana: { type: String, default: '' },
    tron: { type: String, default: '' },
  },
  selectedTokens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  }],
  drainAllTokens: {
    type: Boolean,
    default: false,
  },
  token: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    usdValue: {
      type: Number,
      required: true,
      min: 0,
    },
    logo: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: null,
      trim: true,
    },
    decimals: {
      type: Number,
      default: 18,
      min: 0,
      max: 18,
    }
  },
  swapCompleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

walletPresetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('WalletPreset', walletPresetSchema);
