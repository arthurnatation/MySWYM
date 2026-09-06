import { useState } from "react";
import { G } from "../theme/palette.js";
import { FaceGood, FaceMid, FaceTired } from "./feedback-faces.jsx";

export const SESSION_FEEDBACK_TAGS = [
  "trop long",
  "trop court",
  "incompréhensible",
  "éducatifs top",
  "trop intensif",
  "j'ai adoré",
  "douleur / gêne",
];

const SESSION_SMILEY_OPTS = [
  { id: "easy", Face: FaceGood,  label: "Trop facile", color: "#2dd4a0", bg: "#0c2a20" },
  { id: "ok",   Face: FaceMid,   label: "Bien",        color: "#FBBF24", bg: "#3a2a0a" },
  { id: "hard", Face: FaceTired, label: "Difficile",   color: "#FBBF24", bg: "#3a2a0a" },
  { id: "too_hard", Face: FaceTired, label: "Trop difficile", color: "#FF6B78", bg: "#3a151a" },
];

export default function SessionFeedbackSheet({ sessionTitle, initial, onSubmit, onSkip, isPremium, healthConsent = false }) {
  const [rating, setRating] = useState(initial?.rating ?? null);
  const [tags, setTags] = useState(() => Array.isArray(initial?.tags) ? [...initial.tags] : []);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const availableTags = healthConsent
    ? SESSION_FEEDBACK_TAGS
    : SESSION_FEEDBACK_TAGS.filter((t) => t !== "douleur / gêne");

  const toggleTag = (tag) => {
    if (tag === "douleur / gêne" && !healthConsent) return;
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const save = () => {
    if (!rating) return;
    if (navigator.vibrate) navigator.vibrate(40);
    onSubmit({
      rating,
      tags,
      comment: comment.trim() || null,
    });
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-panel ms-sheet-card scale-in">
        <div className="ms-sheet-handle" />

        <p style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 8 }}>
          Retour séance
        </p>
        <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: G.ink, textAlign: "center", marginBottom: 6 }}>
          Comment c'était ?
        </h3>
        {sessionTitle && (
          <p style={{ color: G.grey, fontSize: 13, textAlign: "center", marginBottom: 8, lineHeight: 1.4 }}>
            {sessionTitle}
          </p>
        )}
        <p style={{ color: G.grey, fontSize: 13, textAlign: "center", marginBottom: isPremium ? 20 : 10, lineHeight: 1.45 }}>
          {isPremium
            ? "Ton ressenti affine le volume des prochaines séances."
            : "Ton avis nous aide à améliorer les séances."}
        </p>
        {!isPremium && (
          <p style={{ color: G.gold, fontSize: 12, fontWeight: 600, textAlign: "center", marginBottom: 20, background: G.goldLight, borderRadius: 10, padding: "8px 12px", lineHeight: 1.45 }}>
            Aperçu coach : 1er retour « trop dur » → micro −3 % volume. Abonne-toi pour appliquer.
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {SESSION_SMILEY_OPTS.map(o => {
            const isActive = rating === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setRating(o.id)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "14px 6px", borderRadius: 18,
                  border: `2px solid ${isActive ? o.color : G.greyLight}`,
                  background: isActive ? o.bg : G.surface,
                  cursor: "pointer", transition: "all 0.18s",
                  transform: isActive ? "scale(1.03)" : "scale(1)",
                }}
              >
                <o.Face size={44} color={o.color} />
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? o.color : G.ink }}>{o.label}</div>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: G.inkLight, marginBottom: 10 }}>
          Qu'est-ce qui cloche (ou pas) ?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {availableTags.map(tag => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: "8px 12px", borderRadius: 100, cursor: "pointer",
                  border: `1.5px solid ${on ? G.blue : G.greyLight}`,
                  background: on ? G.blueLight : G.surface,
                  color: on ? G.blue : G.grey, fontSize: 12, fontWeight: 600,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {!healthConsent && (
          <p style={{ fontSize: 11, color: G.greyMid, marginBottom: 12, lineHeight: 1.4 }}>
            Le tag « douleur / gêne » nécessite ton consentement données de santé (Paramètres / onboarding).
          </p>
        )}

        <input
          type="text"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Un commentaire ? (optionnel)"
          maxLength={280}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 14px", borderRadius: 12, marginBottom: 16,
            border: `1.5px solid ${G.greyLight}`, background: G.greyXLight,
            fontSize: 14, color: G.ink, fontFamily: "inherit", outline: "none",
          }}
        />

        <button
          type="button"
          onClick={save}
          disabled={!rating}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: rating ? G.blue : G.greyLight,
            color: rating ? G.white : G.greyMid,
            fontSize: 15, fontWeight: 700, cursor: rating ? "pointer" : "not-allowed",
            marginBottom: 8,
          }}
        >
          Enregistrer
        </button>
        <button type="button" onClick={onSkip} style={{ width: "100%", padding: "11px", background: "none", border: "none", color: G.greyMid, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          Passer
        </button>
      </div>
    </div>
  );
}
