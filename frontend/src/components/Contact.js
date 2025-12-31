import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Contact() {
  const { user, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill name and email for logged-in users/agencies
  useEffect(() => {
    if (isAuthenticated && user) {
      let userName = '';
      let userEmail = '';

      if (user.role === 'agency') {
        // For agencies: use agency name and email
        userName = user.name || user.agency?.name || '';
        userEmail = user.email || user.agency?.email || '';
      } else {
        // For regular users: use firstname + lastname or username
        if (user.firstname && user.lastname) {
          userName = `${user.firstname} ${user.lastname}`;
        } else if (user.username) {
          userName = user.username;
        }
        userEmail = user.email || '';
      }

      setFormData(prev => ({
        ...prev,
        name: userName,
        email: userEmail
      }));
    }
  }, [user, isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent editing name and email if user is logged in
    if (isAuthenticated && (name === 'name' || name === 'email')) {
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/contact`,
        formData
      );
      
      setSubmitted(true);
      // Keep name and email, clear only subject and message
      setFormData(prev => ({ 
        ...prev, 
        subject: '', 
        message: '' 
      }));
      
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-container">
      <div className="content-card">
        <h2 className="page-title">Contact Us</h2>
        <p className="page-subtitle">
          Have questions or feedback? We'd love to hear from you!
        </p>

        {submitted && (
          <div className="success-banner">
            ✓ Thank you for contacting us! We'll get back to you soon.
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="contact-layout">
          <div className="contact-form-section">
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                  readOnly={isAuthenticated}
                  className={isAuthenticated ? 'input-readonly' : ''}
                />
                {isAuthenticated && (
                  <span className="field-locked-hint">🔒 Auto-filled from your account</span>
                )}
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                  readOnly={isAuthenticated}
                  className={isAuthenticated ? 'input-readonly' : ''}
                />
                {isAuthenticated && (
                  <span className="field-locked-hint">🔒 Auto-filled from your account</span>
                )}
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What is this about?"
                />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Tell us more..."
                />
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          <div className="contact-info-section">
            <h3>Get in Touch</h3>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <h4>Email</h4>
                  <p>support@aitripplanner.com</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">💬</span>
                <div>
                  <h4>Live Chat</h4>
                  <p>Available Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">🌐</span>
                <div>
                  <h4>Social Media</h4>
                  <p>Follow us @aitripplanner</p>
                </div>
              </div>
            </div>

            <div className="faq-section">
              <h4>Quick FAQ</h4>
              <div className="faq-item">
                <strong>How does AI Trip Planner work?</strong>
                <p>Simply enter your travel details and our AI creates a personalized itinerary.</p>
              </div>
              <div className="faq-item">
                <strong>Is it free to use?</strong>
                <p>Yes! Creating an account and generating trips is completely free.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
