import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: '',
    email: '',
    password: ''
  });

  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [token, user, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin/users`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setShowCreateForm(false);
      setFormData({ username: '', firstname: '', lastname: '', email: '', password: '' });
      fetchUsers();
      alert('User created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${editingUser.userid}`,
        {
          username: formData.username,
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setEditingUser(null);
      setFormData({ username: '', firstname: '', lastname: '', email: '', password: '' });
      fetchUsers();
      alert('User updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userid) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${userid}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      fetchUsers();
      alert('User deleted successfully!');
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      password: ''
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    setFormData({ username: '', firstname: '', lastname: '', email: '', password: '' });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>👥 User Management</h1>
        <button 
          onClick={() => {
            setShowCreateForm(true);
            setEditingUser(null);
          }} 
          className="create-user-button"
        >
          + Create New User
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Create/Edit User Form */}
      {(showCreateForm || editingUser) && (
        <div className="user-form-card">
          <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="user-form">
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="johndoe"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  required
                  placeholder="John"
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            {!editingUser && (
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 8 chars with uppercase, lowercase, digit, special char"
                />
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={cancelEdit} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="save-button">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-card">
        <h2>All Users ({users.length})</h2>
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.userid}>
                  <td>{user.userid}</td>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.firstname} {user.lastname}</td>
                  <td>{user.email}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => startEdit(user)} 
                      className="edit-btn"
                      title="Edit user"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.userid)} 
                      className="delete-btn"
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;