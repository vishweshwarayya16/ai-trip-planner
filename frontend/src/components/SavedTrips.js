import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function SavedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchSavedTrips();
  }, [isAuthenticated, navigate, token]);

  const fetchSavedTrips = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/saved-trips`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTrips(response.data);
    } catch (err) {
      setError('Failed to load saved trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripid) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/saved-trips/${tripid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTrips(trips.filter(trip => trip.tripid !== tripid));
      if (selectedTrip?.tripid === tripid) {
        setSelectedTrip(null);
      }
    } catch (err) {
      alert('Failed to delete trip');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className="saved-trips-container">
      <div className="saved-trips-header">
        <h2 className="page-title">My Saved Trips</h2>
        <button onClick={() => navigate('/generate-trip')} className="new-trip-button">
          + Generate New Trip
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No saved trips yet</h3>
          <p>Start planning your adventure by generating a new trip!</p>
          <button onClick={() => navigate('/generate-trip')} className="generate-button">
            Generate Your First Trip
          </button>
        </div>
      ) : (
        <div className="trips-layout">
          <div className="trips-list">
            {trips.map((trip) => (
              <div
                key={trip.tripid}
                className={`trip-card ${selectedTrip?.tripid === trip.tripid ? 'active' : ''}`}
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="trip-card-header">
                  <h3>Trip #{trip.tripid}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.tripid);
                    }}
                    className="delete-button"
                  >
                    🗑️
                  </button>
                </div>
                <p className="trip-date">Saved on: {formatDate(trip.saved_at)}</p>
                <p className="trip-preview">
                  {trip.tripdetails.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>

          {selectedTrip && (
            <div className="trip-details-panel">
              <div className="trip-details-header">
                <h3>Trip Details</h3>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="close-button"
                >
                  ✕
                </button>
              </div>
              <div className="trip-details-content">
                {formatTripDetails(selectedTrip.tripdetails)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SavedTrips;