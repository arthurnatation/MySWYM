import { Trash2 } from "lucide-react";
import { G } from "../theme/palette.js";

export default function ConfirmSheet({
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  destructive = true,
  icon: Icon = Trash2,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-sheet-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="sheet-panel ms-sheet-card scale-in">
        <div className="ms-sheet-handle" />
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: destructive ? G.coralLight : G.blueLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon size={22} color={destructive ? G.coral : G.blue} />
        </div>
        <h3
          id="confirm-sheet-title"
          style={{
            fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: G.ink,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p style={{ color: G.grey, fontSize: 14, textAlign: "center", lineHeight: 1.55, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: destructive ? G.coral : G.blue,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: `1.5px solid ${G.greyLight}`,
              background: G.surface,
              color: G.ink,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
