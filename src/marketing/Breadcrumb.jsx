import { useTranslation } from "react-i18next";
import { LocalizedLink } from "../i18n/locale-routing.jsx";
import { BRAND, FONT } from "../theme/brand.js";

/**
 * Fil d’Ariane, pages à plus d’un niveau (pas sur la landing).
 */
export default function Breadcrumb({ items, onDark = false }) {
  const { t } = useTranslation("common");
  const muted = onDark ? "rgba(255,255,255,0.55)" : BRAND.inkLight;
  const current = onDark ? "#f4f8fa" : BRAND.ink;
  const link = onDark ? "#74b4ff" : BRAND.primaryDeep;

  return (
    <nav aria-label={t("breadcrumb.label")} style={{ marginBottom: 20, fontFamily: FONT, fontSize: 13 }}>
      <ol style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", margin: 0, padding: 0, color: muted }}>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 ? <span aria-hidden>/</span> : null}
              {last || !item.href ? (
                <span style={{ color: current, fontWeight: 600 }}>{item.label}</span>
              ) : (
                <LocalizedLink
                  to={item.href}
                  style={{
                    color: link,
                    textDecoration: "none",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                    padding: "0 2px",
                  }}
                >
                  {item.label}
                </LocalizedLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
