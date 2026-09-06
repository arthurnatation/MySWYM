import { Lock } from "lucide-react";
import { G } from "../theme/palette.js";
import { PRICING_SUMMARY_FR } from "../lib/pricing.js";
import Btn from "../ui/Btn.jsx";
import SoftMistSheet from "./SoftMistSheet.jsx";
import SessionHeroCard from "../SessionHeroCard.jsx";

const MUTED = "#4a5d72";

export default function TrialExpiredFreeze({ onSubscribe, onSignOut, preview = null }) {
  const heroPreview = preview
    ? {
        title: preview.title || "Séance",
        type: preview.type || "En pause",
        distanceLabel: preview.distance ? `${preview.distance} m` : null,
        durationLabel: preview.duration ? `${preview.duration} min` : null,
        blocks: preview.blocks || [],
      }
    : null;

  return (
    <SoftMistSheet
      open
      eyebrow="Essai terminé"
      title="Ton essai est terminé"
      subtitle={`Le coach est en pause. Abonne-toi pour reprendre tes séances, ${PRICING_SUMMARY_FR}.`}
      onClose={undefined}
      dismissOnOverlay={false}
      zIndex={500}
      ariaLabel="Essai terminé"
      bodyClassName="ms-soft-sheet-body--tall"
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: G.blue,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 18px",
        }}
      >
        <Lock size={24} color={G.white} />
      </div>

      {heroPreview ? (
        <div
          aria-hidden
          style={{
            textAlign: "left",
            marginBottom: 22,
            filter: "blur(5px)",
            opacity: 0.55,
            pointerEvents: "none",
            userSelect: "none",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "1.25rem",
              zIndex: 1,
              background: "linear-gradient(180deg, transparent 30%, rgba(244, 248, 252, 0.85) 100%)",
            }}
          />
          <SessionHeroCard preview={heroPreview} kicker="Aperçu, en pause" className="is-compact" />
        </div>
      ) : null}

      <Btn variant="blue" onClick={onSubscribe} style={{ width: "100%", minHeight: 52 }}>
        Reprendre avec Premium
      </Btn>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 14,
          border: "none",
          background: "none",
          color: MUTED,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        Se déconnecter
      </button>
      <p style={{ fontSize: 12, color: MUTED, marginTop: 16, lineHeight: 1.45, textAlign: "center" }}>
        Besoin d’aide ?{" "}
        <a href="mailto:support@myswym.app" style={{ color: G.blue, fontWeight: 700, textDecoration: "none" }}>
          support@myswym.app
        </a>
      </p>
    </SoftMistSheet>
  );
}
