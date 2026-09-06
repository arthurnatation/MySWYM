import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users, ChevronRight, X, Home, Calendar, ChartNoAxesCombined, Lock, History, RefreshCw,
} from "lucide-react";
import { G } from "./theme/palette.js";
import { playUiSound } from "./lib/ui-sounds.js";
import { resolveAvatarUrl } from "./lib/avatar.js";

/** Menu hamburger : navigation modules (réglages → Profil). */
export default function SettingsDrawer({
  open,
  onClose,
  user,
  isPremium,
  onUpgrade,
  onGoHome,
  onGoPlan,
  onGoAnalyse,
  onGoHistory,
  onGoProfile,
  onGoBuddies,
  onModifyPlan,
  showBuddies = false,
  lockBuddies = false,
  showModifyPlan = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const avatarUrl = resolveAvatarUrl(user);
  const firstName = user?.user_metadata?.firstname
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "Nageur";
  const displayName = String(firstName).toUpperCase();
  const initials = firstName.slice(0, 2).toUpperCase();

  const go = (fn) => {
    playUiSound("soft");
    fn?.();
    onClose();
  };

  const moduleRow = (opts) => (
    <button
      key={opts.id}
      type="button"
      onClick={() => {
        if (opts.locked) {
          playUiSound("soft");
          onUpgrade?.(opts.upgradeCtx || "menu");
          onClose();
          return;
        }
        go(opts.onClick);
      }}
      className="ms-menu-row"
    >
      <span className="ms-menu-row-icon" style={opts.bg ? { background: opts.bg } : undefined}>
        <opts.Icon size={20} color={opts.color || G.blue} strokeWidth={1.75} />
        {opts.locked ? (
          <Lock size={10} color={G.grey} style={{ position: "absolute", right: 5, bottom: 5 }} />
        ) : null}
      </span>
      <span className="ms-menu-row-label">{opts.label}</span>
      <ChevronRight size={18} color={G.greyMid} strokeWidth={2} />
    </button>
  );

  return createPortal(
    <div
      className="ms-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
    >
      <div className="ms-menu-mist" aria-hidden="true" />
      <div className="ms-menu-panel">
        <header className="ms-menu-header">
          <button
            type="button"
            onClick={() => {
              playUiSound("soft");
              onClose();
            }}
            aria-label="Fermer le menu"
            className="ms-glass-icon-btn"
          >
            <X size={18} color={G.ink} strokeWidth={2.25} />
          </button>
        </header>

        <button
          type="button"
          onClick={() => go(onGoProfile)}
          className="ms-menu-profile"
        >
          <div className="ms-menu-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ms-menu-profile-name">{displayName}</div>
            <div className="ms-menu-profile-email">
              {user?.email || "Compte mySWYM"}
            </div>
          </div>
          <ChevronRight size={18} color={G.greyMid} />
        </button>

        {!isPremium ? (
          <div className="ms-menu-promo">
            <div className="ms-menu-promo-copy">
              <div className="ms-menu-promo-title">Passer Premium</div>
              <div className="ms-menu-promo-sub">
                Plans complets, adaptation et binômes.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playUiSound("tap");
                onUpgrade?.("menu_premium");
                onClose();
              }}
              className="ms-menu-promo-cta"
            >
              Voir l’abonnement
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : null}

        <div className="ms-menu-list">
          {moduleRow({ id: "home", Icon: Home, label: "Accueil", onClick: onGoHome })}
          {moduleRow({ id: "plan", Icon: Calendar, label: "Programme", onClick: onGoPlan })}
          {moduleRow({
            id: "analyse",
            Icon: ChartNoAxesCombined,
            label: "Analyse",
            onClick: onGoAnalyse,
            bg: "rgba(26, 168, 194, 0.12)",
            color: G.water,
          })}
          {moduleRow({
            id: "history",
            Icon: History,
            label: "Historique",
            onClick: onGoHistory,
            bg: "rgba(212, 160, 23, 0.12)",
            color: G.gold,
          })}
          {showBuddies
            ? moduleRow({
                id: "buddies",
                Icon: Users,
                label: "Binômes",
                onClick: onGoBuddies,
                locked: lockBuddies,
                upgradeCtx: "buddies",
                bg: "rgba(31, 174, 134, 0.12)",
                color: G.mint,
              })
            : null}
          {showModifyPlan && onModifyPlan
            ? moduleRow({
                id: "modify-plan",
                Icon: RefreshCw,
                label: "Modifier mon plan",
                onClick: onModifyPlan,
                bg: "rgba(0, 107, 253, 0.1)",
                color: G.blue,
              })
            : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
