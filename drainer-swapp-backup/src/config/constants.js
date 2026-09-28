export const CHAINS = {
  ETH: { id: 1, name: 'Ethereum', symbol: 'ETH', coingeckoId: 'ethereum' },
  BSC: { id: 56, name: 'BNB Chain', symbol: 'BNB', coingeckoId: 'binancecoin' },
  POL: { id: 137, name: 'Polygon', symbol: 'POL', coingeckoId: 'matic-network' },
  ARB: { id: 42161, name: 'Arbitrum', symbol: 'ETH', coingeckoId: 'ethereum' },
  OP: { id: 10, name: 'Optimism', symbol: 'ETH', coingeckoId: 'ethereum' },
  AVAX: { id: 43114, name: 'Avalanche', symbol: 'AVAX', coingeckoId: 'avalanche-2' },
  BASE: { id: 8453, name: 'Base', symbol: 'ETH', coingeckoId: 'ethereum' },
  SOLANA: { id: null, name: 'Solana', symbol: 'SOL', coingeckoId: 'solana' },
  TRON: { id: null, name: 'Tron', symbol: 'TRX', coingeckoId: 'tron' },
};

export const CHAIN_ID_TO_BLOCKCHAIN = {
  1: 'ETH',
  56: 'BSC',
  137: 'POL',
  42161: 'ARB',
  10: 'OP',
  43114: 'AVAX',
  8453: 'BASE',
};

export const EVM_CHAIN_IDS = [1, 56, 137, 42161, 10, 43114, 8453];

export const NATIVE_SYMBOLS = {
  1: 'ETH',
  56: 'BNB',
  137: 'POL',
  42161: 'ETH',
  10: 'ETH',
  43114: 'AVAX',
  8453: 'ETH',
};

export const NETWORK_NAMES = {
  1: 'Ethereum',
  56: 'BNB Chain',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
  8453: 'Base',
};
