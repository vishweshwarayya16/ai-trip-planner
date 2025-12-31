import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function AgencyRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: form, 2: OTP verification
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validatePassword = (password) => {
    const checks = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
      password.length >= 8
    ];
    return checks.every(Boolean);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Name, email, and password are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be 8+ chars and include uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agency/send-registration-otp`,
        {
          email: formData.email,
          name: formData.name
        }
      );
      setStep(2);
      setError('');
    } catch (err) {
      const message = err.response?.data || 'Failed to send OTP. Please try again.';
      setError(typeof message === 'string' ? message : 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agency/verify-registration-otp`,
        {
          email: formData.email,
          otp: otp
        }
      );
      // OTP verified, proceed with registration
      await handleRegister();
    } catch (err) {
      const message = err.response?.data || 'Invalid OTP. Please try again.';
      setError(typeof message === 'string' ? message : 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/agency/register`,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        }
      );

      const { token, agency, role } = response.data;
      login(token, {
        ...agency,
        role,
        username: agency.name
      });
      navigate('/agency/packages');
    } catch (err) {
      const message = err.response?.data || 'Registration failed. Please try again.';
      setError(typeof message === 'string' ? message : 'Registration failed. Please try again.');
      throw err;
    }
  };

  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Verify Your Email</h2>
          <p className="auth-subtitle">Enter the 6-digit code sent to {formData.email}</p>
          
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                required
                placeholder="000000"
                maxLength="6"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
              <small className="form-hint">Check your email for the verification code</small>
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Register'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
              }}
              className="link-button"
            >
              ← Back to form
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Register Your Agency</h2>
        <p className="auth-subtitle">Partner with us to showcase curated trips</p>

        <form onSubmit={handleSendOTP} className="auth-form">
          <div className="form-group">
            <label>Agency Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Wanderlust Travels"
            />
          </div>

          <div className="form-group">
            <label>Business Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="contact@wanderlust.com"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 555 123 4567"
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
              placeholder="Create password"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP & Continue'}
          </button>

          <p className="auth-footer">
            Already registered? <Link to="/agency/login">Login here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AgencyRegister;

