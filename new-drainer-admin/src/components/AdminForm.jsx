import React, { useState, useEffect } from 'react';

function AdminForm({ admin, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isActive: true,
  });

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        password: '',
        role: admin.role || 'admin',
        isActive: admin.isActive !== undefined ? admin.isActive : true,
      });
    }
  }, [admin]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!e.target.checkValidity()) {
      e.target.reportValidity();
      return;
    }
    
    const data = { ...formData };
    if (admin && !data.password) {
      delete data.password;
    }
    
    onSubmit(data);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>{admin ? 'Edit Admin' : 'Add New Admin'}</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Name <span className="required">*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Admin Name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email <span className="required">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="admin@example.com"
              required
              disabled={!!admin}
            />
            {admin && (
              <div className="form-help">Email cannot be changed after creation</div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              {admin ? 'New Password (leave empty to keep current)' : 'Password'} 
              {!admin && <span className="required">*</span>}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimum 6 characters"
              required={!admin}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Role <span className="required">*</span></label>
            <select name="role" value={formData.role} onChange={handleInputChange} required>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <div className="form-help">Super Admin can manage other admins</div>
          </div>
        </div>

        <div className="form-group">
          <label style={{ marginBottom: '0.5rem', display: 'block' }}>Account Status</label>
          <div className="toggle-switch-wrapper">
            <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span style={{ color: formData.isActive ? 'var(--success)' : 'var(--text-muted)', fontWeight: '500' }}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary">
            {admin ? 'Update Admin' : 'Create Admin'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminForm;
