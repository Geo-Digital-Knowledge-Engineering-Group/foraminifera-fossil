import React, { useState, useRef } from "react";
import "../styles/pages/vlm.css";

// React app starts with REACT_APP_API_URL or falls back to relative/local route
const API_URL = (process.env.REACT_APP_API_URL || "") + "/api/vlm/observe";

// Basic SVG icons to replace emojis
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
    <circle cx="12" cy="5" r="2"></circle>
    <path d="M12 7v4"></path>
    <line x1="8" y1="16" x2="8" y2="16"></line>
    <line x1="16" y1="16" x2="16" y2="16"></line>
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);


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
      <div className="vlm-content-wrapper">
        <h2 className="vlm-title">VLM Gözlemcisi (AI)</h2>
        <p className="vlm-desc">
          Google Gemini Vision destekli yapay zeka ile foraminifer mikrofosili görüntülerini analiz edin, morfolojik karakterleri otomatik çıkarın.
        </p>

        <div className="vlm-body">
          {/* Left Side: Upload & Form */}
          <div className="vlm-left">
            <div 
              className={`upload-zone ${base64Image ? 'active' : ''}`}
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
                    <CloseIcon />
                  </button>
                </>
              ) : (
                <>
                  <CameraIcon />
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
              <div className="error-message">
                <AlertIcon /> <span>{error}</span>
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
                <BotIcon />
                <h3>Analiz Sonuçları</h3>
                <p>Yapay zeka çıkarımları burada görüntülenecektir.</p>
              </div>
            )}

            {loading && (
              <div className="empty-state">
                <span className="spinner"></span>
                <h3>Yapay Zeka Çalışıyor...</h3>
                <p>Gemini Vision modeli görüntüyü inceliyor. Bu işlem birkaç saniye sürebilir.</p>
              </div>
            )}

            {result && !loading && (
              <div className="results-container">
                {/* VLM Suggestion */}
                {result.observation?.vlm_suggestion && (
                  <div className="vlm-suggestion">
                    <div className="vlm-status">{result.observation.vlm_suggestion.identification_status}</div>
                    <div className="vlm-id">
                      {result.observation.vlm_suggestion.best_open_id || "Belirsiz Takson"}
                    </div>
                    
                    {result.observation.student_explanation_tr && (
                      <div className="vlm-explanation">
                        {result.observation.student_explanation_tr}
                      </div>
                    )}

                    <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      <strong>Aday Cinsler: </strong>
                      {result.observation.vlm_suggestion.candidate_genera?.map(g => g.name).join(", ") || "Bulunamadı"}
                    </div>
                  </div>
                )}

                {/* Scoring Engine Result */}
                {result.score && (
                  <div style={{ padding: '16px 20px', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '8px', background: 'var(--color-surface)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text)', fontSize: '15px' }}>Skor Motoru Sonucu</h4>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                      {result.score.identification ? <em>{result.score.identification}</em> : "Tanı Konulamadı"}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', marginTop: '6px' }}>
                      {result.score.status}
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
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.4' }}>
                              "{obs.reason}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d", padding: "12px 16px", borderRadius: "6px", fontSize: "13px", marginTop: "12px", display: "flex", gap: "8px" }}>
                  <div style={{ marginTop: "2px" }}><AlertIcon /></div>
                  <div><strong>Uyarı:</strong> Sonuçları kullanmadan önce daima doğrulayın. Bu bir eğitim ve karar-destek aracıdır, resmi bir taksonomik teşhis değildir.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Vlm;
