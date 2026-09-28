import React, { useState, useEffect } from 'react';
import api, { setAuthToken } from './config/api';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import WalletPresets from './components/WalletPresets';
import TokenManagement from './components/TokenManagement';
import AdminManagement from './components/AdminManagement';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAuthToken(token);
      fetchCurrentAdmin();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, []);

  const fetchCurrentAdmin = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentAdmin(response.data.admin);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthToken(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (admin, token) => {
    setCurrentAdmin(admin);
    setIsAuthenticated(true);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setActivePage('dashboard');
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
          Drainer Swap Admin
        </h1>
        <div className="header-actions">
          <div className="user-info">
            <span>{currentAdmin?.name}</span>
            {currentAdmin?.role === 'super_admin' && (
              <span className="user-badge">Super Admin</span>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <div
            className={`sidebar-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </div>
          <div
            className={`sidebar-item ${activePage === 'presets' ? 'active' : ''}`}
            onClick={() => setActivePage('presets')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Wallet Presets
          </div>
          <div
            className={`sidebar-item ${activePage === 'tokens' ? 'active' : ''}`}
            onClick={() => setActivePage('tokens')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12" />
              <path d="M15 9.5c-1-1-2.5-1-3.5 0s-1.5 2.5 0 3.5 2.5 2.5 3.5 3.5c-1 1-2.5 1-3.5 0" />
            </svg>
            Token Management
          </div>
          {currentAdmin?.role === 'super_admin' && (
            <div
              className={`sidebar-item ${activePage === 'admins' ? 'active' : ''}`}
              onClick={() => setActivePage('admins')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Admin Management
            </div>
          )}
        </aside>

        <main className="content">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'presets' && <WalletPresets />}
          {activePage === 'tokens' && <TokenManagement />}
          {activePage === 'admins' && currentAdmin?.role === 'super_admin' && (
            <AdminManagement />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
