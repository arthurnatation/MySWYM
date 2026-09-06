import { useState, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "./supabase.js";
import { FONT, FONT_DISPLAY } from "./theme/brand.js";
import { G } from "./theme/palette.js";
import Btn from "./ui/Btn.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { useActiveLocale } from "./i18n/locale-routing.jsx";
import { track } from "./lib/analytics.js";
import { captureReferralFromUrl, getStoredReferralCode } from "./lib/referral.js";
import { legalHref } from "./lib/legal-copy.js";
import { usePageSeo } from "./lib/seo.js";

export const getAuthInpStyle = () => ({
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: `1.5px solid ${G.inkLight}`,
  fontSize: 15,
  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
  background: G.greyXLight,
  color: G.ink,
  outline: "none",
  boxSizing: "border-box",
});

export const PasswordInput = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  autoComplete = "current-password",
}) => {
  const [visible, setVisible] = useState(false);
  const inputId = id || "auth-password";
  return (
    <div style={{ width: "100%" }}>
      {label ? (
        <label htmlFor={inputId} style={{ display: "block", fontSize: 13, fontWeight: 600, color: G.ink, marginBottom: 6 }}>
          {label}
        </label>
      ) : null}
      <div style={{ position: "relative", width: "100%" }}>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={e => e.key === "Enter" && onEnter?.()}
          autoComplete={autoComplete}
          style={{ ...getAuthInpStyle(), paddingRight: 48 }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", padding: 4, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: G.greyMid, lineHeight: 0, minWidth: 44, minHeight: 44,
          }}
        >
          {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
};

function mapAuthError(raw, t) {
  const msg = String(raw || "");
  if (/invalid login credentials|invalid_credentials/i.test(msg)) return t("auth.errCredentials", { defaultValue: "Email ou mot de passe incorrect." });
  if (/email not confirmed/i.test(msg)) return t("auth.errConfirm", { defaultValue: "Confirme ton email avant de te connecter." });
  if (/user already registered|already been registered/i.test(msg)) return t("auth.errExists", { defaultValue: "Ce compte existe déjà. Connecte-toi ou réinitialise ton mot de passe." });
  if (/password/i.test(msg) && /at least|characters|weak/i.test(msg)) return t("auth.errPassword", { defaultValue: "Mot de passe trop court. Utilise au moins 6 caractères." });
  if (/rate limit|too many/i.test(msg)) return t("auth.errRate", { defaultValue: "Trop de tentatives. Réessaie dans une minute." });
  if (/network|fetch/i.test(msg)) return t("auth.errNetwork", { defaultValue: "Connexion impossible. Vérifie ton réseau et réessaie." });
  return msg || t("auth.errGeneric", { defaultValue: "Une erreur est survenue. Réessaie." });
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const authOAuthRedirect = () => `${window.location.origin}/app`;

const SocialAuthButtons = ({ disabled, onError, onBlockedClick, intent = "login" }) => {
  const { t } = useTranslation("onboarding");
  const [busy, setBusy] = useState(null);

  const startOAuth = async (provider) => {
    if (busy) return;
    if (disabled) {
      onBlockedClick?.();
      return;
    }
    setBusy(provider);
    onError?.(null);
    try {
      try { sessionStorage.setItem("myswym_oauth_intent", intent); } catch { /* ignore */ }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authOAuthRedirect(),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });
      if (error) throw error;
      // Redirect en cours, on laisse busy actif
    } catch (e) {
      setBusy(null);
      const raw = e.message || "";
      const friendly = /not enabled|Unsupported provider/i.test(raw)
        ? t("auth.socialOff")
        : (raw || t("auth.socialFail"));
      onError?.(friendly);
    }
  };

  const btnBase = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", padding: "13px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600,
    fontFamily: FONT, cursor: busy ? "not-allowed" : "pointer",
    opacity: disabled && !onBlockedClick ? 0.45 : 1, transition: "opacity 0.15s, background 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        type="button"
        disabled={!!busy}
        aria-disabled={disabled || !!busy}
        onClick={() => startOAuth("google")}
        style={{
          ...btnBase,
          background: G.surface,
          color: G.ink,
          border: `1.5px solid ${G.greyLight}`,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <GoogleMark />
        {busy === "google" ? t("auth.redirecting") : t("auth.google")}
      </button>
    </div>
  );
};

const AuthScreen = ({ onAuth, onBack, onNavigateMode, onStartQuiz, initialMode = "password", showBrandHeader = true }) => {
  const locale = useActiveLocale();
  const { t } = useTranslation("onboarding");
  // mode :
  //   "password", login classique avec mot de passe
  //   "register", création de compte avec mot de passe
  //   "reset"   , réinitialisation du mot de passe
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { captureReferralFromUrl(); }, []);
  useEffect(() => {
    if (mode === "register") {
      track("signup_started", { source: "auth_screen" }, { onceKey: "signup_started:auth_screen" });
    }
  }, [mode]);

  const authPath = mode === "register" ? "/inscription" : mode === "reset" ? "/connexion" : "/connexion";
  usePageSeo({
    title: locale === "en"
      ? (mode === "register" ? "Sign up | MySWYM" : mode === "reset" ? "Reset password | MySWYM" : "Log in | MySWYM")
      : (mode === "register" ? "Inscription | MySWYM" : mode === "reset" ? "Mot de passe oublié | MySWYM" : "Connexion | MySWYM"),
    description: locale === "en"
      ? "Log in or create your MySWYM account. 7-day Premium trial, no card."
      : "Connecte-toi ou crée ton compte MySWYM. Essai Premium 7 jours, sans carte.",
    path: authPath,
    noIndex: true,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);    // pour les autres flows (reset, register confirm)
  const [acceptAge, setAcceptAge] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const referralCode = getStoredReferralCode();

  const switchMode = (m) => {
    if (m === "register" || m === "password") onNavigateMode?.(m);
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  const handle = async () => {
    setError(null); setSuccess(null); setLoading(true);
    try {
      if (mode === "password") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else if (mode === "register") {
        if (!acceptAge || !acceptTerms) {
          throw new Error(t("auth.needChecks"));
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              ...(referralCode ? { referred_by: referralCode } : {}),
              accepted_terms_at: new Date().toISOString(),
              confirmed_age_18: true,
            },
          },
        });
        if (error) throw error;
        if (data.user && !data.user.identities?.length) throw new Error(t("auth.exists"));
        track("signup_completed", {}, { onceKey: `signup_completed:${data.user?.id || email}` });
        setSuccess(referralCode ? t("auth.createdReferral") : t("auth.created"));
        switchMode("password");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/app`,
        });
        if (error) throw error;
        setSuccess(t("auth.resetSent"));
      }
    } catch (e) { setError(mapAuthError(e.message || e, t)); }
    finally { setLoading(false); }
  };

  const titleMap = {
    password: t("auth.loginTitle"),
    register: t("auth.registerTitle"),
    reset:    t("auth.resetTitle"),
  };
  const subtitleMap = {
    password: t("auth.loginLead"),
    register: referralCode
      ? t("auth.registerReferral", { code: referralCode })
      : t("auth.registerLead"),
    reset:    t("auth.resetLead"),
  };
  const ctaMap = {
    password: t("auth.loginCta"),
    register: t("auth.registerCta"),
    reset:    t("auth.resetCta"),
  };

  const registerBlocked = mode === "register" && (!acceptAge || !acceptTerms);

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 20px", paddingTop: showBrandHeader ? 64 : 96, paddingBottom: "calc(10.5rem + env(safe-area-inset-bottom, 0px))" }}>
      {(showBrandHeader || onBack) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 44 }}>
          {showBrandHeader ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <BrandLogo variant="wordmark" height={24} />
            </div>
          ) : <div />}
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: `1px solid ${G.greyLight}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, color: G.grey, cursor: "pointer" }}>
              {t("common.back")}
            </button>
          )}
        </div>
      )}
      <div className="fade-up">
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", textTransform: "none", color: G.ink, marginBottom: 8, lineHeight: 1.1 }}>
          {titleMap[mode]}
        </h1>
        <p style={{ color: G.grey, fontSize: 15, marginBottom: 28, lineHeight: 1.5 }}>
          {subtitleMap[mode]}
        </p>

        {error   && <div style={{ background: G.coralLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: G.coral, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: G.mintLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: G.mint, fontSize: 13 }}>{success}</div>}

        {(mode === "password" || mode === "register") && (
          <>
            <SocialAuthButtons
              disabled={loading || registerBlocked}
              intent={mode === "register" ? "signup" : "login"}
              onError={(msg) => { setSuccess(null); setError(msg); }}
              onBlockedClick={registerBlocked ? () => {
                setSuccess(null);
                setError(t("auth.googleBlocked"));
              } : undefined}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
              <div style={{ flex: 1, height: 1, background: G.greyLight }} />
              <span style={{ fontSize: 12, color: G.grey, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{t("common.or")}</span>
              <div style={{ flex: 1, height: 1, background: G.greyLight }} />
            </div>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: mode === "password" ? 8 : 16 }}>
          <div>
            <label htmlFor="auth-email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: G.ink, marginBottom: 6 }}>
              {t("auth.email")}
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handle()}
              style={getAuthInpStyle()}
            />
          </div>
          {(mode === "password" || mode === "register") && (
            <PasswordInput
              id="auth-password"
              label={t("auth.password")}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onEnter={handle}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          )}
        </div>

        {mode === "password" && (
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              style={{
                background: "none", border: "none", color: G.grey, fontSize: 13, cursor: "pointer",
                minHeight: 44, padding: "10px 4px", display: "inline-flex", alignItems: "center",
              }}
            >
              {t("auth.forgot")}
            </button>
          </div>
        )}

        {mode === "register" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10, fontSize: 12, lineHeight: 1.45, color: G.grey, cursor: "pointer" }}>
              <input type="checkbox" checked={acceptAge} onChange={(e) => setAcceptAge(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{t("auth.age")}</span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45, color: G.grey, cursor: "pointer" }}>
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} style={{ marginTop: 2 }} />
              <span>
                <Trans
                  i18nKey="auth.terms"
                  ns="onboarding"
                  components={{
                    cgu: <a href={legalHref("cgu", locale)} target="_blank" rel="noopener noreferrer" style={{ color: G.blue, fontWeight: 700, textDecoration: "none" }} />,
                    privacy: <a href={legalHref("privacy", locale)} target="_blank" rel="noopener noreferrer" style={{ color: G.blue, fontWeight: 700, textDecoration: "none" }} />,
                  }}
                />
              </span>
            </label>
            <p style={{ fontSize: 11, color: G.greyMid, margin: "10px 0 0", lineHeight: 1.4 }}>
              {t("auth.trial")}
            </p>
            <p style={{ fontSize: 11, color: G.greyMid, margin: "6px 0 0", lineHeight: 1.4 }}>
              {t("health.safety")}
            </p>
          </div>
        )}

        <Btn onClick={handle} disabled={loading || !email || ((mode === "password" || mode === "register") && !password) || registerBlocked} variant="blue">
          {loading
            ? (mode === "register" ? "Création…" : mode === "reset" ? "Envoi…" : "Connexion…")
            : ctaMap[mode]}
        </Btn>
        {(mode === "password" || mode === "register") && (!email || !password) && !loading ? (
          <p style={{ fontSize: 12, color: G.greyMid, margin: "8px 0 0", lineHeight: 1.4 }}>
            Renseigne email et mot de passe pour continuer.
          </p>
        ) : null}
        {registerBlocked && !loading ? (
          <p style={{ fontSize: 12, color: G.greyMid, margin: "8px 0 0", lineHeight: 1.4 }}>
            {t("auth.needChecks")}
          </p>
        ) : null}

        {/* Toggles secondaires */}
        <div style={{ marginTop: 18, textAlign: "center", fontSize: 14, color: G.grey }}>
          {mode === "password" && (
            <button
              type="button"
              onClick={() => (onStartQuiz ? onStartQuiz() : switchMode("register"))}
              style={{
                background: "none", border: "none", color: G.ink, fontWeight: 600, cursor: "pointer", fontSize: 14,
                minHeight: 44, padding: "10px 12px", display: "inline-flex", alignItems: "center",
              }}
            >
              {t("auth.createAccount")}
            </button>
          )}
          {mode === "register" && (
            <button
              type="button"
              onClick={() => switchMode("password")}
              style={{
                background: "none", border: "none", color: G.ink, fontWeight: 600, cursor: "pointer", fontSize: 14,
                minHeight: 44, padding: "10px 12px", display: "inline-flex", alignItems: "center",
              }}
            >
              {t("auth.hasAccount")}
            </button>
          )}
          {mode === "reset" && (
            <button
              type="button"
              onClick={() => switchMode("password")}
              style={{
                background: "none", border: "none", color: G.ink, fontWeight: 600, cursor: "pointer", fontSize: 14,
                minHeight: 44, padding: "10px 12px", display: "inline-flex", alignItems: "center",
              }}
            >
              {t("auth.backLogin")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
