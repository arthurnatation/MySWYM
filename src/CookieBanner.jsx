import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import {
  DEFAULT_COOKIE_PREFS,
  readConsent,
  writeConsent,
} from "./lib/cookie-consent.js";
import {
  CookieCategories,
  CookiePreferenceActions,
} from "./marketing/CookiePreferences.jsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "./ui/lp-dialog.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/lp-tabs.jsx";
import "./theme/cookie-consent.css";

export default function CookieBanner() {
  const { t } = useTranslation("common");
  const titleId = useId();
  const [banner, setBanner] = useState(false);
  const [manager, setManager] = useState(false);
  const [tab, setTab] = useState("categories");
  const [prefs, setPrefs] = useState(DEFAULT_COOKIE_PREFS);

  useEffect(() => {
    const syncBanner = () => setBanner(!readConsent());
    syncBanner();
    const openManager = () => {
      setPrefs(readConsent() || DEFAULT_COOKIE_PREFS);
      setTab("categories");
      setManager(true);
    };
    window.addEventListener("myswym:cookie-consent-changed", syncBanner);
    window.addEventListener("myswym:cookie-manager-open", openManager);
    return () => {
      window.removeEventListener("myswym:cookie-consent-changed", syncBanner);
      window.removeEventListener("myswym:cookie-manager-open", openManager);
    };
  }, []);

  const persist = (next) => {
    writeConsent(next);
    setBanner(false);
    setManager(false);
  };

  const closeManager = () => {
    setManager(false);
    setTab("categories");
  };

  return (
    <>
      {banner && !manager ? (
        <div className="ms-cookie-banner" role="dialog" aria-label={t("cookies.bannerAria")}>
          <p>
            {t("cookies.bannerShort")}{" "}
            <LocalizedLink className="ms-cookie-inline-link" to={{ pathname: "/politique-cookies", hash: "#parametrage-cookies" }}>{t("cookies.learnMore")}</LocalizedLink>
          </p>
          <div className="ms-cookie-banner-actions">
            <button type="button" className="ms-cookie-btn ms-cookie-btn--secondary" onClick={() => persist({ analytics: false, performance: false })}>
              {t("cookies.rejectAll")}
            </button>
            <button type="button" className="ms-cookie-btn ms-cookie-btn--primary" onClick={() => persist({ analytics: true, performance: true })}>
              {t("cookies.acceptAll")}
            </button>
          </div>
          <button type="button" className="ms-cookie-link" onClick={() => { setPrefs(DEFAULT_COOKIE_PREFS); setManager(true); }}>
            {t("cookies.customize")}
          </button>
        </div>
      ) : null}

      <Dialog
        open={manager}
        onOpenChange={(open) => {
          if (open) setManager(true);
          else closeManager();
        }}
      >
        <DialogPortal>
          <DialogOverlay className="ms-cookie-overlay" />
          <DialogContent
            className="ms-cookie-dialog"
            aria-labelledby={titleId}
            onInteractOutside={(event) => {
              if (!readConsent()) event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              if (!readConsent()) event.preventDefault();
            }}
          >
            <div className="ms-cookie-dialog-head">
              <DialogTitle id={titleId}>{t("cookies.title")}</DialogTitle>
              <DialogClose asChild>
                <button type="button" className="ms-cookie-icon" aria-label={t("cookies.close")}>
                  <X size={20} />
                </button>
              </DialogClose>
            </div>

            <DialogDescription className="ms-cookie-sr">
              {t("cookies.lead")}
            </DialogDescription>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="ms-cookie-tabs" aria-label={t("cookies.title")}>
                <TabsTrigger value="categories" className="ms-cookie-tab">
                  {t("cookies.tabCategories")}
                </TabsTrigger>
                <TabsTrigger value="declaration" className="ms-cookie-tab">
                  {t("cookies.tabDeclaration")}
                </TabsTrigger>
              </TabsList>

              <div className="ms-cookie-dialog-body">
                <TabsContent value="categories">
                  <p className="ms-cookie-lead">
                    {t("cookies.lead")}{" "}
                    <LocalizedLink className="ms-cookie-inline-link" to={{ pathname: "/politique-cookies", hash: "#parametrage-cookies" }}>{t("cookies.learnMore")}</LocalizedLink>
                  </p>
                  <CookieCategories prefs={prefs} onPrefsChange={setPrefs} />
                </TabsContent>
                <TabsContent value="declaration">
                  <ul className="ms-cookie-decl">
                    <li>
                      <strong>{t("cookies.necessaryTitle")}</strong>
                      <span>{t("cookies.declNecessary")}</span>
                    </li>
                    <li>
                      <strong>PostHog</strong>
                      <span>{t("cookies.declPosthog")}</span>
                    </li>
                    <li>
                      <strong>Vercel Speed Insights</strong>
                      <span>{t("cookies.declVercel")}</span>
                    </li>
                    <li>
                      <strong>{t("cookies.declMarketingTitle")}</strong>
                      <span>{t("cookies.declMarketing")}</span>
                    </li>
                  </ul>
                </TabsContent>
              </div>
            </Tabs>

            <CookiePreferenceActions prefs={prefs} onPersist={persist} />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
