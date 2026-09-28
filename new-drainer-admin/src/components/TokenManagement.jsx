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
  { id: 'FTM', name: 'Fantom', symbol: 'FTM' },
  { id: 'CELO', name: 'Celo', symbol: 'CELO' },
  { id: 'GNOSIS', name: 'Gnosis', symbol: 'xDAI' },
  { id: 'LINEA', name: 'Linea', symbol: 'ETH' },
  { id: 'ZKSYNC', name: 'zkSync Era', symbol: 'ETH' },
  { id: 'SEI', name: 'SEI', symbol: 'SEI' },
  { id: 'SOLANA', name: 'Solana', symbol: 'SOL' },
  { id: 'TRON', name: 'Tron', symbol: 'TRX' },
];

const TokenManagement = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [filterNetwork, setFilterNetwork] = useState('');
  
  const [formData, setFormData] = useState({
    network: 'ETH',
    address: '',
    symbol: '',
    name: '',
    decimals: 18,
  });

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const params = filterNetwork ? `?network=${filterNetwork}` : '';
      const response = await api.get(`/tokens${params}`);
      setTokens(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Failed to fetch tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterNetwork]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'network') {
      const defaultDecimals = value === 'SOLANA' ? 9 : value === 'TRON' ? 6 : 18;
      setFormData(prev => ({
        ...prev,
        network: value,
        decimals: defaultDecimals,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'decimals' ? parseInt(value) || 0 : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.network || !formData.address || !formData.symbol || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (editingToken) {
        await api.put(`/tokens/${editingToken._id}`, formData);
        setSuccess('Token updated successfully');
      } else {
        await api.post('/tokens', formData);
        setSuccess('Token added successfully');
      }
      
      setFormData({
        network: 'ETH',
        address: '',
        symbol: '',
        name: '',
        decimals: 18,
      });
      setShowForm(false);
      setEditingToken(null);
      fetchTokens();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save token');
    }
  };

  const handleEdit = (token) => {
    setFormData({
      network: token.network,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
    });
    setEditingToken(token);
    setShowForm(true);
  };

  const handleDelete = async (token) => {
    if (!window.confirm(`Are you sure you want to delete ${token.symbol} on ${token.network}?`)) {
      return;
    }

    try {
      await api.delete(`/tokens/${token._id}`);
      setSuccess('Token deleted successfully');
      fetchTokens();
    } catch (err) {
      setError('Failed to delete token');
    }
  };

  const handleToggleActive = async (token) => {
    try {
      await api.put(`/tokens/${token._id}`, { isActive: !token.isActive });
      setSuccess(`Token ${token.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchTokens();
    } catch (err) {
      setError('Failed to update token status');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingToken(null);
    setFormData({
      network: 'ETH',
      address: '',
      symbol: '',
      name: '',
      decimals: 18,
    });
  };

  const getNetworkName = (networkId) => {
    return NETWORKS.find(n => n.id === networkId)?.name || networkId;
  };

  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const groupedTokens = safeTokens.reduce((acc, token) => {
    if (!acc[token.network]) {
      acc[token.network] = [];
    }
    acc[token.network].push(token);
    return acc;
  }, {});

  return (
    <div className="token-management">
      <div className="page-header">
        <h2>Token Management</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Token
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-card">
          <h3>{editingToken ? 'Edit Token' : 'Add New Token'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Network <span className="required">*</span></label>
              <select
                name="network"
                value={formData.network}
                onChange={handleInputChange}
                required
              >
                {NETWORKS.map(network => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Contract Address <span className="required">*</span></label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={
                  formData.network === 'SOLANA' 
                    ? 'Token mint address (e.g., EPjFWdd5...)'
                    : formData.network === 'TRON'
                      ? 'T... address (e.g., TR7NHqj...)'
                      : '0x... (ERC-20 contract address)'
                }
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Token Symbol <span className="required">*</span></label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., USDT"
                  required
                />
              </div>

              <div className="form-group">
                <label>Token Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Tether USD"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Decimals</label>
              <input
                type="number"
                name="decimals"
                value={formData.decimals}
                onChange={handleInputChange}
                min="0"
                max={formData.network === 'SOLANA' ? 9 : 18}
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                {formData.network === 'SOLANA' 
                  ? 'Solana: Usually 6-9 (USDC: 6, most SPL: 9)'
                  : formData.network === 'TRON'
                    ? 'Tron: Usually 6 or 18 (USDT: 6)'
                    : 'EVM: Usually 18 (USDT/USDC: 6)'}
              </small>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingToken ? 'Update Token' : 'Add Token'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <label>Filter by Network:</label>
        <select value={filterNetwork} onChange={(e) => setFilterNetwork(e.target.value)}>
          <option value="">All Networks</option>
          {NETWORKS.map(network => (
            <option key={network.id} value={network.id}>
              {network.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="empty-state">
          <p>No tokens found. Add your first token to get started.</p>
        </div>
      ) : (
        <div className="tokens-list">
          {filterNetwork ? (
            <div className="token-table">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Decimals</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map(token => (
                    <tr key={token._id}>
                      <td><strong>{token.symbol}</strong></td>
                      <td>{token.name}</td>
                      <td className="address-cell">
                        <code>{token.address.substring(0, 10)}...{token.address.slice(-8)}</code>
                      </td>
                      <td>{token.decimals}</td>
                      <td>
                        <span className={`badge ${token.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {token.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="btn-icon" onClick={() => handleToggleActive(token)} title={token.isActive ? 'Deactivate' : 'Activate'}>
                          {token.isActive ? '🔴' : '🟢'}
                        </button>
                        <button className="btn-icon" onClick={() => handleEdit(token)} title="Edit">
                          ✏️
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => handleDelete(token)} title="Delete">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            Object.entries(groupedTokens).map(([network, networkTokens]) => (
              <div key={network} className="network-group">
                <h4 className="network-title">
                  <span className={`badge badge-${network.toLowerCase()}`}>{getNetworkName(network)}</span>
                  <span className="token-count">{networkTokens.length} token(s)</span>
                </h4>
                <div className="token-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Decimals</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkTokens.map(token => (
                        <tr key={token._id}>
                          <td><strong>{token.symbol}</strong></td>
                          <td>{token.name}</td>
                          <td className="address-cell">
                            <code>{token.address.substring(0, 10)}...{token.address.slice(-8)}</code>
                          </td>
                          <td>{token.decimals}</td>
                          <td>
                            <span className={`badge ${token.isActive ? 'badge-active' : 'badge-inactive'}`}>
                              {token.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <button className="btn-icon" onClick={() => handleToggleActive(token)} title={token.isActive ? 'Deactivate' : 'Activate'}>
                              {token.isActive ? '🔴' : '🟢'}
                            </button>
                            <button className="btn-icon" onClick={() => handleEdit(token)} title="Edit">
                              ✏️
                            </button>
                            <button className="btn-icon btn-danger" onClick={() => handleDelete(token)} title="Delete">
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .token-management {
          padding: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h2 {
          margin: 0;
          color: #f8fafc;
        }

        .form-card {
          background: #1e293b;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          border: 1px solid #334155;
        }

        .form-card h3 {
          margin: 0 0 20px 0;
          color: #f8fafc;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          color: #94a3b8;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f8fafc;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .required {
          color: #ef4444;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          background: #1e293b;
          border-radius: 8px;
        }

        .filter-bar label {
          color: #94a3b8;
          font-size: 14px;
        }

        .filter-bar select {
          padding: 8px 12px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          color: #f8fafc;
          min-width: 200px;
        }

        .network-group {
          margin-bottom: 24px;
        }

        .network-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .token-count {
          color: #64748b;
          font-size: 14px;
          font-weight: normal;
        }

        .token-table {
          background: #1e293b;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #334155;
        }

        .token-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .token-table th,
        .token-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #334155;
        }

        .token-table th {
          background: #0f172a;
          color: #94a3b8;
          font-weight: 500;
          font-size: 13px;
          text-transform: uppercase;
        }

        .token-table td {
          color: #f8fafc;
        }

        .token-table tbody tr:last-child td {
          border-bottom: none;
        }

        .token-table tbody tr:hover {
          background: #334155;
        }

        .address-cell code {
          background: #0f172a;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #94a3b8;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .btn-icon:hover {
          opacity: 1;
        }

        .badge-active {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .badge-inactive {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #10b981;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .badge-eth { background: linear-gradient(135deg, #627eea, #4f6de4); color: white; }
        .badge-bsc { background: linear-gradient(135deg, #f3ba2f, #c99a27); color: black; }
        .badge-base { background: linear-gradient(135deg, #0052ff, #0043cc); color: white; }
        .badge-pol { background: linear-gradient(135deg, #8247e5, #6b38c4); color: white; }
        .badge-arb { background: linear-gradient(135deg, #28a0f0, #2187c8); color: white; }
        .badge-op { background: linear-gradient(135deg, #ff0420, #cc031a); color: white; }
        .badge-avax { background: linear-gradient(135deg, #e84142, #c73435); color: white; }
        .badge-ftm { background: linear-gradient(135deg, #1969ff, #1456cc); color: white; }
        .badge-celo { background: linear-gradient(135deg, #35d07f, #2aaa66); color: white; }
        .badge-gnosis { background: linear-gradient(135deg, #04795b, #035a44); color: white; }
        .badge-linea { background: linear-gradient(135deg, #121212, #2d2d2d); color: white; }
        .badge-zksync { background: linear-gradient(135deg, #8c8dfc, #6f70c9); color: white; }
        .badge-sei { background: linear-gradient(135deg, #9b1c1c, #7f1717); color: white; }
        .badge-solana { background: linear-gradient(135deg, #9945ff, #14f195); color: white; }
        .badge-tron { background: linear-gradient(135deg, #eb0029, #bc0021); color: white; }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .filter-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-bar select {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TokenManagement;
