import React from 'react';

function About() {
  return (
    <div className="content-container">
      <div className="content-card">
        <h2 className="page-title">About AI Trip Planner</h2>
        
        <div className="about-section">
          <p className="about-intro">
            AI Trip Planner is your intelligent travel companion, leveraging cutting-edge 
            artificial intelligence to create personalized travel itineraries that match 
            your unique preferences and budget.
          </p>

          <h3>Our Mission</h3>
          <p>
            We believe that everyone deserves to experience the joy of travel without the 
            stress of planning. Our mission is to make travel planning accessible, efficient, 
            and enjoyable for travelers of all types.
          </p>

          <h3>How It Works</h3>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Tell Us Your Preferences</h4>
              <p>Share your destination, dates, travel style, and interests</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>AI Creates Your Itinerary</h4>
              <p>Our AI analyzes thousands of options to craft your perfect trip</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Save & Customize</h4>
              <p>Review, save, and access your itineraries anytime</p>
            </div>
          </div>

          <h3>Why Choose Us?</h3>
          <ul className="features-list">
            <li>✅ Powered by advanced AI technology</li>
            <li>✅ Personalized recommendations based on your preferences</li>
            <li>✅ Detailed budget estimates and cost breakdowns</li>
            <li>✅ Day-by-day itineraries with optimal routing</li>
            <li>✅ Local insights and hidden gems</li>
            <li>✅ Save and manage multiple trips</li>
          </ul>

          <h3>Technology Stack</h3>
          <p>
            Built with modern technologies including React, Golang, PostgreSQL, and 
            powered by Groq AI for intelligent trip generation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;