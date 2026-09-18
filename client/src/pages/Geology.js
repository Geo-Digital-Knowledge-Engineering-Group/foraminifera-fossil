import { useState, useEffect } from "react";
import "../styles/pages/geology.css";

const API = process.env.REACT_APP_API_URL + "/api/taxa";

function Geology() {
  return (
    <section id="geology" className="geology-page">
      <div className="geology-content">
        <h2>Jeolojik Bağlam</h2>
        <p>
          Mevcut ontoloji, büyük bentik foraminiferler için önemli evrimsel aşamaları temsil eden <strong>Paleosen</strong> ve <strong>Eosen</strong> dönemlerine odaklanmaktadır.
        </p>
        
        <div className="geology-grid">
          <div className="geology-card">
            <h3>Tanesiyen (Thanetian)</h3>
            <p>Geç Paleosen katı. Karmaşık formların ilk radyasyonu ve spesifik fauna toplulukları ile karakterizedir.</p>
          </div>
          <div className="geology-card">
            <h3>İlerdiyen (Ilerdian)</h3>
            <p>Tethys bölgesinde önemli bir Erken Eosen katı. <em>Alveolina</em> gibi taksonların hızlı çeşitlenmesine tanık olmuştur.</p>
          </div>
          <div className="geology-card">
            <h3>Küiziyen (Cuisian)</h3>
            <p>Kavkı morfolojisi ve ekolojik adaptasyonlarda daha ileri uzmanlaşmaların görüldüğü Geç Erken Eosen katı.</p>
          </div>
        </div>

        <TaxonEnvironmentSection />
      </div>
    </section>
  );
}

// ─── TAXON ENVIRONMENT SECTION ──────────────────────────────────────────
function TaxonEnvironmentSection() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rankFilter, setRankFilter] = useState("");

  // Fetch all profiles on mount
  useEffect(() => {
    fetch(`${API}/environment`)
      .then((res) => {
        if (!res.ok) throw new Error("Veri yüklenemedi");
        return res.json();
      })
      .then((data) => {
        setProfiles(data.profiles || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Client-side filtering
  const filtered = profiles.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.scientificName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = !rankFilter || p.rank === rankFilter;
    return matchesSearch && matchesRank;
  });

  return (
    <div className="taxon-env-section">
      <h3 className="taxon-env-title">Takson Ortam Kayıtları</h3>
      <p className="taxon-env-desc">
        Proje veri setinden derlenen yerel derinlik ve paleo-ortam bilgileri. 
        Tür düzeyindeki kayıtlar bütün cinse otomatik olarak genellenmez.
      </p>

      {/* Search & Filter */}
      <div className="taxon-env-controls">
        <input
          type="text"
          className="taxon-env-search"
          placeholder="Bilimsel isme göre ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="taxon-env-filter"
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
        >
          <option value="">Tümü</option>
          <option value="SPECIES">Tür</option>
          <option value="GENUS">Cins</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="taxon-env-loading">Yükleniyor...</div>
      )}

      {error && (
        <div className="taxon-env-error">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="taxon-env-count">
            {filtered.length} / {profiles.length} kayıt gösteriliyor
          </div>

          <div className="taxon-env-grid">
            {filtered.map((p, i) => (
              <div key={i} className="taxon-env-card">
                <div className="taxon-env-card-header">
                  <em className="taxon-env-name">{p.scientificName}</em>
                  <span className={`taxon-env-rank ${p.rank === "SPECIES" ? "env-rank-species" : "env-rank-genus"}`}>
                    {p.rank === "SPECIES" ? "Tür" : "Cins"}
                  </span>
                </div>

                {p.taxonomicReviewRequired && (
                  <div className="taxon-env-review-badge">
                    Taksonomik inceleme gerekli
                  </div>
                )}

                <div className="taxon-env-field">
                  <span className="taxon-env-field-label">Derinlik:</span>
                  <span>{p.depthTextTr || "—"}</span>
                </div>
                <div className="taxon-env-field">
                  <span className="taxon-env-field-label">Yaşadığı ortam:</span>
                  <span>{p.habitatTextTr || "—"}</span>
                </div>
                <div className="taxon-env-field taxon-env-source">
                  <span className="taxon-env-field-label">Kaynak:</span>
                  <span>{p.sourceLabel || "—"}</span>
                </div>

                {!p.linkedToOntology && (
                  <div className="taxon-env-unlinked">
                    Henüz tanı ontolojisine bağlı değil
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="taxon-env-empty">
              Aramanızla eşleşen kayıt bulunamadı.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Geology;
