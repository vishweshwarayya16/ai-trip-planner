import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function GenerateTrip() {
  const [formData, setFormData] = useState({
    initial_destination: '',
    final_destination: '',
    start_date: '',
    end_date: '',
    travel_type: 'solo',
    mood: 'culture'
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
    setTripDetails('');

    // Validate dates
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after start date');
      setLoading(false);
      return;
    }

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
    } catch (err) {
      setError(err.response?.data || 'Failed to generate trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTripDetails = (details) => {
    return details.split('\n').map((line, index) => {
      if (line.startsWith('##')) {
        return <h3 key={index} className="trip-heading">{line.replace('##', '')}</h3>;
      } else if (line.startsWith('#')) {
        return <h2 key={index} className="trip-title">{line.replace('#', '')}</h2>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="trip-bold">{line.replace(/\*\*/g, '')}</p>;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={index} className="trip-list-item">{line.substring(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="trip-text">{line}</p>;
      }
    });
  };

  return (
    <div className="generate-trip-container">
      <div className="generate-trip-card">
        <h2 className="page-title">Generate Your Trip</h2>
        <p className="page-subtitle">Fill in the details and let AI create your perfect itinerary</p>

        <form onSubmit={handleSubmit} className="trip-form">
          <div className="form-row">
            <div className="form-group">
              <label>Starting From</label>
              <input
                type="text"
                name="initial_destination"
                value={formData.initial_destination}
                onChange={handleChange}
                required
                placeholder="e.g., New York"
              />
            </div>

            <div className="form-group">
              <label>Going To</label>
              <input
                type="text"
                name="final_destination"
                value={formData.final_destination}
                onChange={handleChange}
                required
                placeholder="e.g., Paris"
              />
            </div>
          </div>

          <div className="form-row">
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Travel Type</label>
              <select
                name="travel_type"
                value={formData.travel_type}
                onChange={handleChange}
                required
              >
                <option value="solo">Solo</option>
                <option value="couple">Couple</option>
                <option value="friends">Friends</option>
                <option value="family">Family</option>
              </select>
            </div>

            <div className="form-group">
              <label>Mood/Interest</label>
              <select
                name="mood"
                value={formData.mood}
                onChange={handleChange}
                required
              >
                <option value="food">Food</option>
                <option value="culture">Culture</option>
                <option value="beach">Beach</option>
                <option value="adventure">Adventure</option>
                <option value="relaxation">Relaxation</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="generate-button" disabled={loading}>
            {loading ? '✨ Generating Your Trip...' : '🌍 Generate Trip'}
          </button>
        </form>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Creating your personalized itinerary...</p>
          </div>
        )}

        {tripDetails && (
          <div className="trip-result">
            <h3 className="result-title">Your Trip Itinerary</h3>
            <div className="trip-details">
              {formatTripDetails(tripDetails)}
            </div>
            <button 
              onClick={() => navigate('/saved-trips')} 
              className="view-saved-button"
            >
              View Saved Trips
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateTrip;