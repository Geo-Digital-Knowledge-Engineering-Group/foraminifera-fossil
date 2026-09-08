import "../styles/components/footer.css";
import logo from "../assets/images/logo.png";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-sap-bg)", color: "var(--color-text)", padding: "var(--spacing-medium)" }}>
      <div className="footer-container" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "var(--page-max-width)", margin: "0 auto", fontSize: "12px", padding: 0 }}>
        
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-medium)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <strong style={{ color: "var(--color-primary)" }}>Foraminifera Karar Destek Sistemi</strong>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src={logo} alt="GeoKnow Logo" style={{ height: "24px" }} />
            <a href="https://avesis.ogu.edu.tr/arastirma-grubu/geoknow" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text)", textDecoration: "none", fontWeight: "bold" }}>
              GeoKnow Araştırma Grubu
            </a>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span style={{ color: "var(--color-text-muted)" }}>© {currentYear} Tüm hakları saklıdır.</span>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "11px", fontStyle: "italic", marginTop: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "8px" }}>
          <strong>Uyarı:</strong> Sonuçları kullanmadan önce daima doğrulayın. Bu bir eğitim ve karar-destek aracıdır, resmi bir taksonomik teşhis değildir.
        </div>
        
      </div>
    </footer>
  );
}

export default Footer;