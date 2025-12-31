import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGenerateTrip = () => {
    if (isAuthenticated) {
      navigate('/generate-trip');
    } else {
      navigate('/login');
    }
  };

  // Admin Home Page
  if (isAuthenticated && user?.role === 'admin') {
    return (
      <div className="home-container">
        <div className="admin-hero-section">
          <div className="admin-welcome">
            <span className="welcome-badge admin-badge-home">🛡️ Administrator Portal</span>
            <h1 className="admin-hero-title">
              Welcome, Admin!
            </h1>
            <p className="admin-hero-subtitle">
              Manage users, agencies, and oversee platform operations
            </p>
          </div>
        </div>

        <div className="admin-role-section">
          <h2 className="section-heading">Your Role as Administrator</h2>
          <div className="role-cards-grid">
            <div className="role-card admin-role">
              <div className="role-icon">👥</div>
              <h3>User Management</h3>
              <p>Create, edit, and manage user accounts. Monitor user activity and ensure platform security.</p>
            </div>
            <div className="role-card admin-role">
              <div className="role-icon">🏢</div>
              <h3>Agency Oversight</h3>
              <p>Approve and manage travel agencies. Review their packages and ensure quality standards.</p>
            </div>
            <div className="role-card admin-role">
              <div className="role-icon">📬</div>
              <h3>Communication Hub</h3>
              <p>Handle contact messages, respond to inquiries, and maintain communication with users and agencies.</p>
            </div>
            <div className="role-card admin-role">
              <div className="role-icon">📊</div>
              <h3>Platform Analytics</h3>
              <p>Monitor feedbacks, track user engagement, and ensure smooth platform operations.</p>
            </div>
          </div>
        </div>

        <div className="admin-actions-section">
          <h2 className="section-heading">Admin Dashboard</h2>
          <div className="quick-actions-grid">
            <div className="action-card admin-action" onClick={() => navigate('/admin/users')}>
              <div className="action-icon">👥</div>
              <h4>User Management</h4>
              <p>View, create, edit, and delete user accounts</p>
            </div>
            <div className="action-card admin-action" onClick={() => navigate('/admin/agencies')}>
              <div className="action-icon">🏢</div>
              <h4>Agency Management</h4>
              <p>Manage travel agencies and their packages</p>
            </div>
            <div className="action-card admin-action" onClick={() => navigate('/admin/messages')}>
              <div className="action-icon">📬</div>
              <h4>Messages</h4>
              <p>View and respond to contact inquiries</p>
            </div>
            <div className="action-card admin-action" onClick={() => navigate('/packages')}>
              <div className="action-icon">📦</div>
              <h4>View Packages</h4>
              <p>Browse all travel packages on the platform</p>
            </div>
          </div>
        </div>

        <div className="admin-responsibilities-section">
          <h2 className="section-heading">🎯 Key Responsibilities</h2>
          <div className="responsibilities-container">
            <div className="responsibility-item">
              <span className="responsibility-icon">✅</span>
              <div className="responsibility-content">
                <h4>Maintain Platform Integrity</h4>
                <p>Ensure all users and agencies comply with platform guidelines and policies.</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="responsibility-icon">🔒</span>
              <div className="responsibility-content">
                <h4>Security Oversight</h4>
                <p>Monitor for suspicious activities and protect user data and privacy.</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="responsibility-icon">💬</span>
              <div className="responsibility-content">
                <h4>User Support</h4>
                <p>Address user concerns promptly and maintain high satisfaction levels.</p>
              </div>
            </div>
            <div className="responsibility-item">
              <span className="responsibility-icon">📈</span>
              <div className="responsibility-content">
                <h4>Quality Assurance</h4>
                <p>Review agency packages and feedbacks to maintain platform quality.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Agency Home Page
  if (isAuthenticated && user?.role === 'agency') {
    return (
      <div className="home-container">
        <div className="agency-hero-section">
          <div className="agency-welcome">
            <span className="welcome-badge">🏢 Travel Agency Portal</span>
            <h1 className="agency-hero-title">
              Welcome back, {user?.name || 'Partner'}!
            </h1>
            <p className="agency-hero-subtitle">
              Create and manage travel packages that inspire travelers worldwide
            </p>
          </div>
          <button 
            onClick={() => navigate('/agency/packages')} 
            className="agency-cta-btn"
          >
            📦 Manage Your Packages
          </button>
        </div>

        <div className="agency-role-section">
          <h2 className="section-heading">Your Role as a Travel Partner</h2>
          <div className="role-cards-grid">
            <div className="role-card">
              <div className="role-icon">🌍</div>
              <h3>Create Travel Experiences</h3>
              <p>Design unique travel packages with custom itineraries, destinations, and experiences that attract travelers from around the world.</p>
            </div>
            <div className="role-card">
              <div className="role-icon">📸</div>
              <h3>Showcase Destinations</h3>
              <p>Upload stunning photos and detailed location lists to give travelers a preview of the amazing journey awaiting them.</p>
            </div>
            <div className="role-card">
              <div className="role-icon">💼</div>
              <h3>Grow Your Business</h3>
              <p>Reach thousands of potential travelers looking for their next adventure. Your packages are visible to all platform users.</p>
            </div>
            <div className="role-card">
              <div className="role-icon">✨</div>
              <h3>Build Your Brand</h3>
              <p>Establish your agency's reputation with quality packages. Your agency name appears on every package you create.</p>
            </div>
          </div>
        </div>

        <div className="agency-actions-section">
          <h2 className="section-heading">Quick Actions</h2>
          <div className="quick-actions-grid">
            <div className="action-card" onClick={() => navigate('/agency/packages')}>
              <div className="action-icon">➕</div>
              <h4>Create New Package</h4>
              <p>Add a new travel package with photos and itinerary</p>
            </div>
            <div className="action-card" onClick={() => navigate('/agency/packages')}>
              <div className="action-icon">📋</div>
              <h4>View My Packages</h4>
              <p>Manage and edit your existing packages</p>
            </div>
            <div className="action-card" onClick={() => navigate('/packages')}>
              <div className="action-icon">👁️</div>
              <h4>Browse All Packages</h4>
              <p>See how your packages appear to travelers</p>
            </div>
            <div className="action-card" onClick={() => navigate('/contact')}>
              <div className="action-icon">💬</div>
              <h4>Contact Support</h4>
              <p>Get help or provide feedback</p>
            </div>
          </div>
        </div>

        <div className="agency-tips-section">
          <h2 className="section-heading">💡 Tips for Success</h2>
          <div className="tips-container">
            <div className="tip-item">
              <span className="tip-number">1</span>
              <div className="tip-content">
                <h4>Add High-Quality Photos</h4>
                <p>Packages with beautiful photos get 3x more views. Upload multiple images to showcase destinations.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">2</span>
              <div className="tip-content">
                <h4>Detail Your Itinerary</h4>
                <p>List all the places travelers will visit. A clear itinerary builds trust and excitement.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">3</span>
              <div className="tip-content">
                <h4>Write Compelling Descriptions</h4>
                <p>Describe the experiences, not just the places. What makes your package special?</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">4</span>
              <div className="tip-content">
                <h4>Keep Packages Updated</h4>
                <p>Regularly update pricing and availability. Mark inactive packages to maintain credibility.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular User / Guest Home Page
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Plan Your Perfect Journey</h1>
        <p className="hero-subtitle">
          Let AI create personalized travel itineraries tailored to your preferences
        </p>
        <button onClick={handleGenerateTrip} className="generate-trip-btn">
          🌍 Generate Trip
        </button>
      </div>

      <div className="features-section">
        <h2 className="features-title">Why Choose AI Trip Planner?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Personalized Itineraries</h3>
            <p>Get custom travel plans based on your preferences, budget, and travel style</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Budget Friendly</h3>
            <p>Receive detailed cost estimates and budget-conscious recommendations</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Local Insights</h3>
            <p>Discover hidden gems, local food, and authentic experiences</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>Time Optimized</h3>
            <p>Efficient day-by-day schedules with realistic travel times</p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to Start Your Adventure?</h2>
        <p>Create your account and start planning your dream vacation today!</p>
        {!isAuthenticated && (
          <button onClick={() => navigate('/register')} className="cta-button">
            Get Started Free
          </button>
        )}
      </div>
    </div>
  );
}

export default Home;
