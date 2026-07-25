import React, { useState } from 'react';
import '../styles/pages/predict.css';

const Predict = () => {
  return (
    <div className="predict-container">
      
      {/* ÜST BANNER ALANI */}
<div className="predict-header-banner">
  <div className="banner-left">
    <span className="workspace-tag">FOSSIL PREDICTION WORKSPACE</span>
    <h1>Foraminifera tahmin arayüzü</h1>
    <p>Sol tarafta numune, morfoloji ve yas bilgilerini girin; sag tarafta sistemin önerdigi cins, tur ve habitat sonucunu gorun.</p>
  </div>
  <div className="banner-right-box">
    <span className="proto-title">Prototype</span>
    <span className="proto-val">Sample + taxon inference</span>
  </div>
</div>

      {/* ANA İKİ SÜTUNLU YAPI */}
      <div className="predict-grid">
        
        {/* SOL KISIM: İMPUT KARTI */}
        <div className="predict-card input-card">
          <div className="card-top-tag">
            <span>INPUT</span>
            <span className="side-badge">Left side</span>
          </div>
          <h2>Fosil ve sample bilgileri</h2>

          <form onSubmit={(e) => e.preventDefault()} className="predict-form">
            <div className="form-row">
              <div className="form-group">
                <label>Sample ID</label>
                <input type="text" defaultValue="Sample-24" />
              </div>
              <div className="form-group">
                <label>Taxon ipucu</label>
                <input type="text" defaultValue="Nummulites / Globigerina" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Uzun eksen</label>
                <input type="text" defaultValue="1.8 mm" />
              </div>
              <div className="form-group">
                <label>Kısa eksen</label>
                <input type="text" defaultValue="1.2 mm" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Loca sayisi</label>
                <input type="text" defaultValue="12" />
              </div>
              <div className="form-group">
                <label>Tur sayisi</label>
                <input type="text" defaultValue="3" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Depth</label>
                <input type="text" defaultValue="250 m" />
              </div>
              <div className="form-group">
                <label>Geological age</label>
                <input type="text" defaultValue="45-50 Ma" />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Kalki tipi / kabuk bilesimi</label>
              <input type="text" defaultValue="Hyaline, Calcareous" />
            </div>

            <div className="form-group full-width">
              <label>Habitat / environmental hint</label>
              <input type="text" defaultValue="Benthic, shallow marine" />
            </div>

            <div className="form-row formula-row">
              <div className="form-group formula-text">
                <label>Formula</label>
                <p>Uzama indisi = uzun eksen / kisa eksen</p>
              </div>
              <button type="submit" className="predict-btn">Predict fossil</button>
            </div>
          </form>
        </div>

        {/* ORTADAKİ RESULT OKU */}
        <div className="result-arrow-container">
          <span className="arrow-line">→</span>
          <span className="arrow-text">RESULT</span>
        </div>

        {/* SAĞ KISIM: OUTPUT KARTI (RESULT) */}
        <div className="predict-card output-card">
          <div className="card-top-tag">
            <span>OUTPUT</span>
            <span className="side-badge right-badge">Right side</span>
          </div>
          <h2>Tahmin sonucu</h2>

          <div className="result-main-box">
            <div className="result-icon-title">
              <div className="fossil-icon">✦</div>
              <div>
                <span className="rec-label">RECOMMENDED FOSSIL</span>
                <h3>Nummulites sp.</h3>
              </div>
            </div>
            <p className="result-desc">
              Girilen morfoloji, kabuk tipi ve derinlik bilgilerine göre örnek bir benthic foraminifer eşleştirmesi.
            </p>

            <div className="result-metrics-grid">
              <div className="metric-item">
                <span className="m-label">Confidence</span>
                <span className="m-val">%92</span>
              </div>
              <div className="metric-item">
                <span className="m-label">Habitat</span>
                <span className="m-val">Benthic</span>
              </div>
              <div className="metric-item">
                <span className="m-label">Age range</span>
                <span className="m-val">45-50 Ma</span>
              </div>
              <div className="metric-item">
                <span className="m-label">Shape ratio</span>
                <span className="m-val">1.50</span>
              </div>
            </div>
          </div>

          <div className="result-sub-grid">
            <div className="sub-box">
              <span className="m-label">Genus</span>
              <span className="m-val">Nummulites</span>
            </div>
            <div className="sub-box">
              <span className="m-label">Species</span>
              <span className="m-val">sp.</span>
            </div>
            <div className="sub-box">
              <span className="m-label">Loca pattern</span>
              <span className="m-val">Growing chambers</span>
            </div>
            <div className="sub-box">
              <span className="m-label">Shell type</span>
              <span className="m-val">Hyaline</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Predict;