import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function LocationSearch({ value, onChange, placeholder, name }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    // Close suggestions when clicking outside
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length >= 3) {
        searchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const searchLocations = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 3) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TripPlannerApp/1.0'
          }
        }
      );

      const locations = response.data.map(item => ({
        name: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village || '',
        country: item.address?.country || '',
        state: item.address?.state || '',
        displayName: formatDisplayName(item)
      }));

      setSuggestions(locations);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayName = (item) => {
    const parts = [];
    
    if (item.address?.city) parts.push(item.address.city);
    else if (item.address?.town) parts.push(item.address.town);
    else if (item.address?.village) parts.push(item.address.village);
    
    if (item.address?.state && !parts.includes(item.address.state)) {
      parts.push(item.address.state);
    }
    
    if (item.address?.country) parts.push(item.address.country);
    
    return parts.join(', ') || item.display_name;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
  };

  const handleSelectSuggestion = (suggestion) => {
    const selectedValue = suggestion.city || suggestion.displayName.split(',')[0];
    setQuery(selectedValue);
    onChange(selectedValue);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="location-search-wrapper" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        required
        autoComplete="off"
        className="location-search-input"
      />
      
      {loading && (
        <div className="search-loading">
          <div className="search-spinner"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="location-suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="location-suggestion-item"
            >
              <span className="location-icon">📍</span>
              <div className="location-info">
                <div className="location-name">{suggestion.displayName}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && query.length >= 3 && (
        <div className="no-suggestions">
          <p>No locations found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}

export default LocationSearch;