import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { useWallet } from '../contexts/WalletContext';
import Toast from './Toast';

const EVM_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 56, name: 'BNB Chain', symbol: 'BNB', color: '#F3BA2F' },
  { id: 137, name: 'Polygon', symbol: 'POL', color: '#8247E5' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', color: '#28A0F0' },
  { id: 10, name: 'Optimism', symbol: 'ETH', color: '#FF0420' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', color: '#E84142' },
  { id: 8453, name: 'Base', symbol: 'ETH', color: '#0052FF' },
];

const NON_EVM_CHAINS = [
  { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#9945FF', type: 'solana' },
  { id: 'tron', name: 'Tron', symbol: 'TRX', color: '#FF0013', type: 'tron' },
];

function Header({ openConnectModalSignal = 0 }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: balanceData } = useBalance({ address });

  const {
    solanaAddress, solanaConnected, solanaBalance, connectSolana, disconnectSolana,
    tronAddress, tronConnected, tronBalance, connectTron, disconnectTron,
  } = useWallet();

  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const networkRef = useRef(null);
  const connectRef = useRef(null);

  // Open connect modal whenever SwapCard requests a connection (e.g. user clicks Swap without wallet)
  useEffect(() => {
    if (openConnectModalSignal > 0) {
      setShowConnectModal(true);
    }
  }, [openConnectModalSignal]);

  const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect');
  const injectedConnector = connectors.find((c) => c.id === 'injected');
  const coinbaseConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK');

  useEffect(() => {
    if (isConnected || isPending) return;
    const eth = window.ethereum;
    if (!eth) return;

    // Gate on mobile UA: eth.isMetaMask is true on desktop extension too,
    // so without this check it hijacks the connect flow on desktop.
    const isMobileUA = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
    if (!isMobileUA) return;

    const isInAppBrowser =
      eth.isMetaMask || eth.isTrust || eth.isTrustWallet ||
      eth.isCoinbaseWallet || eth.isTokenPocket || eth.isBraveWallet ||
      eth.isRabby || eth.isBitKeep || eth.isOKExWallet;

    if (!isInAppBrowser) return;

    const connector = eth.isCoinbaseWallet
      ? coinbaseConnector
      : injectedConnector;

    if (connector) {
      connect({ connector });
    }
  }, [isConnected, isPending, connect, injectedConnector, coinbaseConnector]);

  // Open connect modal when externally requested (e.g. user clicks Swap without a wallet)
  useEffect(() => {
    if (openConnectModalSignal > 0) {
      setShowConnectModal(true);
    }
  }, [openConnectModalSignal]);

  // Determine active connection
  const isAnyConnected = isConnected || solanaConnected || tronConnected;
  
  const activeChainType = tronConnected
    ? 'tron'
    : solanaConnected
      ? 'solana'
      : isConnected
        ? 'evm'
        : 'evm';

  let displayAddress = '';
  let currentNetwork = '';
  if (tronConnected && tronAddress) {
    displayAddress = tronAddress;
    currentNetwork = 'Tron';
  } else if (solanaConnected && solanaAddress) {
    displayAddress = solanaAddress;
    currentNetwork = 'Solana';
  } else if (isConnected && address) {
    displayAddress = address;
    const chain = EVM_CHAINS.find((c) => c.id === chainId);
    currentNetwork = chain?.name || 'Unknown';
  }

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const getTronErrorMessage = (reason) => {
    switch (reason) {
      case 'rejected':
        return 'Tron connection rejected in wallet popup.';
      case 'pending':
        return 'Tron connection request already pending. Approve it in TronLink.';
      case 'locked_or_not_approved':
        return 'Tron wallet detected but locked/not approved. Unlock and approve this site.';
      case 'api_unavailable':
        return 'Tron wallet API unavailable. Update TronLink and refresh page.';
      case 'not_detected_mobile':
        return 'No Tron wallet injection found. Open this site in TronLink mobile browser.';
      case 'open_in_tronlink_mobile':
        return 'Opening TronLink app. Approve and continue in TronLink DApp browser.';
      case 'not_detected_desktop':
        return 'No TronLink injection found. In extension settings, set Site Access to "On all sites" (or allow this domain), then reload.';
      default:
        return 'Tron wallet connection failed. Check TronLink and try again.';
    }
  };

  const formatBalance = () => {
    if (!balanceData || activeChainType !== 'evm') return null;
    const balance = parseFloat(formatEther(balanceData.value));
    return balance < 0.01 ? balance.toFixed(6) : balance.toFixed(4);
  };

  const getBalanceSymbol = () => {
    const chain = EVM_CHAINS.find((c) => c.id === chainId);
    return chain?.symbol || 'ETH';
  };

  const handleDisconnectAll = async () => {
    if (isConnected) disconnect();
    if (solanaConnected) disconnectSolana();
    if (tronConnected) disconnectTron();
  };

  const handleSwitchToEVM = async (targetChainId) => {
    setShowNetworkModal(false);

    if (isConnected) {
      try {
        await switchChainAsync({ chainId: targetChainId });
      } catch (err) {
        // Chain might need to be added
      }
    } else {
      // Show connect modal for EVM
      setShowConnectModal(true);
    }
  };

  const handleSwitchToSolana = async () => {
    setShowNetworkModal(false);
    if (solanaConnected) {
      await disconnectSolana();
    } else {
      await connectSolana();
    }
  };

  const handleSwitchToTron = async () => {
    setShowNetworkModal(false);
    if (tronConnected) {
      disconnectTron();
      showToastMessage('Tron wallet disconnected');
    } else {
      showToastMessage('Detecting Tron wallet...');
      const result = await connectTron();
      if (result?.success) {
        showToastMessage('Tron wallet connected');
      } else {
        showToastMessage(getTronErrorMessage(result?.reason));
      }
    }
  };

  const handleConnectEVM = (connector) => {
    setShowConnectModal(false);
    connect({ connector });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (networkRef.current && !networkRef.current.contains(event.target)) {
        setShowNetworkModal(false);
      }
      if (connectRef.current && !connectRef.current.contains(event.target)) {
        setShowConnectModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNetworkColor = () => {
    if (tronConnected) return '#FF0013';
    if (solanaConnected) return '#9945FF';
    const chain = EVM_CHAINS.find((c) => c.id === chainId);
    return chain?.color || '#627EEA';
  };

  return (
    <>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      <header>
        <div className="logo">BitNovaSwap</div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isAnyConnected ? (
          <>
            {/* Balance */}
            {activeChainType === 'evm' && balanceData && (
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f0f0f0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
              }}>
                {formatBalance()} {getBalanceSymbol()}
              </div>
            )}
            {activeChainType === 'solana' && solanaBalance !== null && (
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f0f0f0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
              }}>
                {solanaBalance < 0.01 ? solanaBalance.toFixed(6) : solanaBalance.toFixed(4)} SOL
              </div>
            )}
            {activeChainType === 'tron' && tronBalance !== null && (
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#f0f0f0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
              }}>
                {tronBalance < 0.01 ? tronBalance.toFixed(6) : tronBalance.toFixed(4)} TRX
              </div>
            )}

            {/* Network Selector */}
            <div style={{ position: 'relative' }} ref={networkRef}>
              <button
                onClick={() => setShowNetworkModal(!showNetworkModal)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${getNetworkColor()}`,
                  background: `${getNetworkColor()}15`,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500',
                  color: getNetworkColor(),
                }}
              >
                <span>{currentNetwork}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ transform: showNetworkModal ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                  <path d="M6 9L1 4H11L6 9Z" fill="currentColor" />
                </svg>
              </button>

              {showNetworkModal && (
                <div style={{
                  position: 'absolute',
                  top: '45px',
                  right: '0',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  minWidth: '220px',
                  padding: '8px 0',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  <div style={{ padding: '8px 16px', fontSize: '11px', color: '#888', fontWeight: '600' }}>
                    EVM Networks
                  </div>
                  {EVM_CHAINS.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleSwitchToEVM(chain.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: chainId === chain.id && activeChainType === 'evm' ? `${chain.color}15` : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: chainId === chain.id && activeChainType === 'evm' ? chain.color : '#333',
                        fontWeight: chainId === chain.id && activeChainType === 'evm' ? '600' : '400',
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: chain.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 'bold',
                      }}>
                        {chain.symbol.charAt(0)}
                      </div>
                      {chain.name}
                      {chainId === chain.id && activeChainType === 'evm' && (
                        <span style={{ marginLeft: 'auto' }}>✓</span>
                      )}
                    </button>
                  ))}

                  <div style={{ padding: '8px 16px', fontSize: '11px', color: '#888', fontWeight: '600', borderTop: '1px solid #eee', marginTop: '4px' }}>
                    Other Networks
                  </div>
                  {NON_EVM_CHAINS.map((chain) => {
                    const isActive = (chain.type === 'solana' && solanaConnected) || (chain.type === 'tron' && tronConnected);
                    return (
                      <button
                        key={chain.id}
                        onClick={() => chain.type === 'solana' ? handleSwitchToSolana() : handleSwitchToTron()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: isActive ? `${chain.color}15` : 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: isActive ? chain.color : '#333',
                          fontWeight: isActive ? '600' : '400',
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: chain.color, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 'bold',
                        }}>
                          {chain.symbol.charAt(0)}
                        </div>
                        {chain.name}
                        {isActive && <span style={{ marginLeft: 'auto' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Address */}
            <button style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#6366f1',
              color: 'white',
              fontWeight: '500',
            }}>
              {formatAddress(displayAddress)}
            </button>

            {/* Disconnect */}
            <button
              onClick={handleDisconnectAll}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <div style={{ position: 'relative' }} ref={connectRef}>
            <button
              onClick={() => setShowConnectModal(!showConnectModal)}
              disabled={isPending}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#6366f1',
                color: 'white',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {isPending ? 'Connecting...' : 'Connect Wallet'}
            </button>

            {showConnectModal && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '280px',
                padding: '16px',
              }}>
                <div style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '18px', color: '#1a1a2e' }}>
                  Connect Wallet
                </div>

                {/* WalletConnect */}
                {walletConnectConnector && (
                  <button
                    onClick={() => handleConnectEVM(walletConnectConnector)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '14px', marginBottom: '10px',
                      border: '1px solid #e5e5e5', background: 'white',
                      cursor: 'pointer', borderRadius: '10px',
                      fontSize: '15px', fontWeight: '500', color: '#1a1a2e',
                    }}
                  >
                    <img src="https://explorer-api.walletconnect.com/v3/logo/lg/fc7e8f33-7655-47b3-5b71-a59dfa2e0600?projectId=2f05ae7f1116030fde2d36508f472bfb" 
                      alt="WalletConnect" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                    WalletConnect
                  </button>
                )}

                {/* Coinbase */}
                {coinbaseConnector && (
                  <button
                    onClick={() => handleConnectEVM(coinbaseConnector)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '14px', marginBottom: '10px',
                      border: '1px solid #0052ff', background: '#0052ff10',
                      cursor: 'pointer', borderRadius: '10px',
                      fontSize: '15px', fontWeight: '500', color: '#0052ff',
                    }}
                  >
                    <img src="https://www.svgrepo.com/show/331345/coinbase-v2.svg" 
                      alt="Coinbase" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                    Coinbase / Base
                  </button>
                )}

                {/* Browser Wallet */}
                {injectedConnector && window.ethereum && (
                  <button
                    onClick={() => handleConnectEVM(injectedConnector)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '14px', marginBottom: '10px',
                      border: '1px solid #e5e5e5', background: '#f5f5f5',
                      cursor: 'pointer', borderRadius: '10px',
                      fontSize: '15px', fontWeight: '500', color: '#1a1a2e',
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>🌐</span>
                    Browser Wallet
                  </button>
                )}

                <div style={{ padding: '8px 0', fontSize: '11px', color: '#888', fontWeight: '600', borderTop: '1px solid #eee', marginTop: '8px' }}>
                  Other Networks
                </div>

                {/* Solana */}
                <button
                  onClick={async () => {
                    setShowConnectModal(false);
                    if (solanaConnected) {
                      await disconnectSolana();
                    } else {
                      await connectSolana();
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '14px', marginBottom: '10px',
                    border: '1px solid #9945FF', background: '#9945FF10',
                    cursor: 'pointer', borderRadius: '10px',
                    fontSize: '15px', fontWeight: '500', color: '#9945FF',
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: '#9945FF', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold',
                  }}>S</div>
                  Solana
                </button>

                {/* Tron */}
                <button
                  onClick={async () => {
                    setShowConnectModal(false);
                    if (tronConnected) {
                      disconnectTron();
                      showToastMessage('Tron wallet disconnected');
                    } else {
                      showToastMessage('Detecting Tron wallet...');
                      const result = await connectTron();
                      if (result?.success) {
                        showToastMessage('Tron wallet connected');
                      } else {
                        showToastMessage(getTronErrorMessage(result?.reason));
                      }
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '14px',
                    border: '1px solid #FF0013', background: '#FF001310',
                    cursor: 'pointer', borderRadius: '10px',
                    fontSize: '15px', fontWeight: '500', color: '#FF0013',
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: '#FF0013', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold',
                  }}>T</div>
                  Tron
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </header>
    </>
  );
}

export default Header;
