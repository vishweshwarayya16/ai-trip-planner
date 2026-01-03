import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [agencyFeedbacks, setAgencyFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ average_rating: 0, total_reviews: 0 });

  useEffect(() => {
    const fetchPackage = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/packages`
        );
        const found = response.data.find(
          (p) => p.package_id === parseInt(id, 10)
        );
        if (found) {
          setPkg(found);
          // Fetch agency feedbacks
          try {
            const feedbackResponse = await axios.get(
              `${process.env.REACT_APP_API_URL}/api/feedbacks/agency?agency_id=${found.agency_id}`
            );
            setAgencyFeedbacks(feedbackResponse.data.feedbacks || []);
            setFeedbackStats({
              average_rating: feedbackResponse.data.average_rating || 0,
              total_reviews: feedbackResponse.data.total_reviews || 0
            });
          } catch (feedbackErr) {
            console.log('Could not fetch agency feedbacks:', feedbackErr);
            setAgencyFeedbacks([]);
          }
        } else {
          setError('Package not found');
        }
      } catch (err) {
        setError('Failed to load package details');
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id]);

  const getImageUrl = (filename) =>
    `${process.env.REACT_APP_API_URL}/uploads/packages/${filename}`;

  const handlePrevImage = () => {
    if (pkg?.photos?.length) {
      setActiveImage((prev) =>
        prev === 0 ? pkg.photos.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (pkg?.photos?.length) {
      setActiveImage((prev) =>
        prev === pkg.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (loading) {
    return (
      <div className="package-details-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading package details...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="package-details-container">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>{error || 'Package not found'}</h3>
          <button className="secondary-button" onClick={() => navigate('/packages')}>
            Back to Packages
          </button>
        </div>
      </div>
    );
  }

  const locations = pkg.locations || [];
  const photos = pkg.photos || [];

  return (
    <div className="package-details-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="package-details-card">
        {/* Gallery Section */}
        {photos.length > 0 && (
          <div className="package-gallery">
            <div className="gallery-main">
              <img
                src={getImageUrl(photos[activeImage])}
                alt={`${pkg.title} - ${activeImage + 1}`}
                className="gallery-main-image"
                onClick={() => setLightboxOpen(true)}
              />
              {photos.length > 1 && (
                <>
                  <button className="gallery-nav gallery-prev" onClick={handlePrevImage}>
                    ‹
                  </button>
                  <button className="gallery-nav gallery-next" onClick={handleNextImage}>
                    ›
                  </button>
                </>
              )}
              <div className="gallery-counter">
                {activeImage + 1} / {photos.length}
              </div>
            </div>
            {photos.length > 1 && (
              <div className="gallery-thumbnails">
                {photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={getImageUrl(photo)}
                    alt={`Thumbnail ${idx + 1}`}
                    className={`gallery-thumb ${idx === activeImage ? 'active' : ''}`}
                    onClick={() => setActiveImage(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Package Header */}
        <div className="package-details-header">
          <div className="header-top">
            <h1 className="package-title">{pkg.title}</h1>
            <span className="agency-badge-large">{pkg.agency_name}</span>
          </div>
          <div className="package-meta">
            <span className="meta-item">
              📍 {pkg.initial_destination} → {pkg.location}
            </span>
            <span className="meta-item">⏱ {pkg.duration_days} days</span>
            <span className="meta-item">👥 {pkg.num_travelers} traveler{pkg.num_travelers > 1 ? 's' : ''}</span>
            <span className="meta-item">🚉 {pkg.transport_mode}</span>
          </div>
          <div className="package-price-large">
            ₹{Number(pkg.price).toLocaleString('en-IN')}
            <span className="price-note">per person</span>
          </div>
        </div>

        {/* Itinerary/Locations */}
        {locations.length > 0 && (
          <div className="package-itinerary">
            <h3 className="section-title">🗺️ Itinerary</h3>
            <div className="itinerary-list">
              {locations.map((loc, idx) => (
                <div key={idx} className="itinerary-item">
                  <div className="itinerary-marker">
                    <span className="marker-number">{idx + 1}</span>
                    {idx < locations.length - 1 && <div className="marker-line"></div>}
                  </div>
                  <div className="itinerary-content">
                    <span className="itinerary-location">{loc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="package-description-full">
          <h3 className="section-title">📝 Description</h3>
          <p>{pkg.description}</p>
        </div>

        {/* Package Details Grid */}
        <div className="package-info-grid">
          <div className="info-card">
            <span className="info-icon">🗓️</span>
            <div className="info-content">
              <span className="info-label">Duration</span>
              <span className="info-value">{pkg.duration_days} days</span>
            </div>
          </div>
          <div className="info-card">
            <span className="info-icon">👥</span>
            <div className="info-content">
              <span className="info-label">Group Size</span>
              <span className="info-value">{pkg.num_travelers} traveler{pkg.num_travelers > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="info-card">
            <span className="info-icon">✈️</span>
            <div className="info-content">
              <span className="info-label">Transport</span>
              <span className="info-value">{pkg.transport_mode}</span>
            </div>
          </div>
          <div className="info-card">
            <span className="info-icon">💰</span>
            <div className="info-content">
              <span className="info-label">Price</span>
              <span className="info-value">₹{Number(pkg.price).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Agency Info */}
        <div className="package-footer">
          <div className="agency-info">
            <h4>Offered by</h4>
            <span className="agency-name">{pkg.agency_name}</span>
          </div>
          {user?.role === 'agency' && (
            <p className="agency-notice">This is how travelers will see your package.</p>
          )}
        </div>

        {/* Contact Details Section */}
        <div className="contact-details-section">
          <h3 className="section-title">📞 Contact Details</h3>
          <div className="contact-details-grid">
            <div className="contact-item">
              <span className="contact-icon">🏢</span>
              <div className="contact-content">
                <span className="contact-label">Agency Name</span>
                <span className="contact-value">{pkg.agency_name}</span>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <div className="contact-content">
                <span className="contact-label">Email</span>
                <span className="contact-value">
                  {pkg.agency_email ? (
                    <a href={`mailto:${pkg.agency_email}`} className="contact-link">
                      {pkg.agency_email}
                    </a>
                  ) : 'Not available'}
                </span>
              </div>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📱</span>
              <div className="contact-content">
                <span className="contact-label">Phone</span>
                <span className="contact-value">
                  {pkg.agency_phone ? (
                    <a href={`tel:${pkg.agency_phone}`} className="contact-link">
                      {pkg.agency_phone}
                    </a>
                  ) : 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Agency Feedbacks Section */}
        {agencyFeedbacks.length > 0 && (
          <div className="agency-feedbacks-section">
            <h3 className="feedbacks-section-title">
              💬 Reviews for {pkg.agency_name}
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
              {agencyFeedbacks.map((feedback, index) => (
                <div key={feedback.feedback_id || index} className="feedback-item">
                  <div className="feedback-header">
                    <span className="feedback-user">👤 {feedback.username}</span>
                    <span className="feedback-rating">
                      {'★'.repeat(feedback.rating)}{'☆'.repeat(5 - feedback.rating)}
                    </span>
                  </div>
                  {feedback.feedback_text && feedback.feedback_text !== 'No additional comments' && (
                    <p className="feedback-text">"{feedback.feedback_text}"</p>
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
      </div>

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>
            ×
          </button>
          <button
            className="lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevImage();
            }}
          >
            ‹
          </button>
          <img
            src={getImageUrl(photos[activeImage])}
            alt={`${pkg.title} - ${activeImage + 1}`}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage();
            }}
          >
            ›
          </button>
          <div className="lightbox-counter">
            {activeImage + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default PackageDetails;

