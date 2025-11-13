import React, { useState, useEffect } from 'react';
import axios from 'axios';

function WeatherWidget({ destination }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!destination) return;
    
    fetchWeather();
  }, [destination]);

  const fetchWeather = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/weather/${encodeURIComponent(destination)}`
      );
      setWeather(response.data);
    } catch (err) {
      setError('Weather data not available');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="weather-spinner"></div>
        <p>Loading weather...</p>
      </div>
    );
  }

  if (error || !weather || weather.error_msg) {
    return (
      <div className="weather-widget error">
        <p>⚠️ {error || weather?.error_msg || 'Weather data unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <h3 className="weather-title">
        🌤️ Weather Forecast for {weather.city}, {weather.country}
      </h3>
      
      <div className="weather-forecasts">
        {weather.forecasts && weather.forecasts.map((forecast, index) => (
          <div key={index} className="weather-card">
            <div className="weather-date">{new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <img 
              src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
              alt={forecast.description}
              className="weather-icon"
            />
            <div className="weather-temp">{Math.round(forecast.temp)}°C</div>
            <div className="weather-desc">{forecast.description}</div>
            <div className="weather-details">
              <span>💧 {forecast.humidity}%</span>
              <span>🌧️ {Math.round(forecast.rain_chance)}%</span>
            </div>
            <div className="weather-minmax">
              {Math.round(forecast.temp_min)}° / {Math.round(forecast.temp_max)}°
            </div>
          </div>
        ))}
      </div>

      <div className="weather-tips">
        <p><strong>💡 Weather Tips:</strong></p>
        <ul>
          <li>Check weather updates closer to your travel dates</li>
          <li>Pack accordingly based on the forecast</li>
          <li>Consider weather when planning outdoor activities</li>
        </ul>
      </div>
    </div>
  );
}

export default WeatherWidget;