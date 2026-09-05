import { useState, useEffect } from "react";
import {
  Award, Flame, Trophy, TrendingUp, Target,
} from "lucide-react";
import { FONT, FONT_DISPLAY } from "./theme/brand.js";
import { G } from "./theme/palette.js";
import SessionHeroCard from "./SessionHeroCard.jsx";
import Btn from "./ui/Btn.jsx";
import AllureUnlockSheet from "./sheets/AllureUnlockSheet.jsx";
import SessionPrepSheet from "./sheets/SessionPrepSheet.jsx";
import TrialCountdownBanner from "./ui/TrialCountdownBanner.jsx";
import CoachCard from "./CoachCard.jsx";
import { track, sessionAnalyticsProps } from "./lib/analytics.js";
import { findNextSession, sessionCardModel, sessionWhyLine } from "./lib/plan-reveal.js";
import {
  hasSeenAllureUnlockTip,
  shouldShowAllureUnlockTip,
} from "./lib/allure-unlock-tip.js";
import { isSessionResolved } from "./lib/plan-progress-merge.js";
import { ACCESS_STATUS } from "./lib/access.js";
import { BADGE_DEFS, computeStats, checkBadges } from "./lib/plan-stats.js";
import { playUiSound } from "./lib/ui-sounds.js";
import { getTabUi } from "./tab-ui-registry.js";

export function HomeBadgesSection({ plan }) {
  const stats = computeStats(plan);
  const earnedIds = new Set(checkBadges(stats));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {BADGE_DEFS.map((b) => {
          const ok = earnedIds.has(b.id);
          return (
            <div
              key={b.id}
              className="ms-glass-card"
              style={{
                padding: "12px 8px",
                textAlign: "center",
                opacity: ok ? 1 : 0.45,
              }}
            >
              <Award size={18} color={ok ? G.gold : G.greyMid} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: G.ink, lineHeight: 1.25 }}>{b.label}</div>
            </div>
          );
        })}
      </div>
      {earnedIds.size === 0 ? (
        <p style={{ fontSize: 12, color: G.grey, margin: "12px 0 0", lineHeight: 1.45 }}>
          Complète des séances pour débloquer les badges grisés.
        </p>
      ) : null}
    </div>
  );
}

