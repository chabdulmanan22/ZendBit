const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Token = require('../models/Token');
const { authenticateAdmin } = require('../middleware/auth');

// Default initial tokens for all supported networks
let memoryTokens = [
  { _id: 'eth_usdt', network: 'ETH', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, isActive: true },
  { _id: 'eth_usdc', network: 'ETH', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6, isActive: true },
  { _id: 'eth_dai', network: 'ETH', address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, isActive: true },
  { _id: 'eth_wbtc', network: 'ETH', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8, isActive: true },
  { _id: 'eth_weth', network: 'ETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, isActive: true },
  { _id: 'bsc_usdt', network: 'BSC', address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, isActive: true },
  { _id: 'bsc_usdc', network: 'BSC', address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, isActive: true },
  { _id: 'bsc_btcb', network: 'BSC', address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', symbol: 'BTCB', name: 'Binance-Peg BTC', decimals: 18, isActive: true },
  { _id: 'sol_usdc', network: 'SOLANA', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6, isActive: true },
  { _id: 'sol_usdt', network: 'SOLANA', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether USD', decimals: 6, isActive: true },
  { _id: 'trx_usdt', network: 'TRON', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', symbol: 'USDT', name: 'Tether USD', decimals: 6, isActive: true },
  { _id: 'pol_usdt', network: 'POL', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', name: 'Tether USD', decimals: 6, isActive: true },
  { _id: 'base_usdc', network: 'BASE', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, isActive: true },
  { _id: 'arb_usdt', network: 'ARB', address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, isActive: true },
];

async function ensureTokensSeeded() {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const count = await Token.countDocuments();
    if (count === 0) {
      const seedData = memoryTokens.map(({ _id, ...rest }) => rest);
      await Token.insertMany(seedData);
      console.log('[TOKENS] Default tokens seeded into MongoDB');
    }
  } catch (err) {
    console.error('[TOKENS SEED ERROR]', err.message);
  }
}

// GET /api/tokens/by-networks - Group tokens by network for Preset creation form
router.get('/by-networks', async (req, res) => {
  try {
    let tokens = memoryTokens;
    if (mongoose.connection.readyState === 1) {
      await ensureTokensSeeded();
      tokens = await Token.find({ isActive: true }).sort({ createdAt: 1 });
    }
    
    const byNetworks = {};
    tokens.forEach(token => {
      const net = token.network;
      if (!byNetworks[net]) {
        byNetworks[net] = [];
      }
      byNetworks[net].push(token);
    });

    res.json(byNetworks);
  } catch (error) {
    console.error('[GET /tokens/by-networks error]', error);
    // Fallback to memory
    const byNetworks = {};
    memoryTokens.forEach(token => {
      const net = token.network;
      if (!byNetworks[net]) byNetworks[net] = [];
      byNetworks[net].push(token);
    });
    res.json(byNetworks);
  }
});

// GET /api/tokens - List all tokens
router.get('/', async (req, res) => {
  try {
    const { network } = req.query;
    if (mongoose.connection.readyState === 1) {
      await ensureTokensSeeded();
      const filter = {};
      if (network && network !== 'ALL') filter.network = network;
      const tokens = await Token.find(filter).sort({ createdAt: -1 });
      return res.json(tokens);
    }
    
    let filtered = memoryTokens;
    if (network && network !== 'ALL') {
      filtered = memoryTokens.filter(t => t.network === network);
    }
    res.json(filtered);
  } catch (error) {
    res.json(memoryTokens);
  }
});

// POST /api/tokens - Add a new token
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { network, address, symbol, name, decimals } = req.body;
    if (!network || !address || !symbol || !name) {
      return res.status(400).json({ error: 'Network, address, symbol, and name are required' });
    }

    const tokenData = {
      network: network.toUpperCase(),
      address: address.trim(),
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      decimals: parseInt(decimals, 10) || 18,
      isActive: true,
    };

    if (mongoose.connection.readyState === 1) {
      const token = await Token.create(tokenData);
      return res.status(201).json(token);
    }

    const memToken = { _id: Date.now().toString(), ...tokenData };
    memoryTokens.unshift(memToken);
    res.status(201).json(memToken);
  } catch (error) {
    console.error('[POST /tokens error]', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tokens/:id - Update token
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { network, address, symbol, name, decimals, isActive } = req.body;
    const updateData = {};
    if (network) updateData.network = network.toUpperCase();
    if (address) updateData.address = address.trim();
    if (symbol) updateData.symbol = symbol.trim().toUpperCase();
    if (name) updateData.name = name.trim();
    if (decimals !== undefined) updateData.decimals = parseInt(decimals, 10);
    if (isActive !== undefined) updateData.isActive = isActive;

    if (mongoose.connection.readyState === 1) {
      const token = await Token.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (token) return res.json(token);
    }

    const idx = memoryTokens.findIndex(t => t._id === req.params.id);
    if (idx !== -1) {
      memoryTokens[idx] = { ...memoryTokens[idx], ...updateData };
      return res.json(memoryTokens[idx]);
    }

    res.status(404).json({ error: 'Token not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tokens/:id - Delete token
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await Token.findByIdAndDelete(req.params.id);
    }
    memoryTokens = memoryTokens.filter(t => t._id !== req.params.id);
    res.json({ success: true, message: 'Token deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
