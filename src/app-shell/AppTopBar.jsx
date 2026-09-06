import { useEffect, useMemo, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { G } from "../theme/palette.js";
import BrandLogo from "../BrandLogo.jsx";
import { resolveAvatarUrl } from "../lib/avatar.js";
import {
  buildInAppNotifications,
  readSeenNotifications,
  writeSeenNotifications,
} from "../lib/in-app-notifications.js";
import NotificationsSheet from "../sheets/NotificationsSheet.jsx";
import { playUiSound } from "../lib/ui-sounds.js";

/** Barre haute Miracle : hamburger · picto MySWYM · notifs + avatar */
export default function AppTopBar({
  user,
  onOpenMenu,
  onAvatarClick,
  plan = null,
  onTabChange = null,
  onUpgrade = null,
  immersive = false,
}) {
  const avatarUrl = resolveAvatarUrl(user);
  const firstName = user?.user_metadata?.firstname
    || (() => {
      try {
        if (user?.id) {
          return localStorage.getItem(`myswym_firstname_${user.id}`) || localStorage.getItem("myswym_firstname");
        }
        return localStorage.getItem("myswym_firstname");
      } catch { return null; }
    })()
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "Nageur";
  const initials = firstName.slice(0, 2).toUpperCase();
  const [notifOpen, setNotifOpen] = useState(false);
  const notificationItems = useMemo(
    () => buildInAppNotifications({ user, plan }),
    [user, plan],
  );
  const [seenMap, setSeenMap] = useState(() => readSeenNotifications(user));
  const unreadCount = notificationItems.filter((item) => !seenMap[item.id]).length;

  useEffect(() => {
    setSeenMap(readSeenNotifications(user));
  }, [user?.id, user?.user_metadata?.notifications_seen]);

  useEffect(() => {
    const existing = readSeenNotifications(user);
    if (Object.keys(existing).length > 0) return;
    const bootstrapSeen = {};
    notificationItems.forEach((item) => {
      if (item.type === "badge") bootstrapSeen[item.id] = Date.now();
    });
    if (Object.keys(bootstrapSeen).length > 0) {
      writeSeenNotifications(user, bootstrapSeen);
      setSeenMap(bootstrapSeen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per user/plan
  }, [user?.id, plan]);

  const markNotificationsAsRead = (items = notificationItems) => {
    if (!items.length) return;
    const next = { ...readSeenNotifications(user) };
    const stamp = Date.now();
    items.forEach((item) => { next[item.id] = stamp; });
    writeSeenNotifications(user, next);
    setSeenMap(next);
  };

  const handleOpenNotifications = () => {
    playUiSound("soft");
    setNotifOpen(true);
    markNotificationsAsRead();
  };

  const handleNotificationAction = (_item, action) => {
    setNotifOpen(false);
    if (action === "upgrade") {
      onUpgrade?.();
      return;
    }
    if (action === "profile") {
      if (onTabChange) onTabChange("profile");
      else onAvatarClick?.();
      return;
    }
    if (action === "buddies") onTabChange?.("buddies");
  };

  const handleLogoClick = () => {
    if (!onTabChange) return;
    playUiSound("soft");
    onTabChange("home");
  };

  const iconColor = G.ink;

  return (
    <header
      className={immersive ? "ms-app-topbar is-immersive" : "ms-app-topbar"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: immersive ? "transparent" : G.glass,
        backdropFilter: immersive ? "none" : "blur(18px) saturate(1.15)",
        WebkitBackdropFilter: immersive ? "none" : "blur(18px) saturate(1.15)",
        borderBottom: immersive ? "none" : `1px solid ${G.greyLight}`,
        boxShadow: immersive ? "none" : "0 1px 16px rgba(0,107,253,0.08)",
        paddingTop: "var(--safe-top)",
      }}
    >
      <div
        className="app-shell"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 12,
          paddingBottom: 12,
          minHeight: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          {onOpenMenu ? (
            <button
              type="button"
              onClick={() => {
                playUiSound("soft");
                onOpenMenu();
              }}
              className="ms-glass-icon-btn"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} color={iconColor} strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            lineHeight: 0,
          }}
        >
          {onTabChange ? (
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="MySWYM, accueil"
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                padding: 6,
                margin: 0,
                cursor: "pointer",
                borderRadius: 10,
                lineHeight: 0,
              }}
            >
              <BrandLogo variant="mark" height={26} alt="" />
            </button>
          ) : (
            <BrandLogo variant="mark" height={26} alt="MySWYM" />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleOpenNotifications}
            className="ms-glass-icon-btn"
            aria-label={`Ouvrir les notifications (${unreadCount} non lues)`}
          >
            <Bell size={18} color={unreadCount ? G.gold : iconColor} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 14,
                  height: 14,
                  padding: "0 3px",
                  borderRadius: 999,
                  background: G.coral,
                  color: G.white,
                  border: "2px solid rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>
          {onAvatarClick ? (
            <button
              type="button"
              onClick={() => {
                playUiSound("soft");
                onAvatarClick();
              }}
              className="ms-glass-icon-btn"
              aria-label="Ouvrir le profil"
              style={{ overflow: "hidden", padding: 0 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 800, color: G.blue }}>{initials}</span>
              )}
            </button>
          ) : null}
        </div>
      </div>

      <NotificationsSheet
        open={notifOpen}
        items={notificationItems}
        onClose={() => setNotifOpen(false)}
        onAction={handleNotificationAction}
      />
    </header>
  );
}
