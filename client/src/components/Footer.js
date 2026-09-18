import React from "react";
import logo from "../assets/images/logo.png";

function Footer() {
  return (
    <footer className="site-footer" style={{ backgroundColor: '#dcdeda', borderTop: '1px solid #c8d0cc', padding: '15px 30px', marginTop: 'auto' }}>
      <div className="footer-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* LEFT TITLE */}
        <div className="footer-left">
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4a514c' }}>
            Foraminifera Karar Destek Sistemi
          </span>
        </div>

        {/* RIGHT INFO (LOGO, GROUP & COPYRIGHT) */}
        <div className="footer-right" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <img 
            src={logo} 
            alt="GeoKnow Logo" 
            style={{ height: '30px', objectFit: 'contain' }} 
          />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a2c24' }}>
            GeoKnow Araştırma Grubu
          </span>
          <span style={{ color: '#888' }}>|</span>
          <span style={{ fontSize: '12px', color: '#333' }}>
            © 2026 Tüm hakları saklıdır.
          </span>
          <span style={{ color: '#888' }}>|</span>
          <strong style={{ color: '#555', fontSize: '12px' }}>
            Uyarı: Sonuçları kullanmadan önce daima doğrulayın. Bu bir eğitim ve karar-destek aracıdır, resmi bir taksonomik teşhis değildir.
          </strong>
        </div>

      </div>
    </footer>
  );
}

export default Footer;