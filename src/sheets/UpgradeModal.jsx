import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { G } from "../theme/palette.js";
import Btn from "../ui/Btn.jsx";
import SoftMistSheet from "./SoftMistSheet.jsx";
import CheckoutLegalGates, { checkoutGatesReady, checkoutGatesError } from "../CheckoutLegalGates.jsx";
import { supabase } from "../supabase.js";
import { PRICING, PRICING_SUMMARY_FR, priceIdForPlan } from "../lib/pricing.js";
import { getUpgradeCopy } from "../lib/coach-insights.js";
import { trackEvent } from "../lib/analytics.js";
import { captureReferralFromUrl, resolveReferralCode } from "../lib/referral.js";

const PREMIUM_LINES_ACTIVE = [
  "Séances complètes + allures à la seconde (T100)",
  "Adaptation coach après feedback séance / semaine",
  "Plan jusqu’à ton événement · jusqu’à 5× / semaine",
  "Projection d’allures · plans complets · vidéos technique",
];

const MUTED = "#4a5d72";

export default function UpgradeModal({
  onClose,
  weeksBlocked,
  softContext = null,
  trialEligible = true,
  planWeeks = 0,
  canDismiss = true,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [period, setPeriod] = useState("monthly_flex");
  const [user, setUser] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptWithdrawal, setAcceptWithdrawal] = useState(false);
  const legalReady = checkoutGatesReady(acceptTerms, acceptWithdrawal);

  useEffect(() => {
    captureReferralFromUrl();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    if (legalReady) setErr(null);
  }, [legalReady]);

  const hasReferral = Boolean(resolveReferralCode(user));
  const showTrialOffer = false;
  const isAnnual = period === "annual";
  const isCommit = period === "monthly_commit";
  const selectedPriceId = priceIdForPlan(period);
  const trialEnded = softContext === "trial_expired" || !!weeksBlocked;
  const resolvedContext = trialEnded && softContext !== "trial_expired" ? "trial_expired" : softContext;
  const copy = getUpgradeCopy(resolvedContext, {
    weeks: planWeeks || 0,
    trialEligible,
  });
  const headline = copy.headline;
  const subtitle = copy.subtitle;
  const premiumLines = trialEnded
    ? PREMIUM_LINES_ACTIVE
    : [
        `Essai 7 jours sans carte à l’inscription, puis ${PRICING_SUMMARY_FR}`,
        ...PREMIUM_LINES_ACTIVE,
      ];

  const handleAcceptTerms = (checked) => {
    setAcceptTerms(checked);
    setErr(null);
  };

  const handleAcceptWithdrawal = (checked) => {
    setAcceptWithdrawal(checked);
    setErr(null);
  };

  const callFunction = async (fnName, body) => {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const session = refreshData?.session;
    if (!session) throw new Error("Connecte-toi d'abord.");
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const handleCheckout = async () => {
    if (loading) return;
    const gateError = checkoutGatesError(acceptTerms, acceptWithdrawal);
    if (gateError) {
      setErr(gateError);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const priceId = selectedPriceId;
      const referralCode = resolveReferralCode(user);
      trackEvent("checkout_started", {
        source: "upgrade_modal",
        price_id: priceId,
        soft_context: softContext || null,
      }, { essential: true });
      const json = await callFunction("create-checkout", {
        origin: window.location.origin,
        priceId,
        ...(referralCode ? { referralCode } : {}),
      });
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      if (json.alreadySubscribed) {
        setErr(json.error || "Tu as déjà un abonnement en cours.");
        setLoading(false);
        return;
      }
      throw new Error(json.error || "Lien de paiement introuvable");
    } catch (e) {
      setErr(e.message || "Erreur.");
      setLoading(false);
    }
  };

  const ctaLabel = isAnnual
    ? `Démarrer : ${PRICING.annual.label}/an`
    : isCommit
      ? `Démarrer : ${PRICING.monthlyCommit.label}/mois · 12 mois`
      : showTrialOffer
        ? `Essai 7 jours, puis ${PRICING.monthlyFlex.label}/mois`
        : hasReferral
          ? "Démarrer : −20% parrainage"
          : `Démarrer : ${PRICING.monthlyFlex.label}/mois`;

  const planBtn = (id, label, commitment, price, suffix) => {
    const active = period === id;
    return (
      <button
        type="button"
        onClick={() => setPeriod(id)}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 14,
          cursor: "pointer",
          textAlign: "left",
          border: `1.5px solid ${active ? G.blue : G.greyLight}`,
          background: active ? G.blueLight : G.surface,
          position: "relative",
          minHeight: 56,
        }}
      >
        {hasReferral && id === "monthly_flex" && active ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: G.mint,
              color: G.white,
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            −20%
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: active ? G.blue : MUTED,
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{commitment}</div>
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: G.ink,
            }}
          >
            {price}
            <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{suffix}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <SoftMistSheet
      open
      eyebrow="Premium"
      title={headline}
      subtitle={subtitle}
      onClose={canDismiss ? onClose : undefined}
      dismissOnOverlay={canDismiss}
      zIndex={500}
      ariaLabel="Abonnement Premium"
      bodyClassName="ms-soft-sheet-body--tall"
    >
      <p style={{ color: MUTED, fontSize: 12, margin: "0 0 14px", lineHeight: 1.45 }}>
        {PRICING_SUMMARY_FR} · résiliation via le portail Stripe
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {planBtn("monthly_flex", "MENSUEL", PRICING.monthlyFlex.commitmentFr, PRICING.monthlyFlex.label, " /mois")}
        {planBtn("monthly_commit", "MENSUEL 12 MOIS", PRICING.monthlyCommit.commitmentFr, PRICING.monthlyCommit.label, " /mois")}
        {planBtn("annual", "ANNUEL", PRICING.annual.commitmentFr, PRICING.annual.label, " /an")}
      </div>

      {showTrialOffer ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: G.blueLight,
            border: `1px solid ${G.greyLight}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: G.blue, lineHeight: 1.4, textAlign: "center" }}>
            7 jours offerts sans carte à l’inscription · ensuite tes séances se mettent en pause
          </span>
        </div>
      ) : null}

      {isCommit ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: G.goldLight,
            border: `1px solid ${G.greyLight}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: G.gold, lineHeight: 1.45, textAlign: "center" }}>
            {PRICING.monthlyCommit.label}/mois pendant 12 mois · pas de remboursement ni de fin anticipée avant
            la fin (hors cas légaux)
          </span>
        </div>
      ) : null}

      {isAnnual ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: G.goldLight,
            border: `1px solid ${G.greyLight}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: G.gold, lineHeight: 1.45, textAlign: "center" }}>
            {PRICING.annual.label} facturés une fois · pas de remboursement au prorata hors cas légaux
          </span>
        </div>
      ) : null}

      {hasReferral ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: G.mintLight,
            border: `1px solid ${G.greyLight}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: G.mint }}>
            Parrainage actif : −20% auto au paiement
          </span>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: MUTED, textAlign: "center", marginBottom: 16, lineHeight: 1.4 }}>
          Un ami t’a parrainé ? −20% auto au paiement.
        </p>
      )}

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Inclus avec Premium
        </div>
        {premiumLines.map((line, i) => (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: i < premiumLines.length - 1 ? 8 : 0,
            }}
          >
            <Check size={14} color={G.blue} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.4 }}>{line}</span>
          </div>
        ))}
      </div>

      <CheckoutLegalGates
        acceptTerms={acceptTerms}
        onAcceptTerms={handleAcceptTerms}
        acceptWithdrawal={acceptWithdrawal}
        onAcceptWithdrawal={handleAcceptWithdrawal}
        ink={G.ink}
        muted={MUTED}
        linkColor={G.blue}
        idPrefix="upgrade-modal-legal"
      />

      {err ? (
        <div
          style={{
            background: G.coralLight,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            color: G.coral,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}
      <Btn variant="blue" onClick={handleCheckout} disabled={loading}>
        {loading ? "Redirection…" : ctaLabel}
      </Btn>
      {canDismiss ? (
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px",
            background: "none",
            border: "none",
            color: MUTED,
            cursor: "pointer",
            fontSize: 13,
            minHeight: 44,
            fontWeight: 600,
          }}
        >
          Retour
        </button>
      ) : null}
    </SoftMistSheet>
  );
}
