import { ChevronLeft, ChevronRight, CircleHelp, Mail, Bug, ExternalLink, Info, Globe, Star } from "lucide-react";
import { G } from "./theme/palette.js";
import { legalHref } from "./lib/legal-copy.js";
import { getStoredLanguage } from "./i18n/index.js";
import { withLocalePrefix } from "./i18n/locale-path.js";
import { playUiSound } from "./lib/ui-sounds.js";

const IG_URL = "https://www.instagram.com/arthurnatation/";
const TT_URL = "https://www.tiktok.com/@arthurnatation";
const FB_URL = "https://www.facebook.com/myswymapp/";
const LI_URL = "https://www.linkedin.com/company/myswym";

function InstagramMark({ size = 18, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

function TikTokMark({ size = 18, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d="M19.6 8.2a5.7 5.7 0 0 1-3.4-1.1v7.2a5.9 5.9 0 1 1-5.9-5.9c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.9V2.5h2.9c.2 1.8 1.6 3.3 3.4 3.7v2z" />
    </svg>
  );
}

function FacebookMark({ size = 18, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

function LinkedinMark({ size = 18, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <path d="M6.5 9H4v11h2.5V9zM5.2 4C4.3 4 3.6 4.7 3.6 5.6S4.3 7.2 5.2 7.2 6.9 6.5 6.9 5.6 6.2 4 5.2 4zM20 20h-2.5v-5.6c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.4-1.7 3.3-1.7 2.4 0 4.3 1.6 4.3 5.1V20z" />
    </svg>
  );
}

export function openSupportChat(tab = "messages") {
  window.dispatchEvent(new CustomEvent("myswym:open-support", { detail: { tab } }));
}

function PanelShell({ title, onBack, children }) {
  return (
    <div className="ms-profile-subpanel">
      <header className="ms-profile-subpanel-toolbar">
        <button
          type="button"
          className="ms-glass-icon-btn"
          aria-label="Retour"
          onClick={() => {
            playUiSound("soft");
            onBack();
          }}
        >
          <ChevronLeft size={22} color={G.ink} strokeWidth={2.25} />
        </button>
        <h1>{title}</h1>
        <div style={{ width: 44 }} aria-hidden />
      </header>
      <div className="ms-profile-subpanel-body">{children}</div>
    </div>
  );
}

function HelpRow({ icon: Icon, title, subtitle, onClick, href, external }) {
  const inner = (
    <>
      <span className="ms-profile-settings-icon" style={{ background: "rgba(0,107,253,0.1)" }}>
        <Icon size={18} color={G.blue} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ms-profile-settings-label" style={{ display: "block" }}>{title}</span>
        {subtitle ? (
          <span className="ms-profile-settings-hint" style={{ display: "block" }}>{subtitle}</span>
        ) : null}
      </span>
      {external ? (
        <ExternalLink size={16} color={G.greyMid} />
      ) : (
        <ChevronRight size={18} color={G.greyMid} />
      )}
    </>
  );

  if (href) {
    return (
      <a
        className="ms-profile-account-row"
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={() => playUiSound("soft")}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="ms-profile-account-row"
      onClick={() => {
        playUiSound("soft");
        onClick?.();
      }}
    >
      {inner}
    </button>
  );
}

/** Écran Support (réf. Miracle). */
export function ProfileSupportPanel({ onBack }) {
  const locale = getStoredLanguage();
  const faqHref = withLocalePrefix("/faq", locale);

  return (
    <PanelShell title="Support" onBack={onBack}>
      <div className="ms-profile-group-label">Obtenir de l’aide</div>
      <div className="ms-profile-account-stack">
        <HelpRow
          icon={CircleHelp}
          title="Centre d’aide"
          subtitle="FAQ et articles"
          href={faqHref}
          external
        />
        <HelpRow
          icon={Mail}
          title="Contacter le support"
          subtitle="Écrire à l’équipe MySWYM"
          href={withLocalePrefix("/contact", locale)}
          external
        />
        <HelpRow
          icon={Bug}
          title="Signaler un bug"
          subtitle="Aide-nous à améliorer l’app"
          onClick={() => {
            onBack();
            openSupportChat("messages");
          }}
        />
        <HelpRow
          icon={Star}
          title="Donner son avis"
          subtitle="Partage ton retour sur MySWYM"
          href={`${withLocalePrefix("/avis", locale)}#write`}
          external
        />
      </div>

      <div className="ms-profile-group-label">Communauté</div>
      <div className="ms-profile-account-stack">
        <HelpRow
          icon={InstagramMark}
          title="Instagram"
          subtitle="@arthurnatation"
          href={IG_URL}
          external
        />
        <HelpRow
          icon={TikTokMark}
          title="TikTok"
          subtitle="@arthurnatation"
          href={TT_URL}
          external
        />
        <HelpRow
          icon={FacebookMark}
          title="Facebook"
          subtitle="Suivre MySWYM"
          href={FB_URL}
          external
        />
        <HelpRow
          icon={LinkedinMark}
          title="LinkedIn"
          subtitle="Suivre MySWYM"
          href={LI_URL}
          external
        />
        <HelpRow
          icon={Globe}
          title="Site mySWYM"
          subtitle="myswym.app"
          href={withLocalePrefix("/", locale)}
          external
        />
      </div>
    </PanelShell>
  );
}

/** Écran Politiques / documents légaux. */
export function ProfileLegalPanel({ onBack }) {
  const locale = getStoredLanguage();
  const docs = [
    { key: "cgu", label: "Conditions d’utilisation" },
    { key: "privacy", label: "Politique de confidentialité" },
    { key: "cookies", label: "Politique cookies" },
    { key: "mentions", label: "Mentions légales" },
    { key: "cgv", label: "Conditions de vente" },
  ];

  return (
    <PanelShell title="Politiques" onBack={onBack}>
      <div className="ms-profile-legal-intro">
        En utilisant MySWYM, tu acceptes les conditions d’utilisation et reconnais avoir pris connaissance de la politique de confidentialité.
      </div>

      <div className="ms-profile-group-label">Documents légaux</div>
      <div className="ms-profile-account-stack">
        {docs.map((doc) => (
          <a
            key={doc.key}
            className="ms-profile-account-row"
            href={legalHref(doc.key, locale)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playUiSound("soft")}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="ms-profile-settings-label" style={{ flex: 1 }}>{doc.label}</span>
            <ExternalLink size={16} color={G.greyMid} />
          </a>
        ))}
      </div>

      <p className="ms-profile-legal-meta">
        Documents à jour sur le site mySWYM
        <br />
        mySWYM · natation
      </p>
    </PanelShell>
  );
}

/** Lignes réglages : Support + Politiques. */
export function ProfileHelpSettingsRows({ onOpenSupport, onOpenLegal }) {
  return (
    <>
      <button
        type="button"
        className="ms-profile-settings-row"
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          boxSizing: "border-box",
        }}
        onClick={() => {
          playUiSound("soft");
          onOpenSupport();
        }}
      >
        <span className="ms-profile-settings-icon" style={{ background: "rgba(0,107,253,0.12)" }}>
          <CircleHelp size={18} color={G.blue} />
        </span>
        <span className="ms-profile-settings-label" style={{ flex: 1 }}>Support</span>
        <ChevronRight size={18} color={G.greyMid} />
      </button>
      <button
        type="button"
        className="ms-profile-settings-row"
        style={{
          width: "100%",
          border: "none",
          borderBottom: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          boxSizing: "border-box",
        }}
        onClick={() => {
          playUiSound("soft");
          onOpenLegal();
        }}
      >
        <span className="ms-profile-settings-icon" style={{ background: "rgba(0,107,253,0.12)" }}>
          <Info size={18} color={G.blue} />
        </span>
        <span className="ms-profile-settings-label" style={{ flex: 1 }}>Politiques</span>
        <ChevronRight size={18} color={G.greyMid} />
      </button>
    </>
  );
}
