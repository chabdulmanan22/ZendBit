const express = require('express');
const router = express.Router();
const AdminSettings = require('../models/AdminSettings');
const { authenticateAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get admin settings
router.get('/', async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update admin settings
router.put(
  '/',
  authenticateAdmin,
  [
    body('gasRequirement.currency').optional().isIn(['ETH', 'BNB']).withMessage('Currency must be ETH or BNB'),
    body('gasRequirement.amount').optional().isNumeric().withMessage('Gas amount must be a number'),
    body('receivingWallets.evm').optional().isEthereumAddress().withMessage('Invalid EVM wallet address'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const settings = await AdminSettings.getSettings();
      
      if (req.body.gasRequirement) {
        settings.gasRequirement = {
          ...settings.gasRequirement,
          ...req.body.gasRequirement,
        };
      }

      if (req.body.receivingWallets) {
        settings.receivingWallets = {
          ...settings.receivingWallets,
          ...req.body.receivingWallets,
        };
      }

      await settings.save();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

