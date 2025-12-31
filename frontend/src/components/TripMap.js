import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
    "><span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 12px;">${label}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// District coordinates
const DISTRICT_COORDS = {
  "Bagalkot": { lat: 16.1691, lng: 75.6615 },
  "Ballari (Bellary)": { lat: 15.1394, lng: 76.9214 },
  "Belagavi (Belgaum)": { lat: 15.8497, lng: 74.4977 },
  "Bengaluru Rural": { lat: 13.2257, lng: 77.3910 },
  "Bengaluru Urban": { lat: 12.9716, lng: 77.5946 },
  "Bidar": { lat: 17.9104, lng: 77.5199 },
  "Chamarajanagar": { lat: 11.9261, lng: 76.9398 },
  "Chikkaballapur": { lat: 13.4355, lng: 77.7278 },
  "Chikkamagaluru": { lat: 13.3161, lng: 75.7747 },
  "Chitradurga": { lat: 14.2251, lng: 76.3980 },
  "Dakshina Kannada": { lat: 12.9141, lng: 74.8560 },
  "Davanagere": { lat: 14.4644, lng: 75.9218 },
  "Dharwad": { lat: 15.4589, lng: 75.0078 },
  "Gadag": { lat: 15.4166, lng: 75.6290 },
  "Hassan": { lat: 13.0068, lng: 76.0996 },
  "Haveri": { lat: 14.7951, lng: 75.3990 },
  "Kalaburagi (Gulbarga)": { lat: 17.3297, lng: 76.8343 },
  "Kodagu (Coorg)": { lat: 12.4244, lng: 75.7382 },
  "Kolar": { lat: 13.1360, lng: 78.1292 },
  "Koppal": { lat: 15.3500, lng: 76.1500 },
  "Mandya": { lat: 12.5220, lng: 76.8951 },
  "Mysuru (Mysore)": { lat: 12.2958, lng: 76.6394 },
  "Raichur": { lat: 16.2120, lng: 77.3439 },
  "Ramanagara": { lat: 12.7159, lng: 77.2819 },
  "Shivamogga (Shimoga)": { lat: 13.9299, lng: 75.5681 },
  "Tumakuru (Tumkur)": { lat: 13.3379, lng: 77.1173 },
  "Udupi": { lat: 13.3409, lng: 74.7421 },
  "Uttara Kannada (Karwar)": { lat: 14.8182, lng: 74.1289 },
  "Vijayapura (Bijapur)": { lat: 16.8302, lng: 75.7100 },
  "Yadgir": { lat: 16.7700, lng: 77.1400 },
  "Vijayanagara": { lat: 15.3350, lng: 76.4600 }
};

// Famous places coordinates
const FAMOUS_PLACES = {
  "mysore palace": { lat: 12.3052, lng: 76.6552 },
  "chamundi hills": { lat: 12.2724, lng: 76.6704 },
  "brindavan gardens": { lat: 12.4214, lng: 76.5728 },
  "mysore zoo": { lat: 12.3020, lng: 76.6631 },
  "lalbagh botanical garden": { lat: 12.9507, lng: 77.5848 },
  "cubbon park": { lat: 12.9763, lng: 77.5929 },
  "bangalore palace": { lat: 12.9987, lng: 77.5922 },
  "vidhana soudha": { lat: 12.9796, lng: 77.5906 },
  "hampi": { lat: 15.3350, lng: 76.4600 },
  "virupaksha temple": { lat: 15.3350, lng: 76.4600 },
  "vittala temple": { lat: 15.3350, lng: 76.4727 },
  "abbey falls": { lat: 12.4567, lng: 75.7250 },
  "raja's seat": { lat: 12.4200, lng: 75.7400 },
  "jog falls": { lat: 14.2297, lng: 74.8125 },
  "gokarna": { lat: 14.5479, lng: 74.3188 },
  "murudeshwar": { lat: 14.0944, lng: 74.4844 },
  "badami caves": { lat: 15.9196, lng: 75.6820 },
  "belur": { lat: 13.1631, lng: 75.8650 },
  "halebidu": { lat: 13.2128, lng: 75.9958 },
  "shravanabelagola": { lat: 12.8590, lng: 76.4866 },
  "nandi hills": { lat: 13.3702, lng: 77.6835 },
  "coorg": { lat: 12.4244, lng: 75.7382 },
  "madikeri": { lat: 12.4244, lng: 75.7382 },
};

