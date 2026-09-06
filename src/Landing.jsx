import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/lp-accordion.jsx";
import { LpButton } from "./ui/lp-button.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { usePublicCta } from "./lib/use-auth-session.js";
import { landingCtaPath } from "./lib/landing-onboarding.js";
import {
  ArrowRight,
  Target,
  Sparkles,
  Repeat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gauge,
} from "lucide-react";
import { track } from "./lib/analytics.js";
import Footer from "./Footer.jsx";
import PublicNav from "./PublicNav.jsx";
import LandingReviews from "./marketing/LandingReviews.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import { usePublishedReviews } from "./marketing/usePublishedReviews.js";
import { usePageSeo, organizationJsonLd, softwareApplicationJsonLd } from "./lib/seo.js";
import "./landing/landing.css";

const OBJECTIVE_TABS = [
  { id: "progression", labelKey: "tabProgression", tagKey: "tagLevel", kindKey: "kindLevels", cards: ["p1", "p2", "p3"], media: "/nagerprogresser-objectif-landing.webp", width: 1672, height: 941 },
  {
    id: "triathlon",
    labelKey: "tabTriathlon",
    tagKey: "tagEvent",
    kindKey: "kindFormats",
    cards: ["t1", "t2", "t3", "t4", "t5"],
    media: "/Triathlon-objectif-landing.webp",
    width: 1672,
    height: 941,
  },
  { id: "openwater", labelKey: "tabOpenwater", tagKey: "tagDistance", kindKey: "kindBands", cards: ["w1", "w2", "w3"], media: "/Eaulibre-objectif-landing.webp", width: 1536, height: 1024 },
  { id: "diploma", labelKey: "tabDiploma", tagKey: "tagDiploma", kindKey: "kindDiplomas", cards: ["d1", "d2", "d3"], media: "/Sauveteur-objectif-landing.webp", width: 1536, height: 1024, comingSoon: true },
];

