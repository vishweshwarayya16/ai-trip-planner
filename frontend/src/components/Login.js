import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({
    username_or_email: '',
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
        `${process.env.REACT_APP_API_URL}/api/login`,
        formData
      );

      const { token, userid, username, firstname, lastname, email, role } = response.data;
      login(token, { userid, username, firstname, lastname, email, role });
      navigate('/');
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data) {
        setError(typeof err.response.data === 'string' ? err.response.data : 'Login failed. Please try again.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Login to your account</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              name="username_or_email"
              value={formData.username_or_email}
              onChange={handleChange}
              required
              placeholder="Enter username or email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className="link-button"
          >
            Forgot Password?
          </button>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>

          <p className="auth-footer">
            Travel agency partner? <Link to="/agency/login">Access the agency portal</Link>
          </p>

          <div className="admin-login-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin-login')}
            className="admin-login-link"
          >
            🛡️ Login as Admin
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;