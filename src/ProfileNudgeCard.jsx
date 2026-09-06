import { Ruler, X } from "lucide-react";
import { FONT, FONT_DISPLAY } from "./theme/brand.js";

const G = {
  surface: "var(--myswym-surface, #06101f)",
  ink: "var(--myswym-ink, #f4f8fa)",
  grey: "var(--myswym-grey, #9bb0c8)",
  greyLight: "var(--myswym-grey-light, rgba(0, 107, 253, 0.22))",
  blue: "var(--myswym-blue, #006bfd)",
  blueLight: "var(--myswym-blue-light, #0a162c)",
};

export default function ProfileNudgeCard({ onOpenProfile, onDismiss }) {
  return (
    <div
      role="note"
      className="ms-glass-card"
      style={{
        borderRadius: 18,
        padding: "14px 14px 14px 16px",
        marginBottom: 16,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: G.blueLight, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Ruler size={18} color={G.blue} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: G.ink, letterSpacing: "-0.03em" }}>
          Bassin et matériel
        </div>
        <p style={{ margin: "4px 0 10px", fontSize: 13, lineHeight: 1.45, color: G.grey, fontFamily: FONT }}>
          Après ta première séance : confirme ton bassin (25 ou 50 m) et ton matériel dans Profil pour des séances encore plus justes.
        </p>
        <button
          type="button"
          onClick={onOpenProfile}
          style={{
            border: "none", background: "none", padding: 0, cursor: "pointer",
            color: G.blue, fontSize: 13, fontWeight: 700, fontFamily: FONT, minHeight: 44,
          }}
        >
          Compléter mon profil
        </button>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer"
          style={{
            width: 44, height: 44, flexShrink: 0, border: "none", background: "none",
            color: G.grey, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
