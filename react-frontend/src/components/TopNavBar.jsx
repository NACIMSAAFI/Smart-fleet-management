import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import { FaTruck, FaTachometerAlt, FaCar, FaPlusCircle, FaSignOutAlt } from 'react-icons/fa';

const TopNavBar = () => {
  const [userName, setUserName] = useState('');
  const location = useLocation();
  
  useEffect(() => {
    if (authService.checkAuth()) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user?.name) {
            setUserName(user.name);
          }
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
    }
  }, []);
  
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };
  
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="top-nav">
      <div className="nav-logo-container">
        <Link to="/dashboard" className="nav-logo">
          <FaTruck /> Fleet Manager
        </Link>
      </div>
      
      <div className="nav-links">
        <Link 
          to="/dashboard" 
          className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
        >
          <FaTachometerAlt /> Dashboard
        </Link>
        <Link 
          to="/vehicles" 
          className={`nav-link ${isActive('/vehicles') ? 'active' : ''}`}
        >
          <FaCar /> Vehicles
        </Link>
        <Link 
          to="/vehicles/add" 
          className={`nav-link ${isActive('/vehicles/add') ? 'active' : ''}`}
        >
          <FaPlusCircle /> Add Vehicle
        </Link>
      </div>
      
      <div className="nav-user">
        {userName && <span className="welcome-message">Welcome, {userName}</span>}
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </nav>
  );
};

export default TopNavBar;