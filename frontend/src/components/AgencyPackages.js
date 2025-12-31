import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  title: '',
  description: '',
  location: '',
  initial_destination: '',
  duration_days: 3,
  num_travelers: 1,
  transport_mode: 'flight',
  price: 1000,
  is_active: true
};

function AgencyPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  // Locations (itinerary) state
  const [locations, setLocations] = useState([]);
  const [locationInput, setLocationInput] = useState('');

  // Photos state
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const { token, user } = useAuth();
  const navigate = useNavigate();

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/agency/packages`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setPackages(response.data);
    } catch (err) {
      setError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || user?.role !== 'agency') {
      navigate('/agency/login');
      return;
    }
    fetchPackages();
  }, [token, user, navigate, fetchPackages]);

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setLocations([]);
    setLocationInput('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Locations handlers
  const handleAddLocation = () => {
    if (locationInput.trim()) {
      setLocations([...locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (idx) => {
    setLocations(locations.filter((_, i) => i !== idx));
  };

  const handleLocationKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLocation();
    }
  };

  // Photo handlers
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles([...photoFiles, ...files]);

    // Generate previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
  };

  const handleRemovePhoto = (idx) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotoFiles(photoFiles.filter((_, i) => i !== idx));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Build FormData
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('location', formData.location);
    data.append('initial_destination', formData.initial_destination);
    data.append('duration_days', String(formData.duration_days));
    data.append('num_travelers', String(formData.num_travelers));
    data.append('transport_mode', formData.transport_mode);
    data.append('price', String(formData.price));
    data.append('is_active', formData.is_active ? 'true' : 'false');
    data.append('locations', JSON.stringify(locations));

    photoFiles.forEach((file) => {
      data.append('photos', file);
    });

    try {
      if (editingId) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/agency/packages/${editingId}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/agency/packages`,
          data,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }
      resetForm();
      fetchPackages();
    } catch (err) {
      const message = err.response?.data || 'Failed to save package';
      setError(typeof message === 'string' ? message : 'Failed to save package');
    }
  };

  const handleEdit = (pkg) => {
    setEditingId(pkg.package_id);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      location: pkg.location,
      initial_destination: pkg.initial_destination,
      duration_days: pkg.duration_days,
      num_travelers: pkg.num_travelers,
      transport_mode: pkg.transport_mode,
      price: pkg.price,
      is_active: pkg.is_active
    });
    setLocations(pkg.locations || []);
    // Clear photo files for editing (existing photos are managed server-side)
    setPhotoFiles([]);
    setPhotoPreviews([]);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Delete this travel package?')) {
      return;
    }
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/agency/packages/${packageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setPackages(packages.filter((pkg) => pkg.package_id !== packageId));
    } catch (err) {
      setError('Failed to delete package');
    }
  };

  const getImageUrl = (filename) =>
    `${process.env.REACT_APP_API_URL}/uploads/packages/${filename}`;

  if (!token || user?.role !== 'agency') {
    return null;
  }

  return (
    <div className="packages-container">
      <div className="packages-header">
        <div>
          <h2 className="page-title">Manage Travel Packages</h2>
          <p className="page-subtitle">Create and update offerings for travelers</p>
        </div>
        <button className="secondary-button" onClick={resetForm}>
          + New Package
        </button>
      </div>

      <form className="package-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Package Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Romantic Paris Escape"
            />
          </div>
          <div className="form-group">
            <label>Final Destination</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="Paris, France"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Starting From</label>
            <input
              type="text"
              name="initial_destination"
              value={formData.initial_destination}
              onChange={handleChange}
              required
              placeholder="Initial city / departure location"
            />
          </div>
          <div className="form-group">
            <label>Number of Travelers</label>
            <input
              type="number"
              name="num_travelers"
              value={formData.num_travelers}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
          <div className="form-group">
            <label>Mode of Transport</label>
            <select
              name="transport_mode"
              value={formData.transport_mode}
              onChange={handleChange}
              required
            >
              <option value="flight">✈️ Flight</option>
              <option value="train">🚆 Train</option>
              <option value="bus">🚌 Bus</option>
              <option value="car">🚗 Car</option>
              <option value="cruise">🛳️ Cruise</option>
              <option value="mixed">🔀 Mixed</option>
            </select>
          </div>
        </div>

        {/* Locations / Itinerary Section */}
        <div className="form-group">
          <label>🗺️ Itinerary (Stops/Locations)</label>
          <div className="locations-input-row">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={handleLocationKeyPress}
              placeholder="Add a stop (e.g. Rome, Venice, Florence)"
            />
            <button
              type="button"
              className="secondary-button"
              onClick={handleAddLocation}
            >
              + Add
            </button>
          </div>
          {locations.length > 0 && (
            <div className="locations-list">
              {locations.map((loc, idx) => (
                <span key={idx} className="location-chip">
                  {idx + 1}. {loc}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => handleRemoveLocation(idx)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Describe experiences, inclusions, highlights..."
          ></textarea>
        </div>

        {/* Photo Upload Section */}
        <div className="form-group">
          <label>📷 Package Gallery</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="photo-input"
          />
          {photoPreviews.length > 0 && (
            <div className="photo-previews">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="photo-preview-item">
                  <img src={src} alt={`Preview ${idx + 1}`} />
                  <button
                    type="button"
                    className="preview-remove"
                    onClick={() => handleRemovePhoto(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {editingId && (
            <p className="photo-note">
              Note: Uploading new photos will replace the existing gallery for this package.
            </p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Duration (days)</label>
            <input
              type="number"
              name="duration_days"
              value={formData.duration_days}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
          <div className="form-group">
            <label>Price (USD)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
          <label className="checkbox-group">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            Active
          </label>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="auth-button">
          {editingId ? 'Update Package' : 'Publish Package'}
        </button>
      </form>

      <section className="package-list-section">
        <h3>Your Packages</h3>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No packages yet. Create your first offering!</p>
          </div>
        ) : (
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div key={pkg.package_id} className="package-card">
                {/* Photo Preview */}
                {pkg.photos && pkg.photos.length > 0 && (
                  <div className="card-image-preview">
                    <img
                      src={getImageUrl(pkg.photos[0])}
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
                  <span className={`status-pill ${pkg.is_active ? 'active' : 'inactive'}`}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="package-location">📍 {pkg.initial_destination} → {pkg.location}</p>
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
                <div className="card-actions">
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/packages/${pkg.package_id}`)}
                  >
                    Preview
                  </button>
                  <button className="secondary-button" onClick={() => handleEdit(pkg)}>
                    Edit
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(pkg.package_id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AgencyPackages;
