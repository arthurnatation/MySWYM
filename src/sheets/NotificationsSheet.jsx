import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronRight, X } from "lucide-react";
import {
  NOTIFICATION_KIND_META,
  formatNotificationDate,
} from "../lib/in-app-notifications.js";

/** Action produit associée au type de notif. */
export function notificationActionFor(item) {
  switch (item?.type) {
    case "billing":
    case "security":
    case "promo":
      return "upgrade";
    case "badge":
      return "profile";
    case "buddy":
      return "buddies";
    default:
      return null;
  }
}

/**
 * Centre de notifications, bottom sheet soft mist.
 */
export default function NotificationsSheet({
  open,
  items = [],
  onClose,
  onAction,
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

  if (!open) return null;

  return createPortal(
    <div
      className="sheet-overlay ms-soft-overlay ms-notif-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="sheet-panel scale-in ms-soft-sheet ms-notif-sheet">
        <div className="ms-notif-head">
          <div className="ms-sheet-handle" />
          <div className="ms-notif-head-row">
            <div style={{ minWidth: 0 }}>
              <h2 className="ms-notif-title">Notifications</h2>
              <p className="ms-notif-subtitle">
                {items.length
                  ? `${items.length} notification${items.length > 1 ? "s" : ""}`
                  : "Aucune notification pour l’instant"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer les notifications"
              className="ms-notif-close"
            >
              <X size={18} color="currentColor" />
            </button>
          </div>
        </div>

        <div className="ms-notif-body">
          {items.length ? (
            <div className="ms-notif-list">
              {items.map((item) => {
                const kindMeta = NOTIFICATION_KIND_META[item.type] || NOTIFICATION_KIND_META.update;
                const Icon = item.accentIcon || kindMeta.Icon;
                const bg = item.type === "badge" ? `${item.accentColor}22` : kindMeta.bg;
                const color = item.accentColor || kindMeta.color;
                const action = notificationActionFor(item);
                const interactive = Boolean(action && onAction);
                const Wrapper = interactive ? "button" : "div";
                return (
                  <Wrapper
                    key={item.id}
                    type={interactive ? "button" : undefined}
                    onClick={interactive ? () => onAction(item, action) : undefined}
                    className={`ms-notif-card${interactive ? " is-interactive" : ""}`}
                  >
                    <div className="ms-notif-icon" style={{ background: bg, color }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="ms-notif-card-title">{item.title}</div>
                      <div className="ms-notif-card-body">{item.body}</div>
                      <div className="ms-notif-card-date">
                        {formatNotificationDate(item.createdAt)}
                      </div>
                    </div>
                    {interactive ? (
                      <ChevronRight size={18} color="#8A9AAB" className="ms-notif-chevron" />
                    ) : null}
                  </Wrapper>
                );
              })}
            </div>
          ) : (
            <div className="ms-notif-empty">
              <div className="ms-notif-empty-icon">
                <Bell size={22} color="#006bfd" />
              </div>
              <div className="ms-notif-empty-title">Rien pour le moment</div>
              <div className="ms-notif-empty-text">
                Ici tu verras les badges, alertes d’abonnement, binômes et mises à jour.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
