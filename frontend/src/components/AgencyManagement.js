import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function AgencyManagement() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const [viewingPackages, setViewingPackages] = useState(null);
  const [agencyPackages, setAgencyPackages] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAgencies();
  }, [token, user, navigate]);

  const fetchAgencies = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/agencies`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAgencies(response.data || []);
    } catch (err) {
      setError('Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencyPackages = async (agencyId, agencyName) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/agencies/${agencyId}/packages`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAgencyPackages(response.data || []);
      setViewingPackages({ id: agencyId, name: agencyName });
    } catch (err) {
      alert('Failed to load packages');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateAgency = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/agencies`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setShowCreateForm(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchAgencies();
      alert('Agency created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create agency');
    }
  };

  const handleUpdateAgency = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/agencies/${editingAgency.agency_id}`,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setEditingAgency(null);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchAgencies();
      alert('Agency updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update agency');
    }
  };

  const handleDeleteAgency = async (agencyId) => {
    if (!window.confirm('Are you sure you want to delete this agency? This will also delete all their packages. This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/admin/agencies/${agencyId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      fetchAgencies();
      alert('Agency deleted successfully!');
    } catch (err) {
      alert('Failed to delete agency');
    }
  };

  const startEdit = (agency) => {
    setEditingAgency(agency);
    setFormData({
      name: agency.name,
      email: agency.email,
      phone: agency.phone || '',
      password: ''
    });
    setShowCreateForm(false);
    setViewingPackages(null);
  };

  const cancelEdit = () => {
    setEditingAgency(null);
    setShowCreateForm(false);
    setFormData({ name: '', email: '', phone: '', password: '' });
  };

  const closePackagesView = () => {
    setViewingPackages(null);
    setAgencyPackages([]);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading agencies...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🏢 Agency Management</h1>
        <button 
          onClick={() => {
            setShowCreateForm(true);
            setEditingAgency(null);
            setViewingPackages(null);
          }} 
          className="create-user-button"
        >
          + Create New Agency
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* View Packages Modal */}
      {viewingPackages && (
        <div className="packages-modal">
          <div className="packages-modal-content">
            <div className="packages-modal-header">
              <h2>📦 Packages by {viewingPackages.name}</h2>
              <button className="close-modal-btn" onClick={closePackagesView}>×</button>
            </div>
            {agencyPackages.length === 0 ? (
              <p className="no-packages">No packages found for this agency.</p>
            ) : (
              <div className="packages-list">
                {agencyPackages.map(pkg => (
                  <div key={pkg.package_id} className="package-item">
                    <div className="package-item-header">
                      <h4>{pkg.title}</h4>
                      <span className={`status-badge ${pkg.is_active ? 'active' : 'inactive'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="package-route">
                      📍 {pkg.initial_destination} → {pkg.location}
                    </p>
                    <div className="package-details">
                      <span>⏱ {pkg.duration_days} days</span>
                      <span>👥 {pkg.num_travelers} travelers</span>
                      <span>💰 ₹{Number(pkg.price).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Agency Form */}
      {(showCreateForm || editingAgency) && (
        <div className="user-form-card">
          <h2>{editingAgency ? 'Edit Agency' : 'Create New Agency'}</h2>
          <form onSubmit={editingAgency ? handleUpdateAgency : handleCreateAgency} className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label>Agency Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Travel Agency Name"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="agency@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>

            {!editingAgency && (
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 8 characters"
                />
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={cancelEdit} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                {editingAgency ? 'Update Agency' : 'Create Agency'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agencies Table */}
      <div className="users-table-card">
        <h2>All Travel Agencies ({agencies.length})</h2>
        <div className="table-responsive">
          <table className="users-table agencies-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Agency Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No agencies found</td>
                </tr>
              ) : (
                agencies.map(agency => (
                  <tr key={agency.agency_id}>
                    <td>{agency.agency_id}</td>
                    <td><strong>{agency.name}</strong></td>
                    <td>{agency.email}</td>
                    <td>{agency.phone || '-'}</td>
                    <td>{new Date(agency.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => fetchAgencyPackages(agency.agency_id, agency.name)} 
                        className="view-btn"
                        title="View packages"
                      >
                        📦
                      </button>
                      <button 
                        onClick={() => startEdit(agency)} 
                        className="edit-btn"
                        title="Edit agency"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteAgency(agency.agency_id)} 
                        className="delete-btn"
                        title="Delete agency"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AgencyManagement;

