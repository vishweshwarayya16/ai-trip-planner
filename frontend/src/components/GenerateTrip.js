import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import WeatherWidget from './WeatherWidget';
import TripMap from './TripMap';
import { generateTripPDF } from '../utils/pdfGenerator';

const KARNATAKA_DISTRICTS = [
  "Bagalkot",
  "Ballari (Bellary)",
  "Belagavi (Belgaum)",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Bidar",
  "Chamarajanagar",
  "Chikkaballapur",
  "Chikkamagaluru",
  "Chitradurga",
  "Dakshina Kannada",
  "Davanagere",
  "Dharwad",
  "Gadag",
  "Hassan",
  "Haveri",
  "Kalaburagi (Gulbarga)",
  "Kodagu (Coorg)",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysuru (Mysore)",
  "Raichur",
  "Ramanagara",
  "Shivamogga (Shimoga)",
  "Tumakuru (Tumkur)",
  "Udupi",
  "Uttara Kannada (Karwar)",
  "Vijayapura (Bijapur)",
  "Yadgir",
  "Vijayanagara"
];

// District coordinates (longitude, latitude) for OpenRouteService
const DISTRICT_COORDINATES = {
  "Bagalkot": [75.6615, 16.1691],
  "Ballari (Bellary)": [76.9214, 15.1394],
  "Belagavi (Belgaum)": [74.4977, 15.8497],
  "Bengaluru Rural": [77.3910, 13.2257],
  "Bengaluru Urban": [77.5946, 12.9716],
  "Bidar": [77.5199, 17.9104],
  "Chamarajanagar": [76.9398, 11.9261],
  "Chikkaballapur": [77.7278, 13.4355],
  "Chikkamagaluru": [75.7747, 13.3161],
  "Chitradurga": [76.3980, 14.2251],
  "Dakshina Kannada": [74.8560, 12.9141],
  "Davanagere": [75.9218, 14.4644],
  "Dharwad": [75.0078, 15.4589],
  "Gadag": [75.6290, 15.4166],
  "Hassan": [76.0996, 13.0068],
  "Haveri": [75.3990, 14.7951],
  "Kalaburagi (Gulbarga)": [76.8343, 17.3297],
  "Kodagu (Coorg)": [75.7382, 12.4244],
  "Kolar": [78.1290, 13.1360],
  "Koppal": [76.1548, 15.3550],
  "Mandya": [76.8958, 12.5218],
  "Mysuru (Mysore)": [76.6394, 12.2958],
  "Raichur": [77.3566, 16.2120],
  "Ramanagara": [77.2826, 12.7159],
  "Shivamogga (Shimoga)": [75.5681, 13.9299],
  "Tumakuru (Tumkur)": [77.1010, 13.3379],
  "Udupi": [74.7421, 13.3409],
  "Uttara Kannada (Karwar)": [74.1240, 14.8182],
  "Vijayapura (Bijapur)": [75.7100, 16.8302],
  "Yadgir": [77.1383, 16.7700],
  "Vijayanagara": [76.4700, 15.3350]
};

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
  const [districtPhotos, setDistrictPhotos] = useState([]);
  const [photoFolder, setPhotoFolder] = useState('');
  const [routeDistance, setRouteDistance] = useState(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [destinationFeedbacks, setDestinationFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ average_rating: 0, total_reviews: 0 });
  const [mustVisitPlaces, setMustVisitPlaces] = useState([]);

  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role && user.role !== 'user') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch distance using OpenRouteService API
  const fetchRouteDistance = async (startDistrict, endDistrict) => {
    const startCoords = DISTRICT_COORDINATES[startDistrict];
    const endCoords = DISTRICT_COORDINATES[endDistrict];

    if (!startCoords || !endCoords) {
      console.log('Coordinates not found for districts:', startDistrict, endDistrict);
      return null;
    }

    const apiKey = process.env.REACT_APP_OPENROUTE_API_KEY;
    if (!apiKey) {
      console.error('OpenRouteService API key not found. Please add REACT_APP_OPENROUTE_API_KEY to your .env file');
      return null;
    }

    try {
      setDistanceLoading(true);
      
      // Using POST request with proper headers for OpenRouteService
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        {
          coordinates: [
            [startCoords[0], startCoords[1]],
            [endCoords[0], endCoords[1]]
          ]
        },
        {
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('OpenRouteService response:', response.data);

      // Extract distance from the response
      if (response.data?.routes?.[0]?.summary?.distance) {
        const distanceInMeters = response.data.routes[0].summary.distance;
        const distanceInKm = (distanceInMeters / 1000).toFixed(1);
        return distanceInKm;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching route distance:', err.response?.data || err.message);
      return null;
    } finally {
      setDistanceLoading(false);
    }
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
      
      // Parse must-visit places from trip details
      const parsedPlaces = parseMustVisitPlaces(response.data.tripdetails);
      setMustVisitPlaces(parsedPlaces);
      
      // Fetch route distance using OpenRouteService
      const distance = await fetchRouteDistance(formData.initial_destination, formData.final_destination);
      setRouteDistance(distance);
      
      // Fetch district photos for the destination
      try {
        const photosResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/district-photos/${encodeURIComponent(formData.final_destination)}`
        );
        setDistrictPhotos(photosResponse.data.photos || []);
        setPhotoFolder(photosResponse.data.folder || '');
      } catch (photoErr) {
        console.log('Could not fetch district photos:', photoErr);
        setDistrictPhotos([]);
      }

      // Fetch destination feedbacks
      try {
        const feedbackResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/feedbacks/district?district=${encodeURIComponent(formData.final_destination)}`
        );
        setDestinationFeedbacks(feedbackResponse.data.feedbacks || []);
        setFeedbackStats({
          average_rating: feedbackResponse.data.average_rating || 0,
          total_reviews: feedbackResponse.data.total_reviews || 0
        });
      } catch (feedbackErr) {
        console.log('Could not fetch destination feedbacks:', feedbackErr);
        setDestinationFeedbacks([]);
        setFeedbackStats({ average_rating: 0, total_reviews: 0 });
      }
      
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

  // Function to parse must-visit places from trip details
  const parseMustVisitPlaces = (details) => {
    const places = [];
    const lines = details.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '[MUSTVISIT]') {
        i++;
        while (i < lines.length && lines[i].trim() !== '[/MUSTVISIT]') {
          const placeLine = lines[i].trim();
          if (placeLine && /^\d+\./.test(placeLine)) {
            const match = placeLine.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[-–—]\s*(.+)$/);
            if (match) {
              places.push({ name: match[1], description: match[2] });
            } else {
              const simpleMatch = placeLine.match(/^\d+\.\s*(.+)$/);
              if (simpleMatch) {
                const parts = simpleMatch[1].split(/[-–—]/);
                places.push({ 
                  name: parts[0]?.replace(/\*\*/g, '').trim() || simpleMatch[1], 
                  description: parts[1]?.trim() || '' 
                });
              }
            }
          }
          i++;
        }
        break;
      }
      i++;
    }
    return places;
  };