/** Accueil minimal : greeting + 1 bandeau max + séance + CTA. */
export default function Dashboard({
  plan, profile, onTabChange, onSignOut, user,
  isPremium = false, onRegenerateLoop, onUpgrade, onReset, onShare, onEditFeedback, onPaceUpdate, onValidateSession, onOpenMenu,
  activePlanId = null,
  accessState = null,
}) {
  const {
    AppTopBar,
    getTypeMeta,
  } = getTabUi();
  const stats = computeStats(plan);
  const isLoop = !!plan?.isSessionLoop;
  const [homePrepOpen, setHomePrepOpen] = useState(false);
  const [allureTipDismissed, setAllureTipDismissed] = useState(() => hasSeenAllureUnlockTip(user?.id));
  const next = findNextSession(plan);
  const preview = next?.session ? sessionCardModel(next.session) : null;
  const hasSwum = stats.totalSessions > 0;
  const trialBannerActive =
    accessState?.status === ACCESS_STATUS.TRIAL && (Number(accessState.trialDaysLeft) || 0) > 0;
  const showAllureTip = shouldShowAllureUnlockTip(profile, {
    dismissed: allureTipDismissed,
    hasSwum,
    hasPlan: !!plan,
  });

  useEffect(() => {
    setAllureTipDismissed(hasSeenAllureUnlockTip(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!showAllureTip) return;
    track("allure_unlock_tip_viewed", {
      isPremium: !!isPremium,
      hasPace: !!profile?.pace100,
    }, { onceKey: `allure_unlock_tip:${user?.id || "anon"}` });
  }, [showAllureTip, isPremium, profile?.pace100, user?.id]);

  const firstName = user?.user_metadata?.firstname
    || (() => {
      try {
        if (user?.id) {
          return localStorage.getItem(`myswym_firstname_${user.id}`) || localStorage.getItem("myswym_firstname");
        }
        return localStorage.getItem("myswym_firstname");
      } catch { return null; }
    })()
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "Nageur";

  const planFinished = !isLoop && stats.totalSessions >= stats.planTotal && stats.planTotal > 0;
  const tm = getTypeMeta(next?.session?.type);
  const coachWeek = plan?.weeks?.length
    ? Math.max(0, plan.weeks.findIndex((w) => !(w.sessions || []).every(isSessionResolved)))
    : 0;

  const startToday = () => {
    if (!next?.session || next.resolved) {
      onTabChange?.("plan");
      return;
    }
    if (!isPremium) {
      onUpgrade?.("session_locked");
      return;
    }
    const props = sessionAnalyticsProps(profile, next.session, {
      planWeek: (plan?.weeks?.[next.weekIndex]?.number) ?? next.weekIndex + 1,
      sessionIndex: next.sessionIndex,
    });
    track("session_started", {
      level: props.level,
      objective: props.objective,
      planWeek: props.planWeek,
      sessionIndex: props.sessionIndex,
      volume: props.volume,
    }, { onceKey: `session_started:${activePlanId || "plan"}:${next.weekIndex}:${next.sessionIndex}` });
    setHomePrepOpen(true);
  };

  return (
    <div
      className="ms-home-immersive"
      style={{ paddingBottom: "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 32px)", minHeight: "100dvh" }}
    >
      <div className="ms-home-immersive-bg ms-home-immersive-bg--mist" aria-hidden>
        <img src="/hero-pool.webp" alt="" width={1024} height={1024} decoding="async" />
        <div className="ms-home-immersive-scrim" />
      </div>

      <AppTopBar
        user={user}
        onOpenMenu={onOpenMenu}
        onAvatarClick={() => onTabChange("profile")}
        plan={plan}
        onTabChange={onTabChange}
        onUpgrade={onUpgrade}
        immersive
      />

      <div className="app-shell" style={{ paddingTop: 8 }}>

        <div className="ms-home-greet">
          <div>
            <p>
              {(() => {
                const h = new Date().getHours();
                const hello = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
                return `${hello}, ${firstName}`;
              })()}
            </p>
            <h1>{plan ? "Prêt à nager ?" : "Crée ton programme"}</h1>
          </div>
          {plan && stats.streak > 0 && (
            <span className="ms-home-streak" title={`Série de ${stats.streak}`}>
              <Flame size={14} color="#D4A017" aria-hidden />
              {stats.streak}
            </span>
          )}
        </div>

        {trialBannerActive ? (
          <TrialCountdownBanner accessState={accessState} onUpgrade={onUpgrade} />
        ) : plan && next?.resolved ? (
          <div className="ms-habit-banner is-done" role="status">
            Séance validée
          </div>
        ) : null}

        {!plan && (
          <div className="ms-glass-card" style={{ padding: "22px 18px", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT_DISPLAY, color: G.ink, margin: "0 0 8px" }}>
              Ton plan t’attend
            </h2>
            <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.45, margin: "0 0 18px" }}>
              Quelques questions, puis ta séance du jour.
            </p>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                playUiSound("tap");
                onTabChange?.("plan");
              }}
              style={{ fontFamily: FONT }}
            >
              Commencer
            </button>
          </div>
        )}

        {preview && (
          <div style={{ marginBottom: 12 }}>
            <SessionHeroCard
              className="is-glass"
              kicker="Programme du jour"
              preview={{
                ...preview,
                title: next.resolved ? "Séance faite" : (preview.title || "Séance du jour"),
              }}
            >
              <button
                type="button"
                className="ms-pill-cta"
                onClick={() => {
                  playUiSound(next.resolved ? "soft" : "tap");
                  startToday();
                }}
                style={{ fontFamily: FONT }}
              >
                {next.resolved
                  ? "Voir le programme"
                  : (isPremium ? "Préparer la séance" : "S’abonner pour nager")}
              </button>
            </SessionHeroCard>
          </div>
        )}

        {plan && isPremium && (
          <CoachCard
            plan={plan}
            profile={profile}
            currentWeekIndex={coachWeek}
          />
        )}

        {plan && !isPremium && (
          <div className="ms-glass-card" style={{ padding: "18px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Target size={16} color={G.blue} />
              <span style={{ fontSize: 15, fontWeight: 700, color: G.ink }}>Message du coach</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: G.grey, lineHeight: 1.45 }}>
              Les conseils adaptés à ta progression sont inclus dans Premium.
            </p>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                playUiSound("tap");
                onUpgrade?.("home_coach");
              }}
            >
              Débloquer
            </button>
          </div>
        )}

        {!isLoop && planFinished && (
          <div className="ms-glass-card" style={{ borderRadius: 24, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
            {plan.isProgression
              ? <><TrendingUp size={36} color={G.blue} style={{ margin: "0 auto 8px" }} /><h2 style={{ fontSize: 20, fontWeight: 700, color: G.ink, marginBottom: 6 }}>Cycle terminé</h2><p style={{ color: G.grey, fontSize: 13, marginBottom: 14 }}>Tu as nagé <strong style={{ color: G.ink }}>{(stats.totalMeters / 1000).toFixed(1)} km</strong> en {plan.weeks.length} semaines.</p><Btn variant="blue" onClick={onSignOut}>Nouveau cycle</Btn></>
              : <><Trophy size={36} color={G.gold} style={{ margin: "0 auto 8px" }} /><h2 style={{ fontSize: 20, fontWeight: 700, color: G.ink, marginBottom: 4 }}>Programme complété</h2><p style={{ color: G.grey, fontSize: 13 }}>Ton plan est terminé.</p></>
            }
          </div>
        )}

        {plan && (
          <button
            type="button"
            onClick={() => {
              playUiSound("soft");
              onTabChange?.("plan");
            }}
            style={{
              width: "100%", marginTop: 8, minHeight: 44, border: "none", background: "none",
              color: G.grey, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Voir le programme
          </button>
        )}

        <SessionPrepSheet
          open={homePrepOpen && !!next?.session && !next.resolved}
          session={next?.session}
          colors={G}
          accent={{ bg: tm.bg, color: tm.color }}
          isPremium={isPremium}
          profile={profile}
          planId={activePlanId}
          whyLine={next?.session ? sessionWhyLine(next.session, profile) : null}
          onClose={() => setHomePrepOpen(false)}
          onUpgrade={onUpgrade}
          onTooHard={
            isPremium
              ? () => {
                  setHomePrepOpen(false);
                  onEditFeedback?.(next.weekIndex, next.sessionIndex);
                }
              : () => {
                  setHomePrepOpen(false);
                  onUpgrade?.("feedback_adjust");
                }
          }
        />

        {showAllureTip && (
          <AllureUnlockSheet
            userId={user?.id}
            isPremium={isPremium}
            initialPace100={profile?.pace100 || null}
            onSave={onPaceUpdate}
            onUpgrade={onUpgrade}
            onDismiss={() => setAllureTipDismissed(true)}
          />
        )}
      </div>
    </div>
  );
}
