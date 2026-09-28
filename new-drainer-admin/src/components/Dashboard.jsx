import React, { useState, useEffect } from 'react';
import api from '../config/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalPresets: 0,
    totalAdmins: 0,
    totalTokens: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [presetsRes, adminsRes, tokensRes] = await Promise.all([
        api.get('/wallet-presets'),
        api.get('/auth/admins').catch(() => ({ data: [] })),
        api.get('/tokens').catch(() => ({ data: [] })),
      ]);

      setStats({
        totalPresets: presetsRes.data.length,
        totalAdmins: adminsRes.data.length,
        totalTokens: tokensRes.data.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your admin panel</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalPresets}</div>
          <div className="stat-label">Wallet Presets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalTokens}</div>
          <div className="stat-label">Configured Tokens</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAdmins}</div>
          <div className="stat-label">Admin Accounts</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
