import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bottom sheet soft mist partagé (tips séance, éducatifs, popups app).
 */
export default function SoftMistSheet({
  open = true,
  title,
  eyebrow = null,
  subtitle = null,
  onClose,
  children,
  ariaLabel = null,
  className = "",
  bodyClassName = "",
  lockScroll = true,
}) {
  useEffect(() => {
    if (!open || !lockScroll) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, lockScroll]);

  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`sheet-overlay ms-soft-overlay ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || "Dialogue"}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="sheet-panel scale-in ms-soft-sheet">
        <div className="ms-soft-sheet-head">
          <div className="ms-sheet-handle" />
          <div className="ms-soft-sheet-head-row">
            <div style={{ minWidth: 0, flex: 1 }}>
              {eyebrow ? <div className="ms-soft-sheet-eyebrow">{eyebrow}</div> : null}
              {title ? <h3 className="ms-soft-sheet-title">{title}</h3> : null}
              {subtitle ? <p className="ms-soft-sheet-subtitle">{subtitle}</p> : null}
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="ms-soft-sheet-close"
              >
                <X size={18} color="currentColor" />
              </button>
            ) : null}
          </div>
        </div>
        <div className={`ms-soft-sheet-body ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
