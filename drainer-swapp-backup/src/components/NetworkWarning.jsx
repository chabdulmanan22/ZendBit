import React, { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { EVM_CHAIN_IDS } from '../config/constants';
import { useWallet } from '../contexts/WalletContext';

function NetworkWarning() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);
  
  const { solanaConnected, tronConnected } = useWallet();

  // Don't show warning for Solana/Tron connections
  if (solanaConnected || tronConnected) {
    return null;
  }

  const isSupported = walletChainId && EVM_CHAIN_IDS.includes(walletChainId);

  if (!isConnected || !walletChainId || isSupported) {
    return null;
  }

  const handleSwitchToEthereum = async () => {
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: 1 });
    } catch {
      // handled silently
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="network-warning-banner">
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>
        <div className="warning-text-container">
          <span className="warning-title">Unsupported Network</span>
          <span className="warning-message">Please switch to a supported network.</span>
        </div>
        <button className="switch-network-btn" onClick={handleSwitchToEthereum} disabled={isSwitching}>
          {isSwitching ? 'Switching...' : 'Switch to Ethereum'}
        </button>
      </div>
    </div>
  );
}

export default NetworkWarning;