// Component to fit map bounds
function MapBoundsHandler({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

function TripMap({ source, destination, mustVisitPlaces }) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get coordinates for a place
  const getPlaceCoordinates = (placeName) => {
    if (!placeName) return null;
    const lowerPlace = placeName.toLowerCase().trim();
    
    for (const [key, coords] of Object.entries(FAMOUS_PLACES)) {
      if (lowerPlace.includes(key) || key.includes(lowerPlace)) {
        return coords;
      }
    }
    
    for (const [district, coords] of Object.entries(DISTRICT_COORDS)) {
      if (lowerPlace.includes(district.toLowerCase()) || district.toLowerCase().includes(lowerPlace)) {
        return coords;
      }
    }
    
    return null;
  };

  // Memoize markers to prevent unnecessary re-renders
  const markers = useMemo(() => {
    const markersList = [];
    const sourceCoords = DISTRICT_COORDS[source] || { lat: 12.9716, lng: 77.5946 };
    const destCoords = DISTRICT_COORDS[destination] || sourceCoords;
    
    // Source marker
    markersList.push({
      position: [sourceCoords.lat, sourceCoords.lng],
      name: source,
      type: 'source',
      icon: createCustomIcon('#22c55e', 'S')
    });
    
    // Must-visit places
    if (mustVisitPlaces && mustVisitPlaces.length > 0) {
      mustVisitPlaces.forEach((place, index) => {
        const coords = getPlaceCoordinates(place.name);
        if (coords) {
          markersList.push({
            position: [coords.lat, coords.lng],
            name: place.name,
            description: place.description,
            type: 'place',
            icon: createCustomIcon('#667eea', (index + 1).toString())
          });
        }
      });
    }
    
    // Destination marker
    markersList.push({
      position: [destCoords.lat, destCoords.lng],
      name: destination,
      type: 'destination',
      icon: createCustomIcon('#ef4444', 'D')
    });
    
    return markersList;
  }, [source, destination, mustVisitPlaces]);

  // Calculate bounds
  const bounds = useMemo(() => {
    return markers.map(m => m.position);
  }, [markers]);

  // Fetch route
  useEffect(() => {
    const fetchRoute = async () => {
      setLoading(true);
      
      const waypoints = markers.map(m => [m.position[1], m.position[0]]); // [lng, lat] for API
      
      try {
        const apiKey = process.env.REACT_APP_OPENROUTE_API_KEY;
        if (apiKey && waypoints.length >= 2) {
          const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
            method: 'POST',
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              coordinates: waypoints
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.features && data.features[0] && data.features[0].geometry) {
              const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setRouteCoordinates(coords);
            }
          } else {
            // Fallback to straight lines
            setRouteCoordinates(markers.map(m => m.position));
          }
        } else {
          setRouteCoordinates(markers.map(m => m.position));
        }
      } catch (error) {
        console.log('Could not fetch route:', error);
        setRouteCoordinates(markers.map(m => m.position));
      }
      
      setLoading(false);
    };
    
    if (markers.length > 0) {
      fetchRoute();
    }
  }, [markers]);

  // Default center (Karnataka)
  const center = useMemo(() => {
    if (markers.length > 0) {
      return markers[0].position;
    }
    return [13.0827, 76.2707];
  }, [markers]);

  if (loading) {
    return (
      <div className="trip-map-container">
        <h3 className="map-title">🗺️ Your Trip Route</h3>
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-map-container">
      <h3 className="map-title">🗺️ Your Trip Route</h3>
      <div className="map-legend">
        <span className="legend-item">
          <span className="legend-dot source"></span> Start: {source}
        </span>
        <span className="legend-item">
          <span className="legend-dot destination"></span> End: {destination}
        </span>
        <span className="legend-item">
          <span className="legend-dot place"></span> Must-Visit Places
        </span>
      </div>
      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: '450px', width: '100%', borderRadius: '12px' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapBoundsHandler bounds={bounds} />
          
          {/* Route polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#667eea',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10'
              }}
            />
          )}
          
          {/* Markers */}
          {markers.map((marker, index) => (
            <Marker
              key={`marker-${index}`}
              position={marker.position}
              icon={marker.icon}
            >
              <Popup>
                <div style={{ textAlign: 'center', padding: '5px' }}>
                  <strong style={{ fontSize: '14px' }}>{marker.name}</strong>
                  {marker.description && (
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                      {marker.description}
                    </p>
                  )}
                  <span style={{ fontSize: '11px', color: '#667eea', fontWeight: 'bold' }}>
                    {marker.type === 'source' && '📍 Starting Point'}
                    {marker.type === 'destination' && '🎯 Destination'}
                    {marker.type === 'place' && '⭐ Must Visit'}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="map-note">
        📌 Click on markers to see details. The route shows the path through all must-visit places.
      </p>
    </div>
  );
}

export default TripMap;
