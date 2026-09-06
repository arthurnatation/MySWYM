import { useEffect, useState } from "react";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import { usePageSeo, breadcrumbJsonLd, faqPageJsonLd } from "./lib/seo.js";
import { BRAND, FONT, FONT_DISPLAY } from "./theme/brand.js";
import "./theme/public.css";

const C = { ...BRAND };

export default function FaqPage() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const [open, setOpen] = useState(0);
  const items = [1, 2, 3, 4, 5].map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }));
  const crumbs = [
    { label: tc("footer.home"), href: "/" },
    { label: tc("nav.faq") },
  ];

  usePageSeo({
    title: t("faqPage.metaTitle"),
    description: t("faqPage.metaDescription"),
    path: "/faq",
    jsonLd: [
      breadcrumbJsonLd(crumbs.map((c, i) => (i < crumbs.length - 1 ? c : { label: c.label }))),
      faqPageJsonLd(items),
    ],
  });

  useEffect(() => {
    document.body.style.background = C.bg;
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="ms-root" style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.ink }}>
      <PublicNav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "96px 20px 64px" }}>
         <Breadcrumb items={crumbs} />
        <p style={{ color: C.primary, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", margin: "0 0 12px" }}>
          {t("faq.label")}
        </p>
        <h1 style={{
          fontFamily: FONT_DISPLAY, fontSize: "clamp(34px,5vw,52px)", fontWeight: 800,
          color: C.ink, margin: "0 0 12px", letterSpacing: "-0.03em",
        }}>
          {t("faq.title")}
        </h1>
        <p style={{ color: C.inkLight, fontSize: 16, lineHeight: 1.65, margin: "0 0 32px" }}>
          {t("faqPage.intro")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                style={{
                  background: isOpen ? C.cardAlt : C.card,
                  border: `1px solid ${isOpen ? C.outlineVar : C.border}`,
                  borderRadius: 18, overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "18px 22px", background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", gap: 16, minHeight: 56, fontFamily: FONT,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.ink, flex: 1, lineHeight: 1.4 }}>{item.q}</span>
                  <ChevronDown size={18} color={C.secondary} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                </button>
                {isOpen && (
                  <p style={{ margin: 0, padding: "0 22px 20px", fontSize: 14, color: C.inkLight, lineHeight: 1.75 }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 36, color: C.inkLight, fontSize: 15 }}>
          {t("faqPage.moreTitle")}{" "}
          <LocalizedLink to="/contact" style={{ color: C.primaryDeep, fontWeight: 700, textDecoration: "none" }}>
            {t("faqPage.moreCta")}
          </LocalizedLink>
        </p>
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
