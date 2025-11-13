import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import LocationSearch from './LocationSearch';
import WeatherWidget from './WeatherWidget';

function GenerateTrip() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    initial_destination: '',
    final_destination: '',
    start_date: '',
    end_date: '',
    num_travelers: 1,
    mood: 'cultural'
  });
  const [loading, setLoading] = useState(false);
  const [tripDetails, setTripDetails] = useState('');
  const [error, setError] = useState('');

  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLocationChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleChange = (e) => {
    const value = e.target.name === 'num_travelers' ? parseInt(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  const handleNext = (e) => {
    e.preventDefault();
    
    // Validation for each step
    if (step === 1) {
      if (!formData.initial_destination || !formData.final_destination) {
        setError('Please enter both starting point and destination');
        return;
      }
      if (formData.initial_destination === formData.final_destination) {
        setError('Starting point and destination cannot be the same');
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.start_date || !formData.end_date) {
        setError('Please select both start and end dates');
        return;
      }
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        setError('End date must be after start date');
        return;
      }
    }

    setError('');
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (formData.num_travelers < 1) {
      setError('Number of travelers must be at least 1');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/generate-trip`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTripDetails(response.data.tripdetails);
      setStep(4); // Move to results page
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to generate trip. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
const formatTripDetails = (details) => {
  return details.split('\n').map((line, index) => {
    // Main section headers (with **SECTION)
    if (line.includes('**SECTION') || line.includes('SECTION')) {
      return <h2 key={index} className="section-header">{line.replace(/\*\*/g, '')}</h2>;
    }
    // Sub headers with ##
    else if (line.startsWith('##')) {
      return <h3 key={index} className="trip-heading">{line.replace('##', '').trim()}</h3>;
    }
    // Headers with #
    else if (line.startsWith('#')) {
      return <h2 key={index} className="trip-title">{line.replace('#', '').trim()}</h2>;
    }
    // Bold text with **
    else if (line.includes('**') && line.trim().startsWith('**')) {
      return <p key={index} className="trip-bold">{line.replace(/\*\*/g, '')}</p>;
    }
    // List items
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return <li key={index} className="trip-list-item">{line.replace(/^[\s-\*]+/, '')}</li>;
    }
    // Numbered lists
    else if (/^\d+\./.test(line.trim())) {
      return <li key={index} className="trip-list-item numbered">{line.trim()}</li>;
    }
    // Horizontal rules
    else if (line.trim() === '---' || line.trim() === '___') {
      return <hr key={index} className="section-divider" />;
    }
    // Empty lines
    else if (line.trim() === '') {
      return <br key={index} />;
    }
    // Regular text
    else {
      return <p key={index} className="trip-text">{line}</p>;
    }
  });
};

  const startNewTrip = () => {
    setStep(1);
    setFormData({
      initial_destination: '',
      final_destination: '',
      start_date: '',
      end_date: '',
      num_travelers: 1,
      mood: 'cultural'
    });
    setTripDetails('');
    setError('');
    window.scrollTo(0, 0);
  };

  return (
    <div className="generate-trip-container">
      <div className="generate-trip-card">
        {/* Progress Bar */}
        {step < 4 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
            <div className="progress-steps">
              <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                <div className="step-circle">1</div>
                <div className="step-label">Destinations</div>
              </div>
              <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                <div className="step-circle">2</div>
                <div className="step-label">Dates</div>
              </div>
              <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                <div className="step-circle">3</div>
                <div className="step-label">Details</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Destinations */}
        {step === 1 && (
          <div className="step-content">
            <h2 className="page-title">Where are you traveling?</h2>
            <p className="page-subtitle">Choose your starting point and destination</p>

            <form onSubmit={handleNext} className="trip-form">
              <div className="form-group">
                <label>Starting From</label>
                <LocationSearch
                  name="initial_destination"
                  value={formData.initial_destination}
                  onChange={(value) => handleLocationChange('initial_destination', value)}
                  placeholder="Search for your starting city..."
                />
              </div>

              <div className="form-group">
                <label>Going To</label>
                <LocationSearch
                  name="final_destination"
                  value={formData.final_destination}
                  onChange={(value) => handleLocationChange('final_destination', value)}
                  placeholder="Search for your destination..."
                />
              </div>

              {error && <p className="error-message">{error}</p>}

              <div className="form-actions">
                <button type="button" onClick={() => navigate('/')} className="back-button">
                  Cancel
                </button>
                <button type="submit" className="next-button">
                  Next →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Dates */}
        {step === 2 && (
          <div className="step-content">
            <h2 className="page-title">When are you traveling?</h2>
            <p className="page-subtitle">Select your travel dates</p>

            <div className="trip-summary">
              <p><strong>Route:</strong> {formData.initial_destination} → {formData.final_destination}</p>
            </div>

            <form onSubmit={handleNext} className="trip-form">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                />
              </div>

              {formData.start_date && formData.end_date && (
                <div className="date-duration">
                  <p>
                    📅 Duration: {Math.ceil((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}

              {error && <p className="error-message">{error}</p>}

              <div className="form-actions">
                <button type="button" onClick={handleBack} className="back-button">
                  ← Back
                </button>
                <button type="submit" className="next-button">
                  Next →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Travelers & Preferences */}
        {step === 3 && (
          <div className="step-content">
            <h2 className="page-title">Travel Details</h2>
            <p className="page-subtitle">Tell us about your group and preferences</p>

            <div className="trip-summary">
              <p><strong>Route:</strong> {formData.initial_destination} → {formData.final_destination}</p>
              <p><strong>Dates:</strong> {formData.start_date} to {formData.end_date}</p>
            </div>

            <form onSubmit={handleGenerate} className="trip-form">
              <div className="form-group">
                <label>Number of Travelers</label>
                <input
                  type="number"
                  name="num_travelers"
                  value={formData.num_travelers}
                  onChange={handleChange}
                  required
                  min="1"
                  max="50"
                  placeholder="How many people?"
                />
                <small className="form-hint">
                  {formData.num_travelers === 1 && "✈️ Solo traveler"}
                  {formData.num_travelers === 2 && "👥 Perfect for couples or friends"}
                  {formData.num_travelers > 2 && formData.num_travelers <= 5 && "👨‍👩‍👧‍👦 Small group trip"}
                  {formData.num_travelers > 5 && formData.num_travelers <= 10 && "👥👥 Medium group adventure"}
                  {formData.num_travelers > 10 && "🚌 Large group expedition"}
                </small>
              </div>

              <div className="form-group">
                <label>Travel Interest/Mood</label>
                <select
                  name="mood"
                  value={formData.mood}
                  onChange={handleChange}
                  required
                >
                  <option value="cultural">🏛️ Cultural Exploration</option>
                  <option value="natural_beauty">🏞️ Natural Beauty & Scenery</option>
                  <option value="historical">🏰 Historical Significance</option>
                  <option value="adventure">🏔️ Adventure & Activities</option>
                  <option value="relaxation">🧘 Relaxation & Escape</option>
                </select>
              </div>

              {error && <p className="error-message">{error}</p>}

              <div className="form-actions">
                <button type="button" onClick={handleBack} className="back-button">
                  ← Back
                </button>
                <button type="submit" className="generate-final-button" disabled={loading}>
                  {loading ? '✨ Generating...' : '🌍 Generate Trip'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="step-content results-page">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Creating your personalized itinerary for {formData.num_travelers} traveler{formData.num_travelers > 1 ? 's' : ''}...</p>
              </div>
            ) : (
              <>
                <h2 className="page-title">Your Trip Itinerary</h2>
                <div className="trip-summary-header">
                  <div className="summary-item">
                    <span className="summary-icon">📍</span>
                    <div>
                      <small>Route</small>
                      <strong>{formData.initial_destination} → {formData.final_destination}</strong>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">📅</span>
                    <div>
                      <small>Dates</small>
                      <strong>{new Date(formData.start_date).toLocaleDateString()} - {new Date(formData.end_date).toLocaleDateString()}</strong>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">👥</span>
                    <div>
                      <small>Travelers</small>
                      <strong>{formData.num_travelers} {formData.num_travelers === 1 ? 'Person' : 'People'}</strong>
                    </div>
                  </div>
                </div>

                {/* Weather Widget */}
                {formData.final_destination && (
                  <WeatherWidget destination={formData.final_destination} />
                )}

                {/* Trip Details */}
                <div className="trip-result">
                  <div className="trip-details">
                    {formatTripDetails(tripDetails)}
                  </div>
                </div>

                <div className="form-actions">
                  <button onClick={startNewTrip} className="back-button">
                    Plan Another Trip
                  </button>
                  <button onClick={() => navigate('/saved-trips')} className="next-button">
                    View Saved Trips →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateTrip;