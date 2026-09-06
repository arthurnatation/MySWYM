import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { usePageSeo, breadcrumbJsonLd, faqPageJsonLd } from "./lib/seo.js";
import { usePublicCta } from "./lib/use-auth-session.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/lp-accordion.jsx";
import LandingReviews from "./marketing/LandingReviews.jsx";
import "./theme/public.css";
import "./landing/landing.css";

const STEP_ICONS = [ClipboardList, Sparkles, BookOpen, RefreshCw];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SessionPreview() {
  const { t } = useTranslation("landing");
  const blocks = [
    { label: t("session.warmLabel"), content: t("session.warmContent") },
    { label: t("session.mainLabel"), content: t("session.mainContent") },
    { label: t("session.coolLabel"), content: t("session.coolContent") },
  ];
  return (
    <div className="ms-session">
      <div className="ms-session-head">
        <span className="ms-blog-tag">{t("session.type")}</span>
        <h3>{t("session.heading")}</h3>
        <p>{t("session.meta")}</p>
      </div>
      {blocks.map((b) => (
        <div key={b.label} className="ms-session-block">
          <strong>{b.label}</strong>
          <p>{b.content}</p>
        </div>
      ))}
      <p className="ms-session-tip">{t("session.tip")}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const cta = usePublicCta();
  const crumbs = [
    { label: tc("footer.home"), href: "/" },
    { label: tc("nav.how") },
  ];
  const steps = [1, 2, 3, 4].map((n) => ({
    n,
    Icon: STEP_ICONS[n - 1],
    meta: t(`howPage.s${n}Meta`),
    title: t(`how.s${n}Title`),
    desc: t(`how.s${n}Desc`),
  }));
  const trial = [1, 2, 3].map((n) => ({
    title: t(`howPage.t${n}Title`),
    desc: t(`howPage.t${n}Desc`),
  }));
  const who = [1, 2, 3].map((n) => t(`howPage.w${n}`));
  const faqItems = [1, 2, 3].map((n) => ({
    id: `how-faq-${n}`,
    q: t(`howPage.fq${n}`),
    a: t(`howPage.fa${n}`),
  }));

  usePageSeo({
    title: t("meta.howTitle"),
    description: t("meta.howDescription"),
    path: "/comment-ca-marche",
    jsonLd: [breadcrumbJsonLd(crumbs), faqPageJsonLd(faqItems)],
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToSession = () => {
    document.getElementById("seance")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="ms-root">
      <PublicNav />

      <header className="ms-how-hero">
        <div className="ms-how-wrap ms-how-hero-grid">
          <div>
             <Breadcrumb items={crumbs} />
            <h1 className="ms-how-h1">
              <span>{t("howPage.h1a")}</span>
              <span>{t("howPage.h1b")}</span>
            </h1>
            <p className="ms-pricing-lead">{t("howPage.lead")}</p>
            <ul className="ms-how-chips">
              <li>{t("howPage.chipQuiz")}</li>
              <li>{t("howPage.chipTrial")}</li>
              <li>{t("howPage.chipPool")}</li>
            </ul>
            <div className="ms-how-hero-cta">
              <LocalizedLink to={cta.href} className="ms-btn">
                {t("howPage.cta")} <ArrowRight size={15} aria-hidden />
              </LocalizedLink>
              <button type="button" className="ms-how-see" onClick={scrollToSession}>
                {t("howPage.seeSession")}
              </button>
            </div>
          </div>
          <div className="ms-how-hero-media">
            <img
              src="/hero-pool.webp"
              alt={t("howPage.heroAlt")}
              width={1200}
              height={800}
            />
          </div>
        </div>
      </header>

      <section className="ms-how-section" aria-labelledby="how-steps-title">
        <div className="ms-how-wrap">
          <p className="ms-pricing-kicker">{t("howPage.stepsLabel")}</p>
          <h2 id="how-steps-title" className="ms-pricing-h2">
            {t("howPage.stepsTitle")}
          </h2>
          <ol className="ms-how-steps">
            {steps.map((s) => (
              <li key={s.n} className="ms-how-step">
                <div className="ms-how-step-icon" aria-hidden>
                  <s.Icon size={20} />
                </div>
                <div>
                  <p className="ms-how-step-meta">
                    {String(s.n).padStart(2, "0")} · {s.meta}
                  </p>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ms-how-section ms-how-section-alt" id="seance" aria-labelledby="how-session-title">
        <div className="ms-how-wrap ms-how-split">
          <div>
            <p className="ms-pricing-kicker">{t("howPage.sessionLabel")}</p>
            <h2 id="how-session-title" className="ms-pricing-h2">
              {t("howPage.sessionTitle")}
            </h2>
            <p className="ms-pricing-sub">{t("howPage.sessionLead")}</p>
            <div className="ms-how-inline-media">
              <img
                src="/nagerprogresser-objectif-landing.webp"
                alt={t("howPage.sessionAlt")}
                width={800}
                height={450}
                loading="lazy"
              />
            </div>
          </div>
          <SessionPreview />
        </div>
      </section>

      <section className="ms-how-section" aria-labelledby="how-trial-title">
        <div className="ms-how-wrap">
          <p className="ms-pricing-kicker">{t("howPage.trialLabel")}</p>
          <h2 id="how-trial-title" className="ms-pricing-h2">
            {t("howPage.trialTitle")}
          </h2>
          <p className="ms-pricing-sub">{t("howPage.trialLead")}</p>
          <div className="ms-how-trial">
            {trial.map((item, i) => (
              <article key={item.title} className="ms-how-trial-card">
                <p className="ms-how-step-meta">{String(i + 1).padStart(2, "0")}</p>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ms-how-section ms-how-section-alt" aria-labelledby="how-who-title">
        <div className="ms-how-wrap ms-how-split">
          <div className="ms-how-inline-media">
            <img src="/coach.webp" alt={t("howPage.whoAlt")} width={800} height={1000} loading="lazy" />
          </div>
          <div>
            <p className="ms-pricing-kicker">{t("howPage.whoLabel")}</p>
            <h2 id="how-who-title" className="ms-pricing-h2">
              {t("howPage.whoTitle")}
            </h2>
            <p className="ms-pricing-sub">{t("howPage.whoLead")}</p>
            <ul className="ms-how-who">
              {who.map((line) => (
                <li key={line}>
                  <Check size={16} aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="ms-how-section" aria-labelledby="how-faq-title">
        <div className="ms-how-wrap">
          <p className="ms-pricing-kicker">{t("howPage.faqLabel")}</p>
          <h2 id="how-faq-title" className="ms-pricing-h2">
            {t("howPage.faqTitle")}
          </h2>
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
          <p className="ms-how-faq-more">
            <LocalizedLink to="/faq" className="ms-contact-link">
              {t("howPage.allFaq")}
              <ArrowRight size={14} aria-hidden />
            </LocalizedLink>
          </p>
        </div>
      </section>

      <div className="lp-root ms-how-reviews">
        <LandingReviews showWriteCta={false} />
      </div>

      <section className="ms-pricing-final">
        <div className="ms-how-wrap">
          <p className="ms-pricing-kicker">{t("howPage.lastLabel")}</p>
          <h2 className="ms-pricing-h2">{t("howPage.lastTitle")}</h2>
          <p className="ms-pricing-sub">{t("howPage.lastLead")}</p>
          <div className="ms-pricing-cta-row">
            <LocalizedLink to={cta.href} className="ms-btn">
              {t("howPage.cta")} <ArrowRight size={15} aria-hidden />
            </LocalizedLink>
            <LocalizedLink to="/tarifs" className="ms-btn ms-btn-ghost">
              {t("howPage.toPricing")}
            </LocalizedLink>
          </div>
        </div>
      </section>

      <Footer />
      <StickyCta revealOnScroll />
    </div>
  );
}
