import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          ✈️ AI TRIP PLANNER
        </Link>
        
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" className="navbar-link">Home</Link>
          </li>
          <li className="navbar-item">
            <Link to="/about" className="navbar-link">About Us</Link>
          </li>
          <li className="navbar-item">
            <Link to="/contact" className="navbar-link">Contact</Link>
          </li>
          
          {isAuthenticated ? (
            <>
              <li className="navbar-item">
                <Link to="/saved-trips" className="navbar-link">Saved Trips</Link>
              </li>
              <li className="navbar-item">
                <span className="navbar-user">👤 {user?.firstname || user?.username}</span>
              </li>
              <li className="navbar-item">
                <button onClick={handleLogout} className="navbar-button logout-btn">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link to="/login" className="navbar-button login-btn">Login</Link>
              </li>
              <li className="navbar-item">
                <Link to="/register" className="navbar-button register-btn">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;