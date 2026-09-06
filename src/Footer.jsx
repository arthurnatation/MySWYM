import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { openCookieManager } from "./lib/cookie-consent.js";
import BrandLogo from "./BrandLogo.jsx";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import "./theme/public.css";

function useIsMobile(bp = 900) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const apply = () => setMobile(mq.matches || window.innerWidth < bp);
    apply();
    mq.addEventListener?.("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, [bp]);
  return mobile;
}

function NavCol({ title, links, collapse }) {
  const items = (
    <ul className="ms-footer-links">
      {links.map(([label, href]) => (
        <li key={href}>
          <LocalizedLink to={href}>{label}</LocalizedLink>
        </li>
      ))}
    </ul>
  );
  if (collapse) {
    return (
      <details className="ms-footer-acc">
        <summary>
          <span>{title}</span>
          <ChevronDown size={16} aria-hidden />
        </summary>
        {items}
      </details>
    );
  }
  return (
    <div className="ms-footer-col">
      <p className="ms-footer-heading">{title}</p>
      {items}
    </div>
  );
}

function StoreBadge({ store, label, soon }) {
  return (
    <div className="ms-footer-store" aria-disabled="true">
      <span className="ms-footer-store-icon" aria-hidden>
        {store === "apple" ? <AppleMark /> : <PlayMark />}
      </span>
      <span className="ms-footer-store-copy">
        <span className="ms-footer-store-soon">{soon}</span>
        <span className="ms-footer-store-name">{label}</span>
      </span>
    </div>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.2-2.4-.1 0-2.1-.8-2.1-3.2zM14.8 6.4c.6-.7 1-1.7.9-2.7-1 .1-2.1.6-2.8 1.4-.6.7-1.1 1.7-.9 2.7 1 0 2.1-.6 2.8-1.4z" />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4.5 3.4v17.2c0 .7.8 1.1 1.4.7l14-8.6c.6-.4.6-1.3 0-1.7l-14-8.3c-.6-.4-1.4 0-1.4.7z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedinMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M6.5 9H4v11h2.5V9zM5.2 4C4.3 4 3.6 4.7 3.6 5.6S4.3 7.2 5.2 7.2 6.9 6.5 6.9 5.6 6.2 4 5.2 4zM20 20h-2.5v-5.6c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.4-1.7 3.3-1.7 2.4 0 4.3 1.6 4.3 5.1V20z" />
    </svg>
  );
}

const SOCIAL = [
  { id: "facebook", href: "https://www.facebook.com/myswymapp/", Icon: FacebookMark },
  { id: "instagram", href: "https://www.instagram.com/myswym.app/", Icon: InstagramMark },
  { id: "linkedin", href: "https://www.linkedin.com/company/myswym", Icon: LinkedinMark },
];

/** Footer marketing, afficher sur toutes les pages publiques et l'app. */
export default function Footer({ aboveBottomNav = false }) {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const year = new Date().getFullYear();
  const [newsStatus, setNewsStatus] = useState("idle");

  const productLinks = [
    [t("footer.home"), "/"],
    [t("footer.how"), "/comment-ca-marche"],
    [t("footer.pricing"), "/tarifs"],
    [t("footer.blog"), "/blog"],
  ];
  const helpLinks = [
    [t("footer.faq"), "/faq"],
    [t("footer.reviews"), "/avis"],
    [t("footer.contact"), "/contact"],
  ];
  const accountLinks = [
    [t("nav.login"), "/connexion"],
    [t("nav.cta"), "/app"],
  ];
  const legalLinks = [
    [t("footer.legalMentions"), "/mentions-legales"],
    [t("footer.privacy"), "/politique-confidentialite"],
    [t("footer.cookies"), "/politique-cookies"],
    [t("footer.cgu"), "/cgu"],
    [t("footer.cgv"), "/cgv"],
  ];

  return (
    <footer
      className="ms-footer"
      style={{
        marginBottom: aboveBottomNav
          ? "calc(var(--bottom-nav-h, 72px) + var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + var(--nav-lift, 0px))"
          : undefined,
      }}
    >
      <div className="ms-footer-inner">
        <div className="ms-footer-top">
          <LocalizedLink to="/" className="ms-footer-logo" aria-label={t("nav.homeAria")}>
            <BrandLogo variant="wordmark" height={28} />
          </LocalizedLink>
        </div>

        <div className="ms-footer-main">
          <div className="ms-footer-news">
            <h2 className="ms-footer-news-title">{t("footer.newsletterTitle")}</h2>
            <p className="ms-footer-news-body">{t("footer.newsletterBody")}</p>
            <form
              className="ms-footer-news-form"
              onSubmit={(e) => {
                e.preventDefault();
                setNewsStatus("soon");
              }}
            >
              <label className="sr-only" htmlFor="ms-footer-email">
                {t("footer.newsletterEmail")}
              </label>
              <input
                id="ms-footer-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t("footer.newsletterEmail")}
                disabled={newsStatus === "soon"}
              />
              <button type="submit" aria-label={t("footer.newsletterSubmit")} disabled={newsStatus === "soon"}>
                <ChevronRight size={18} />
              </button>
            </form>
            {newsStatus === "soon" && (
              <p className="ms-footer-news-soon" role="status">
                {t("footer.newsletterSoon")}
              </p>
            )}
          </div>

          <nav className="ms-footer-nav" aria-label={t("footer.explore")}>
            <NavCol title={t("footer.product")} links={productLinks} collapse={isMobile} />
            <NavCol title={t("footer.help")} links={helpLinks} collapse={isMobile} />
            <NavCol title={t("footer.account")} links={accountLinks} collapse={isMobile} />
          </nav>

          <div className="ms-footer-apps">
            <p className="ms-footer-heading">{t("footer.downloadApp")}</p>
            <StoreBadge store="apple" label={t("footer.appStore")} soon={t("footer.comingSoon")} />
            <StoreBadge store="google" label={t("footer.googlePlay")} soon={t("footer.comingSoon")} />
          </div>
        </div>

        <div className="ms-footer-bottom">
          <div className="ms-footer-legal">
            {legalLinks.map(([label, href]) => (
              <LocalizedLink key={href} to={href}>
                {label}
              </LocalizedLink>
            ))}
            <button type="button" onClick={() => openCookieManager()}>
              {t("footer.manageCookies")}
            </button>
          </div>
          <div className="ms-footer-social" aria-label={t("footer.social")}>
            {SOCIAL.map(({ id, href, Icon }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(`footer.${id}`)}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <p className="ms-footer-copy">{t("footer.rights", { year })}</p>
      </div>
    </footer>
  );
}
