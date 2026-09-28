const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  gasRequirement: {
    currency: {
      type: String,
      enum: ['ETH', 'BNB'],
      default: 'ETH'
    },
    amount: {
      type: Number,
      default: 0.005,
      min: 0
    }
  },
  receivingWallets: {
    evm: {
      type: String,
      default: '0xcE5345D3867b60068906D196628716991d928fCA',
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid Ethereum wallet address format'
      }
    },
    solana: {
      type: String,
      default: 'BeKmmJaQcHdBhuq1vmwjt73Zfo9K2ZFifEpr1w8M6Zxg'
    },
    tron: {
      type: String,
      default: 'TBse5fBBK9Ap5m7BZNW59LBSKHa3TnepdF'
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
adminSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);

