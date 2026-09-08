import "../styles/components/footer.css";
import logo from "../assets/images/logo.png";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-sap-bg)", color: "var(--color-text)", padding: "var(--spacing-medium)" }}>
      <div className="footer-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", maxWidth: "var(--page-max-width)", margin: "0 auto", fontSize: "12px", padding: 0, textAlign: "center" }}>
        
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap", textAlign: "center" }}>
          <strong style={{ color: "var(--color-primary)", fontSize: "13px" }}>Foraminifera Karar Destek Sistemi</strong>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={logo} alt="GeoKnow Logo" style={{ height: "20px" }} />
            <a href="https://avesis.ogu.edu.tr/arastirma-grubu/geoknow" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text)", textDecoration: "none", fontWeight: "bold" }}>
              GeoKnow Araştırma Grubu
            </a>
          </div>

          <span style={{ color: "var(--color-border)" }}>|</span>
          <span style={{ color: "var(--color-text-muted)" }}>© {currentYear} Tüm hakları saklıdır.</span>
        </div>

        <span style={{ color: "var(--color-text-muted)", fontSize: "11px", fontStyle: "italic" }}>
          <strong>Uyarı:</strong> Sonuçları kullanmadan önce daima doğrulayın. Bu bir eğitim ve karar-destek aracıdır, resmi bir taksonomik teşhis değildir.
        </span>
        
      </div>
    </footer>
  );
}

export default Footer;