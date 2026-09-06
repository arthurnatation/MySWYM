import { G } from "../theme/palette.js";

export default function CancelSurveySheet({ onChoose, onSkip }) {
  const reasons = [
    { id: "price", label: "Trop cher" },
    { id: "pause", label: "Pause / pas le temps" },
    { id: "hard", label: "Trop dur / pas adapté" },
    { id: "other", label: "Autre" },
  ];
  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <div className="sheet-panel ms-sheet-card scale-in">
        <div className="ms-sheet-handle" />
        <h3
          style={{
            fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            textTransform: "none",
            letterSpacing: "-0.02em",
            color: G.ink,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Avant de partir
        </h3>
        <p style={{ color: G.grey, fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 1.55 }}>
          Une raison rapide (optionnel), ça nous aide à améliorer MySWYM.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {reasons.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChoose(r.id)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: `1.5px solid ${G.greyLight}`,
                background: G.surface,
                color: G.ink,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                minHeight: 48,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          style={{
            width: "100%",
            padding: 12,
            border: "none",
            background: "none",
            color: G.grey,
            fontSize: 13,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Continuer vers Stripe
        </button>
      </div>
    </div>
  );
}
