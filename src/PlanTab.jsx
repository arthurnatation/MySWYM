import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { FONT_DISPLAY } from "./theme/brand.js";
import { G } from "./theme/palette.js";
import CoachCard from "./CoachCard.jsx";
import { AppTabShell } from "./app-shell/index.js";
import { isSessionResolved } from "./lib/plan-progress-merge.js";
import { getTabUi } from "./tab-ui-registry.js";
import { findGoalById } from "./lib/onboarding-catalog.jsx";

const TAB_PAD = {
  paddingBottom: "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 24px)",
  minHeight: "100dvh",
};

// ── PLAN TAB ──────────────────────────────────────────────────────────────
export default function PlanTab({
  plan, profile, isPremium, onComplete, onAdvanceLoop, onShare, onEditFeedback, onReset, onUpgrade,
  plans, activePlanId, onSwitchPlan, onAddPlan, onDeletePlan, onRegenerateLoop, onUpdateProgram,
  user, onOpenMenu, onTabChange,
  addingPlan = false, onboardingProps = null, onCancelAddPlan = null,
}) {
  const {
    AppTopBar,
    OnboardingWizard,
    ProgressionLoopView,
    PlanSelector,
    PremiumBanner,
    ResetConfirmButton,
    UpdateProgramCard,
    WeekCard,
    GOALS,
    CATEGORIES,
  } = getTabUi();

  const [stravaBestPace, setStravaBestPace] = useState(null);
  const [showTools, setShowTools] = useState(false);
  const [showPastWeeks, setShowPastWeeks] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("strava_activities")
      .select("pace")
      .eq("user_id", user.id)
      .in("activity_type", ["Swim", "OpenWaterSwim"])
      .gt("pace", 0)
      .order("pace", { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setStravaBestPace(data?.[0]?.pace ?? null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const topBar = (planArg) => (
    <AppTopBar
      user={user}
      onOpenMenu={onOpenMenu}
      onAvatarClick={onTabChange ? () => onTabChange("profile") : undefined}
      plan={planArg}
      onTabChange={onTabChange}
      onUpgrade={onUpgrade}
      immersive
    />
  );

  // Compte connecté sans plan (ou ajout d’un plan) → questionnaire dans le shell app
  if ((!plan || addingPlan) && onboardingProps) {
    return (
      <AppTabShell style={TAB_PAD}>
        {topBar(null)}
        <div className="app-shell" style={{ paddingTop: 16, paddingBottom: 24 }}>
          <div className="ms-glass-card" style={{ padding: "18px 16px", marginBottom: 16, borderRadius: 26 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: G.ink, lineHeight: 1.15, margin: 0 }}>
              {addingPlan ? "Remplacer mon programme" : "Crée ton programme"}
            </h1>
            <p style={{ fontSize: 14, color: G.grey, marginTop: 6, lineHeight: 1.45 }}>
              Réponds au questionnaire, Accueil, Profil et Binômes restent accessibles.
            </p>
          </div>
          <OnboardingWizard
            {...onboardingProps}
            onCancel={addingPlan && plans?.length > 0 ? onCancelAddPlan : null}
          />
        </div>
      </AppTabShell>
    );
  }

  if (!plan?.weeks) {
    return (
      <AppTabShell style={TAB_PAD}>
        {topBar(null)}
        <div className="app-shell" style={{ paddingTop: 32 }}>
          <p style={{ color: G.grey, fontSize: 14 }}>Aucun programme pour le moment.</p>
        </div>
      </AppTabShell>
    );
  }

  if (plan?.isSessionLoop) {
    return (
      <ProgressionLoopView
        plan={plan}
        profile={profile}
        plans={plans}
        activePlanId={activePlanId}
        isPremium={isPremium}
        onComplete={(a, b, c) => {
          if (typeof a === "string" && b === undefined) onComplete(0, 0, a);
          else onComplete(a ?? 0, b ?? 0, c);
        }}
        onAdvanceLoop={onAdvanceLoop}
        onSwitchPlan={onSwitchPlan}
        onDeletePlan={onDeletePlan}
        onRegenerate={onRegenerateLoop}
        onUpgrade={onUpgrade}
        onReset={onReset}
        onShare={onShare}
        onEditFeedback={onEditFeedback}
        user={user}
        onOpenMenu={onOpenMenu}
        onTabChange={onTabChange}
      />
    );
  }

  const currentWeekIndex = plan.weeks.findIndex(w => !w.sessions.every(isSessionResolved));
  const currentWeek = currentWeekIndex >= 0 ? plan.weeks[currentWeekIndex] : null;

  const planLabel = findGoalById(profile.goal, GOALS)?.label
                 || CATEGORIES.find(c => c.id === profile.category)?.label
                 || "Mon plan";

  const indexed = plan.weeks.map((week, i) => ({ week, i }));
  const currentAndNext = currentWeekIndex < 0
    ? indexed
    : indexed.filter(({ i }) => i >= currentWeekIndex);
  const pastWeeks = currentWeekIndex < 0
    ? []
    : indexed.filter(({ i }) => i < currentWeekIndex).reverse();

  return (
    <AppTabShell style={TAB_PAD}>
      {topBar(plan)}

      <div className="app-shell" style={{ paddingTop: 14, paddingBottom: 8 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: G.ink, margin: 0 }}>
              Programme
            </h1>
            <span className="ms-chip" style={{ height: 28, fontSize: 11 }}>
              Sem. {currentWeekIndex >= 0 ? currentWeekIndex + 1 : plan.weeks.length}/{plan.weeks.length}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: G.grey, lineHeight: 1.4 }}>
            {planLabel}
            {currentWeek?.focus ? ` · ${currentWeek.focus}` : ""}
          </p>
        </div>
        {(plans?.length > 0) && (
          <div style={{ marginBottom: 12 }}>
            <PlanSelector
              plans={plans}
              activePlanId={activePlanId}
            />
          </div>
        )}
      </div>

      <div className="app-shell" style={{ paddingTop: 4 }}>

        {!isPremium && (
          <PremiumBanner
            onUpgrade={onUpgrade}
            weeks={plan?.totalRealWeeks || plan?.weeks?.length || 0}
          />
        )}

        {currentAndNext.map(({ week, i }) => (
          <WeekCard
            key={i}
            week={week}
            weekIndex={i}
            onComplete={onComplete}
            onShare={onShare}
            onEditFeedback={onEditFeedback}
            isCurrentWeek={i === currentWeekIndex}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            analyticsCtx={{ planId: activePlanId, profile }}
          />
        ))}

        {pastWeeks.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setShowPastWeeks((v) => !v)}
              style={{
                width: "100%", minHeight: 44, border: "none", cursor: "pointer",
                background: "rgba(15,27,45,0.04)", borderRadius: 14,
                fontSize: 13, fontWeight: 600, color: G.grey,
              }}
            >
              {showPastWeeks ? "Masquer les semaines passées" : `Semaines passées (${pastWeeks.length})`}
            </button>
            {showPastWeeks && pastWeeks.map(({ week, i }) => (
              <WeekCard
                key={i}
                week={week}
                weekIndex={i}
                onComplete={onComplete}
                onShare={onShare}
                onEditFeedback={onEditFeedback}
                isCurrentWeek={false}
                isPremium={isPremium}
                onUpgrade={onUpgrade}
                analyticsCtx={{ planId: activePlanId, profile }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          style={{
            width: "100%", minHeight: 44, marginTop: 4, marginBottom: 8,
            border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: G.grey,
          }}
        >
          {showTools ? "Masquer les réglages" : "Ajuster mon programme"}
        </button>

        {showTools && (
          <div style={{ marginBottom: 12 }}>
            {isPremium && (
              <CoachCard
                plan={plan}
                profile={profile}
                currentWeekIndex={currentWeekIndex >= 0 ? currentWeekIndex : 0}
              />
            )}
            <UpdateProgramCard
              profile={profile}
              isPremium={isPremium}
              onUpgrade={onUpgrade}
              onSave={onUpdateProgram}
              stravaBestPace={stravaBestPace}
            />
            <ResetConfirmButton onReset={onReset} variant={isPremium ? "subtle" : "card"} />
          </div>
        )}
      </div>
    </AppTabShell>
  );
}
