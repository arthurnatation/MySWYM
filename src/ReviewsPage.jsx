import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import LandingReviews from "./marketing/LandingReviews.jsx";
import { usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import { BRAND, FONT } from "./theme/brand.js";
import "./theme/public.css";
import "./landing/landing.css";

const C = { ...BRAND };

export default function ReviewsPage() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const crumbs = [
    { label: tc("footer.home"), href: "/" },
    { label: tc("footer.reviews") },
  ];

  usePageSeo({
    title: t("reviewsPage.metaTitle"),
    description: t("reviewsPage.metaDescription"),
    path: "/avis",
    jsonLd: breadcrumbJsonLd(crumbs.map((c, i) => (i < crumbs.length - 1 ? c : { label: c.label }))),
  });

  useEffect(() => {
    document.body.style.background = C.bg;
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lp-root" style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.ink }}>
      <PublicNav />
      <main style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
        <div className="lp-wrap" style={{ maxWidth: 800, paddingTop: 28 }}>
           <Breadcrumb items={crumbs} />
        </div>
        <LandingReviews asPage />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
