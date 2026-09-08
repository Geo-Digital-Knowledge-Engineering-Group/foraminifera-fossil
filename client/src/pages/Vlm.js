import React, { useState, useRef } from "react";
import "../styles/pages/vlm.css";

// React app starts with REACT_APP_API_URL or falls back to relative/local route
const API_URL = (process.env.REACT_APP_API_URL || "") + "/api/vlm/observe";

function Vlm() {
  const [file, setFile] = useState(null);
  const [base64Image, setBase64Image] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    locality: "",
    age: "",
    optics: "",
    scale: "",
    views: "",
    runScore: true
  });

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (!file.type.match("image.*")) {
      setError("Lütfen sadece resim dosyası yükleyin (JPG, PNG).");
      return;
    }
    
    // Check size limit (< 8MB roughly for safety with base64)
    if (file.size > 8 * 1024 * 1024) {
      setError("Dosya boyutu 8MB'dan küçük olmalıdır.");
      return;
    }

    setFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setBase64Image(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async () => {
    if (!base64Image) {
      setError("Lütfen analiz için bir görüntü yükleyin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          ...formData
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Görüntü analiz edilirken bir hata oluştu.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vlm-page">
      <div className="vlm-header">
        <h1>VLM Gözlemcisi (AI)</h1>
        <p>Google Gemini Vision destekli yapay zeka ile foraminifer mikrofosili görüntülerini analiz edin, morfolojik karakterleri otomatik çıkarın.</p>
      </div>

      <div className="vlm-content">
        {/* Left Side: Upload & Form */}
        <div className="vlm-left">
          <div 
            className={`upload-zone ${base64Image ? 'has-image' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !base64Image && fileInputRef.current?.click()}
          >
            {base64Image ? (
              <>
                <img src={base64Image} alt="Preview" className="image-preview" />
                <button 
                  className="remove-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setBase64Image("");
                    setFile(null);
                    setResult(null);
                  }}
                  title="Görüntüyü Kaldır"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <div className="upload-icon">📸</div>
                <div className="upload-text">Görüntü yüklemek için tıklayın veya sürükleyip bırakın</div>
                <div className="upload-hint">Desteklenen formatlar: JPG, PNG, WEBP (Max 8MB)</div>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/jpeg, image/png, image/webp, image/gif"
              onChange={handleFileSelect}
            />
          </div>

          <div className="form-group">
            <label>Lokasyon (Locality)</label>
            <input 
              type="text" 
              name="locality" 
              placeholder="Örn: Sivrihisar, Ankara..." 
              value={formData.locality} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>Jeolojik Yaş (Age / Stratigraphy)</label>
            <input 
              type="text" 
              name="age" 
              placeholder="Örn: Eosen, Miyosen..." 
              value={formData.age} 
              onChange={handleChange} 
            />
          </div>

          <div className="form-group">
            <label>Işıklandırma / Büyütme (Optics)</label>
            <input 
              type="text" 
              name="optics" 
              placeholder="Örn: İnce kesit, yansıyan ışık..." 
              value={formData.optics} 
              onChange={handleChange} 
            />
          </div>

          <div className="checkbox-group">
            <input 
              type="checkbox" 
              id="runScore" 
              name="runScore" 
              checked={formData.runScore} 
              onChange={handleChange} 
            />
            <label htmlFor="runScore">Analiz sonrası Karar Destek motorunu çalıştır (Skorlama)</label>
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: "1.5rem" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={loading || !base64Image}
          >
            {loading ? (
              <><span className="spinner"></span> Analiz Ediliyor...</>
            ) : (
              "Görüntüyü Analiz Et"
            )}
          </button>
        </div>

        {/* Right Side: Results */}
        <div className="vlm-right">
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h3>Analiz Sonuçları</h3>
              <p>Yapay zeka çıkarımları burada görüntülenecektir.</p>
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', width: '40px', height: '40px', borderWidth: '4px' }}></span>
              <h3 style={{ marginTop: '1rem' }}>Yapay Zeka Çalışıyor...</h3>
              <p>Gemini Vision modeli görüntüyü inceliyor. Bu işlem birkaç saniye sürebilir.</p>
            </div>
          )}

          {result && !loading && (
            <div className="results-container">
              {/* VLM Suggestion */}
              {result.observation?.vlm_suggestion && (
                <div className="vlm-suggestion">
                  <div className="vlm-status">VLM Tahmini Durumu: {result.observation.vlm_suggestion.identification_status}</div>
                  <div className="vlm-id">
                    {result.observation.vlm_suggestion.best_open_id || "Belirsiz Takson"}
                  </div>
                  
                  {result.observation.student_explanation_tr && (
                    <div className="vlm-explanation">
                      {result.observation.student_explanation_tr}
                    </div>
                  )}

                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                    <strong>Aday Cinsler: </strong>
                    {result.observation.vlm_suggestion.candidate_genera?.map(g => g.name).join(", ") || "Bulunamadı"}
                  </div>
                </div>
              )}

              {/* Scoring Engine Result */}
              {result.score && (
                <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '1.5rem', background: '#f8f9fa' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>Skor Motoru Sonucu</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    {result.score.identification ? <em>{result.score.identification}</em> : "Tanı Konulamadı"}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Durum: {result.score.status}
                  </div>
                </div>
              )}

              {/* Observations */}
              <div>
                <h3 className="result-section-title">Karakter Çıkarımları</h3>
                <div className="observation-grid">
                  {Object.entries(result.observation?.observations || {}).map(([key, obs]) => {
                    if (obs.state === "NOT_OBSERVABLE") return null;
                    return (
                      <div key={key} className="obs-card">
                        <div className="obs-id">{key}</div>
                        <div className="obs-value">{obs.value || "-"}</div>
                        <div className={`obs-state state-${obs.state}`}>{obs.state}</div>
                        {obs.reason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                            "{obs.reason}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div style={{ background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", marginTop: "1rem" }}>
                <strong>Disclaimer:</strong> Always verify the results before use. This is a teaching and decision-support tool, not an official taxonomic determination.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Vlm;
