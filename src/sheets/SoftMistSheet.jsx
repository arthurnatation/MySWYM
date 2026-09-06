import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bottom sheet soft mist partagé (tips séance, éducatifs, popups app).
 * `fullscreenMobile` : quasi plein écran sous 640px (prep séance).
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
  zIndex = null,
  dismissOnOverlay = true,
  fullscreenMobile = false,
}) {
  /** Ignore le click/mouseup qui a ouvert le sheet (évite fermeture immédiate). */
  const ignoreDismissUntil = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    ignoreDismissUntil.current = Date.now() + 350;
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || !lockScroll) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, lockScroll]);

  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    // capture : le sheet du dessus mange Escape avant le parent (prep / historique).
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const overlayClass = [
    "sheet-overlay",
    "ms-soft-overlay",
    fullscreenMobile ? "ms-soft-overlay--fullscreen" : "",
    zIndex != null ? "ms-soft-overlay--stacked" : "",
    className,
  ].filter(Boolean).join(" ");

  const panelClass = [
    "sheet-panel",
    "scale-in",
    "ms-soft-sheet",
    fullscreenMobile ? "ms-soft-sheet--fullscreen" : "",
  ].filter(Boolean).join(" ");

  const tryDismiss = (e) => {
    if (!dismissOnOverlay || !onClose) return;
    if (e.target !== e.currentTarget) return;
    if (Date.now() < ignoreDismissUntil.current) return;
    onClose();
  };

  return createPortal(
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || "Dialogue"}
      style={zIndex != null ? { zIndex } : undefined}
      onMouseDown={tryDismiss}
      onClick={tryDismiss}
    >
      <div
        className={panelClass}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
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
