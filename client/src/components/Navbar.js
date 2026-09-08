import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";

import "../styles/components/navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'var(--color-sap-bg)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="navbar-container">
        <div className="navbar-brand">
          <img
            src={logo}
            alt="GeoKnow Logo"
            className="navbar-logo"
            style={{ height: "60px" }}
          />
        </div>

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

        <nav className={`navbar-menu ${isMenuOpen ? "navbar-menu-open" : ""}`} style={{ zIndex: 1000 }}>
          <Link to="/tani" onClick={handleLinkClick} style={{ fontWeight: 'bold', color: location.pathname === '/tani' ? 'var(--color-primary)' : 'var(--color-text)' }}>Taksonomi Karar Destek</Link>
          <Link to="/vlm" onClick={handleLinkClick} style={{ color: location.pathname === '/vlm' ? 'var(--color-primary)' : 'var(--color-text)' }}>VLM Gözlem</Link>
          <Link to="/hakkinda" onClick={handleLinkClick} style={{ color: location.pathname === '/hakkinda' ? 'var(--color-primary)' : 'var(--color-text)' }}>Veriseti ve Hakkında</Link>
          <Link to="/jeoloji" onClick={handleLinkClick} style={{ color: location.pathname === '/jeoloji' ? 'var(--color-primary)' : 'var(--color-text)' }}>Jeolojik Bağlam</Link>
          <Link to="/iletisim" onClick={handleLinkClick} style={{ color: location.pathname === '/iletisim' ? 'var(--color-primary)' : 'var(--color-text)' }}>İletişim</Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
