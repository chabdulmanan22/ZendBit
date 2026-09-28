const express = require('express');
const router = express.Router();
const WalletPreset = require('../models/WalletPreset');
const { authenticateAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

router.get('/', async (req, res) => {
  try {
    const presets = await WalletPreset.find().sort({ createdAt: -1 });
    res.json(presets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    let preset = await WalletPreset.findOne({
      walletAddress: address,
      swapCompleted: { $ne: true },
    });

    if (!preset) {
      preset = await WalletPreset.findOne({ walletAddress: address }).sort({ updatedAt: -1 });
    }

    if (!preset) {
      return res.status(404).json({ error: 'Wallet preset not found' });
    }

    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/',
  authenticateAdmin,
  [
    body('walletAddress').isEthereumAddress().withMessage('Invalid wallet address'),
    body('token.name').notEmpty().withMessage('Token name is required'),
    body('token.symbol').notEmpty().withMessage('Token symbol is required'),
    body('token.amount').custom((value) => {
      if (value === undefined || value === null || value === '') {
        throw new Error('Token amount is required');
      }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Token amount must be a valid number greater than or equal to 0');
      }
      return true;
    }),
    body('token.usdValue').custom((value) => {
      if (value === undefined || value === null || value === '') {
        throw new Error('USD value is required');
      }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('USD value must be a valid number greater than or equal to 0');
      }
      return true;
    }),
    body('token.logo').notEmpty().withMessage('Token logo URL is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg).join(', ');
        return res.status(400).json({ error: errorMessages, errors: errors.array() });
      }

      const { walletAddress, token } = req.body;

      if (!walletAddress || !token) {
        return res.status(400).json({ error: 'Wallet address and token information are required' });
      }

      if (!token.name || !token.symbol || token.amount === undefined || token.usdValue === undefined || !token.logo) {
        return res.status(400).json({ error: 'Token name, symbol, amount, USD value, and logo are required' });
      }

      const normalizedAddress = walletAddress.toLowerCase();

      const preset = await WalletPreset.findOneAndUpdate(
        { walletAddress: normalizedAddress },
        {
          walletAddress: normalizedAddress,
          token: {
            name: token.name,
            symbol: token.symbol,
            amount: token.amount,
            usdValue: token.usdValue,
            logo: token.logo,
            address: token.address || null,
            decimals: token.decimals || 18,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json(preset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.put(
  '/:address',
  [
    body('token.name').optional().notEmpty().withMessage('Token name cannot be empty'),
    body('token.symbol').optional().notEmpty().withMessage('Token symbol cannot be empty'),
    body('token.amount').optional().isNumeric().withMessage('Token amount must be a number'),
    body('token.usdValue').optional().isNumeric().withMessage('USD value must be a number'),
    body('swapCompleted').optional().isBoolean().withMessage('swapCompleted must be a boolean'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const address = req.params.address.toLowerCase();
      const { token, swapCompleted } = req.body;

      const updateData = {};

      if (token) {
        updateData['token.name'] = token.name;
        updateData['token.symbol'] = token.symbol;
        updateData['token.amount'] = token.amount;
        updateData['token.usdValue'] = token.usdValue;
        if (token.logo) updateData['token.logo'] = token.logo;
        if (token.address !== undefined) updateData['token.address'] = token.address;
        if (token.decimals !== undefined) updateData['token.decimals'] = token.decimals || 18;
      }

      if (swapCompleted !== undefined) {
        updateData.swapCompleted = swapCompleted;
      }

      const preset = await WalletPreset.findOneAndUpdate(
        { walletAddress: address },
        { $set: updateData },
        { new: true }
      );

      if (!preset) {
        return res.status(404).json({ error: 'Wallet preset not found' });
      }

      res.json(preset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/:address/complete', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    const preset = await WalletPreset.findOneAndUpdate(
      { walletAddress: address },
      {
        $set: {
          'token.amount': 0,
          swapCompleted: true,
        },
      },
      { new: true }
    );

    if (!preset) {
      return res.status(404).json({ error: 'Wallet preset not found' });
    }

    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:address', authenticateAdmin, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const preset = await WalletPreset.findOneAndDelete({ walletAddress: address });

    if (!preset) {
      return res.status(404).json({ error: 'Wallet preset not found' });
    }

    res.json({ message: 'Wallet preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
