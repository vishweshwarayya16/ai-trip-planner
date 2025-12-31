import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Karnataka Districts
const KARNATAKA_DISTRICTS = [
  "Bagalkot", "Ballari (Bellary)", "Belagavi (Belgaum)", "Bengaluru Rural", "Bengaluru Urban",
  "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
  "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri",
  "Kalaburagi (Gulbarga)", "Kodagu (Coorg)", "Kolar", "Koppal", "Mandya",
  "Mysuru (Mysore)", "Raichur", "Ramanagara", "Shivamogga (Shimoga)",
  "Tumakuru (Tumkur)", "Udupi", "Uttara Kannada (Karwar)", "Vijayapura (Bijapur)",
  "Yadgir", "Vijayanagara"
];

function Feedback() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('select'); // 'select', 'form', 'history'
  const [feedbackType, setFeedbackType] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    district_name: '',
    agency_id: '',
    feedback_text: '',
    rating: 0,
    hotel_name: '',
    hotel_feedback: '',
    hotel_rating: 0
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Fetch agencies for dropdown
    axios.get('http://localhost:8082/api/agencies')
      .then(res => setAgencies(res.data || []))
      .catch(err => console.error('Failed to fetch agencies:', err));
    
    // Fetch user's feedback history
    fetchUserFeedbacks();
  }, []);

  const fetchUserFeedbacks = () => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:8082/api/feedbacks', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUserFeedbacks(res.data || []))
      .catch(err => console.error('Failed to fetch feedbacks:', err));
  };

  const handleTypeSelect = (type) => {
    setFeedbackType(type);
    setStep('form');
    setFormData({
      district_name: '',
      agency_id: '',
      feedback_text: '',
      rating: 0,
      hotel_name: '',
      hotel_feedback: '',
      hotel_rating: 0
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingClick = (rating, field = 'rating') => {
    setFormData(prev => ({ ...prev, [field]: rating }));
  };

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate word count (0-25 words for both types)
    const wordCount = countWords(formData.feedback_text);
    if (wordCount > 25) {
      setMessage({ type: 'error', text: 'Feedback must be 0-25 words' });
      return;
    }

    // Validate district selection for trip_plan
    if (feedbackType === 'trip_plan' && !formData.district_name) {
      setMessage({ type: 'error', text: 'Please select a district' });
      return;
    }

    // Validate rating
    if (formData.rating === 0) {
      setMessage({ type: 'error', text: 'Please select a rating' });
      return;
    }

    // Validate agency for travel_agency type
    if (feedbackType === 'travel_agency' && !formData.agency_id) {
      setMessage({ type: 'error', text: 'Please select a travel agency' });
      return;
    }

    setSubmitLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        feedback_type: feedbackType,
        feedback_text: formData.feedback_text,
        rating: formData.rating,
        hotel_name: formData.hotel_name || null,
        hotel_feedback: formData.hotel_feedback || null,
        hotel_rating: formData.hotel_rating > 0 ? formData.hotel_rating : null
      };

      if (feedbackType === 'trip_plan') {
        payload.district_name = formData.district_name;
      }

      if (feedbackType === 'travel_agency') {
        payload.agency_id = parseInt(formData.agency_id);
      }

      await axios.post('http://localhost:8082/api/feedback', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: 'Thank you for your feedback!' });
      fetchUserFeedbacks();
      
      // Reset form after success
      setTimeout(() => {
        setStep('select');
        setFeedbackType('');
        setFormData({
          district_name: '',
          agency_id: '',
          feedback_text: '',
          rating: 0,
          hotel_name: '',
          hotel_feedback: '',
          hotel_rating: 0
        });
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error) {
      console.error('Feedback submission error:', error.response?.data || error.message);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || error.message || 'Failed to submit feedback' 
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8082/api/feedback?id=${feedbackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUserFeedbacks();
    } catch (error) {
      alert('Failed to delete feedback');
    }
  };

  const renderStars = (rating, interactive = false, field = 'rating') => {
    return (
      <div className={`star-rating ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={interactive ? () => handleRatingClick(star, field) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const wordCount = countWords(formData.feedback_text);

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h1>📝 Share Your Experience</h1>
        <p>Your feedback helps us improve and assists other travelers</p>
      </div>

      {/* Tab Navigation */}
      <div className="feedback-tabs">
        <button 
          className={`feedback-tab ${step !== 'history' ? 'active' : ''}`}
          onClick={() => setStep('select')}
        >
          ✍️ Give Feedback
        </button>
        <button 
          className={`feedback-tab ${step === 'history' ? 'active' : ''}`}
          onClick={() => setStep('history')}
        >
          📋 My Feedbacks ({userFeedbacks.length})
        </button>
      </div>

      {/* Selection Step */}
      {step === 'select' && (
        <div className="feedback-selection">
          <h2>What would you like to give feedback about?</h2>
          <div className="feedback-type-cards">
            <div 
              className="feedback-type-card trip-plan"
              onClick={() => handleTypeSelect('trip_plan')}
            >
              <div className="type-icon">🗺️</div>
              <h3>Trip Plan</h3>
              <p>Share how our AI trip planner helped you plan your journey</p>
              <ul className="type-features">
                <li>✓ Itinerary quality</li>
                <li>✓ Recommendations accuracy</li>
                <li>✓ Overall experience</li>
              </ul>
            </div>
            
            <div 
              className="feedback-type-card travel-agency"
              onClick={() => handleTypeSelect('travel_agency')}
            >
              <div className="type-icon">🏢</div>
              <h3>Travel Agency</h3>
              <p>Review a travel agency you booked with through our platform</p>
              <ul className="type-features">
                <li>✓ Service quality</li>
                <li>✓ Value for money</li>
                <li>✓ Professional behavior</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Step */}
      {step === 'form' && (
        <div className="feedback-form-container">
          <button className="back-button" onClick={() => setStep('select')}>
            ← Back to selection
          </button>
          
          <div className="feedback-form-header">
            <h2>
              {feedbackType === 'trip_plan' ? '🗺️ Trip Plan Feedback' : '🏢 Travel Agency Feedback'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="feedback-form">
            {/* District Selection (only for trip_plan) */}
            {feedbackType === 'trip_plan' && (
              <div className="form-group">
                <label>Select District *</label>
                <select
                  name="district_name"
                  value={formData.district_name}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Choose a district...</option>
                  {KARNATAKA_DISTRICTS.map(district => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Agency Selection (only for travel_agency) */}
            {feedbackType === 'travel_agency' && (
              <div className="form-group">
                <label>Select Travel Agency *</label>
                <select
                  name="agency_id"
                  value={formData.agency_id}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Choose an agency...</option>
                  {agencies.map(agency => (
                    <option key={agency.agency_id} value={agency.agency_id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main Feedback Text */}
            <div className="form-group">
              <label>
                {feedbackType === 'trip_plan' 
                  ? 'Quick feedback about your trip (optional)' 
                  : 'Quick feedback about the agency (optional)'}
              </label>
              <textarea
                name="feedback_text"
                value={formData.feedback_text}
                onChange={handleInputChange}
                placeholder={feedbackType === 'trip_plan' 
                  ? 'Brief feedback about your trip experience (max 25 words)'
                  : 'Brief feedback about the travel agency (max 25 words)'}
                rows={3}
              />
              <div className={`word-count ${wordCount > 25 ? 'error' : 'valid'}`}>
                {wordCount}/25 words
              </div>
            </div>

            {/* Main Rating */}
            <div className="form-group rating-group">
              <label>Overall Rating *</label>
              <div className="rating-selector">
                {renderStars(formData.rating, true, 'rating')}
                <span className="rating-text">
                  {formData.rating === 0 && 'Click to rate'}
                  {formData.rating === 1 && 'Poor'}
                  {formData.rating === 2 && 'Fair'}
                  {formData.rating === 3 && 'Good'}
                  {formData.rating === 4 && 'Very Good'}
                  {formData.rating === 5 && 'Excellent'}
                </span>
              </div>
            </div>

            {/* Hotel Section */}
            <div className="hotel-feedback-section">
              <h3>🏨 Hotel Feedback (Optional)</h3>
              <p className="section-desc">Share details about your hotel stay</p>

              <div className="form-group">
                <label>Hotel Name</label>
                <input
                  type="text"
                  name="hotel_name"
                  value={formData.hotel_name}
                  onChange={handleInputChange}
                  placeholder="Enter the hotel name where you stayed"
                />
              </div>

              <div className="form-group">
                <label>Hotel Experience</label>
                <textarea
                  name="hotel_feedback"
                  value={formData.hotel_feedback}
                  onChange={handleInputChange}
                  placeholder="How was the hotel facility? Share your experience about rooms, service, amenities, etc."
                  rows={4}
                />
              </div>

              <div className="form-group rating-group">
                <label>Hotel Rating</label>
                <div className="rating-selector">
                  {renderStars(formData.hotel_rating, true, 'hotel_rating')}
                  <span className="rating-text hotel-rating-text">
                    {formData.hotel_rating === 0 && 'Click to rate (optional)'}
                    {formData.hotel_rating === 1 && 'Poor'}
                    {formData.hotel_rating === 2 && 'Fair'}
                    {formData.hotel_rating === 3 && 'Good'}
                    {formData.hotel_rating === 4 && 'Very Good'}
                    {formData.hotel_rating === 5 && 'Excellent'}
                  </span>
                </div>
              </div>
            </div>

            {message.text && (
              <div className={`feedback-message ${message.type}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            <button 
              type="submit" 
              className="submit-feedback-btn"
              disabled={submitLoading}
            >
              {submitLoading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      {/* History Step */}
      {step === 'history' && (
        <div className="feedback-history">
          <h2>Your Feedback History</h2>
          
          {userFeedbacks.length === 0 ? (
            <div className="no-feedbacks">
              <div className="no-feedbacks-icon">📭</div>
              <p>You haven't submitted any feedback yet.</p>
              <button onClick={() => setStep('select')} className="give-feedback-btn">
                Give Your First Feedback
              </button>
            </div>
          ) : (
            <div className="feedback-list">
              {userFeedbacks.map(feedback => (
                <div key={feedback.feedback_id} className="feedback-card">
                  <div className="feedback-card-header">
                    <div className="feedback-type-badge">
                      {feedback.feedback_type === 'trip_plan' ? '🗺️ Trip Plan' : '🏢 Travel Agency'}
                    </div>
                    <div className="feedback-date">
                      {new Date(feedback.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {feedback.feedback_type === 'trip_plan' && feedback.district_name && (
                    <div className="feedback-district">
                      <strong>📍 District:</strong> {feedback.district_name}
                    </div>
                  )}

                  {feedback.feedback_type === 'travel_agency' && feedback.agency_name && (
                    <div className="feedback-agency">
                      <strong>Agency:</strong> {feedback.agency_name}
                    </div>
                  )}

                  <div className="feedback-rating-display">
                    {renderStars(feedback.rating)}
                    <span className="rating-value">{feedback.rating}/5</span>
                  </div>

                  <p className="feedback-text-content">{feedback.feedback_text}</p>

                  {feedback.hotel_name && (
                    <div className="hotel-info">
                      <div className="hotel-info-header">
                        <span className="hotel-icon">🏨</span>
                        <strong>{feedback.hotel_name}</strong>
                        {feedback.hotel_rating > 0 && (
                          <span className="hotel-rating-inline">
                            {renderStars(feedback.hotel_rating)}
                          </span>
                        )}
                      </div>
                      {feedback.hotel_feedback && (
                        <p className="hotel-feedback-text">{feedback.hotel_feedback}</p>
                      )}
                    </div>
                  )}

                  <button 
                    className="delete-feedback-btn"
                    onClick={() => handleDeleteFeedback(feedback.feedback_id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Feedback;