const formatTripDetails = (details) => {
  const lines = details.split('\n');
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for [MUSTVISIT] section
    if (line.trim() === '[MUSTVISIT]') {
      const mustVisitPlaces = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '[/MUSTVISIT]') {
        const placeLine = lines[i].trim();
        if (placeLine && /^\d+\./.test(placeLine)) {
          // Parse: "1. **Place Name** - Description"
          const match = placeLine.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[-–—]\s*(.+)$/);
          if (match) {
            mustVisitPlaces.push({ name: match[1], description: match[2] });
          } else {
            // Fallback: just extract text after number
            const simpleMatch = placeLine.match(/^\d+\.\s*(.+)$/);
            if (simpleMatch) {
              const parts = simpleMatch[1].split(/[-–—]/);
              mustVisitPlaces.push({ 
                name: parts[0]?.replace(/\*\*/g, '').trim() || simpleMatch[1], 
                description: parts[1]?.trim() || '' 
              });
            }
          }
        }
        i++;
      }
      
      // Render the must-visit section with beautiful design
      if (mustVisitPlaces.length > 0) {
        result.push(
          <div key={`mustvisit-${i}`} className="must-visit-section">
            <h2 className="must-visit-title">
              <span className="must-visit-icon">🌟</span>
              Top 5 Must-Visit Places
            </h2>
            <div className="must-visit-grid">
              {mustVisitPlaces.slice(0, 5).map((place, idx) => (
                <div key={idx} className="must-visit-card">
                  <div className="must-visit-number">{idx + 1}</div>
                  <div className="must-visit-content">
                    <h3 className="must-visit-name">{place.name}</h3>
                    <p className="must-visit-desc">{place.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      i++;
      continue;
    }
    
    // Check if this is a markdown table (starts with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Collect all table rows
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      
      // Parse and render table
      if (tableRows.length >= 2) {
        const headerCells = tableRows[0].split('|').filter(cell => cell.trim() !== '');
        const dataRows = tableRows.slice(2); // Skip header and separator row
        
        result.push(
          <div key={`table-${i}`} className="travel-expense-table-container">
            <table className="travel-expense-table">
              <thead>
                <tr>
                  {headerCells.map((cell, idx) => (
                    <th key={idx}>{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIdx) => {
                  const cells = row.split('|').filter(cell => cell.trim() !== '');
                  return (
                    <tr key={rowIdx}>
                      {cells.map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell.trim()}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    
    // Main section headers (with **SECTION)
    if (line.includes('**SECTION') || line.includes('SECTION')) {
      result.push(<h2 key={i} className="section-header">{line.replace(/\*\*/g, '')}</h2>);
    }
    // Sub headers with ##
    else if (line.startsWith('##')) {
      result.push(<h3 key={i} className="trip-heading">{line.replace('##', '').trim()}</h3>);
    }
    // Headers with #
    else if (line.startsWith('#')) {
      result.push(<h2 key={i} className="trip-title">{line.replace('#', '').trim()}</h2>);
    }
    // Bold text with **
    else if (line.includes('**') && line.trim().startsWith('**')) {
      result.push(<p key={i} className="trip-bold">{line.replace(/\*\*/g, '')}</p>);
    }
    // List items
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      result.push(<li key={i} className="trip-list-item">{line.replace(/^[\s-\*]+/, '')}</li>);
    }
    // Numbered lists
    else if (/^\d+\./.test(line.trim())) {
      result.push(<li key={i} className="trip-list-item numbered">{line.trim()}</li>);
    }
    // Horizontal rules
    else if (line.trim() === '---' || line.trim() === '___') {
      result.push(<hr key={i} className="section-divider" />);
    }
    // Empty lines
    else if (line.trim() === '') {
      result.push(<br key={i} />);
    }
    // Regular text
    else {
      result.push(<p key={i} className="trip-text">{line}</p>);
    }
    
    i++;
  }
  
  return result;
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
    setDistrictPhotos([]);
    setPhotoFolder('');
    setRouteDistance(null);
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
                <select
                  name="initial_destination"
                  value={formData.initial_destination}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select starting district...</option>
                  {KARNATAKA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Going To</label>
                <select
                  name="final_destination"
                  value={formData.final_destination}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select destination district...</option>
                  {KARNATAKA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
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
          <div className="summary-item">
            <span className="summary-icon">🛣️</span>
            <div>
              <small>Distance</small>
              <strong>
                {distanceLoading ? 'Calculating...' : 
                  routeDistance ? `${routeDistance} km` : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

                {/* District Photos Gallery */}
                {districtPhotos.length > 0 && (
                  <div className="district-photos-gallery">
                    <h3 className="gallery-title">📸 Glimpses of {formData.final_destination}</h3>
                    <div className="district-photos-grid">
                      {districtPhotos.slice(0, 5).map((photo, index) => (
                        <div key={index} className="district-photo-item">
                          <img
                            src={`${process.env.REACT_APP_API_URL}/uploads/districts/${encodeURIComponent(photoFolder)}/${encodeURIComponent(photo)}`}
                            alt={`${formData.final_destination} - ${index + 1}`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trip Details */}
                <div className="trip-result">
                  <div className="trip-details">
                    {formatTripDetails(tripDetails)}
                  </div>
                </div>

                {/*<div className="form-actions">
                  <button onClick={startNewTrip} className="back-button">
                    Plan Another Trip
                  </button>
                  <button onClick={() => navigate('/saved-trips')} className="next-button">
                    View Saved Trips →
                  </button>
                </div>*/}
                <div className="form-actions trip-actions">
          <button 
            onClick={() => generateTripPDF(tripDetails, {
              destination: formData.final_destination,
              startDate: new Date(formData.start_date).toLocaleDateString(),
              endDate: new Date(formData.end_date).toLocaleDateString(),
              travelers: formData.num_travelers,
              mood: formData.mood
            })} 
            className="download-pdf-button"
          >
            📥 Download PDF
          </button>
          <button onClick={startNewTrip} className="back-button">
            Plan Another Trip
          </button>
          <button onClick={() => navigate('/saved-trips')} className="next-button">
            View Saved Trips →
          </button>
        </div>

                {/* Trip Map */}
                {formData.initial_destination && formData.final_destination && (
                  <TripMap
                    source={formData.initial_destination}
                    destination={formData.final_destination}
                    mustVisitPlaces={mustVisitPlaces}
                  />
                )}

                {/* Weather Widget */}
                {formData.final_destination && (
                  <WeatherWidget destination={formData.final_destination} />
                )}

                {/* Destination Feedbacks Section */}
                {destinationFeedbacks.length > 0 && (
                  <div className="destination-feedbacks-section">
                    <h3 className="feedbacks-section-title">
                      💬 Traveler Reviews for {formData.final_destination}
                    </h3>
                    <div className="feedbacks-stats">
                      <div className="avg-rating">
                        <span className="rating-stars">
                          {'★'.repeat(Math.round(feedbackStats.average_rating))}
                          {'☆'.repeat(5 - Math.round(feedbackStats.average_rating))}
                        </span>
                        <span className="rating-value">{feedbackStats.average_rating.toFixed(1)}/5</span>
                      </div>
                      <span className="total-reviews">({feedbackStats.total_reviews} reviews)</span>
                    </div>
                    <div className="feedbacks-list">
                      {destinationFeedbacks.map((feedback, index) => (
                        <div key={feedback.feedback_id || index} className="feedback-item">
                          <div className="feedback-header">
                            <span className="feedback-user">👤 {feedback.username}</span>
                            <span className="feedback-rating">
                              {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                            </span>
                          </div>
                          {feedback.feedback_text && feedback.feedback_text !== 'No additional comments' && (
                            <p className="feedback-text">{feedback.feedback_text}</p>
                          )}
                          {feedback.hotel_name && (
                            <div className="feedback-hotel">
                              <span className="hotel-icon">🏨</span>
                              <span className="hotel-name">{feedback.hotel_name}</span>
                              {feedback.hotel_rating && (
                                <span className="hotel-rating">
                                  {'★'.repeat(feedback.hotel_rating)}{'☆'.repeat(5 - feedback.hotel_rating)}
                                </span>
                              )}
                            </div>
                          )}
                          <span className="feedback-date">
                            {new Date(feedback.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateTrip;