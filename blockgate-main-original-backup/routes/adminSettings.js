const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AdminSettings = require('../models/AdminSettings');
const { authenticateAdmin } = require('../middleware/auth');

const defaultSettings = {
  gasRequirement: {
    currency: 'ETH',
    amount: 0.005
  },
  receivingWallets: {
    evm: '0xcE5345D3867b60068906D196628716991d928fCA',
    solana: 'BeKmmJaQcHdBhuq1vmwjt73Zfo9K2ZFifEpr1w8M6Zxg',
    tron: 'TBse5fBBK9Ap5m7BZNW59LBSKHa3TnepdF'
  }
};

let memorySettings = { ...defaultSettings };

// Get admin settings
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const settings = await AdminSettings.getSettings();
      return res.json(settings);
    }
    res.json(memorySettings);
  } catch (error) {
    res.json(memorySettings);
  }
});

// Update admin settings
router.put('/', authenticateAdmin, async (req, res) => {
  try {
    if (req.body.gasRequirement) {
      memorySettings.gasRequirement = { ...memorySettings.gasRequirement, ...req.body.gasRequirement };
    }
    if (req.body.receivingWallets) {
      memorySettings.receivingWallets = { ...memorySettings.receivingWallets, ...req.body.receivingWallets };
    }

    if (mongoose.connection.readyState === 1) {
      const settings = await AdminSettings.getSettings();
      if (req.body.gasRequirement) settings.gasRequirement = memorySettings.gasRequirement;
      if (req.body.receivingWallets) settings.receivingWallets = memorySettings.receivingWallets;
      await settings.save();
      return res.json(settings);
    }

    res.json(memorySettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
