import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/admin-login`,
        formData
      );

      const { token, email, role } = response.data;
      login(token, { email, role, username: 'Admin' });
      navigate('/');
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
        if (err.response.data.error.includes('not an admin')) {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setError('Admin login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="admin-badge">
          <span>🛡️</span>
          <h2 className="auth-title">Admin Access</h2>
        </div>
        <p className="auth-subtitle">Enter admin credentials to continue</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@aitripplanner.com"
            />
          </div>

          <div className="form-group">
            <label>Admin Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter admin password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="auth-button admin-button" disabled={loading}>
            {loading ? 'Verifying...' : '🔐 Login as Admin'}
          </button>

          <p className="auth-footer">
            Regular user? <Link to="/login">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;