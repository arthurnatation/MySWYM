import { Home, Calendar, ChartNoAxesCombined, History } from "lucide-react";
import { G } from "../theme/palette.js";
import { playUiSound } from "../lib/ui-sounds.js";

export default function BottomNav({ active, onChange, newBadge }) {
  const tabs = [
    { id: "home", Icon: Home, label: "Accueil" },
    { id: "plan", Icon: Calendar, label: "Programme" },
    { id: "analyse", Icon: ChartNoAxesCombined, label: "Analyse" },
    { id: "history", Icon: History, label: "Historique" },
  ];
  return (
    <div className="bottom-nav">
      <nav className="bottom-nav-inner" style={{ minHeight: "var(--bottom-nav-h)", padding: "8px 6px" }} aria-label="Navigation principale">
        {tabs.map((t) => {
          const isActive = active === t.id;
          const iconColor = isActive ? G.blue : G.grey;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playUiSound("nav");
                onChange(t.id);
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={t.label}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, background: "none", border: "none", cursor: "pointer",
                minHeight: 48, padding: "4px 2px", position: "relative",
              }}
            >
              <span
                className={isActive ? "ms-nav-active-halo" : undefined}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 36,
                  borderRadius: 999,
                  background: isActive ? "rgba(0, 107, 253, 0.12)" : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <t.Icon size={22} color={iconColor} strokeWidth={isActive ? 2.2 : 1.6} style={{ transition: "all 0.2s" }} />
                {t.id === "analyse" && newBadge && (
                  <div style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: G.coral }} />
                )}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? G.blue : G.grey,
              }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
