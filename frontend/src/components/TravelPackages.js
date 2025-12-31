import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function TravelPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/packages`);
        setPackages(response.data);
      } catch (err) {
        setError('Unable to load travel packages right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    if (!search.trim()) return packages;
    return packages.filter((pkg) =>
      `${pkg.title} ${pkg.location} ${pkg.initial_destination} ${pkg.agency_name}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [packages, search]);

  return (
    <div className="packages-container">
      <div className="packages-header">
        <div>
          <h2 className="page-title">Featured Travel Packages</h2>
          <p className="page-subtitle">
            Curated experiences from verified travel agencies
          </p>
        </div>
        <input
          type="text"
          className="search-input"
          placeholder="Search by destination, agency, or trip name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading packages...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧳</div>
          <h3>No packages found</h3>
          <p>Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="packages-grid">
          {filteredPackages.map((pkg) => (
            <div key={pkg.package_id} className="package-card">
              {/* Photo Preview */}
              {pkg.photos && pkg.photos.length > 0 && (
                <div className="card-image-preview">
                  <img
                    src={`${process.env.REACT_APP_API_URL}/uploads/packages/${pkg.photos[0]}`}
                    alt={pkg.title}
                    className="card-preview-img"
                  />
                  {pkg.photos.length > 1 && (
                    <span className="photo-count">+{pkg.photos.length - 1} photos</span>
                  )}
                </div>
              )}
              <div className="package-card-header">
                <h4>{pkg.title}</h4>
                <span className="agency-badge">{pkg.agency_name}</span>
              </div>
              <p className="package-location">
                📍 {pkg.initial_destination} → {pkg.location}
              </p>
              {/* Itinerary Preview */}
              {pkg.locations && pkg.locations.length > 0 && (
                <div className="itinerary-preview">
                  <span className="itinerary-label">🗺️ Stops:</span>
                  <span className="itinerary-stops">
                    {pkg.locations.slice(0, 3).join(' → ')}
                    {pkg.locations.length > 3 && ` +${pkg.locations.length - 3} more`}
                  </span>
                </div>
              )}
              <p className="package-duration">
                ⏱ {pkg.duration_days} days · 👥 {pkg.num_travelers} traveler{pkg.num_travelers > 1 ? 's' : ''}
              </p>
              <p className="package-duration">🚉 Mode: {pkg.transport_mode}</p>
              <p className="package-price">₹{Number(pkg.price).toLocaleString('en-IN')}</p>
              <p className="package-description">{pkg.description}</p>
              <div className="card-footer">
                <span>Offered by {pkg.agency_name}</span>
                <button
                  className="view-details-btn"
                  onClick={() => navigate(`/packages/${pkg.package_id}`)}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TravelPackages;

