import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { G } from "../theme/palette.js";
import Btn from "../ui/Btn.jsx";
import SoftMistSheet from "./SoftMistSheet.jsx";
import CheckoutLegalGates, { checkoutGatesReady, checkoutGatesError } from "../CheckoutLegalGates.jsx";
import { buildPlanReadyInsights } from "../lib/coach-insights.js";
import { sessionCardModel } from "../lib/plan-reveal.js";
import SessionHeroCard from "../SessionHeroCard.jsx";
import { canonicalizeGoal } from "../lib/sports-engine/race-event.js";

const GOAL_LABELS = {
  progression: "Nager & Progresser",
  triathlon_xs: "Triathlon XS",
  triathlon_sprint: "Triathlon Sprint",
  triathlon_olympic: "Triathlon Olympique",
  triathlon_half: "Triathlon Half",
  triathlon_ironman: "Triathlon Full",
  open_water_short: "Eau libre courte",
  open_water_mid: "Eau libre moyenne",
  open_water_long: "Eau libre longue",
  bnssa: "BNSSA",
};

const MUTED = "#4a5d72";

export default function PlanReadySheet({ plan, profile, onContinue, onDismiss, loading }) {
  const goalLabel = GOAL_LABELS[canonicalizeGoal(profile?.goal)] || profile?.goal || "Objectif";
  const weeks = plan?.totalRealWeeks || plan?.weeks?.length || 0;
  const freq = profile?.sessionsPerWeek || 0;
  const firstSession = plan?.weeks?.[0]?.sessions?.[0];
  const preview = firstSession ? sessionCardModel(firstSession) : null;
  const isLoop = !!plan?.isSessionLoop || !!plan?.isProgression;
  const insights = buildPlanReadyInsights(plan, profile);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptWithdrawal, setAcceptWithdrawal] = useState(false);
  const [err, setErr] = useState(null);
  const legalReady = checkoutGatesReady(acceptTerms, acceptWithdrawal);

  useEffect(() => {
    if (legalReady) setErr(null);
  }, [legalReady]);

  const handleAcceptTerms = (checked) => {
    setAcceptTerms(checked);
    setErr(null);
  };

  const handleAcceptWithdrawal = (checked) => {
    setAcceptWithdrawal(checked);
    setErr(null);
  };

  const handleContinue = () => {
    const gateError = checkoutGatesError(acceptTerms, acceptWithdrawal);
    if (gateError) {
      setErr(gateError);
      return;
    }
    setErr(null);
    onContinue?.();
  };

  const title =
    weeks > 4 && !isLoop ? `Ton plan ${weeks} semaines est prêt` : "Ton coach a préparé ton plan";

  return (
    <SoftMistSheet
      open
      eyebrow="Ton plan"
      title={title}
      subtitle="Débloque les séances et l’adaptation coach, 7 jours offerts sans carte à l’inscription. Ensuite tes séances se mettent en pause."
      onClose={onDismiss}
      zIndex={500}
      ariaLabel="Plan prêt"
      bodyClassName="ms-soft-sheet-body--tall"
    >
      <div
        style={{
          border: `1px solid ${G.greyLight}`,
          borderRadius: 16,
          padding: "12px 14px",
          marginBottom: 14,
          background: G.blueLight,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, marginBottom: 8 }}>{goalLabel}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: MUTED }}>
          {!isLoop && weeks > 0 ? (
            <span style={{ background: G.surface, borderRadius: 8, padding: "6px 10px" }}>
              {weeks} semaines
            </span>
          ) : null}
          {freq > 0 ? (
            <span style={{ background: G.surface, borderRadius: 8, padding: "6px 10px" }}>
              {freq}× / semaine
            </span>
          ) : null}
          {profile?.level ? (
            <span style={{ background: G.surface, borderRadius: 8, padding: "6px 10px" }}>
              {profile.level}
            </span>
          ) : null}
          {profile?.pool ? (
            <span style={{ background: G.surface, borderRadius: 8, padding: "6px 10px" }}>
              {profile.pool} m
            </span>
          ) : null}
        </div>
      </div>

      {preview ? (
        <div style={{ marginBottom: 14 }}>
          <SessionHeroCard preview={preview} kicker="Aperçu 1ʳᵉ séance" className="is-compact" />
        </div>
      ) : null}

      {insights.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: MUTED,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Ce que ton coach a déjà calibré
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((insight) => (
              <div
                key={insight.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: G.surface,
                  border: `1px solid ${G.greyLight}`,
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <Check size={14} color={G.blue} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.4, fontWeight: 600 }}>
                  {insight.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CheckoutLegalGates
        acceptTerms={acceptTerms}
        onAcceptTerms={handleAcceptTerms}
        acceptWithdrawal={acceptWithdrawal}
        onAcceptWithdrawal={handleAcceptWithdrawal}
        ink={G.ink}
        muted={MUTED}
        linkColor={G.blue}
        idPrefix="plan-ready-legal"
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
      <Btn variant="blue" onClick={handleContinue} disabled={loading}>
        {loading ? "Redirection…" : "S’abonner : débloquer mon coach"}
      </Btn>
      <button
        type="button"
        onClick={onDismiss}
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
        Voir l’aperçu sans activer
      </button>
    </SoftMistSheet>
  );
}
