import { useState, useEffect } from "react";
import "../styles/pages/fossils.css";

const API = process.env.REACT_APP_API_URL + "/api/diagnose";

// ─── STATUS / LEVEL META ────────────────────────────────────────────────────
const STATUS_META = {
  CONFIRMED_GENUS:          { label: "TEYİT EDİLDİ",      color: "#1a7a1a", bg: "#d4edda" },
  PROBABLE_GENUS:           { label: "MUHTEMEL",           color: "#856404", bg: "#fff3cd" },
  CANDIDATE_GENUS:          { label: "ADAY",               color: "#0c5460", bg: "#d1ecf1" },
  INDETERMINATE:            { label: "BELİRSİZ",           color: "#721c24", bg: "#f8d7da" },
  NO_MATCH_WITHIN_CORE_TAXA:{ label: "EŞLEŞİLEMEDİ",     color: "#383d41", bg: "#e2e3e5" },
};

const LEVEL_LABELS = {
  M: { label: "ZORUNLU",      color: "#721c24", bg: "#f8d7da" },
  D: { label: "TANISAL",      color: "#0c5460", bg: "#d1ecf1" },
  S: { label: "DESTEKLEYİCİ",color: "#1a7a1a", bg: "#d4edda" },
  C: { label: "ÇELİŞEN",     color: "#383d41", bg: "#e2e3e5" },
};

