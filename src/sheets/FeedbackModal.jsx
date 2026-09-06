import { useState } from "react";
import { G } from "../theme/palette.js";
import { SMILEY_OPTS } from "./feedback-faces.jsx";

export default function FeedbackModal({ weekNumber, onSubmit, onSkip, isPremium }) {
  const [selected, setSelected] = useState(null);

  const confirm = (id) => {
    setSelected(id);
    // Légère vibration tactile si disponible
    if (navigator.vibrate) navigator.vibrate(40);
    // Soumettre après une courte animation
    setTimeout(() => onSubmit({ rating: id, motivation: id, pain: "none", comment: null }), 320);
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-panel ms-sheet-card scale-in">
        <div className="ms-sheet-handle" />

        <p style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>
          Semaine {weekNumber} terminée
        </p>
        <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: G.ink, textAlign: "center", marginBottom: 6 }}>
          Comment tu t'es senti·e ?
        </h3>
        <p style={{ color: G.grey, fontSize: 14, textAlign: "center", marginBottom: isPremium ? 28 : 12, lineHeight: 1.5 }}>
          {isPremium
            ? "Ta réponse ajuste le volume des prochaines séances."
            : "On enregistre ton ressenti pour suivre ta progression."}
        </p>
        {!isPremium && (
          <p style={{ color: G.gold, fontSize: 12, fontWeight: 600, textAlign: "center", marginBottom: 28, background: G.goldLight, borderRadius: 10, padding: "8px 12px", lineHeight: 1.45 }}>
            Aperçu coach : trop dur → volume −12 % la semaine suivante. Abonne-toi pour appliquer.
          </p>
        )}

        {/* 3 smiley cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {SMILEY_OPTS.map(o => {
            const isActive = selected === o.id;
            return (
              <button key={o.id} onClick={() => confirm(o.id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                padding: "18px 8px", borderRadius: 20,
                border: `2px solid ${isActive ? o.color : G.greyLight}`,
                background: isActive ? o.bg : G.surface,
                cursor: "pointer", transition: "all 0.18s",
                transform: isActive ? "scale(1.04)" : "scale(1)",
              }}>
                <o.Face size={52} color={o.color} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? o.color : G.ink, marginBottom: 2 }}>{o.label}</div>
                  <div style={{ fontSize: 11, color: G.grey, lineHeight: 1.3 }}>{o.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={onSkip} style={{ width: "100%", padding: "11px", background: "none", border: "none", color: G.greyMid, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          Passer
        </button>
      </div>
    </div>
  );
}
