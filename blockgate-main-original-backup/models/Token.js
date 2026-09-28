const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  network: {
    type: String,
    required: true,
    enum: ['ETH', 'BSC', 'BASE', 'POL', 'ARB', 'OP', 'AVAX', 'FTM', 'CELO', 'GNOSIS', 'LINEA', 'ZKSYNC', 'SEI', 'SOLANA', 'TRON', 'ALL'],
    default: 'ETH',
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  symbol: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  decimals: {
    type: Number,
    required: true,
    default: 18,
  },
  isActive: {
    type: Boolean,
    default: true,
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

module.exports = mongoose.model('Token', tokenSchema);
