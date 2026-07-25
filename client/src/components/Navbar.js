import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";

import "../styles/components/navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Handler to close the mobile menu on link click
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: '#ffffff', borderBottom: '1px solid #eaeaea' }}>
      <div className="navbar-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 30px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* BRAND LOGO AREA */}
        <div className="navbar-brand">
          <Link to="/" onClick={handleLinkClick}>
            <img
              src={logo}
              alt="GeoKnow Logo"
              className="navbar-logo"
              style={{ height: "45px", objectFit: 'contain' }}
            />
          </Link>
        </div>

        {/* MOBILE MENU TOGGLE BUTTON */}
        <button
          className="navbar-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
          style={{ zIndex: 1001 }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* NAVIGATION LINKS */}
        <nav className={`navbar-menu ${isMenuOpen ? "navbar-menu-open" : ""}`} style={{ display: 'flex', gap: '25px', alignItems: 'center', zIndex: 1000 }}>
          <Link 
            to="/" 
            onClick={handleLinkClick} 
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/' ? '600' : '400' }}
          >
            Home
          </Link>
          <Link 
            to="/tani" 
            onClick={handleLinkClick} 
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/tani' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/tani' ? '600' : '400' }}
          >
            Fossils
          </Link>
          <Link 
            to="/jeoloji" 
            onClick={handleLinkClick} 
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/jeoloji' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/jeoloji' ? '600' : '400' }}
          >
            Geology
          </Link>
          <Link 
            to="/hakkinda" 
            onClick={handleLinkClick} 
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/hakkinda' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/hakkinda' ? '600' : '400' }}
          >
            About
          </Link>
          <Link 
            to="/iletisim" 
            onClick={handleLinkClick} 
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/iletisim' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/iletisim' ? '600' : '400' }}
          >
            Contact
          </Link>
          <Link 
            to="/predict" 
            onClick={handleLinkClick} 
            className="navbar-predict-btn"
            style={{ textDecoration: 'none', fontSize: '14px', color: location.pathname === '/predict' ? '#2c3e50' : '#555', fontWeight: location.pathname === '/predict' ? '600' : '400' }}
          >
            Predict
          </Link>
        </nav>

      </div>
    </header>
  );
}

export default Navbar;