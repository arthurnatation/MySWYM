import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { G } from "../theme/palette.js";
import WorkoutPrepView from "../workout/WorkoutPrepView.jsx";

/**
 * Préparation séance, sheet quasi plein écran (plus d’inline sur l’accueil).
 */
export default function SessionPrepSheet({
  open,
  session,
  colors = G,
  accent,
  isPremium = true,
  profile = null,
  planId = null,
  whyLine = null,
  onClose,
  onUpgrade,
  onTooHard,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !session) return null;

  return createPortal(
    <div
      className="sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Préparation de la séance"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ zIndex: 400 }}
    >
      <div
        className="sheet-panel scale-in ms-sheet-card"
        style={{
          borderRadius: "24px 24px 0 0",
          maxHeight: "min(94dvh, 920px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderBottom: "none",
          boxShadow: "0 -12px 40px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: "max(12px, env(safe-area-inset-top)) 16px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(6, 16, 31, 0.45)",
          }}
        >
          <div className="ms-sheet-handle" style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: colors.grey || G.grey,
                }}
              >
                Préparation
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.ink || G.ink,
                  marginTop: 2,
                  lineHeight: 1.3,
                }}
              >
                Vérifie ta séance avant d’aller nager
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la préparation"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: `1px solid ${colors.greyLight || G.greyLight}`,
                background: colors.greyXLight || G.greyXLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={18} color={colors.ink || G.ink} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "16px 16px max(20px, env(safe-area-inset-bottom))",
          }}
        >
          <WorkoutPrepView
            session={session}
            colors={colors}
            accent={accent}
            isPremium={isPremium}
            showStart={false}
            profile={profile}
            planId={planId}
            whyLine={whyLine}
            onUpgrade={onUpgrade}
            onTooHard={onTooHard}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