const INCLUDE_ITEMS = [
  { n: 1, Icon: Target },
  { n: 3, Icon: Gauge },
  { n: 4, Icon: Repeat },
  { n: 6, Icon: Sparkles },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Hero() {
  const { t } = useTranslation("landing");
  const cta = usePublicCta();
  return (
    <section className="lp-hero">
      <div className="lp-hero-bg" aria-hidden>
        <img
          src="/hero-pool.webp"
          alt=""
          className="lp-hero-img"
          width={1024}
          height={1024}
          fetchPriority="high"
        />
      </div>
      <div className="lp-wrap lp-hero-inner">
        <div className="lp-hero-copy">
          <h1 className="lp-h1 lp-display">{t("hero.title")}</h1>
          <p className="lp-lead">{t("hero.subtitle")}</p>
          <div className="lp-cta-row">
            <LpButton asChild size="lg">
              <Link to={cta.href}>
                {t("hero.cta")}
                <ArrowRight size={16} />
              </Link>
            </LpButton>
            <a href="#seance" className="lp-see-link">
              {t("hero.seeSession")}
              <ArrowRight size={14} />
            </a>
          </div>
          <p className="lp-hero-note">{t("hero.freeNote")}</p>
        </div>
        <aside className="lp-hero-phones" aria-label={t("session.label")}>
          <a href="#seance" className="lp-hero-phones-link">
            <img
              src="/hero-phone-mockup.webp"
              alt={t("hero.mockupAlt")}
              className="lp-hero-phones-img"
              width={1024}
              height={1536}
              decoding="async"
            />
          </a>
        </aside>
        <dl className="lp-stats lp-hero-stats">
          {[
            [t("hero.proof1Value"), t("hero.proof1Label")],
            [t("hero.proof2Value"), t("hero.proof2Label")],
            [t("hero.proof3Value"), t("hero.proof3Label")],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="lp-display">{n}</dt>
              <dd>{l}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Objectives() {
  const { t } = useTranslation("landing");
  const cta = usePublicCta();
  const initialCat = 1;
  const [tabId, setTabId] = useState(OBJECTIVE_TABS[initialCat].id);
  const [catIndex, setCatIndex] = useState(initialCat);
  const [canPrev, setCanPrev] = useState(initialCat > 0);
  const [canNext, setCanNext] = useState(initialCat < OBJECTIVE_TABS.length - 1);
  const railRef = useRef(null);
  const listRef = useRef(null);
  const catIndexRef = useRef(initialCat);
  const activeTab = OBJECTIVE_TABS.find((item) => item.id === tabId) || OBJECTIVE_TABS[0];
  const cardCount = activeTab.cards.length;

  const syncFromRail = () => {
    const el = railRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(".lp-obj-cat-card");
    if (!cards.length) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const mid = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    const next = OBJECTIVE_TABS[best];
    if (!next) return;
    catIndexRef.current = best;
    setCatIndex(best);
    setTabId(next.id);
    setCanPrev(best > 0);
    setCanNext(best < OBJECTIVE_TABS.length - 1);
  };

  const scrollToCat = (index, behavior) => {
    const el = railRef.current;
    const card = el?.querySelectorAll(".lp-obj-cat-card")?.[index];
    if (!el || !card) return;
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    el.scrollTo({
      left: Math.max(0, left),
      behavior:
        behavior ?? (prefersReducedMotion() ? "auto" : "smooth"),
    });
  };

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncFromRail);
    };
    const onResize = () => {
      scrollToCat(catIndexRef.current, "auto");
      syncFromRail();
    };
    // Démarre sur la 2e image pour montrer qu’on peut glisser (peek gauche + droite)
    scrollToCat(initialCat, "auto");
    syncFromRail();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [tabId]);

  const scrollByCat = (dir) => {
    scrollToCat(Math.min(OBJECTIVE_TABS.length - 1, Math.max(0, catIndex + dir)));
  };

  return (
    <section className="lp-section lp-obj-section">
      <div className="lp-wrap">
        <div className="lp-intro">
          <h2 className="lp-h2 lp-display">{t("objectives.title")}</h2>
          <p className="lp-lead lp-lead-tight">{t("objectives.subtitle")}</p>
        </div>
        <p className="lp-obj-hint" aria-live="polite">
          {t("objectives.hint", {
            category: t(`objectives.${activeTab.labelKey}`),
            qty: cardCount,
            kind: t(`objectives.${activeTab.kindKey}`),
          })}
        </p>
      </div>

      <div className="lp-obj-phone-stage">
        <button
          type="button"
          className="lp-obj-phone-nav lp-obj-phone-nav-prev"
          aria-label={t("objectives.scrollPrev")}
          disabled={!canPrev}
          onClick={() => scrollByCat(-1)}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="lp-obj-phone-scene">
          <div
            className="lp-obj-cat-rail"
            ref={railRef}
            role="tablist"
            aria-label={t("objectives.tabsAria")}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                scrollByCat(1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                scrollByCat(-1);
              } else if (e.key === "Home") {
                e.preventDefault();
                scrollToCat(0);
              } else if (e.key === "End") {
                e.preventDefault();
                scrollToCat(OBJECTIVE_TABS.length - 1);
              }
            }}
          >
            {OBJECTIVE_TABS.map((item, index) => {
              const selected = item.id === tabId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`lp-obj-tab-${item.id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={`lp-obj-cat-card${selected ? " is-active" : ""}${item.comingSoon ? " is-soon" : ""}`}
                  onClick={() => scrollToCat(index)}
                >
                  <img
                    src={item.media}
                    alt=""
                    width={item.width}
                    height={item.height}
                    draggable={false}
                  />
                  <span className="lp-obj-cat-label">
                    {t(`objectives.${item.labelKey}`)}
                    {item.comingSoon ? (
                      <span className="lp-obj-cat-soon">{t("objectives.comingSoonShort")}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lp-obj-phone">
            <span className="lp-obj-phone-btn lp-obj-phone-btn-silent" aria-hidden />
            <span className="lp-obj-phone-btn lp-obj-phone-btn-vol-up" aria-hidden />
            <span className="lp-obj-phone-btn lp-obj-phone-btn-vol-down" aria-hidden />
            <span className="lp-obj-phone-btn lp-obj-phone-btn-power" aria-hidden />
            <div className="lp-obj-phone-frame">
              <div className="lp-obj-phone-island" aria-hidden>
                <span className="lp-obj-phone-island-lens" />
                <span className="lp-obj-phone-island-sensor" />
              </div>
              <div className="lp-obj-phone-glass">
                <div className="lp-obj-phone-window" aria-hidden />
                <div
                  className="lp-obj-phone-panel"
                  ref={listRef}
                  role="tabpanel"
                  aria-labelledby={`lp-obj-tab-${activeTab.id}`}
                  aria-live="polite"
                >
                  <p className="lp-obj-phone-panel-kicker">
                    {t(`objectives.${activeTab.tagKey}`)}
                    {" · "}
                    {cardCount} {t(`objectives.${activeTab.kindKey}`)}
                  </p>
                  <ul className="lp-obj-format-list">
                    {activeTab.cards.map((key) => (
                      <li key={key}>
                        {activeTab.comingSoon ? (
                          <div className="lp-obj-format-card is-soon" aria-disabled="true">
                            <h3 className="lp-obj-format-title">{t(`objectives.${key}Title`)}</h3>
                            <p className="lp-obj-format-meta">{t(`objectives.${key}Meta`)}</p>
                            <p className="lp-obj-format-desc">{t(`objectives.${key}Desc`)}</p>
                            <span className="lp-obj-format-cta">{t("objectives.comingSoon")}</span>
                          </div>
                        ) : (
                          <LocalizedLink
                            to={landingCtaPath(key, cta.href)}
                            className="lp-obj-format-card"
                          >
                            <h3 className="lp-obj-format-title">{t(`objectives.${key}Title`)}</h3>
                            <p className="lp-obj-format-meta">{t(`objectives.${key}Meta`)}</p>
                            <p className="lp-obj-format-desc">{t(`objectives.${key}Desc`)}</p>
                            <span className="lp-obj-format-cta">
                              {t("objectives.cta")}
                              <ArrowRight size={14} />
                            </span>
                          </LocalizedLink>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lp-obj-phone-glare" aria-hidden />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="lp-obj-phone-nav lp-obj-phone-nav-next"
          aria-label={t("objectives.scrollNext")}
          disabled={!canNext}
          onClick={() => scrollByCat(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

function WhyMyswym() {
  const { t } = useTranslation("landing");
  const blocks = [1, 2, 3].map((n) => ({
    title: t(`why.b${n}Title`),
    stat: t(`why.b${n}Stat`),
    desc: t(`why.b${n}Desc`),
  }));
  return (
    <section id="pourquoi" className="lp-band">
      <div className="lp-wrap lp-section">
        <p className="lp-kicker">{t("why.label")}</p>
        <h2 className="lp-h2 lp-display">{t("why.title")}</h2>
        <p className="lp-lead lp-lead-tight">{t("why.subtitle")}</p>
        <div className="lp-why-grid">
          {blocks.map((b) => (
            <div key={b.title} className="lp-card">
              <h3 className="lp-feature-title lp-feature-title-flush">{b.title}</h3>
              <p className="lp-card-kicker">{b.stat}</p>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SessionPreview() {
  const { t } = useTranslation("landing");
  const cta = usePublicCta();
  const beats = [
    { label: t("session.warmLabel"), detail: t("session.warmContent") },
    { label: t("session.mainLabel"), detail: t("session.mainContent") },
    { label: t("session.coolLabel"), detail: t("session.coolContent") },
  ];
  return (
    <section id="seance" className="lp-band">
      <div className="lp-wrap lp-section lp-session-preview">
        <div className="lp-session-preview-phone">
          <img
            src="/session-phone-mockup.png"
            alt={t("session.mockupAlt")}
            className="lp-session-preview-phone-img"
            width={682}
            height={1024}
            decoding="async"
            loading="lazy"
          />
        </div>
        <div className="lp-session-preview-copy">
          <p className="lp-kicker">{t("session.label")}</p>
          <h2 className="lp-h2 lp-display">{t("session.title")}</h2>
          <p className="lp-lead lp-lead-tight">{t("session.subtitle")}</p>
          <div className="lp-session-preview-detail">
            <img
              src="/session-detail-mockup.webp"
              alt={t("session.detailMockupAlt")}
              className="lp-session-preview-detail-img"
              width={1024}
              height={1536}
              decoding="async"
              loading="lazy"
            />
          </div>
          <ul className="lp-session-beats">
            {beats.map((b) => (
              <li key={b.label} className="lp-session-beat">
                <strong>{b.label}</strong>
                <p>{b.detail}</p>
              </li>
            ))}
          </ul>
          <p className="lp-session-tip">{t("session.tip")}</p>
          <LpButton asChild className="lp-session-cta">
            <Link to={cta.href}>
              {t("session.cta")}
              <ArrowRight size={14} />
            </Link>
          </LpButton>
        </div>
      </div>
    </section>
  );
}

function CoachSection() {
  const { t } = useTranslation("landing");
  const cta = usePublicCta();
  return (
    <section id="coach" className="lp-section lp-coach-section">
      <div className="lp-wrap lp-coach">
        <div className="lp-coach-copy">
          <p className="lp-kicker">{t("coach.label")}</p>
          <p className="lp-card-kicker lp-coach-eyebrow">{t("coach.eyebrow")}</p>
          <h2 className="lp-h2 lp-display lp-coach-title">
            {t("coach.titleLine1")}<br />{t("coach.titleLine2")}
          </h2>
          <p className="lp-lead lp-coach-body">{t("coach.body")}</p>
          <div className="lp-coach-actions">
            <LpButton asChild className="lp-coach-cta">
              <Link to={cta.href}>
                {t("coach.cta")}
                <ArrowRight size={14} />
              </Link>
            </LpButton>
            <a
              href={t("coach.igHref")}
              className="lp-see-link lp-coach-ig"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("coach.igCta")}
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
        <div className="lp-coach-media">
          <img
            src="/coach.webp"
            alt="Arthur Noël, coach MySWYM"
            width={756}
            height={756}
            className="lp-coach-photo"
            loading="lazy"
          />
          <blockquote className="lp-quote">{t("coach.quote")}</blockquote>
        </div>
      </div>
    </section>
  );
}

function Includes() {
  const { t } = useTranslation("landing");
  const items = INCLUDE_ITEMS.map(({ n, Icon }) => ({
    Icon,
    title: t(`includes.i${n}Title`),
    desc: t(`includes.i${n}Desc`),
  }));
  return (
    <section className="lp-band">
      <div className="lp-wrap lp-section">
        <p className="lp-kicker">{t("includes.label")}</p>
        <h2 className="lp-h2 lp-display">{t("includes.title")}</h2>
        <p className="lp-lead lp-lead-tight">{t("includes.subtitle")}</p>
        <div className="lp-grid-2 lp-includes-grid">
          {items.map((item) => (
            <div key={item.title} className="lp-card">
              <item.Icon size={24} color="var(--lp-primary)" strokeWidth={1.8} />
              <h3 className="lp-feature-title">{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const { t } = useTranslation("landing");
  const items = [1, 2, 3, 4, 5].map((n) => ({ id: `faq-${n}`, q: t(`faq.q${n}`), a: t(`faq.a${n}`) }));
  const chatPoints = [1, 2, 3].map((n) => t(`faq.chatPoint${n}`));
  return (
    <section id="faq" className="lp-section">
      <div className="lp-wrap lp-faq-section">
        <div className="lp-faq-intro">
          <p className="lp-kicker lp-center">{t("faq.label")}</p>
          <h2 className="lp-h2 lp-display lp-faq-title">{t("faq.title")}</h2>
        </div>
        <div className="lp-faq-layout">
          <div className="lp-faq-main">
            <Accordion type="single" collapsible className="lp-faq-list">
              {items.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="lp-faq-item">
                  <AccordionTrigger>
                    <span>{item.q}</span>
                    <ChevronDown size={16} color="var(--lp-primary)" aria-hidden />
                  </AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="lp-see">
              <LocalizedLink to="/faq" className="lp-see-link">
                {t("faq.seeAll")}
                <ArrowRight size={14} />
              </LocalizedLink>
            </p>
          </div>
          <aside className="lp-faq-chat" aria-label={t("faq.chatTitle")}>
            <div className="lp-faq-chat-phone">
              <img
                src="/faq-chat-mockup.webp"
                alt={t("faq.mockupAlt")}
                className="lp-faq-chat-phone-img"
                width={1024}
                height={1536}
                decoding="async"
                loading="lazy"
              />
            </div>
            <div className="lp-faq-chat-copy">
              <p className="lp-kicker">{t("faq.chatKicker")}</p>
              <h3 className="lp-faq-chat-title lp-display">{t("faq.chatTitle")}</h3>
              <p className="lp-faq-chat-body">{t("faq.chatBody")}</p>
              <ul className="lp-faq-chat-points">
                {chatPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <LpButton asChild className="lp-faq-chat-cta">
                <LocalizedLink to="/tarifs">
                  {t("faq.chatCta")}
                  <ArrowRight size={14} />
                </LocalizedLink>
              </LpButton>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation("landing");
  const cta = usePublicCta();
  return (
    <section className="lp-section lp-final">
      <div className="lp-wrap">
        <div className="lp-cta-box">
          <h2 className="lp-h2 lp-display">{t("finalCta.title")}</h2>
          <p className="lp-lead lp-lead-center">{t("finalCta.subtitle")}</p>
          <LpButton asChild size="lg" className="lp-cta-box-btn">
            <Link to={cta.href}>
              {t("finalCta.cta")}
              <ArrowRight size={16} />
            </Link>
          </LpButton>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t, i18n } = useTranslation("landing");
  const { pathname } = useLocation();
  const { reviews } = usePublishedReviews();

  usePageSeo({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/",
    jsonLd: [organizationJsonLd(), softwareApplicationJsonLd(reviews)],
  });

  useEffect(() => {
    track("landing_viewed", { source: "accueil" }, { onceKey: "landing_viewed" });
  }, []);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevScheme = document.documentElement.style.colorScheme;
    document.body.style.background = "#000514";
    document.documentElement.style.colorScheme = "dark";

    const scrollToTarget = () => {
      const hash = window.location.hash?.replace("#", "");
      if (!hash) return;
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      });
    };
    scrollToTarget();
    window.addEventListener("hashchange", scrollToTarget);
    return () => {
      window.removeEventListener("hashchange", scrollToTarget);
      document.body.style.background = prevBg;
      document.documentElement.style.colorScheme = prevScheme;
    };
  }, [t, i18n.language, pathname]);

  return (
    <div className="lp-root">
      <PublicNav />
      <main>
        <Hero />
        <Objectives />
        <WhyMyswym />
        <SessionPreview />
        <CoachSection />
        <Includes />
        <LandingReviews />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
      <StickyCta revealOnScroll />
    </div>
  );
}