// ─── MODULE MAP ──────────────────────────────────────────────────────────────
const MODULE_VALUE_TO_LABEL = {
  AGGLUTINATED: "Aglütinat",
  PORCELANEOUS: "Porselen",
  HYALINE: "Hyalin",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function Fossils() {
  const [mode, setMode] = useState(null);

  return (
    <section id="fossils" className="fossils-page">
      <div className="fossils-content">
        <h2 className="fossils-title">Tanı Destek Sistemi</h2>
        <p className="fossils-desc">
          Mikroskop altında ince kesitte gözlemlediğiniz morfolojik özellikleri
          girerek olası cinsleri adım adım eleyebilirsiniz.
        </p>
        {mode === null   && <ModeSelector onSelect={setMode} />}
        {mode === "wizard"  && <WizardMode  onBack={() => setMode(null)} />}
        {mode === "scoring" && <ScoringMode onBack={() => setMode(null)} />}
      </div>
    </section>
  );
}

// ─── MODE SELECTOR ──────────────────────────────────────────────────────────
function ModeSelector({ onSelect }) {
  return (
    <div className="mode-selector">
      <button className="mode-card" onClick={() => onSelect("wizard")}>
        <span className="mode-icon">🌿</span>
        <strong>Adım Adım Tanı</strong>
        <span>Karar ağacı üzerinden yönlendirilmiş soru-cevap</span>
      </button>
      <button className="mode-card" onClick={() => onSelect("scoring")}>
        <span className="mode-icon">⚖️</span>
        <strong>Karakter Puanlama</strong>
        <span>Gözlemlediğiniz CHR karakterlerini girin, motor puanlasın</span>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIZARD MODE — step-by-step decision tree
// ═══════════════════════════════════════════════════════════════════════════════
function WizardMode({ onBack }) {
  // Stack of {nodeType, node} — history of visited nodes
  const [stack, setStack] = useState([]); // previous states
  const [current, setCurrent] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  // Human-readable breadcrumb: [{q, a}]
  const [crumbs, setCrumbs]   = useState([]);

  // ── Fetch composition question on mount ──────────────────────────────────
  useEffect(() => {
    fetchStart();
  }, []); // eslint-disable-line

  const fetchStart = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/question`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Sunucu hatası");
      setCurrent(data);
    } catch (e) { setError("API bağlantısı kurulamadı: " + e.message); }
    finally  { setLoading(false); }
  };

  // ── User picks an answer ─────────────────────────────────────────────────
  const handleAnswer = async (answer) => {
    setLoading(true); setError(null);

    // Push current to stack (for back navigation)
    setStack((s) => [...s, { current, result }]);

    const qText = current.node?.textTr || "Kavkı bileşimi nedir?";
    const aLabel = answer.labelTr || answer.value;

    try {
      // ── Step A: CHR_01 composition chosen → fetch module entry question ──
      if (current.nodeType === "module_select") {
        const moduleCode = answer.code || answer.value; // e.g. "AGGLUTINATED"
        const res  = await fetch(`${API}/question/entry`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ module: moduleCode }),
        });
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || "Sunucu hatası");
        setCurrent(data); setResult(null);
        setCrumbs((c) => [...c, { q: qText, a: aLabel }]);
        return;
      }

      // ── Step B: Normal question → walk ANSWER edge ───────────────────────
      const res  = await fetch(`${API}/question`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: current.node.id, answerValue: answer.value }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Sunucu hatası");
      
      setCrumbs((c) => [...c, { q: qText, a: aLabel }]);

      if (data.nodeType === "genus" || data.nodeType === "outcome") {
        setResult(data); setCurrent(null);
      } else {
        setCurrent(data); setResult(null);
      }
    } catch (e) { 
      setError("Hata: " + e.message); 
      // Revert stack and crumbs on error
      setStack((s) => s.slice(0, -1));
    }
    finally { setLoading(false); }
  };

  // ── Go back one step ─────────────────────────────────────────────────────
  const handleBack = () => {
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1));
    setCrumbs((c) => c.slice(0, -1));
    setCurrent(prev.current);
    setResult(prev.result);
    setError(null);
  };

  // ── Restart ──────────────────────────────────────────────────────────────
  const reset = () => {
    setStack([]); setCrumbs([]); setCurrent(null); setResult(null);
    fetchStart();
  };

  return (
    <div className="wizard-layout">
      {/* Breadcrumb bar */}
      <div className="wizard-breadcrumb">
        <button className="back-link" onClick={onBack}>← Mod Seç</button>
        {crumbs.map((c, i) => (
          <span key={i} className="breadcrumb-step">
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-q">{c.q.length > 28 ? c.q.slice(0,28)+"…" : c.q}</span>
            <span className="breadcrumb-a">→ {c.a}</span>
          </span>
        ))}
      </div>

      <div className="wizard-body">
        {/* Sidebar: step log */}
        <div className="wizard-steps">
          <div className="steps-header">Yol ({crumbs.length} adım)</div>
          {crumbs.length === 0 && <div className="steps-empty">Henüz adım atılmadı.</div>}
          {crumbs.map((c, i) => (
            <div key={i} className="step-item">
              <span className="step-num">{i + 1}</span>
              <div>
                <div className="step-q">{c.q.length > 36 ? c.q.slice(0,36)+"…" : c.q}</div>
                <div className="step-a">▶ {c.a}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="wizard-main">
          {loading && <div className="wizard-loading"><span className="spinner" /> Yükleniyor...</div>}
          {error   && <div className="wizard-error">{error}</div>}

          {!loading && !error && current && !result && (
            <QuestionCard
              current={current}
              onAnswer={handleAnswer}
              onBack={stack.length > 0 ? handleBack : null}
            />
          )}

          {!loading && !error && result && (
            <ResultCard result={result} onReset={reset} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QUESTION CARD ─────────────────────────────────────────────────────────
function QuestionCard({ current, onAnswer, onBack }) {
  const { nodeType, node } = current;
  // module_select uses node.values; question uses node.answers
  const answers = nodeType === "module_select" ? node.values : (node.answers || []);

  return (
    <div className="question-card">
      {node.sectionSensitive && (
        <div className="section-warning">
          ⚠️ <strong>Kesit Yönü Kontrolü:</strong> Bu soru kesit yönüne duyarlıdır.
          Aksiyal veya ekvatoryal kesit olduğundan emin olun (CHR_21).
        </div>
      )}

      <div className="question-code">{node.code || "CHR_01"}</div>
      <div className="question-text">{node.textTr || "Kavkı bileşimi nedir?"}</div>

      {node.character && (
        <div className="question-chr-badge">
          <span className="chr-id">{node.character.id}</span>
          <span className="chr-name">{node.character.nameTr}</span>
        </div>
      )}

      {node.observationHint && (
        <div className="observation-hint">
          💡 Gözlem ipucu:{" "}
          {Array.isArray(node.observationHint)
            ? node.observationHint.join(", ")
            : node.observationHint}
        </div>
      )}

      <div className="answer-grid">
        {answers.map((a, i) => (
          <button key={i} className="answer-btn" onClick={() => onAnswer(a)}>
            <span className="answer-label">{a.labelTr || a.value}</span>
            {a.nextType === "genus"   && <span className="answer-tag genus-tag">→ Cins</span>}
            {a.nextType === "outcome" && <span className="answer-tag outcome-tag">→ Çıkış</span>}
          </button>
        ))}
      </div>

      <div className="question-nav">
        {onBack && <button className="nav-btn back-btn" onClick={onBack}>← Geri</button>}
        <button
          className="nav-btn skip-btn"
          onClick={() => onAnswer({ value: "NOT_OBSERVABLE", labelTr: "Gözlenemiyor / Emin Değilim" })}
        >
          Gözlenemiyor / Emin Değilim
        </button>
      </div>
    </div>
  );
}

// ─── RESULT CARD ───────────────────────────────────────────────────────────
function ResultCard({ result, onReset, onBack }) {
  const { nodeType, node } = result;

  if (nodeType === "outcome") {
    const isIndet = node.kind === "INDETERMINATE";
    const isNotObs = node.kind === "NOT_OBSERVABLE";

    return (
      <div className="result-card outcome-card">
        <div
          className="result-status"
          style={{
            background: isNotObs ? "#fef3c7" : "#fee2e2",
            color: isNotObs ? "#92400e" : "#991b1b",
          }}
        >
          {isNotObs ? "GÖZLENEMİYOR" : isIndet ? "BELİRSİZ SONUÇ" : "YÖNLENDİRME"}
        </div>

        <h3 className="result-genus" style={{ fontSize: "20px" }}>
          {isNotObs ? "Bu karakter belirlenemedi" : node.id.replace(/_/g, " ")}
        </h3>

        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
          {isNotObs
            ? node.message || "Bu karakter gözlenemediğinden karar ağacında ilerlenemiyor."
            : isIndet
              ? "Bu kesitte yeterli tanı bilgisi elde edilemedi. Farklı kesit yönü veya ek gözlem deneyin."
              : "Karar ağacı bu noktada başka bir dala yönlendiriyor."}
        </p>

        {/* NOT_OBSERVABLE: show reachable genera */}
        {isNotObs && node.reachableGenera && node.reachableGenera.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--color-text)" }}>
              Bu daldan erişilebilir olası cinsler ({node.reachableGenera.length}):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {node.reachableGenera.map((g) => (
                <span
                  key={g.name}
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    fontSize: "13px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "6px",
                    color: "#166534",
                    fontStyle: "italic",
                    fontWeight: "500",
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* NOT_OBSERVABLE: show available branches for re-selection */}
        {isNotObs && node.availableBranches && node.availableBranches.length > 0 && (
          <div style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            fontSize: "14px",
          }}>
            <strong style={{ color: "#1e3a8a" }}>💡 İpucu:</strong>{" "}
            <span style={{ color: "#1e40af" }}>
              Geri gidip bu soru için mevcut cevaplardan birini seçebilirsiniz:{" "}
              {node.availableBranches.map((b) => b.labelTr || b.value).join(", ")}
            </span>
          </div>
        )}

        <div className="result-actions">
          <button className="nav-btn back-btn" onClick={onBack}>← Geri</button>
          <button className="nav-btn reset-btn" onClick={onReset}>↺ Yeniden Başla</button>
        </div>
      </div>
    );
  }

  // Genus result
  const { name, module, flag, taxonomicReviewRequired, rules = {}, closestComparisons = [] } = node;

  return (
    <div className="result-card genus-result">
      <div className="result-status" style={{ background: "#d4edda", color: "#1a7a1a" }}>
        ✓ CİNS BULUNDU
      </div>
      <h3 className="result-genus"><em>{name}</em></h3>
      <div className="result-module-badge">{module}</div>

      {flag && <div className="flag-warning">⚠️ {flag}</div>}
      {taxonomicReviewRequired && (
        <div className="flag-warning">⚠️ Taksonomik inceleme gerekli</div>
      )}

      <div className="rules-section">
        {Object.entries(rules).map(([level, items]) =>
          !items || items.length === 0 ? null : (
            <div key={level} className="rule-group">
              <div
                className="rule-group-header"
                style={{
                  background: LEVEL_LABELS[level[0]]?.bg,
                  color: LEVEL_LABELS[level[0]]?.color,
                }}
              >
                [{level[0]}] {LEVEL_LABELS[level[0]]?.label || level}
              </div>
              <ul className="rule-list">
                {items.map((r, i) => (
                  <li key={i} className="rule-item">
                    {r.code && <span className="rule-code">{r.code}</span>}
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>

      {closestComparisons.length > 0 && (
        <div className="comparisons">
          <strong>En yakın karşılaştırmalar: </strong>
          {closestComparisons.map((c, i) => (
            <span key={i} className="comparison-chip"><em>{c}</em></span>
          ))}
        </div>
      )}

      <div className="result-actions">
        <button className="nav-btn back-btn" onClick={onBack}>← Geri</button>
        <button className="nav-btn reset-btn" onClick={onReset}>↺ Yeniden Başla</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING MODE
// ═══════════════════════════════════════════════════════════════════════════════
const CHR_LIST = [
  { id: "CHR_01", nameTr: "Kavkı bileşimi", values: [
    { code: "AGGLUTINATED", labelTr: "Aglütinat" },
    { code: "PORCELANEOUS", labelTr: "Porselen" },
    { code: "HYALINE",      labelTr: "Hyalin" },
  ]},
  { id: "CHR_03", nameTr: "Septalarla bölünme", values: [
    { code: "PRESENT", labelTr: "Var" }, { code: "ABSENT", labelTr: "Yok" },
  ]},
  { id: "CHR_04", nameTr: "Loca organizasyonu", values: [
    { code: "UNDIVIDED", labelTr: "Septasız" }, { code: "MULTICHAMBERED", labelTr: "Çok localı" },
  ]},
  { id: "CHR_05", nameTr: "Loca dizilimi", values: [
    { code: "UNISERIAL", labelTr: "Uniserial" }, { code: "BISERIAL", labelTr: "Biserial" },
    { code: "TRISERIAL", labelTr: "Triserial" }, { code: "QUINQUELOCULINE", labelTr: "Quinqueloculine" },
    { code: "CYCLIC", labelTr: "Siklik" },
  ]},
  { id: "CHR_06", nameTr: "Sarılım tipi", values: [
    { code: "PLANISPIRAL", labelTr: "Planispiral" }, { code: "TROCHOSPIRAL", labelTr: "Trokospiral" },
    { code: "STREPTOSPIRAL", labelTr: "Streptospiral" }, { code: "GLOMOSPIRAL", labelTr: "Glomospiral" },
    { code: "UNCOILED", labelTr: "Sarılmamış" },
  ]},
  { id: "CHR_08", nameTr: "İnvolüt / Evolüt", values: [
    { code: "INVOLUTE", labelTr: "İnvolüt" }, { code: "SEMI_INVOLUTE", labelTr: "Yarı involüt" },
    { code: "EVOLUTE", labelTr: "Evolüt" },
  ]},
  { id: "CHR_09", nameTr: "Büyüme sırasında değişim", values: [
    { code: "NONE", labelTr: "Değişim yok" },
    { code: "PLANISPIRAL_TO_BISERIAL",  labelTr: "Planispiral → Biserial" },
    { code: "PLANISPIRAL_TO_UNISERIAL", labelTr: "Planispiral → Uniserial" },
    { code: "TRISERIAL_TO_BISERIAL",    labelTr: "Triserial → Biserial" },
    { code: "TRISERIAL_TO_UNISERIAL",   labelTr: "Triserial → Uniserial" },
    { code: "COILED_TO_SERIAL",         labelTr: "Sarılı → Seri" },
  ]},
  { id: "CHR_10", nameTr: "İç yapı karmaşıklığı", values: [
    { code: "SIMPLE", labelTr: "Basit" }, { code: "SUBDIVIDED", labelTr: "Alt bölmeli" },
    { code: "COMPLEX", labelTr: "Karmaşık" }, { code: "LABYRINTHIC", labelTr: "Labirentik" },
  ]},
  { id: "CHR_11", nameTr: "İkincil locacıklar", values: [
    { code: "PRESENT", labelTr: "Var" }, { code: "ABSENT", labelTr: "Yok" },
    { code: "WELL_DEVELOPED", labelTr: "İyi gelişmiş" },
  ]},
  { id: "CHR_13", nameTr: "İç bölmeler", values: [
    { code: "ABSENT", labelTr: "Yok" }, { code: "RADIAL", labelTr: "Radyal" },
    { code: "SUBEPIDERMAL", labelTr: "Subepidermal" }, { code: "VERTICAL", labelTr: "Düşey" },
  ]},
  { id: "CHR_14", nameTr: "Pillarlar", values: [
    { code: "PRESENT", labelTr: "Var" }, { code: "ABSENT", labelTr: "Yok" },
    { code: "STRONG", labelTr: "Güçlü" }, { code: "WEAK", labelTr: "Zayıf" },
  ]},
  { id: "CHR_17", nameTr: "Marjinal kord", values: [
    { code: "PRESENT", labelTr: "Var" }, { code: "ABSENT", labelTr: "Yok" },
    { code: "STRONG", labelTr: "Güçlü" },
  ]},
  { id: "CHR_21", nameTr: "Kesit yönü", values: [
    { code: "AXIAL", labelTr: "Eksenel" }, { code: "EQUATORIAL", labelTr: "Ekvatoryal" },
    { code: "OBLIQUE", labelTr: "Eğik" }, { code: "UNKNOWN", labelTr: "Bilinmiyor" },
  ]},
];

function ScoringMode({ onBack }) {
  const [observations, setObservations] = useState({});
  const [scoreResult, setScoreResult]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const toggleObs = (chrId, value) => {
    setObservations((prev) => {
      const cur = prev[chrId];
      if (value === "__NOT_OBS__") {
        // Toggle NOT_OBSERVABLE
        if (cur?.state === "NOT_OBSERVABLE") {
          const next = { ...prev }; delete next[chrId]; return next;
        }
        return { ...prev, [chrId]: { value: null, state: "NOT_OBSERVABLE" } };
      }
      if (cur?.value === value && cur?.state === "PRESENT") {
        const next = { ...prev }; delete next[chrId]; return next;
      }
      return { ...prev, [chrId]: { value, state: "PRESENT" } };
    });
  };

  const handleScore = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations }),
      });
      const data = await res.json();
      if (data.success) setScoreResult(data);
      else setError(data.error);
    } catch { setError("API bağlantısı kurulamadı."); }
    finally   { setLoading(false); }
  };

  const reset = () => { setObservations({}); setScoreResult(null); setError(null); };

  return (
    <div className="scoring-layout">
      <button className="back-link" onClick={onBack} style={{ marginBottom: "12px" }}>
        ← Mod Seç
      </button>

      <div className="scoring-body">
        {/* Left: character selector */}
        <div className="scoring-form">
          <div className="scoring-form-header">Morfolojik Gözlemler</div>
          <p className="scoring-hint">
            Gözlemlediğiniz değerleri seçin. Belirsizse &quot;Gözlenemiyor&quot;u işaretleyin.
          </p>

          {CHR_LIST.map((chr) => {
            const obs = observations[chr.id];
            return (
              <div key={chr.id} className="chr-block">
                <div className="chr-block-header">
                  <span className="chr-id-badge">{chr.id}</span>
                  <span className="chr-name-text">{chr.nameTr}</span>
                  {obs && (
                    <button className="chr-clear" onClick={() => {
                      setObservations((p) => { const n={...p}; delete n[chr.id]; return n; });
                    }}>✕</button>
                  )}
                </div>
                <div className="chr-values">
                  {chr.values.map((v) => {
                    const sel = obs?.value === v.code && obs?.state === "PRESENT";
                    return (
                      <button
                        key={v.code}
                        className={`chr-value-btn${sel ? " selected" : ""}`}
                        onClick={() => toggleObs(chr.id, v.code)}
                      >
                        {v.labelTr}
                      </button>
                    );
                  })}
                  <button
                    className={`chr-value-btn not-obs-btn${obs?.state === "NOT_OBSERVABLE" ? " selected" : ""}`}
                    onClick={() => toggleObs(chr.id, "__NOT_OBS__")}
                  >
                    Gözlenemiyor
                  </button>
                </div>
              </div>
            );
          })}

          <button className="diagnose-button" onClick={handleScore} disabled={loading}>
            {loading ? "Hesaplanıyor..." : "Puanla ve Tanı Yap"}
          </button>
          {Object.keys(observations).length > 0 && (
            <button className="nav-btn reset-btn" onClick={reset} style={{ marginTop: "6px", width: "100%" }}>
              ↺ Sıfırla
            </button>
          )}
        </div>

        {/* Right: results */}
        <div className="scoring-results">
          {!scoreResult && !loading && !error && (
            <div className="no-results">
              {Object.keys(observations).length === 0
                ? "Gözlem seçin ve puanlama yapın."
                : `${Object.keys(observations).filter(k => observations[k]?.state === "PRESENT").length} aktif gözlem seçildi — Puanla butonuna tıklayın.`}
            </div>
          )}
          {loading && <div className="wizard-loading"><span className="spinner" /> Puanlanıyor...</div>}
          {error   && <div className="wizard-error">{error}</div>}
          {scoreResult && !loading && <ScoreResult data={scoreResult} />}
        </div>
      </div>
    </div>
  );
}

// ─── SCORE RESULT ──────────────────────────────────────────────────────────
function ScoreResult({ data }) {
  const { status, identification, confidenceNote, ranking = [], excluded = [], observedCharacterCount } = data;
  const meta = STATUS_META[status] || {};

  return (
    <div className="score-result">
      <div
        className="score-status-banner"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}` }}
      >
        <strong>{meta.label || status}</strong>
        {identification && <span className="score-id-name"> — <em>{identification}</em></span>}
      </div>

      {confidenceNote && <div className="confidence-note">{confidenceNote}</div>}
      <div className="obs-count">
        Değerlendirilen gözlem: <strong>{observedCharacterCount}</strong>
      </div>

      {ranking.length > 0 && (
        <div className="ranking-section">
          <div className="ranking-header">Sıralama (aktif adaylar)</div>
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th><th>Cins</th><th>Mod.</th>
                <th>Puan</th><th>Z.</th><th>T.</th><th>Ç.</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.genus} className={i === 0 ? "top-row" : ""}>
                  <td>{i + 1}</td>
                  <td><em>{r.genus}</em>{r.flag ? " ⚠️" : ""}</td>
                  <td><span className="module-chip">{r.module?.slice(0, 3)}</span></td>
                  <td><strong>{r.score}</strong></td>
                  <td>{r.mandatoryMatched}/{r.mandatoryTotal}</td>
                  <td>{r.diagnosticMatched?.length || 0}</td>
                  <td style={{ color: r.contradictions?.length > 0 ? "#721c24" : "inherit" }}>
                    {r.contradictions?.length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Evidence for top candidate */}
          {ranking[0]?.matchedEvidence?.length > 0 && (
            <div className="evidence-section">
              <div className="evidence-header">
                Eşleşen kanıtlar — <em>{ranking[0].genus}</em>
              </div>
              {ranking[0].matchedEvidence.map((e, i) => {
                const lm = LEVEL_LABELS[e.level] || {};
                return (
                  <div
                    key={i}
                    className="evidence-item"
                    style={{ borderLeft: `3px solid ${lm.color || "#ccc"}` }}
                  >
                    <span
                      className="evidence-level-badge"
                      style={{ background: lm.bg, color: lm.color }}
                    >
                      [{e.level}]
                    </span>
                    <span className="evidence-text">{e.text}</span>
                    <span className="evidence-detail">{e.detail}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {excluded.length > 0 && (
        <details className="excluded-section">
          <summary>Elinen cinsler ({excluded.length})</summary>
          <ul className="excluded-list">
            {excluded.map((r) => (
              <li key={r.genus}>
                <em>{r.genus}</em>:{" "}
                <span className="excluded-reason">{r.exclusionReason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default Fossils;
