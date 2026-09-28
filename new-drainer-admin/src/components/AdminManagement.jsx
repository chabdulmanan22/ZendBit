import React, { useState, useEffect } from 'react';
import api from '../config/api';
import AdminForm from './AdminForm';

function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/admins');
      setAdmins(response.data);
    } catch (error) {
      showAlert('Error fetching admins: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingAdmin(null);
    setShowForm(true);
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      await api.delete(`/auth/admins/${id}`);
      setLoading(true);
      const response = await api.get('/auth/admins');
      setAdmins(response.data);
      setLoading(false);
      showAlert('Admin deleted successfully', 'success');
    } catch (error) {
      setLoading(false);
      showAlert('Error deleting admin: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingAdmin) {
        await api.put(`/auth/admins/${editingAdmin._id}`, formData);
      } else {
        await api.post('/auth/register', formData);
      }
      setShowForm(false);
      setEditingAdmin(null);
      setLoading(true);
      const response = await api.get('/auth/admins');
      setAdmins(response.data);
      setLoading(false);
      showAlert(editingAdmin ? 'Admin updated successfully' : 'Admin created successfully', 'success');
    } catch (error) {
      setLoading(false);
      showAlert('Error saving admin: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAdmin(null);
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  if (loading) {
    return <div className="loading">Loading admins...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Admin Management</h2>
        <p>Manage admin accounts and permissions</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {showForm ? (
        <AdminForm
          admin={editingAdmin}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>Admin Accounts</h3>
            <button className="btn btn-primary" onClick={handleAdd}>
              + Add Admin
            </button>
          </div>

          {admins.length === 0 ? (
            <div className="empty-state">
              <h3>No admins found</h3>
              <p>Click "Add Admin" to create your first admin account</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin._id}>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span className={admin.role === 'super_admin' ? 'user-badge' : ''}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${admin.isActive ? 'status-active' : 'status-inactive'}`}>
                          <span className="status-dot"></span>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(admin)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(admin._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminManagement;
