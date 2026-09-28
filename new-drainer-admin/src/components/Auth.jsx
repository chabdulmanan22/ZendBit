import React, { useState } from 'react';
import api, { setAuthToken } from '../config/api';

function Auth({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, admin } = response.data;
      
      setAuthToken(token);
      onAuth(admin, token);
    } catch (error) {
      if (!error.response) {
        setError('Server unavailable. Please try again in a moment.');
      } else if (error.response.status >= 500) {
        setError('Server error. Please try again in a moment.');
      } else {
        setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Admin Login</h1>
          <p>Enter your credentials to access the admin panel</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="admin@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;
