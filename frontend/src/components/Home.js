import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGenerateTrip = () => {
    if (isAuthenticated) {
      navigate('/generate-trip');
    } else {
      navigate('/login');
    }
  };

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