import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { supabase } from "./supabase.js";
import { track, trackEvent } from "./lib/analytics.js";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import { usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import CheckoutLegalGates, { checkoutGatesReady, checkoutGatesError } from "./CheckoutLegalGates.jsx";
import { PRICE_IDS, PRICING } from "./lib/pricing.js";
import { useAuthSession, usePublicCta } from "./lib/use-auth-session.js";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/lp-accordion.jsx";
import "./theme/public.css";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const COMPARE_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"];

export default function TarifsPage() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const cta = usePublicCta();
  const { isLoggedIn } = useAuthSession();
  const crumbs = [{ label: tc("footer.home"), href: "/" }, { label: tc("nav.pricing") }];
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptWithdrawal, setAcceptWithdrawal] = useState(false);

  usePageSeo({
    title: t("pricingPage.metaTitle"),
    description: t("pricingPage.metaDescription"),
    path: "/tarifs",
    jsonLd: breadcrumbJsonLd(crumbs),
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToOffers = () => {
    document.getElementById("offres")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  const handlePremium = async (priceId) => {
    if (checkoutBusy) return;
    setCheckoutError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      try {
        const ref = new URLSearchParams(window.location.search).get("ref");
        if (ref?.trim()) localStorage.setItem("myswym_ref", ref.trim().toUpperCase());
      } catch {
        /* ignore */
      }
      trackEvent("signup_started", { source: "pricing_page" }, { essential: true });
      track("signup_started", { source: "pricing_page" }, { onceKey: "signup_started:pricing_page" });
      window.location.href = cta.href;
      return;
    }
    if (!checkoutGatesReady(acceptTerms, acceptWithdrawal)) {
      setCheckoutError(checkoutGatesError(acceptTerms, acceptWithdrawal) || t("pricingPage.gatesError"));
      document.getElementById("checkout-legal-gates")?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
      return;
    }
    setCheckoutBusy(true);
    try {
      trackEvent("checkout_started", { source: "pricing_page", price_id: priceId }, { essential: true });
      let referralCode;
      try {
        referralCode =
          (
            session.user?.user_metadata?.referred_by ||
            localStorage.getItem("myswym_ref") ||
            ""
          ).toUpperCase() || undefined;
      } catch {
        referralCode = undefined;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ priceId, ...(referralCode ? { referralCode } : {}) }),
        },
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error || t("pricing.checkoutError"));
      setCheckoutBusy(false);
    } catch {
      setCheckoutError(t("pricing.checkoutError"));
      setCheckoutBusy(false);
    }
  };

  const plans = [
    {
      id: "flex",
      featured: false,
      priceId: PRICE_IDS.monthlyFlex,
      name: t("pricingPage.flexName"),
      title: t("pricingPage.flexTitle"),
      price: PRICING.monthlyFlex.label,
      period: t("pricingPage.perMonth"),
      meta: t("pricingPage.flexMeta"),
      cta: t("pricingPage.flexCta"),
      features: [t("pricingPage.flexF1"), t("pricingPage.flexF2"), t("pricingPage.flexF3")],
    },
    {
      id: "commit",
      featured: true,
      badge: t("pricing.recommended"),
      priceId: PRICE_IDS.monthlyCommit,
      name: t("pricingPage.commitName"),
      title: t("pricingPage.commitTitle"),
      price: PRICING.monthlyCommit.label,
      period: t("pricingPage.perMonth"),
      meta: t("pricingPage.commitMeta"),
      cta: t("pricingPage.commitCta"),
      features: [t("pricingPage.commitF1"), t("pricingPage.commitF2"), t("pricingPage.commitF3")],
    },
    {
      id: "annual",
      featured: false,
      badge: t("pricingPage.annualBadge"),
      priceId: PRICE_IDS.annual,
      name: t("pricingPage.annualName"),
      title: t("pricingPage.annualTitle"),
      price: PRICING.annual.label,
      period: t("pricingPage.perYear"),
      meta: t("pricingPage.annualMeta"),
      cta: t("pricingPage.annualCta"),
      features: [t("pricingPage.annualF1"), t("pricingPage.annualF2"), t("pricingPage.annualF3")],
    },
  ];

  const faqItems = [
    { id: "p1", q: t("pricingPage.faqQ1"), a: t("pricingPage.faqA1") },
    { id: "p2", q: t("faq.q3"), a: t("faq.a3") },
    { id: "p3", q: t("faq.q4"), a: t("faq.a4") },
    { id: "p4", q: t("pricingPage.faqQ2"), a: t("pricingPage.faqA2") },
    { id: "p5", q: t("pricingPage.faqQ3"), a: t("pricingPage.faqA3") },
  ];

  return (
    <div className="ms-root">
      <PublicNav />

      <section className="ms-pricing-hero">
        <div className="ms-pricing-wrap">
           <Breadcrumb items={crumbs} />
          <p className="ms-pricing-kicker">{t("pricingPage.eyebrow")}</p>
          <h1 className="ms-pricing-h1">{t("pricingPage.h1")}</h1>
          <p className="ms-pricing-lead">{t("pricingPage.lead")}</p>
          <div className="ms-pricing-cta-row">
            <LocalizedLink to={cta.href} className="ms-btn">
              {t("pricingPage.startTrial")}
              <ArrowRight size={16} aria-hidden />
            </LocalizedLink>
            <button type="button" className="ms-btn ms-btn-ghost" onClick={scrollToOffers}>
              {t("pricingPage.seeOffers")}
            </button>
          </div>
          <ul className="ms-pricing-chips">
            <li>{t("pricingPage.chipTrial")}</li>
            <li>{t("pricingPage.chipFlex")}</li>
            <li>{t("pricingPage.chipCommit")}</li>
            <li>{t("pricingPage.chipAnnual")}</li>
          </ul>
        </div>
      </section>

      <section id="offres" className="ms-pricing-section">
        <div className="ms-pricing-wrap">
          <div className="ms-pricing-grid">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`ms-pricing-card${plan.featured ? " is-featured" : ""}`}
              >
                <div className="ms-pricing-card-top">
                  <p className="ms-pricing-card-name">{plan.name}</p>
                  {plan.badge ? <span className="ms-pricing-badge">{plan.badge}</span> : null}
                </div>
                <h2 className="ms-pricing-card-title">{plan.title}</h2>
                <p className="ms-pricing-price">
                  {plan.price}
                  <span>{plan.period}</span>
                </p>
                <p className="ms-pricing-meta">{plan.meta}</p>
                <button
                  type="button"
                  className="ms-btn"
                  disabled={checkoutBusy}
                  onClick={() => handlePremium(plan.priceId)}
                >
                  {checkoutBusy ? t("pricingPage.checkoutBusy") : plan.cta}
                </button>
                <ul className="ms-pricing-features">
                  {plan.features.map((item) => (
                    <li key={item}>
                      <Check size={16} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="ms-pricing-note">{t("pricingPage.trialNote")}</p>
        </div>
      </section>

      {isLoggedIn && (
        <section className="ms-pricing-section" style={{ paddingTop: 0 }}>
          <div
            id="checkout-legal-gates"
            className="ms-pricing-gates"
          >
            <h2>{t("pricingPage.gatesTitle")}</h2>
            {checkoutError ? <p className="ms-pricing-error" role="alert">{checkoutError}</p> : null}
            <CheckoutLegalGates
              acceptTerms={acceptTerms}
              onAcceptTerms={(v) => {
                setAcceptTerms(v);
                setCheckoutError("");
              }}
              acceptWithdrawal={acceptWithdrawal}
              onAcceptWithdrawal={(v) => {
                setAcceptWithdrawal(v);
                setCheckoutError("");
              }}
              ink="#0f1b2d"
              muted="#4a5d72"
              linkColor="#006bfd"
            />
          </div>
        </section>
      )}

      {!isLoggedIn && checkoutError ? (
        <section className="ms-pricing-section" style={{ paddingTop: 0 }}>
          <p className="ms-pricing-error ms-pricing-wrap" role="alert">{checkoutError}</p>
        </section>
      ) : null}

      <section className="ms-pricing-section">
        <div className="ms-pricing-wrap">
          <h2 className="ms-pricing-h2">{t("pricingPage.compareTitle")}</h2>
          <p className="ms-pricing-sub">{t("pricingPage.compareLead")}</p>
          <div className="ms-pricing-table-wrap">
            <table className="ms-pricing-table">
              <thead>
                <tr>
                  <th scope="col">{t("pricingPage.colFeature")}</th>
                  <th scope="col">{t("pricingPage.colTrial")}</th>
                  <th scope="col">{t("pricingPage.colPremium")}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row}>
                    <th scope="row">{t(`pricingPage.${row}Label`)}</th>
                    <td>{t(`pricingPage.${row}Trial`)}</td>
                    <td>{t(`pricingPage.${row}Premium`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="faq" className="ms-pricing-section">
        <div className="ms-pricing-wrap">
          <p className="ms-pricing-kicker" style={{ display: "flex", marginInline: "auto" }}>
            {t("faq.label")}
          </p>
          <h2 className="ms-pricing-h2">{t("faq.title")}</h2>
          <Accordion type="single" collapsible className="ms-faq-list">
            {faqItems.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="ms-faq-item">
                <AccordionTrigger>
                  <span>{item.q}</span>
                  <ChevronDown size={16} color="var(--ms-primary)" aria-hidden />
                </AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="ms-pricing-final">
        <div className="ms-pricing-wrap">
          <p className="ms-pricing-kicker">{t("pricingPage.lastStep")}</p>
          <h2 className="ms-pricing-h2">{t("pricingPage.lastTitle")}</h2>
          <p className="ms-pricing-sub">{t("pricingPage.lastLead")}</p>
          <div className="ms-pricing-cta-row">
            <LocalizedLink to={cta.href} className="ms-btn">
              {t("pricingPage.startTrial")}
            </LocalizedLink>
            <button type="button" className="ms-btn ms-btn-ghost" onClick={scrollToOffers}>
              {t("pricingPage.seeOffers")}
            </button>
          </div>
        </div>
      </section>

      <Footer />
      <StickyCta />
    </div>
  );
}
