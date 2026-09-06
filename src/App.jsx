import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabase.js";
import { ACCESS_STATUS, getAccessState, isAccessMetadataPending } from "./lib/access.js";
import { PRICE_IDS, PRICING, PRICING_SUMMARY_FR, priceIdForPlan } from "./lib/pricing.js";
import {
  track,
  trackEvent,
  identify,
  reset as resetAnalytics,
  trackAppOpened,
  personPropertiesFromProfile,
  sessionAnalyticsProps,
} from "./lib/analytics.js";
import { scrollAppToTop } from "./lib/scroll-app.js";
import { shouldApplyRemotePlanSync } from "./lib/plan-sync-guard.js";
import { describePlanSyncChange } from "./lib/plan-sync-message.js";
import { readSeenNotifications, writeSeenNotifications } from "./lib/in-app-notifications.js";
import { loadSessionTemplates } from "./lib/session-templates-store.js";
import { prefetchNatationCatalogue } from "./lib/natation-sheet/client.js";
import { levelBandFromProfile } from "./lib/natation-sheet/parse.js";
import { rewritePlanPaceMarkers } from "./lib/natation-sheet/pace-placeholders.js";
import { buildSessionProvenance } from "./lib/session-provenance.js";
import { buildCoachPlanWeeks, shouldUseCoachGenerator, buildCompetitionSessions, competitionSessionCount, COMPETITION_TIP, buildProgressionLoopSession, buildProgressionLoopWeek, expandLoopWeekSessions, formatLoopSessionTitle, formatLoopWeekSessionTitle, loopDisplaySession, loopSessionOrdinalIndex, withLoopSessionTitle, isoWeekKey, usesSessionLoop } from "./lib/swim-plan-bridge.js";
import { FONT, FONT_DISPLAY } from "./theme/brand.js";
import { G, G_SOFT, applyTheme } from "./theme/palette.js";
import { unlockUiSounds } from "./lib/ui-sounds.js";
import PlanRevealView from "./PlanRevealView.jsx";
import FirstSwimTip, { hasSeenFirstSwimTip } from "./FirstSwimTip.jsx";
import CoachCard from "./CoachCard.jsx";
import PlanTab from "./PlanTab.jsx";
import Dashboard, { HomeBadgesSection } from "./Dashboard.jsx";
import AnalyseTab from "./AnalyseTab.jsx";
import HistoriqueTab from "./HistoriqueTab.jsx";
import { registerTabUi } from "./tab-ui-registry.js";
import {
  getSessionRemindersEnabled,
  setSessionRemindersEnabled,
  persistSessionRemindersPreference,
  shouldShowSessionReminderBanner,
  sessionReminderCopy,
} from "./lib/session-reminder.js";
import SessionHeroCard from "./SessionHeroCard.jsx";
import SessionCompleteView from "./SessionCompleteView.jsx";
import ProfileNudgeCard from "./ProfileNudgeCard.jsx";
import Btn from "./ui/Btn.jsx";
import WeekStatRing from "./ui/WeekStatRing.jsx";
import { shouldShowPlanReveal, revealMinWaitMs, findNextSession, sessionCardModel, sessionWhyLine } from "./lib/plan-reveal.js";
import {
  dismissProfileNudge,
  isProfileNudgeDismissed,
  shouldShowProfileNudge,
} from "./lib/profile-nudge.js";
import {
  parseOnboardingPrefill,
  profilePatchFromPrefill,
  stepFromPrefill,
  persistOnboardingPrefill,
  readPersistedOnboardingPrefill,
  clearOnboardingPrefill,
} from "./lib/landing-onboarding.js";
import { parseTrainingWish } from "./lib/sports-engine/training-wish.js";
import {
  decideAdaptAction,
  normalizeFeedbackRating,
  missedSessionPolicy,
  EQUIPMENT_IDS,
} from "./lib/sports-engine/index.js";
import { createSportsPersistence, rowToSportProfileFields } from "./lib/sports-persistence/index.js";
import { isSessionResolved, shouldPreserveWeek, mergePreservingProgress, planProgressScore, loopSessionNeedsAdvance } from "./lib/plan-progress-merge.js";
import {
  blankTaste,
  normalizeTaste,
  applySessionFeedbackToTaste,
  applyWeekFeedbackToTaste,
  mergeTasteProfiles,
} from "./lib/user-taste.js";
import {
  extractSwimmerProfile,
  extractPlanObjective,
  mergeForGeneration,
  isSwimmerProfileComplete,
  applyFirstPlanDefaults,
  resolveQuestionnaireMode,
  buildQuestionnaireDraft,
  enforceSingleActivePlan,
  replaceActivePlan,
  TRAINING_FOCUS_OPTIONS,
  hydrateSwimmerFromSources,
  BIRTH_MONTH_OPTIONS,
  computeAgeFromBirth,
  daysInBirthMonth,
} from "./lib/swimmer-profile.js";
import {
  appZoneMultForT100,
  projectedPaceAtYears,
} from "./lib/swim-pace.js";
import PyramidBlockViz, { parsePyramidLine } from "./PyramidBlockViz.jsx";
import WorkoutPrepView from "./workout/WorkoutPrepView.jsx";
import { toCoachDetailLines } from "./lib/sports-engine/coach-restitution.js";
import { prettifySessionDetailLine } from "./lib/sports-engine/session-labels.js";

import {
  planFingerprint,
  dedupePlans,
  mergePlanLists,
  readDeletedPlanIds,
  writeDeletedPlanIds,
  persistAccountPlans,
  PLANS_AUTOSAVE_DEBOUNCE_MS,
  PLAN_VISIBILITY_SYNC_MIN_MS,
  storedPlansUpdatedAtMs,
  loadRemotePlansIfNewer,
  parseUserPlansBlob,
  fetchUserPlansLegacy,
} from "./lib/plan-account.js";
import { BADGE_DEFS, computeStats, checkBadges } from "./lib/plan-stats.js";
import { AppShell, AppTabShell, BottomNav, Loading, AppTopBar } from "./app-shell/index.js";
import {
  GOALS,
  CATEGORIES,
  SUB_GOALS,
  ONBOARDING_LEVELS,
  FREQUENCIES,
  POOLS,
  SWIM_STYLES,
  PREFERRED_STROKES,
  STROKE_LABELS,
  STYLE_LABELS,
  EQUIPMENT_OPTS,
  eqLabel,
  isWellnessGoal,
  isProgressionGoal,
  getLvlIndex,
  DIPLOMA_GOAL_IDS,
  goalHidesFourNagesChoice,
  findGoalById,
  findLevelById,
} from "./lib/onboarding-catalog.jsx";
import { impliedSwimStyleForLevel, isBeginnerBlockedForGoal, isBeginnerLevelId } from "./lib/onboarding-level-gate.js";
import ProfileTab from "./ProfileTab.jsx";

import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import BrandLogo from "./BrandLogo.jsx";
import AuthScreen, { PasswordInput } from "./AuthScreen.jsx";
import LanguageSwitcher from "./i18n/LanguageSwitcher.jsx";
import { withLocalePrefix } from "./i18n/locale-path.js";
import i18n, { getStoredLanguage } from "./i18n/index.js";
import HomeBlogCarousel from "./HomeBlogCarousel.jsx";
import FeedbackModal from "./sheets/FeedbackModal.jsx";
import SessionFeedbackSheet from "./sheets/SessionFeedbackSheet.jsx";
import PlanReadySheet from "./sheets/PlanReadySheet.jsx";
import SessionPrepSheet from "./sheets/SessionPrepSheet.jsx";
import UpgradeModal from "./sheets/UpgradeModal.jsx";
import ConfirmSheet from "./sheets/ConfirmSheet.jsx";
import CancelSurveySheet from "./sheets/CancelSurveySheet.jsx";
import TrialExpiredFreeze from "./sheets/TrialExpiredFreeze.jsx";
import WhatsNewSheet, {
  hasSeenWhatsNew,
  markWhatsNewSeen,
  syncWhatsNewSeenIfNeeded,
} from "./sheets/WhatsNewSheet.jsx";
import { resolveReferralCode } from "./lib/referral.js";
import {
  resolveAvatarUrl,
  uploadAndPersistAvatar,
  removeAndPersistAvatar,
  hydrateAvatarFromStorage,
  clearCachedAvatar,
} from "./lib/avatar.js";
import {
  ACCOUNT_DELETE_WARNING,
} from "./lib/legal-copy.js";
import {
  INJURY_ZONES,
  INJURY_SEVERITIES,
  HEALTH_CONSENT_TITLE,
  HEALTH_CONSENT_BODY,
  HEALTH_CONSENT_CHECKBOX,
  HEALTH_DECLARATION_LABEL,
  MEDICAL_WARNING_SHORT,
  formatInjurySummary,
  hasHealthConsent,
} from "./lib/health-data.js";
import { useTranslation } from "react-i18next";
import {
  Waves, Flame, Star, Calendar, BarChart2, Award, Home,
  Ruler, Clock, Zap, Check, Lock, Trophy, Target,
  ChevronDown, ChevronUp, LogOut, Activity, User,
  Droplets, TrendingUp, Timer, RotateCcw, ArrowRight, Gauge, Settings, Shield, Plus, BookOpen, X, Copy, CheckCheck,
  Bell, CreditCard, Link2, ChevronRight, Eye,
  Camera, Trash2, Users, ExternalLink, Info, Pencil, Share2,
} from "lucide-react";
import {
  copySessionText,
} from "./lib/session-export.js";
import { createShareCanvas } from "./lib/session-share-canvas.js";
import { buildWeekProjection } from "./lib/week-projection.js";
import { formatCoachAdaptLine, formatFeedbackToast } from "./lib/adapt-message.js";
import { buildSessionSharePack } from "./lib/session-share-pack.js";
import { fetchReferralInvite } from "./lib/referral-share.js";

const PoolMode = lazy(() => import("./workout/PoolMode.jsx"));
const SettingsDrawer = lazy(() => import("./SettingsDrawer.jsx"));
const SupportBubble = lazy(() => import("./SupportBubble.jsx"));
const BuddyMatching = lazy(() => import("./BuddyMatching.jsx"));

/** Étape K, faits sportifs Supabase (entoure le moteur, ne le remplace pas). */
const sportsPersistence = createSportsPersistence(supabase);

const AUTH_PATHS = { "/connexion": "password", "/inscription": "register" };
const isAuthPath = (pathname) => pathname in AUTH_PATHS;

applyTheme();
if (typeof window !== "undefined") {
  const unlockOnce = () => {
    unlockUiSounds();
    window.removeEventListener("pointerdown", unlockOnce);
    window.removeEventListener("keydown", unlockOnce);
  };
  window.addEventListener("pointerdown", unlockOnce, { once: true });
  window.addEventListener("keydown", unlockOnce, { once: true });
}

// Couleurs lues sur G (DA soft mist clair).
const TYPE_KIND = {
  ENDURANCE:    { Icon: Waves, color: "blue", bg: "blueLight", tooltip: "Nage à allure confortable, tu pourrais parler. C'est la base de toute progression." },
  SEUIL:        { Icon: Activity, color: "gold", bg: "goldLight", tooltip: "Effort soutenu mais contrôlé, tu travailles à la limite de ton confort. Améliore ton endurance." },
  VITESSE:      { Icon: Zap, color: "coral", bg: "coralLight", tooltip: "Sprints courts et intenses, récup complète entre chaque. Développe ta puissance." },
  TECHNIQUE:    { Icon: Target, color: "water", bg: "waterLight", tooltip: "On travaille la façon de nager, position, bras, jambes. Moins d'effort, plus d'efficacité." },
  RÉCUPÉRATION: { Icon: Droplets, color: "mint", bg: "mintLight", tooltip: "Séance très légère pour récupérer. Bouge sans te fatiguer, c'est là que le corps progresse." },
};

function getTypeMeta(type) {
  const kind = TYPE_KIND[type] || TYPE_KIND.ENDURANCE;
  return { Icon: kind.Icon, tooltip: kind.tooltip, bg: G[kind.bg], color: G[kind.color] };
}

const css = `
  :root {
    --myswym-bg: ${G_SOFT.bg};
    --myswym-surface: ${G_SOFT.surface};
    --myswym-ink: ${G_SOFT.ink};
    --myswym-ink-light: ${G_SOFT.inkLight};
    --myswym-blue: ${G_SOFT.blue};
    --myswym-blue-light: ${G_SOFT.blueLight};
    --myswym-grey-light: ${G_SOFT.greyLight};
    --myswym-nav-bg: ${G_SOFT.navGlass};
    --myswym-nav-border: ${G_SOFT.greyLight};
    --myswym-glass: ${G_SOFT.glass};
    --bottom-nav-h: 64px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);
    --app-pad-x: 16px;
    --app-max: 100%;
    --sheet-max: 100%;
    --nav-lift: 12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    background: var(--myswym-bg);
    color: var(--myswym-ink);
    font-family: Geist, ui-sans-serif, system-ui, sans-serif;
    overscroll-behavior: none;
    letter-spacing: 0.01em;
    -webkit-font-smoothing: antialiased;
    min-height: 100dvh;
    transition: background-color 0.25s ease, color 0.2s ease;
  }
  #root { min-height: 100dvh; }
  h1, h2, h3 { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.03em; text-transform: none; font-weight: 700; }
  h4 { letter-spacing: -0.01em; }
  .syne, .ms-display { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.03em; font-weight: 700; text-transform: none; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
  @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  @keyframes badgePop { 0%{opacity:0;transform:scale(0) rotate(-15deg)} 70%{transform:scale(1.15) rotate(3deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes toastIn  { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
  .fade-up   { animation: fadeUp  0.45s ease both; }
  .fade-up-1 { animation: fadeUp  0.45s ease 0.08s both; }
  .fade-up-2 { animation: fadeUp  0.45s ease 0.16s both; }
  .fade-up-3 { animation: fadeUp  0.45s ease 0.24s both; }
  .scale-in  { animation: scaleIn 0.35s cubic-bezier(.175,.885,.32,1.275) both; }
  .badge-pop { animation: badgePop 0.55s cubic-bezier(.175,.885,.32,1.275) both; }
  .toast-in  { animation: toastIn 0.4s cubic-bezier(.175,.885,.32,1.275) both; }
  input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  button { -webkit-tap-highlight-color: transparent; }
  button:active { transform: scale(0.97); transition: transform 0.1s; }
  /* Texte : pas d’apparence native iOS (zoom / style). Cases à cocher : tokens marque. */
  input:not([type="checkbox"]):not([type="radio"]), textarea {
    -webkit-appearance: none;
    appearance: none;
    font-size: 16px;
  }
  input[type="checkbox"] {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    margin: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    border: 2px solid var(--myswym-ink-light, #b4c6db);
    border-radius: 6px;
    background-color: var(--myswym-surface, #06101f);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 12px 12px;
    cursor: pointer;
    vertical-align: top;
  }
  input[type="checkbox"]:checked {
    background-color: #006bfd;
    border-color: #006bfd;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' d='M3 8.5l3 3L13 4.5'/%3E%3C/svg%3E");
  }
  input[type="checkbox"]:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  input[type="checkbox"]:focus-visible {
    outline: 2px solid #006bfd;
    outline-offset: 2px;
  }

  /* Mobile-first app column, inchangé sur téléphone */
  .app-shell {
    width: 100%;
    max-width: var(--app-max);
    margin-left: auto;
    margin-right: auto;
    padding-left: var(--app-pad-x);
    padding-right: var(--app-pad-x);
  }
  .app-shell--flush {
    padding-left: 0;
    padding-right: 0;
  }
  .app-shell--flush > .app-shell-inner {
    padding-left: var(--app-pad-x);
    padding-right: var(--app-pad-x);
  }
  .bottom-nav {
    position: fixed;
    left: 50%;
    right: auto;
    z-index: 100;
    width: min(var(--app-max), calc(100vw - 40px));
    max-width: 380px;
    transform: translateX(-50%);
    bottom: max(var(--nav-lift), env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(24px) saturate(1.2);
    -webkit-backdrop-filter: blur(24px) saturate(1.2);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    box-shadow: 0 12px 36px rgba(50, 110, 180, 0.14);
    padding-bottom: 0;
    overflow: hidden;
  }
  .bottom-nav-inner {
    width: 100%;
    max-width: var(--app-max);
    margin: 0 auto;
    display: flex;
  }
  .app-toast {
    position: fixed;
    z-index: 300;
    left: max(16px, calc((100vw - var(--app-max)) / 2 + 16px));
    right: max(16px, calc((100vw - var(--app-max)) / 2 + 16px));
    bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 16px);
  }
  .support-fab {
    position: fixed;
    z-index: 170;
    right: max(16px, calc((100vw - var(--app-max)) / 2 + 16px));
    bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 16px);
  }
  .support-fab--bare {
    bottom: calc(16px + var(--safe-bottom));
  }
  .support-widget {
    position: fixed;
    z-index: 160;
    right: max(16px, calc((100vw - var(--app-max)) / 2 + 16px));
    bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 16px + 66px);
    width: min(380px, calc(100vw - 32px));
    height: min(560px, calc(100dvh - var(--bottom-nav-h) - var(--safe-bottom) - var(--nav-lift) - 108px));
  }
  .support-widget--bare {
    bottom: calc(16px + var(--safe-bottom) + 66px);
    height: min(560px, calc(100dvh - 108px));
  }
  .sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: rgba(15, 40, 80, 0.22);
    backdrop-filter: blur(10px) saturate(1.1);
    -webkit-backdrop-filter: blur(10px) saturate(1.1);
  }
  .sheet-panel {
    width: 100%;
    max-width: var(--sheet-max);
    margin-left: auto;
    margin-right: auto;
  }
  .h-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 12px;
    padding-left: var(--app-pad-x);
    padding-right: var(--app-pad-x);
  }
  .h-scroll::-webkit-scrollbar { display: none; }
  .myswym-app {
    min-height: 100dvh;
    background:
      radial-gradient(ellipse 90% 55% at 50% -15%, rgba(126, 184, 245, 0.45), transparent 55%),
      var(--myswym-bg);
  }
  .sticky-app-bar {
    position: sticky;
    top: 0;
    z-index: 40;
  }

  /* Tablette : même UX téléphone, colonne centrée + nav flottante */
  @media (min-width: 640px) {
    :root {
      --app-pad-x: 24px;
      --app-max: 480px;
      --sheet-max: 440px;
      --bottom-nav-h: 68px;
      --nav-lift: 14px;
    }
    body {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,107,253,0.10), transparent 55%),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(26,168,194,0.06), transparent 50%),
        var(--myswym-bg);
      background-attachment: fixed;
    }
    html[data-theme="dark"] body {
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,107,253,0.16), transparent 55%),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0,107,253,0.08), transparent 50%),
        var(--myswym-bg);
      background-attachment: fixed;
    }
    .sheet-overlay {
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .sheet-panel {
      border-radius: 24px !important;
      max-height: min(88vh, 720px);
      overflow-y: auto;
      box-shadow: 0 24px 64px rgba(25,28,30,0.22);
    }
    .bottom-nav {
      width: min(var(--app-max), calc(100vw - 32px));
      bottom: var(--nav-lift);
      border-color: rgba(255, 255, 255, 0.9);
      box-shadow: 0 12px 40px rgba(15, 60, 120, 0.14);
    }
    html[data-theme="dark"] .bottom-nav {
      border-color: rgba(255, 255, 255, 0.16);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    }
    .myswym-app {
      background: transparent;
    }
  }

  @media (min-width: 768px) {
    :root {
      --app-max: 520px;
      --sheet-max: 460px;
      --app-pad-x: 26px;
    }
  }

  @media (min-width: 900px) {
    :root {
      --app-pad-x: 28px;
      --app-max: 560px;
      --sheet-max: 480px;
      --nav-lift: 18px;
    }
  }

  @media (min-width: 1200px) {
    :root {
      --app-max: 600px;
      --app-pad-x: 32px;
      --sheet-max: 500px;
    }
  }

  /* Souris / trackpad uniquement, ne change pas le feeling tactile */
  @media (hover: hover) and (pointer: fine) {
    button:active { transform: none; }
    .bottom-nav button:hover { opacity: 0.88; }
    .app-shell button:hover { filter: brightness(0.98); }
  }

  @media (prefers-reduced-motion: reduce) {
    .fade-up, .fade-up-1, .fade-up-2, .fade-up-3, .scale-in, .swimmer, .badge-pop, .toast-in {
      animation: none !important;
    }
  }
`;

// ── DATA ──────────────────────────────────────────────────────────────────
// Catalogues onboarding → ./lib/onboarding-catalog.jsx
const capitalizeLabel = (value = "") => value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
const pluralizeSessions = (count) => `${count} séance${count > 1 ? "s" : ""}`;
const getPlanPrimaryLabel = (entry) => {
  const goalLabel = findGoalById(entry?.profile?.goal)?.label;
  if (goalLabel) return goalLabel;
  return CATEGORIES.find((c) => c.id === entry?.profile?.category)?.label || "Plan";
};
const getPlanSecondaryLabel = (entry) => {
  const profile = entry?.profile || {};
  const meta = [];
  if (isProgressionGoal(profile.goal) || usesSessionLoop(profile)) {
    if (profile.level) meta.push(findLevelById(profile.level)?.label || capitalizeLabel(profile.level));
    meta.push(profile.sessionsPerWeek ? pluralizeSessions(profile.sessionsPerWeek) : "Séance du jour");
    if (profile.eventDate) {
      const days = Math.max(0, Math.ceil((new Date(profile.eventDate) - new Date()) / 86400000));
      meta.push(`J−${days}`);
    }
    return meta.join(" · ");
  }
  if (profile.sessionsPerWeek) meta.push(`${profile.sessionsPerWeek}×/sem`);
  if (profile.eventDate) {
    const days = Math.max(0, Math.ceil((new Date(profile.eventDate) - new Date()) / 86400000));
    meta.push(`J−${days}`);
  }
  return meta.join(" · ");
};

// ── UTILS ─────────────────────────────────────────────────────────────────

// Premium = app_metadata uniquement (écrit par service role / Stripe).
// user_metadata est falsifiable par le client → jamais utilisé pour l'accès.
const checkIsPremium = (user) => getAccessState(user).hasPremiumAccess;

const syncSubscriptionFromStripe = async () => {
  const { data: refreshData } = await supabase.auth.refreshSession();
  const session = refreshData?.session;
  if (!session) return null;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Synchronisation échouée");
  const { data } = await supabase.auth.refreshSession();
  return data?.user ?? null;
};

const weeksUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.max(1, Math.ceil((new Date(dateStr) - new Date()) / (7 * 86400000)));
};

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const eventMinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 42);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toISODate = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const parseISODate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateFR = (iso) => {
  const date = parseISODate(iso);
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const formatDuration = (mins) => {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60).toString().padStart(2, "0") : ""}`;
};

const SKIP_LABELS = { missed: "Sautée", not_done: "Pas nagée" };
const INSTAGRAM_MYSWYM = "https://www.instagram.com/myswym.app/";

/** Sheet de validation séance (faite / sautée / pas nagée). */
function SessionMarkSheet({ sessionTitle, onPick, onClose }) {
  const options = [
    {
      id: "done",
      label: "Je l’ai faite",
      sub: "Valider et avancer",
      icon: Check,
      primary: true,
    },
    {
      id: "missed",
      label: "Je l’ai sautée",
      sub: "Pas le temps / oublié",
      icon: RotateCcw,
      color: G.gold,
    },
    {
      id: "not_done",
      label: "Je n’ai pas nagé",
      sub: "Autre raison",
      icon: X,
      color: G.greyMid,
    },
  ];

  return createPortal(
    <div
      className="sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Marquer la séance"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="sheet-panel scale-in"
        style={{
          background: G.surface,
          borderRadius: "24px 24px 0 0",
          padding: "20px 18px max(28px, env(safe-area-inset-bottom))",
          maxHeight: "85dvh",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: G.greyLight, margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              Séance
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: G.ink, lineHeight: 1.2, fontFamily: FONT_DISPLAY }}>
              Comment s’est passée la séance ?
            </h3>
            {sessionTitle ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: G.inkLight, lineHeight: 1.35 }}>
                {sessionTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0, cursor: "pointer",
              border: `1px solid ${G.greyLight}`, background: G.greyXLight,
              color: G.ink, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => {
            if (opt.primary) {
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onPick?.(opt.id)}
                  style={{
                    width: "100%", minHeight: 52, borderRadius: 14, border: "none", cursor: "pointer",
                    background: G.mint, color: G.white, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: "rgba(255,255,255,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <opt.icon size={18} color={G.white} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{opt.label}</span>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>{opt.sub}</span>
                  </span>
                </button>
              );
            }
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPick?.(opt.id)}
                style={{
                  width: "100%", minHeight: 52, borderRadius: 14, cursor: "pointer",
                  border: `1px solid ${G.greyLight}`, background: G.greyXLight,
                  color: G.ink, padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${opt.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <opt.icon size={16} color={opt.color} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{opt.label}</span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: G.grey, marginTop: 2 }}>{opt.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Enlève le préfixe coach `-` / `·` pour l'affichage. */
const stripDetailPrefix = (raw) => String(raw || "").trim().replace(/^[-–—·]\s*/, "");

/**
 * Classe une ligne de détail :
 * - header : total de bloc (« 400m éducatif + jambes »)
 * - sub : série du bloc (« 4x50m … »)
 * - work : série autonome
 */
const classifyDetailLine = (raw) => {
  const full = String(raw || "");
  const trimmed = full.trim();
  if (!trimmed) return "empty";
  const body = stripDetailPrefix(trimmed);
  // Sous-série : préfixe · ou ligne indentée (sans tiret de bloc)
  const isSubPrefix = /^[·]/.test(trimmed) || (/^\s/.test(full) && !/^[-–—]/.test(trimmed));
  if (isSubPrefix) return "sub";
  const isNx = /^\d+\s*[x×]\s*\d+/i.test(body) || /^\d+\s*[x×]\s*\(/i.test(body);
  // Titre de bloc : « 400m éducatif… » (pas une série NxXm)
  if (/^\d+\s*m\b/i.test(body) && !isNx) return "header";
  return "work";
};

/** Regroupe header + sous-séries en blocs logiques (1 numéro = 1 bloc coach). */
const groupSessionDetails = (details = []) => {
  const groups = [];
  let i = 0;
  while (i < details.length) {
    const raw = details[i];
    const kind = classifyDetailLine(raw);
    if (kind === "empty") { i += 1; continue; }
    if (kind === "header") {
      const children = [];
      i += 1;
      while (i < details.length && classifyDetailLine(details[i]) === "sub") {
        children.push(details[i]);
        i += 1;
      }
      groups.push({ type: "block", header: raw, children });
      continue;
    }
    if (kind === "sub") {
      groups.push({ type: "work", lines: [raw] });
      i += 1;
      continue;
    }
    const lines = [raw];
    i += 1;
    while (i < details.length && classifyDetailLine(details[i]) === "work") {
      lines.push(details[i]);
      i += 1;
    }
    groups.push({ type: "work", lines });
  }
  return groups;
};

/** Une partie « 6×50m crawl D1'10" » ou « 100m jambes D2'30" ». */
const SWIM_SET_PART_RE = /^(?:\d+\s*[x×]\s*\d+\s*m|\d+\s*m)\b/i;

const estimateSetPartMeters = (part) => {
  const t = String(part);
  let m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*m/i);
  if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
  m = t.match(/(\d+)\s*m\b/i);
  return m ? parseInt(m[1], 10) : 0;
};

/**
 * Découpe les lignes Arthur compactes « A · B · C, Z2 » en titre + sous-séries.
 * Fix UX Performance / banque gold : plus de mur de texte sur une ligne.
 */
const expandCompoundDetailLines = (details = []) => {
  // Restitution coach (retire headlines / pyramides opaques / bruit UX)
  const source = toCoachDetailLines(details);
  const out = [];
  for (const raw of source) {
    const full = String(raw ?? "");
    const text = full.trim();
    if (!text) continue;

    // Déjà une sous-série indentée / ·
    if (/^[·]/.test(text) || (/^\s/.test(full) && !/^[-–—]/.test(text))) {
      out.push(full.startsWith("  ") ? full : `  ${text}`);
      continue;
    }

    const emParts = text.replace(/^[-–—]\s*/, "").split(/\s*[—–]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    const swimMain = emParts[0] || text.replace(/^[-–—]\s*/, "");
    const cues = emParts.slice(1);
    const parts = swimMain.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
    const allSets = parts.length >= 2 && parts.every((p) => SWIM_SET_PART_RE.test(p));

    if (allSets) {
      const total = parts.reduce((a, p) => a + estimateSetPartMeters(p), 0);
      const cueStr = cues.join(" - ");
      out.push(total > 0 ? `-${total}m${cueStr ? ` - ${cueStr}` : ""} :` : `-Série${cueStr ? ` - ${cueStr}` : ""} :`);
      parts.forEach((p) => out.push(`  · ${p}`));
    } else {
      out.push(text);
    }
  }
  return out.map((line) => prettifySessionDetailLine(line));
};

// Feedback hebdo : multiplicateur cumulé plafonné (évite ×1.12^n sans borne vs règle +10 %/sem.)
const VOLUME_ADJ_MIN = 0.7;
const VOLUME_ADJ_MAX = 1.3;
const VOLUME_ADJ_EASY = 1.12;
const VOLUME_ADJ_HARD = 0.88;
/** Micro-nudge sessionnel (entre deux bilans hebdo), plus doux pour éviter le double-effet. */
const VOLUME_ADJ_SESSION_EASY = 1.03;
const VOLUME_ADJ_SESSION_HARD = 0.97;
const clampVolumeAdj = (v) => Math.min(VOLUME_ADJ_MAX, Math.max(VOLUME_ADJ_MIN, v));

/** Scale les distances dans une ligne de détail (N×Xm, pyramides, Xm) sans double-comptage. */
const scaleDetailLineMeters = (line, ratio) => {
  if (!ratio || ratio === 1) return line;
  const snap = (m) => Math.max(25, Math.round(Number(m) * ratio / 25) * 25);
  const held = [];
  let out = String(line).replace(/(\d+)\s*([×x])\s*(\d+)\s*m/g, (_, n, x, dist) => {
    const tok = `\0${held.length}\0`;
    held.push(`${n}${x}${snap(dist)}m`);
    return tok;
  });
  out = out.replace(/(\d+(?:\s*[–\-]\s*\d+)+)\s*m/g, (_, seq) => {
    const tok = `\0${held.length}\0`;
    const scaled = seq.split(/([–\-])/).map((p) => (/[–\-]/.test(p) ? p : String(snap(parseInt(p, 10))))).join("");
    held.push(`${scaled}m`);
    return tok;
  });
  out = out.replace(/\b(\d+)\s*m\b/g, (_, d) => `${snap(d)}m`);
  return out.replace(/\0(\d+)\0/g, (_, idx) => held[Number(idx)]);
};

/** Patch volume séance : distance + duration + details (total = somme des blocs). */
const scaleSessionVolume = (s, factor) => {
  if (!factor || factor === 1) return s;
  const oldD = parseInt(s.distance, 10) || 0;
  const details = (s.details || []).map((line) => scaleDetailLineMeters(line, factor));
  const sum = calcSessionDistance(details);
  const dist = sum > 0 ? sum : Math.round(oldD * factor / 50) * 50;
  const durBase = s.duration || Math.max(40, Math.round((dist || oldD) / 35));
  const duration = Math.max(20, Math.round(durBase * (oldD > 0 ? dist / oldD : factor) / 5) * 5);
  return { ...s, details, distance: `${dist}m`, duration };
};

const phaseListForAdjust = (profile, plan) => {
  const rawWeeks = plan.totalRealWeeks || plan.weeks.length;
  const n = plan.weeks.length;
  const goal = profile.goal;
  const full = isProgressionGoal(goal)
    ? buildProgressionPhases().slice(0, rawWeeks)
    : isWellnessGoal(goal)
      ? buildWellnessPhases(rawWeeks)
      : buildPlanPhases(rawWeeks);
  return full.slice(0, n);
};

/**
 * Applique le feedback easy/ok/hard aux semaines futures.
 * - volumeAdj cumulé plafonné [0.70, 1.30]
 * - Coach : régénère les semaines futures vierges (details cohérents)
 * - Legacy / échec regen : scale distance+duration+details
 * Ne touche jamais une semaine déjà commencée (completed/skipped/feedback).
 */
const adjustPlan = (plan, weekIndex, rating, profile = null, premium = true, { sessionNudge = false, finished = true, skipReason = null, isKeySession = false, weekFeedbacks = null, sessionIntent = null, qualitySession = false, phase = null, taperStage = null } = {}) => {
  const legacy = normalizeFeedbackRating(rating);
  const adapt = decideAdaptAction({
    rating,
    finished,
    skipReason,
    previousSignals: plan._adaptSignals || [],
    isKeySession,
    weekFeedbacks,
    sessionIntent,
    qualitySession,
    phase: phase || plan.weeks?.[weekIndex]?.phase || null,
    taperStage: taperStage || plan._taperStage || null,
    level: profile?.level || null,
  });
  const signals = [...(plan._adaptSignals || []), legacy].slice(-5);

  if (plan?.isSessionLoop) {
    const step = adapt.observeOnly && !sessionNudge
      ? 1
      : (adapt.volumeMul !== 1 ? adapt.volumeMul : (legacy === "easy" ? VOLUME_ADJ_SESSION_EASY : legacy === "hard" ? VOLUME_ADJ_SESSION_HARD : 1));
    const prevAdj = plan.volumeAdj ?? 1;
    const nextAdj = step === 1 ? prevAdj : clampVolumeAdj(prevAdj * step);
    return { ...plan, volumeAdj: nextAdj, _adaptSignals: signals, _lastAdapt: adapt.action };
  }

  const prevAdj = plan.volumeAdj ?? 1;
  // Prefer engine mul when not observe-only; session nudge still applies micro-step if observing
  const effectiveAdj = adapt.observeOnly
    ? (sessionNudge
        ? clampVolumeAdj(prevAdj * (legacy === "easy" ? VOLUME_ADJ_SESSION_EASY : legacy === "hard" ? VOLUME_ADJ_SESSION_HARD : 1))
        : prevAdj)
    : clampVolumeAdj(prevAdj * adapt.volumeMul);
  const applyFactor = prevAdj > 0 ? effectiveAdj / prevAdj : 1;

  const weeksWithFeedback = plan.weeks.map((w, i) =>
    (i === weekIndex && !sessionNudge ? { ...w, feedback: legacy } : w),
  );

  let nextWeeks = weeksWithFeedback;

  const engineProfile = profile
    ? {
        ...profile,
        volumeAdj: effectiveAdj,
        taste: plan.taste || profile.taste,
        _engineHistory: {
          hardStreak: signals.filter((s) => s === "hard").length >= 2 ? 2 : (legacy === "hard" ? 1 : 0),
          easyStreak: legacy === "easy" ? 1 : 0,
          unfinishedRecent: finished ? 0 : 1,
          completedSessions: (plan.weeks || []).reduce((n, w) => n + (w.sessions || []).filter((s) => s.completed).length, 0),
          weeklyAdaptation: adapt.weeklyAdaptation || plan._weeklyAdaptation || null,
          trend: adapt.trend || plan._adaptTrend || null,
          painProtection: adapt.safety === "pain" || !!plan._engineHistory?.painProtection,
          capacityDimensions: plan._capacityDimensions || plan._engineHistory?.capacityDimensions || null,
          postRaceRecovery: !!plan._engineHistory?.postRaceRecovery,
          planStartDate: plan.planStartDate || plan._engineHistory?.planStartDate || null,
        },
      }
    : null;

  if (applyFactor !== 1 && engineProfile && shouldUseCoachGenerator(engineProfile.goal)) {
    try {
      const phaseList = phaseListForAdjust(engineProfile, plan);
      const fresh = buildCoachPlanWeeks(
        engineProfile,
        phaseList,
        premium,
        TIPS,
        5,
      );
      nextWeeks = weeksWithFeedback.map((w, i) => {
        if (i <= weekIndex || shouldPreserveWeek(w)) return w;
        return fresh[i] ?? w;
      });
    } catch {
      nextWeeks = weeksWithFeedback.map((w, i) => {
        if (i <= weekIndex || shouldPreserveWeek(w)) return w;
        return { ...w, sessions: w.sessions.map((s) => scaleSessionVolume(s, applyFactor)) };
      });
    }
  } else if (applyFactor !== 1) {
    nextWeeks = weeksWithFeedback.map((w, i) => {
      if (i <= weekIndex || shouldPreserveWeek(w)) return w;
      return { ...w, sessions: w.sessions.map((s) => scaleSessionVolume(s, applyFactor)) };
    });
  }

  return {
    ...plan,
    volumeAdj: effectiveAdj,
    weeks: nextWeeks,
    _adaptSignals: signals,
    _lastAdapt: adapt.action,
    _weeklyAdaptation: adapt.weeklyAdaptation || null,
    _adaptTrend: adapt.trend || null,
    _adaptExplain: adapt.devExplain || null,
    _capacityDimensions: adapt.weeklyAdaptation
      ? plan._capacityDimensions || null
      : plan._capacityDimensions || null,
    // Étape K compat : persister la vue history sur le blob (reload sans tables K)
    _engineHistory: engineProfile?._engineHistory || plan._engineHistory || null,
  };
};

// ── PRIMITIVES ────────────────────────────────────────────────────────────
const onboardingTitleStyle = () => ({
  fontFamily: FONT_DISPLAY,
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: G.ink,
  marginBottom: 8,
  lineHeight: 1.1,
});

const Progress = ({ step, total }) => (
  <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? G.blue : G.greyLight, transition: "background 0.3s" }} />
    ))}
  </div>
);

const Ring = ({ value, size = 64, stroke = 6, color = G.water, bg = "rgba(255,255,255,0.12)", label }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(1, value))}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      {label && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: size * 0.2, fontWeight: 700, color: G.white }}>{label}</span></div>}
    </div>
  );
};

const StatPill = ({ icon: Icon, value, label, color, bg }) => (
  <div style={{ background: G.surface, borderRadius: 22, padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 20px rgba(142,179,255,0.10)", border: `1px solid rgba(142,179,255,0.10)` }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: bg || G.blueLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={20} color={color || G.blue} />
    </div>
    <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.02em", color: color || G.blue, lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 10, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>{label}</span>
  </div>
);

// ── PACE ZONES CARD ─────────────────────────────────────────────────────
/** Labels UI, les mults réels viennent de appZoneMultForT100(T100). */
const ZONE_DEFS = [
  {
    zone: "Zone 1-2",
    label: "Facile, Longue durée",
    key: "easy",
    color: "#34C759",
    bg: "#34C75914",
    desc: "Tu pourrais parler pendant que tu nages. C'est l'allure de base, confortable, régulière. C'est là que tu construis ton moteur.",
    tip: "La majorité de tes séances",
  },
  {
    zone: "Zone 3-4",
    label: "Allure seuil",
    key: "threshold",
    color: "#FF9F0A",
    bg: "#FF9F0A14",
    desc: "Effort soutenu, tu peux tenir cette allure sur 10-20 min mais pas indéfiniment. C'est ton allure de compétition sur distances moyennes.",
    tip: "Améliore ton endurance rapidement",
  },
  {
    zone: "Zone 5-6",
    label: "Sprint",
    key: "sprint",
    color: "#FF3B30",
    bg: "#FF3B3014",
    desc: "Effort maximal sur de courtes distances (25-50m). Tu dois récupérer complètement entre chaque sprint. Développe ta puissance.",
    tip: "Explosivité et vitesse",
  },
];

function fmtTime(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.round(totalSecs % 60);
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;
  return `${m}'${String(s).padStart(2,'0')}"`;
}

function getCurrentWeekNumber(plan) {
  if (!plan?.weeks?.length) return 1;
  const idx = plan.weeks.findIndex(w => !w.sessions.every(isSessionResolved));
  if (idx < 0) return plan.weeks[plan.weeks.length - 1]?.number || plan.weeks.length;
  return plan.weeks[idx]?.number || idx + 1;
}

function appendPaceHistory(profile, { pace100, week, source = "manual" }) {
  if (!pace100) return profile;
  const hist = Array.isArray(profile.paceHistory) ? [...profile.paceHistory] : [];
  const entry = {
    week: week || 1,
    pace100,
    at: new Date().toISOString(),
    source,
  };
  const last = hist[hist.length - 1];
  if (last && last.pace100 === entry.pace100 && last.week === entry.week) {
    return profile;
  }
  hist.push(entry);
  return { ...profile, paceHistory: hist };
}

/** Bloc unique : T50 / T100 / T400 + zones utiles + projection 2/5 ans. */
const MonAllureCard = ({ profile, pace100, pace50 = null, pace400 = null, isPremium, onSave, onUpgrade }) => {
  const [val100, setVal100] = useState(pace100 || null);
  const [val50, setVal50] = useState(pace50 || null);
  const [val400, setVal400] = useState(pace400 || null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [horizonYears, setHorizonYears] = useState(2);
  const isDiscovery = profile?.level === "découverte" || profile?.level === "beginner";

  useEffect(() => {
    setVal100(pace100 || null);
    setVal50(pace50 || null);
    setVal400(pace400 || null);
    setSaved(false);
  }, [pace100, pace50, pace400]);

  const activePace = val100 || pace100 || null;
  const hasChange =
    val100 !== (pace100 || null)
    || val50 !== (pace50 || null)
    || val400 !== (pace400 || null);
  const canSave = isPremium && hasChange && !saving;
  const zoneMult = appZoneMultForT100(activePace);
  const fmtZone = (s) => `${Math.floor(s / 60)}'${String(Math.round(s % 60)).padStart(2, "0")}"`;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await Promise.resolve(onSave?.({
        pace100: val100,
        pace50: val50,
        pace400: val400,
      }));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // Courbe 2/5 ans
  const startPace = pace100 || activePace;
  const showEvolution = !isDiscovery && isPremium && !!startPace;
  const paceAt2 = startPace ? projectedPaceAtYears(startPace, 2) : null;
  const paceAt5 = startPace ? projectedPaceAtYears(startPace, 5) : null;
  const endPace = startPace ? projectedPaceAtYears(startPace, horizonYears) : null;
  let evolSvg = null;
  if (showEvolution && startPace && endPace != null) {
    const STEPS = 24;
    const yearsAxis = Array.from({ length: STEPS + 1 }, (_, i) => (i / STEPS) * horizonYears);
    const projected = yearsAxis.map((y) => projectedPaceAtYears(startPace, y));
    const allVals = [...projected, startPace];
    const tMin = Math.min(...allVals) * 0.98;
    const tMax = Math.max(...allVals) * 1.02;
    const SVG_W = 280, SVG_H = 96, PAD_L = 4, PAD_R = 4, PAD_T = 8, PAD_B = 4;
    const xOf = (y) => PAD_L + (y / Math.max(0.01, horizonYears)) * (SVG_W - PAD_L - PAD_R);
    const yOf = (t) => PAD_T + (1 - (t - tMin) / (tMax - tMin || 1)) * (SVG_H - PAD_T - PAD_B);
    const projPts = yearsAxis.map((y, i) => `${xOf(y).toFixed(1)},${yOf(projected[i]).toFixed(1)}`).join(" ");
    const gainSec = Math.max(0, Math.round(startPace - endPace));
    const gainPct = startPace > 0 ? Math.round((gainSec / startPace) * 1000) / 10 : 0;
    evolSvg = { SVG_W, SVG_H, xOf, yOf, projPts, startPace, endPace, gainSec, gainPct, paceAt2, paceAt5 };
  }

  const lockedPaceBtn = (placeholder, aria) => (
    <button
      type="button"
      onClick={onUpgrade}
      aria-label={aria}
      style={{
        display: "block", width: "100%", boxSizing: "border-box",
        padding: "14px 12px", fontSize: 22,
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontWeight: 700,
        textAlign: "center", letterSpacing: "0.06em",
        border: `2px solid ${G.greyLight}`,
        borderRadius: 14, outline: "none",
        background: G.greyXLight, color: G.greyMid,
        cursor: "pointer", opacity: 0.9,
      }}
    >
      {placeholder}
    </button>
  );

  return (
    <div className="fade-up" style={{
      background: G.surface,
      borderRadius: 20,
      padding: "18px 16px",
      marginBottom: 16,
      border: `1px solid ${G.greyLight}`,
      boxShadow: "0 1px 2px rgba(25,28,30,0.03), 0 12px 32px rgba(53,93,163,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Gauge size={16} color={G.blue} />
          <span style={{ fontSize: 15, fontWeight: 700, color: G.ink, letterSpacing: "-0.01em" }}>
            Mon allure
          </span>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-expanded={infoOpen}
            aria-label={infoOpen ? "Masquer l’aide allures" : "Pourquoi et comment renseigner les temps"}
            style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              border: `1px solid ${G.blueMid}55`,
              background: infoOpen ? G.blueLight : "transparent",
              color: G.blue,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          >
            <Info size={13} strokeWidth={2.4} />
          </button>
        </div>
        {!isPremium && <Lock size={14} color={G.greyMid} aria-hidden />}
      </div>

      {infoOpen && (
        <div style={{
          marginBottom: 12, padding: "12px 14px", borderRadius: 12,
          background: G.blueLight, border: `1px solid ${G.blueMid}33`,
          fontSize: 13, color: G.inkLight, lineHeight: 1.5,
        }}>
          <p style={{ margin: "0 0 8px" }}>
            <strong style={{ color: G.ink }}>Pourquoi&nbsp;?</strong>{" "}
            Le 100&nbsp;m (T100) calibre zones et séances. Les 50 et 400&nbsp;m aident à mieux te situer (on les branchera ensuite).
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: G.ink }}>Comment&nbsp;?</strong>{" "}
            Crawl, départ dans l’eau, note ton meilleur temps sur chaque distance.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.grey, marginBottom: 8 }}>
            Meilleur temps 50 m
          </div>
          {isPremium ? (
            <PaceInput
              placeholder="0:42"
              value={val50}
              onChange={(v) => { setVal50(v); setSaved(false); }}
              maxLen={3}
              minSec={18}
              maxSec={150}
            />
          ) : lockedPaceBtn("0:42", "Débloquer le temps au 50 m avec Premium")}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.grey, marginBottom: 8 }}>
            Meilleur temps 100 m
          </div>
          {isPremium ? (
            <PaceInput
              placeholder="1:45"
              value={val100}
              onChange={(v) => { setVal100(v); setSaved(false); }}
              maxLen={3}
              minSec={45}
              maxSec={5 * 60}
            />
          ) : lockedPaceBtn("1:45", "Débloquer le temps au 100 m avec Premium")}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.grey, marginBottom: 8 }}>
            Meilleur temps 400 m
          </div>
          {isPremium ? (
            <PaceInput
              placeholder="7:30"
              value={val400}
              onChange={(v) => { setVal400(v); setSaved(false); }}
              maxLen={4}
              minSec={200}
              maxSec={20 * 60}
            />
          ) : lockedPaceBtn("7:30", "Débloquer le temps au 400 m avec Premium")}
        </div>
      </div>

      {isPremium ? (
        <>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: "100%", padding: "12px", borderRadius: 14, border: "none",
              minHeight: 44,
              cursor: canSave ? "pointer" : "not-allowed",
              background: saved ? G.mint : canSave ? G.blue : G.greyLight,
              color: saved || canSave ? G.white : G.greyMid,
              fontWeight: 700, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: activePace ? 14 : 0,
            }}
          >
            {saved ? <><Check size={16} /> Enregistré</> : saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved && (
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: G.mint, textAlign: "center" }}>
              Temps enregistrés. Le T100 adapte tes prochaines séances.
            </p>
          )}
          {!saved && pace100 && !hasChange && (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: G.grey, textAlign: "center" }}>
              Actif : {secToDisplay(pace100)} /100&nbsp;m
              {pace50 ? ` · ${secToDisplay(pace50)} /50 m` : ""}
              {pace400 ? ` · ${secToDisplay(pace400)} /400 m` : ""}
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            width: "100%", padding: "12px", borderRadius: 14, border: "none",
            minHeight: 44, cursor: "pointer", marginBottom: 4,
            background: G.blue, color: G.white, fontWeight: 700, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <Lock size={14} color={G.white} />
          Débloquer avec Premium
        </button>
      )}

      {isPremium && activePace && (
        <div style={{ marginBottom: showEvolution ? 16 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.grey, marginBottom: 8 }}>
            Zones utiles
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ZONE_DEFS.map((z) => {
              const ps = Math.round(activePace * zoneMult[z.key]);
              return (
                <div key={z.key} style={{
                  background: z.bg, border: `1px solid ${z.color}28`, borderRadius: 12,
                  padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: G.ink }}>{z.label}</div>
                    <div style={{ fontSize: 11, color: G.grey, marginTop: 2 }}>{z.tip}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: z.color, flexShrink: 0 }}>
                    {fmtZone(ps)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showEvolution && evolSvg && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Projection T100
            </div>
            <div style={{ display: "flex", gap: 4, background: G.greyXLight, borderRadius: 10, padding: 3 }}>
              {[2, 5].map((y) => {
                const active = horizonYears === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setHorizonYears(y)}
                    style={{
                      border: "none", borderRadius: 8, padding: "5px 9px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                      background: active ? G.blue : "transparent",
                      color: active ? G.white : G.grey,
                    }}
                  >
                    {y} ans
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ background: G.greyXLight, borderRadius: 12, padding: "10px 8px 6px", marginBottom: 10 }}>
            <svg width="100%" viewBox={`0 0 ${evolSvg.SVG_W} ${evolSvg.SVG_H}`} style={{ display: "block" }} aria-label="Projection T100">
              <defs>
                <linearGradient id="monAllureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={G.blue} stopOpacity="0.20" />
                  <stop offset="100%" stopColor={G.blue} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon points={`${evolSvg.xOf(0).toFixed(1)},${evolSvg.SVG_H} ${evolSvg.projPts} ${evolSvg.xOf(horizonYears).toFixed(1)},${evolSvg.SVG_H}`} fill="url(#monAllureGrad)" />
              <polyline points={evolSvg.projPts} fill="none" stroke={G.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={evolSvg.xOf(0)} cy={evolSvg.yOf(evolSvg.startPace)} r="4" fill={G.mint} stroke={G.white} strokeWidth="2" />
              <circle cx={evolSvg.xOf(horizonYears)} cy={evolSvg.yOf(evolSvg.endPace)} r="3.5" fill={G.blue} stroke={G.white} strokeWidth="2" />
            </svg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { label: "Aujourd’hui", value: fmtTime(Math.round(evolSvg.startPace)), color: G.ink },
              { label: "+2 ans", value: fmtTime(Math.round(evolSvg.paceAt2)), color: G.blue },
              { label: "+5 ans", value: fmtTime(Math.round(evolSvg.paceAt5)), color: G.mint },
            ].map((c) => (
              <div key={c.label} style={{ background: G.greyXLight, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: G.grey, fontWeight: 600, marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: G.greyMid, margin: 0, lineHeight: 1.45 }}>
            Indicatif · entraînement régulier (~{evolSvg.gainPct}% / −{evolSvg.gainSec}s sur {horizonYears} ans).
          </p>
        </div>
      )}

      {isPremium && Array.isArray(profile?.paceHistory) && profile.paceHistory.filter((h) => h?.pace100).length > 0 && (
        <div style={{ marginTop: showEvolution ? 16 : 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Journal T100
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...profile.paceHistory].filter((h) => h?.pace100).slice(-6).reverse().map((h, i) => {
              const when = h.at ? new Date(h.at) : null;
              const whenLabel = when && Number.isFinite(when.getTime())
                ? when.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                : (h.week ? `Sem. ${h.week}` : "-");
              const src = h.source === "strava" ? "Strava" : h.source === "program" ? "Programme" : "Manuel";
              return (
                <div
                  key={`${h.pace100}-${h.at || i}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "8px 10px", borderRadius: 10, background: G.greyXLight,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>{secToDisplay(h.pace100)}</div>
                  <div style={{ fontSize: 11, color: G.greyMid, textAlign: "right" }}>
                    {whenLabel} · {src}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isPremium && (
        <p style={{ fontSize: 12, color: G.grey, margin: "12px 0 0", lineHeight: 1.45, textAlign: "center" }}>
          Zones + projection 2/5 ans avec Premium.
        </p>
      )}
    </div>
  );
};

const UpdateProgramCard = ({ profile, isPremium, onUpgrade, onSave, stravaBestPace }) => {
  const [freq, setFreq]    = useState(profile?.sessionsPerWeek ?? 2);
  const [pace100, setPace100] = useState(profile?.pace100 ?? null);
  const [paceRaw, setPaceRaw] = useState(profile?.pace100 ? secToDisplay(profile.pace100) : "");
  const [changed, setChanged] = useState(false);
  const isDecouverteLevel = profile?.level === "découverte" || profile?.level === "beginner";

  // Resync si le profil parent change (ex. après régénération / reload)
  useEffect(() => {
    setFreq(profile?.sessionsPerWeek ?? 2);
    setPace100(profile?.pace100 ?? null);
    setPaceRaw(profile?.pace100 ? secToDisplay(profile.pace100) : "");
    setChanged(false);
  }, [profile?.sessionsPerWeek, profile?.pace100]);

  const freqChanged = freq    !== (profile?.sessionsPerWeek ?? 2);
  const paceChanged = !isDecouverteLevel && pace100 !== (profile?.pace100 ?? null);
  const hasChange   = freqChanged || paceChanged || changed;

  // Quand Strava remonte une meilleure allure, on l'affiche si aucune saisie manuelle
  const stravaIsUsed = stravaBestPace && pace100 === stravaBestPace;
  const stravaIsBetter = stravaBestPace && (!pace100 || stravaBestPace < pace100);

  const applyStravaPace = () => {
    setPace100(stravaBestPace);
    setPaceRaw(secToDisplay(stravaBestPace));
    setChanged(true);
  };

  const handlePaceInput = (input) => {
    const digits = input.replace(/\D/g, "").slice(0, 3);
    setPaceRaw(fmtDigits(input, 3));
    if (digits.length < 3) { setPace100(null); return; }
    const { val } = parsePaceInput(input, 9 * 60);
    if (val && val >= 30) { setPace100(val); setChanged(true); }
    else setPace100(null);
  };

  if (!isPremium) {
    return (
      <div className="ms-glass-card" style={{ borderRadius: 18, padding: "18px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Lock size={14} color={G.greyMid} />
          <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: G.ink, margin: 0 }}>Modifier mon programme</h3>
        </div>
        <p style={{ fontSize: 13, color: G.grey, marginBottom: 16 }}>Adapte le nombre de séances{isDecouverteLevel ? "" : " et ton allure"}, réservé aux membres Premium.</p>

        {/* Aperçu grisé, clic → popup Premium */}
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            display: "block", width: "100%", textAlign: "left", cursor: "pointer",
            border: "none", background: "transparent", padding: 0, WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: G.greyMid, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Séances par semaine</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, opacity: 0.45, pointerEvents: "none" }}>
            {FREQUENCIES.map(f => {
              const active = (profile?.sessionsPerWeek ?? 2) === f.id;
              return (
                <span key={f.id} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${active ? G.blue : G.greyLight}`,
                  background: active ? G.blueLight : G.greyXLight,
                  color: active ? G.blue : G.inkLight,
                }}>
                  {f.label}
                </span>
              );
            })}
          </div>

          {!isDecouverteLevel && (
            <>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.greyMid, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Temps 100 m (T100)
          </div>
          <div style={{
            position: "relative", marginBottom: 6,
            borderRadius: 12, border: `1.5px dashed ${G.greyLight}`,
            background: G.greyXLight, opacity: 0.75,
          }}>
            <div style={{
              width: "100%", padding: "12px 48px 12px 14px",
              fontSize: 16, fontWeight: 700, color: G.greyMid,
              fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", boxSizing: "border-box",
            }}>
              {paceRaw || "ex: 2:10"}
            </div>
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: G.greyMid, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={14} color={G.greyMid} />
              /100m
            </span>
          </div>
          <div style={{ fontSize: 11, color: G.greyMid, marginBottom: 16 }}>
            Départ dans l&apos;eau (pas de plongeon), adapte les allures de tes séances
          </div>
            </>
          )}
        </button>

        <button type="button" onClick={onUpgrade} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: G.blueLight, color: G.blue, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 }}>
          <Zap size={14} color={G.blue} /> Débloquer mon coach personnel
        </button>
      </div>
    );
  }

  return (
    <div className="ms-glass-card" style={{ borderRadius: 18, padding: "18px 16px", marginBottom: 16 }}>
      <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: G.ink, marginBottom: 4 }}>Modifier mon programme</h3>
      <p style={{ fontSize: 13, color: G.grey, marginBottom: 16 }}>Tes semaines déjà entamées et tes séances validées sont conservées. La nouvelle fréquence s&apos;applique aux semaines pas encore commencées.</p>

      {/* Fréquence */}
      <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Séances par semaine</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {FREQUENCIES.map(f => {
          const active = freq === f.id;
          return (
            <button key={f.id} onClick={() => { setFreq(f.id); setChanged(true); }} style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${active ? G.blue : G.greyLight}`,
              background: active ? G.blueLight : G.greyXLight,
              color: active ? G.blue : G.inkLight,
            }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Allure 100m, pas en Découverte (souvent incapables d'enchaîner 100 m) */}
      {!isDecouverteLevel && (
        <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Temps 100 m (T100)
        </div>
        {stravaBestPace && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: "#FC4C02", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={10} color="#fff" />
            </div>
            <span style={{ fontSize: 11, color: G.grey }}>Strava : <strong style={{ color: G.ink }}>{secToDisplay(stravaBestPace)}</strong></span>
            {stravaIsBetter && (
              <button onClick={applyStravaPace} style={{
                padding: "2px 8px", borderRadius: 6, border: "none",
                background: G.blue, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>Utiliser</button>
            )}
            {stravaIsUsed && (
              <span style={{ fontSize: 11, color: G.blue, fontWeight: 600 }}>utilisé</span>
            )}
          </div>
        )}
      </div>
      <div style={{ position: "relative", marginBottom: 6 }}>
        <input
          type="text" inputMode="numeric"
          placeholder={stravaBestPace ? secToDisplay(stravaBestPace) : "ex: 2:10"}
          value={paceRaw}
          onChange={e => handlePaceInput(e.target.value)}
          style={{
            width: "100%", padding: "12px 48px 12px 14px", borderRadius: 12,
            border: `1.5px solid ${pace100 ? G.blue : G.greyLight}`,
            fontSize: 16, fontWeight: 700, color: G.ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", background: G.surface,
            outline: "none", boxSizing: "border-box",
          }}
        />
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: G.grey, pointerEvents: "none" }}>/100m</span>
      </div>
      <div style={{ fontSize: 11, color: pace100 ? G.blue : G.greyMid, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
        {pace100
          ? <><Gauge size={11} color={G.blue} /> Départ dans l&apos;eau, les allures seront recalculées sur ce T100</>
          : "Optionnel : test 100 m départ dans l'eau (pas de plongeon)"}
      </div>
        </>
      )}

      {hasChange && (
        <button onClick={() => { onSave(freq, isDecouverteLevel ? null : pace100); setChanged(false); }} style={{
          width: "100%", padding: "13px", borderRadius: 12, background: G.blue, border: "none",
          color: G.white, fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <RotateCcw size={14} color={G.white} /> Régénérer mon plan ({freq}×/sem)
        </button>
      )}
    </div>
  );
};

// ── STRAVA ────────────────────────────────────────────────────────────────────

const STRAVA_ACTIVITY_META = {
  Swim:          { label: "Nage piscine", color: G.blue, bg: G.blueLight, Icon: Waves    },
  OpenWaterSwim: { label: "Eau libre", color: G.water, bg: G.waterLight, Icon: Waves    },
  Triathlon:     { label: "Triathlon", color: G.purple, bg: G.purpleLight, Icon: Activity },
  Run:           { label: "Course", color: G.coral, bg: G.coralLight, Icon: Activity },
  Ride:          { label: "Vélo", color: G.mint, bg: G.mintLight, Icon: Activity },
};

const fmtDist = (m) => {
  if (!m) return "-";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
};
const fmtDur = (s) => {
  if (!s) return "-";
  const h = Math.floor(s / 3600);
  const mn = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${mn}min` : `${mn} min`;
};
const fmtPace = (sec) => {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}/100m`;
};

const fmtSpeedKmh = (metersPerSecond) => {
  if (!metersPerSecond) return "-";
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
};

const formatActivityLongDate = (iso) => {
  if (!iso) return "-";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const parseSessionDistanceValue = (distanceLabel) => {
  if (!distanceLabel) return null;
  const raw = String(distanceLabel).trim().toLowerCase();
  if (raw.includes("km")) {
    const km = Number(raw.replace(",", ".").replace(/[^0-9.]/g, ""));
    return Number.isFinite(km) ? Math.round(km * 1000) : null;
  }
  const meters = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(meters) && meters > 0 ? meters : null;
};

const inferSwimFocus = (pace100Ref, activityPace, durationSec, distanceMeters) => {
  if (pace100Ref && activityPace) {
    const mult = appZoneMultForT100(pace100Ref);
    if (activityPace <= pace100Ref * ((mult.sprint ?? 0.95) + 0.05)) {
      return { key: "VITESSE", label: "vitesse", explanation: "Allure très rapide par rapport à ton T100" };
    }
    if (activityPace <= pace100Ref * ((mult.threshold ?? 1.08) + 0.08)) {
      return { key: "SEUIL", label: "seuil", explanation: "Allure soutenue, proche d'un travail au seuil" };
    }
    if (activityPace <= pace100Ref * ((mult.easy ?? 1.35) + 0.08)) {
      return { key: "ENDURANCE", label: "endurance", explanation: "Allure contrôlée, utile pour construire l'endurance" };
    }
    return { key: "RÉCUPÉRATION", label: "récupération", explanation: "Allure très relâchée, proche d'une séance facile" };
  }

  if ((distanceMeters || 0) >= 2500 || (durationSec || 0) >= 45 * 60) {
    return { key: "ENDURANCE", label: "endurance", explanation: "Volume assez long, orienté endurance" };
  }
  if ((durationSec || 0) <= 20 * 60) {
    return { key: "VITESSE", label: "vitesse", explanation: "Format court, souvent orienté qualité ou intensité" };
  }
  return { key: "SEUIL", label: "seuil", explanation: "Charge intermédiaire, entre endurance active et seuil" };
};

const getStravaVenueLabel = (activity) => {
  const type = activity?.activity_type || activity?.raw_data?.type || activity?.raw_data?.sport_type;
  if (type === "OpenWaterSwim") return "eau libre";
  if (type === "Swim") return "piscine";
  return null;
};

const buildPremiumActivityAnalysis = ({ activity, detail, currentSessionRef, profile }) => {
  const planned = currentSessionRef?.session || null;
  const actualDistance = Number(detail?.distance || activity.distance) || 0;
  const actualDuration = Number(detail?.moving_time || activity.duration) || 0;
  const actualPace = Number(activity.pace) || null;
  const focus = inferSwimFocus(profile?.pace100 || null, actualPace, actualDuration, actualDistance);
  const venue = getStravaVenueLabel(activity);
  const venueTitle = venue === "eau libre"
    ? `Séance eau libre · travail d'${focus.label}`
    : venue === "piscine"
      ? `Séance piscine · travail d'${focus.label}`
      : `Tu as surtout travaillé l'${focus.label}`;
  const venueChip = venue ? { label: "Lieu", value: venue } : null;

  if (!planned) {
    return {
      title: venueTitle,
      verdict: "Analyse disponible, mais sans séance de référence à comparer.",
      chips: [
        ...(venueChip ? [venueChip] : []),
        { label: "Focus détecté", value: focus.label },
      ],
      summary: venue
        ? `${focus.explanation}. Activité Strava détectée en ${venue}.`
        : focus.explanation,
    };
  }

  const plannedType = planned.type || "ENDURANCE";
  const plannedDistance = parseSessionDistanceValue(planned.distance);
  const distanceGap = plannedDistance ? Math.abs(actualDistance - plannedDistance) / plannedDistance : null;
  const typeMatch = plannedType === focus.key || (plannedType === "RÉCUPÉRATION" && focus.key === "ENDURANCE");
  const distanceMatch = distanceGap == null ? true : distanceGap <= 0.2;

  let verdict = "Partiellement conforme à la séance prévue";
  if (typeMatch && distanceMatch) verdict = "Très cohérent avec la séance prévue";
  else if (!typeMatch && !distanceMatch) verdict = "Plutôt éloigné de la séance prévue";

  return {
    title: venueTitle,
    verdict,
    chips: [
      ...(venueChip ? [venueChip] : []),
      { label: "Prévu", value: (plannedType || "ENDURANCE").toLowerCase() },
      { label: "Réalisé", value: focus.label },
      { label: "Volume", value: plannedDistance ? `${Math.round((actualDistance / plannedDistance) * 100)}%` : fmtDist(actualDistance) },
    ],
    summary: `${focus.explanation}${venue ? ` · séance en ${venue}` : ""}. ${planned.title ? `La prochaine séance prévue est "${planned.title}".` : "La séance prévue sert ici de référence de comparaison."}`,
  };
};

const StravaActivityModal = ({ activity, onClose, currentSessionRef, isPremium, onUpgrade, profile, showHeartRate = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailPayload, setDetailPayload] = useState(null);

  useEffect(() => {
    if (!activity?.strava_activity_id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expirée");

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-activity-detail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ activityId: activity.strava_activity_id }),
          }
        );
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || "Impossible de charger le détail");
        if (!cancelled) setDetailPayload(json);
      } catch (e) {
        if (!cancelled) setError(e.message || "Impossible de charger le détail Strava");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [activity?.strava_activity_id]);

  if (!activity) return null;

  const detail = detailPayload?.detail || null;
  const streams = detailPayload?.streams || {};
  const raw = detail || activity.raw_data || {};
  const venueLabel = getStravaVenueLabel(activity)
    || STRAVA_ACTIVITY_META[activity.activity_type]?.label
    || activity.activity_type
    || "Activité";
  const cadenceValue = raw.average_cadence
    ? `${Number(raw.average_cadence).toFixed(1)} / min`
    : null;

  const metricCards = [
    { label: "Distance", value: fmtDist(detail?.distance || activity.distance), color: G.blue, bg: G.blueLight },
    { label: "Temps", value: fmtDur(detail?.moving_time || activity.duration), color: G.mint, bg: G.mintLight },
    { label: "Allure", value: fmtPace(activity.pace) || "-", color: G.coral, bg: G.coralLight },
    { label: "Vitesse moy.", value: fmtSpeedKmh(raw.average_speed), color: G.water, bg: G.waterLight },
    { label: "Vitesse max", value: fmtSpeedKmh(raw.max_speed), color: G.gold, bg: G.goldLight },
    { label: "FC moy.", value: showHeartRate && (raw.average_heartrate || activity.heart_rate) ? `${Math.round(raw.average_heartrate || activity.heart_rate)} bpm` : (showHeartRate ? "-" : "Masquée"), color: G.ink, bg: G.greyXLight },
    { label: "Lieu", value: venueLabel, color: G.blue, bg: G.blueLight },
    { label: cadenceValue ? "Cadence" : "Calories", value: cadenceValue || (activity.calories ? `${Math.round(activity.calories)} kcal` : "-"), color: G.mint, bg: G.mintLight },
  ];

  const extraRows = [
    { label: "Temps écoulé", value: raw.elapsed_time ? fmtDur(raw.elapsed_time) : null },
    { label: "Sport", value: raw.sport_type || null },
    { label: "Appareil", value: raw.device_name || null },
    { label: "Date", value: formatActivityLongDate(activity.activity_date) },
  ].filter((row) => row.value);

  const streamCards = [
    {
      key: "heartrate",
      label: "Fréquence cardiaque",
      unit: "bpm",
      color: G.coral,
      values: showHeartRate && Array.isArray(streams?.heartrate?.data) ? streams.heartrate.data : [],
      formatValue: (v) => `${Math.round(v)} bpm`,
    },
    {
      key: "velocity_smooth",
      label: "Vitesse",
      unit: "km/h",
      color: G.blue,
      values: Array.isArray(streams?.velocity_smooth?.data) ? streams.velocity_smooth.data.map((v) => Number(v) * 3.6) : [],
      formatValue: (v) => `${Number(v).toFixed(1)} km/h`,
    },
    {
      key: "cadence",
      label: "Cadence / coups de bras",
      unit: "/min",
      color: G.mint,
      values: Array.isArray(streams?.cadence?.data) ? streams.cadence.data : [],
      formatValue: (v) => `${Number(v).toFixed(1)} / min`,
    },
  ].filter((item) => item.values.length > 1);
  const premiumAnalysis = buildPremiumActivityAnalysis({ activity, detail, currentSessionRef, profile });

  const renderStreamChart = (values, color) => {
    const width = 300;
    const height = 90;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const points = values.map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - (((value - min) / Math.max(1, max - min || 1)) * (height - 12) + 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }} aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={width * f} y1={0} x2={width * f} y2={height} stroke={G.greyLight} strokeWidth="1" strokeDasharray="3,3" />
        ))}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return createPortal(
    <div
      className="sheet-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Détail activité Strava"
    >
      <div className="sheet-panel scale-in" style={{ background: G.surface, borderRadius: "24px 24px 0 0", padding: "24px 18px", paddingBottom: "max(28px, env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: G.greyLight, margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Activité Strava
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: G.ink, lineHeight: 1.15, margin: "0 0 6px" }}>
              {activity.title || "Séance"}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: G.grey, lineHeight: 1.45 }}>
              {formatActivityLongDate(activity.activity_date)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 44, height: 44, borderRadius: 14, border: `1px solid ${G.greyLight}`, background: G.greyXLight, color: G.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {metricCards.map((card) => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 16, padding: "14px 12px", border: `1px solid ${G.greyLight}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: card.color, marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: G.ink, lineHeight: 1.15 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: G.greyXLight, borderRadius: 18, padding: "16px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: G.ink, marginBottom: 12 }}>Détails synchronisés</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {extraRows.map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 12, color: G.grey }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, textAlign: "right" }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {isPremium ? (
          <div style={{ background: `linear-gradient(135deg, ${G.blueLight}, ${G.surface})`, borderRadius: 18, padding: "16px 14px", border: `1px solid ${G.greyLight}`, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, background: G.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color={G.blue} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>Analyse Premium MySWYM</div>
                <div style={{ fontSize: 12, color: G.grey }}>{premiumAnalysis.verdict}</div>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: G.ink, marginBottom: 10 }}>{premiumAnalysis.title}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {premiumAnalysis.chips.map((chip) => (
                <span key={chip.label} style={{ fontSize: 11, fontWeight: 700, color: G.blue, background: G.surface, border: `1px solid ${G.greyLight}`, borderRadius: 999, padding: "6px 10px" }}>
                  {chip.label} : {chip.value}
                </span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: G.grey, lineHeight: 1.5 }}>{premiumAnalysis.summary}</p>
          </div>
        ) : (
          <div style={{ background: G.surface, borderRadius: 18, padding: "16px 14px", border: `1px solid ${G.greyLight}`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: G.ink, marginBottom: 8 }}>Analyse Premium MySWYM</div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: G.grey, lineHeight: 1.5 }}>
              Débloque l&apos;analyse automatique de ta séance pour comprendre ce que tu as travaillé et si cela correspond à la séance prévue.
            </p>
            <button type="button" onClick={onUpgrade} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: G.blue, color: G.white, fontWeight: 700, cursor: "pointer" }}>
              Voir mes recommandations
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ background: G.surface, borderRadius: 18, padding: "16px 14px", border: `1px solid ${G.greyLight}`, fontSize: 13, color: G.grey }}>
            Chargement des détails avancés Strava…
          </div>
        ) : error ? (
          <div style={{ background: G.coralLight, borderRadius: 18, padding: "16px 14px", color: G.coral, fontSize: 13 }}>
            {error}
          </div>
        ) : streamCards.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {streamCards.map((stream) => {
              const avg = stream.values.reduce((sum, value) => sum + Number(value || 0), 0) / stream.values.length;
              return (
                <div key={stream.key} style={{ background: G.surface, borderRadius: 18, padding: "16px 14px", border: `1px solid ${G.greyLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>{stream.label}</div>
                    <div style={{ fontSize: 12, color: stream.color, fontWeight: 700 }}>{stream.formatValue(avg)}</div>
                  </div>
                  <div style={{ background: G.greyXLight, borderRadius: 12, padding: "10px 10px 6px" }}>
                    {renderStreamChart(stream.values, stream.color)}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: G.greyMid }}>Début</span>
                      <span style={{ fontSize: 10, color: G.greyMid }}>Temps</span>
                      <span style={{ fontSize: 10, color: G.greyMid }}>Fin</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: G.surface, borderRadius: 18, padding: "16px 14px", border: `1px solid ${G.greyLight}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: G.ink, marginBottom: 8 }}>Analyse</div>
            <p style={{ margin: 0, fontSize: 13, color: G.grey, lineHeight: 1.5 }}>
              Aucun stream détaillé n&apos;a été renvoyé par Strava pour cette activité. Si ta montre partage la fréquence cardiaque, la vitesse ou la cadence pour cette nage, elles apparaîtront ici automatiquement.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const StravaSection = ({
  user,
  onPaceUpdate,
  currentPace100,
  plan,
  profile,
  onValidateSession,
  onBestPace,
  showProgramActions = true,
  showDetails = true,
  isPremium = false,
  onUpgrade,
}) => {
  const [connected, setConnected]     = useState(null); // null = chargement
  const [athlete, setAthlete]       = useState(null);
  const [activities, setActivities]    = useState([]);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [msg, setMsg]           = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [healthGateOpen, setHealthGateOpen] = useState(false);
  const [healthGateChecked, setHealthGateChecked] = useState(false);
  const [localHealthConsent, setLocalHealthConsent] = useState(null);
  const STRAVA_ACTIVITIES_PREVIEW = 3;
  const activitiesVisible = activitiesOpen
    ? activities
    : activities.slice(0, STRAVA_ACTIVITIES_PREVIEW);

  // client_id est public (pas un secret), fallback hardcodé si l'env n'est pas chargé
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID || "233278";
  const healthOk = localHealthConsent === true || hasHealthConsent(profile);

  useEffect(() => {
    if (!user) return;
    checkConnection();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const onStrava = () => { checkConnection(); };
    window.addEventListener("myswym:strava-connected", onStrava);
    return () => window.removeEventListener("myswym:strava-connected", onStrava);
  }, [user?.id]);

  async function checkConnection() {
    try {
      const { data: rpcRows, error: rpcError } = await supabase.rpc("get_strava_connection_status");
      if (!rpcError) {
        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
        const isConnected = row?.connected === true;
        setConnected(isConnected);
        if (isConnected && row?.athlete_data) setAthlete(row.athlete_data);
        if (isConnected) await loadActivities();
        return;
      }

      // Fallback legacy (migration pas encore appliquée)
      const { data, error } = await supabase
        .from("strava_tokens")
        .select("athlete_data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) { setConnected(false); return; }
      setConnected(!!data);
      if (data?.athlete_data) setAthlete(data.athlete_data);
      if (data) await loadActivities();
    } catch {
      setConnected(false);
    }
  }

  const loadActivities = async () => {
    const { data } = await supabase
      .from("strava_activities")
      .select("strava_activity_id, activity_type, title, distance, duration, pace, calories, heart_rate, activity_date")
      .eq("user_id", user.id)
      .in("activity_type", ["Swim", "OpenWaterSwim"])
      .order("activity_date", { ascending: false })
      .limit(30);
    setActivities(data ?? []);
  };

  const connect = () => {
    if (!healthOk) {
      setHealthGateOpen(true);
      setHealthGateChecked(false);
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/app");
    window.location.href =
      `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
      `&response_type=code&redirect_uri=${redirectUri}` +
      `&approval_prompt=auto&scope=activity%3Aread_all&state=strava_connect`;
  };

  const persistHealthConsentAndConnect = async () => {
    if (!healthGateChecked) return;
    const at = new Date().toISOString();
    setLocalHealthConsent(true);
    try {
      await supabase.auth.updateUser({
        data: { health_consent: true, health_consent_at: at },
      });
      if (user?.id) {
        await supabase.from("sport_profiles").upsert({
          user_id: user.id,
          extra: {
            ...(profile?.extra && typeof profile.extra === "object" ? profile.extra : {}),
            healthConsent: true,
            healthConsentAt: at,
          },
          updated_at: at,
        }, { onConflict: "user_id" });
      }
    } catch { /* best effort */ }
    setHealthGateOpen(false);
    const redirectUri = encodeURIComponent(window.location.origin + "/app");
    window.location.href =
      `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
      `&response_type=code&redirect_uri=${redirectUri}` +
      `&approval_prompt=auto&scope=activity%3Aread_all&state=strava_connect`;
  };

  const sync = async () => {
    setSyncing(true); setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée, reconnecte-toi.");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ per_page: 50, sync_all: true }),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMsg({ type: "ok", text: `${json.synced} activité(s) synchronisée(s)` });
      await loadActivities();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Déconnecter Strava et supprimer les activités synchronisées ?")) return;
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée, reconnecte-toi.");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-disconnect`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConnected(false); setAthlete(null); setActivities([]); setMsg(null);
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setDisconnecting(false);
    }
  };

  // km natation cette semaine (lundi → dimanche)
  const weeklySwimM = activities
    .filter(a => {
      if (!["Swim", "OpenWaterSwim"].includes(a.activity_type)) return false;
      const now    = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      return new Date(a.activity_date + "T12:00:00") >= monday;
    })
    .reduce((sum, a) => sum + (Number(a.distance) || 0), 0);

  // ── Meilleur 100m depuis Strava ─────────────────────────────────────────
  const swimPaces = activities.filter(a => ["Swim","OpenWaterSwim"].includes(a.activity_type) && a.pace > 0).map(a => a.pace);
  const bestPace  = swimPaces.length > 0 ? Math.min(...swimPaces) : null;
  // "meilleur" = plus rapide = valeur en secondes plus basse
  const hasBetterPace = bestPace && (!currentPace100 || bestPace < currentPace100);

  // Remonte bestPace vers le parent dès que les activités changent
  useEffect(() => { onBestPace?.(bestPace); }, [bestPace, onBestPace]);

  // ── Activité natation d'aujourd'hui ─────────────────────────────────────
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todaySwim = connected ? activities.find(
    a => ["Swim","OpenWaterSwim"].includes(a.activity_type) && a.activity_date === todayStr
  ) : null;

  // ── Première séance non validée du plan courant ──────────────────────────
  const currentSessionRef = (() => {
    if (!plan?.weeks) return null;
    const wi = plan.weeks.findIndex(w => !w.sessions.every(isSessionResolved));
    if (wi === -1) return null;
    const si = plan.weeks[wi].sessions.findIndex(s => !isSessionResolved(s));
    if (si === -1) return null;
    return { weekIndex: wi, sessionIndex: si, session: plan.weeks[wi].sessions[si] };
  })();

  const canValidate = todaySwim && currentSessionRef && !isSessionResolved(currentSessionRef.session);
  const latestVisibleSwim = activities[0] || null;
  const latestPremiumAnalysis = latestVisibleSwim
    ? buildPremiumActivityAnalysis({ activity: latestVisibleSwim, detail: null, currentSessionRef, profile })
    : null;

  // Pendant le chargement on affiche le bouton "Connecter" (état optimiste)
  // il sera remplacé par l'état réel dès que checkConnection() répond

  return (
    <div style={{ background: G.surface, borderRadius: 20, padding: "18px 16px", marginBottom: 16, border: `1px solid ${G.greyLight}`, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>

      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: connected ? "#FC4C02" : G.greyLight,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Activity size={18} color={connected ? "#fff" : G.greyMid} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: G.ink, lineHeight: 1.2 }}>Strava</div>
            <div style={{ fontSize: 12, color: G.grey }}>
              {connected && athlete?.firstname
                ? `${athlete.firstname}${athlete.lastname ? " " + athlete.lastname : ""}`
                : connected ? "Connecté" : "Non connecté"}
            </div>
          </div>
        </div>
        {connected && (
          <button
            onClick={sync}
            disabled={syncing}
            style={{ padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${G.blue}`, background: G.blueLight, color: G.blue, fontSize: 13, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.5 : 1, fontFamily: FONT }}
          >
            {syncing ? "Sync…" : "Synchroniser"}
          </button>
        )}
      </div>

      {/* ── Message retour ───────────────────────────────────────── */}
      {msg && (
        <div style={{ background: msg.type === "ok" ? G.mintLight : G.coralLight, borderRadius: 10, padding: "9px 13px", marginBottom: 12, color: msg.type === "ok" ? G.mint : G.coral, fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {/* ── Non connecté ─────────────────────────────────────────── */}
      {!connected ? (
        <div>
          <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.5, margin: "0 0 12px" }}>
            Relie Strava pour importer tes sorties et valider plus vite.
          </p>
          <button
            onClick={connect}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: G.blue, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: FONT, minHeight: 48 }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 6, background: "#FC4C02", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Activity size={13} color="#fff" />
            </span>
            Connecter Strava
          </button>
        </div>
      ) : (
        <>
          {!showDetails && (
            <div style={{ background: G.greyXLight, borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>Compte connecte</div>
                <div style={{ fontSize: 11, color: G.grey }}>
                  {athlete?.firstname ? `${athlete.firstname}${athlete.lastname ? ` ${athlete.lastname}` : ""}` : "Strava relie a ton compte"}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.mint, background: G.mintLight, padding: "6px 10px", borderRadius: 999 }}>
                Connecte
              </div>
            </div>
          )}

          {/* Volume hebdo natation */}
          {showDetails && weeklySwimM > 0 && (
            <div style={{ background: G.blueLight, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <Waves size={16} color={G.blue} />
              <span style={{ fontSize: 13, fontWeight: 600, color: G.blue }}>
                {(weeklySwimM / 1000).toFixed(1)} km nagés cette semaine
              </span>
            </div>
          )}

          {/* ── Valider séance depuis Strava ─────────────────────── */}
          {showDetails && showProgramActions && canValidate && (
            <div style={{ background: G.blueLight, borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: G.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Waves size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>Tu as nagé {fmtDist(todaySwim.distance)} aujourd'hui !</div>
                <div style={{ fontSize: 11, color: G.grey }}>Valide ta séance du programme ?</div>
              </div>
              <button
                onClick={() => { onValidateSession(currentSessionRef.weekIndex, currentSessionRef.sessionIndex); setMsg({ type: "ok", text: "Séance validée depuis Strava" }); }}
                style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: G.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: FONT }}
              >
                Valider
              </button>
            </div>
          )}

          {/* ── Meilleur temps 100m depuis Strava ────────────────── */}
          {showDetails && bestPace && (
            <div style={{ background: hasBetterPace ? G.goldLight : G.greyXLight, borderRadius: 14, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: hasBetterPace ? G.gold : G.greyLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trophy size={18} color={hasBetterPace ? "#fff" : G.greyMid} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>
                  Meilleur 100m Strava : {fmtPace(bestPace)}
                  {hasBetterPace && ", record"}
                </div>
                <div style={{ fontSize: 11, color: G.grey }}>
                  {hasBetterPace
                    ? `Plus rapide que ta référence (${fmtPace(currentPace100)})`
                    : `Identique à ta référence actuelle`}
                </div>
              </div>
              {hasBetterPace && onPaceUpdate && (
                <button
                  onClick={() => { onPaceUpdate(bestPace); setMsg({ type: "ok", text: `Référence mise à jour : ${fmtPace(bestPace)}` }); }}
                  style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.gold, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: FONT }}
                >
                  Utiliser
                </button>
              )}
            </div>
          )}

          {showDetails && latestVisibleSwim && latestPremiumAnalysis && (
            isPremium ? (
              <button
                type="button"
                onClick={() => setSelectedActivity(latestVisibleSwim)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer",
                  background: `linear-gradient(135deg, ${G.blueLight}, ${G.surface})`,
                  borderRadius: 16, padding: "14px", marginBottom: 12,
                  border: `1px solid ${G.greyLight}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: G.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap size={16} color={G.blue} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>Analyse de la dernière séance</div>
                      <div style={{ fontSize: 12, color: G.grey }}>Premium MySWYM x Strava</div>
                    </div>
                  </div>
                  <Eye size={16} color={G.greyMid} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_DISPLAY, color: G.ink, marginBottom: 6 }}>{latestPremiumAnalysis.title}</div>
                <div style={{ fontSize: 12, color: G.grey, marginBottom: 8 }}>{latestPremiumAnalysis.verdict}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {latestPremiumAnalysis.chips.map((chip) => (
                    <span key={chip.label} style={{ fontSize: 11, fontWeight: 700, color: G.blue, background: G.surface, border: `1px solid ${G.greyLight}`, borderRadius: 999, padding: "5px 9px" }}>
                      {chip.label} : {chip.value}
                    </span>
                  ))}
                </div>
              </button>
            ) : (
              <div style={{
                background: G.greyXLight, borderRadius: 16, padding: "14px", marginBottom: 12,
                border: `1px solid ${G.greyLight}`, opacity: 0.85,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: G.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Lock size={15} color={G.greyMid} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>Analyse de la dernière séance</div>
                    <div style={{ fontSize: 12, color: G.grey }}>Réservé aux abonnés Premium</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: G.grey, lineHeight: 1.5 }}>
                  Débloque un résumé automatique de ta dernière séance Strava pour comprendre ce que tu as travaillé et si cela correspond à ton plan.
                </div>
              </div>
            )
          )}

          {/* Liste des activités, 3 visibles, le reste derrière « Voir plus » */}
          {showDetails && (activities.length === 0 ? (
            <div style={{ fontSize: 13, color: G.grey, textAlign: "center", padding: "16px 0" }}>
              Aucune activité, clique sur "Synchroniser".
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
              {activitiesVisible.map((a, i) => {
                const meta = STRAVA_ACTIVITY_META[a.activity_type] ?? { label: a.activity_type ?? "Activité", color: G.grey, bg: G.greyXLight, Icon: Activity };
                const { Icon: AIcon, color, bg, label } = meta;
                return (
                  <button
                    key={a.strava_activity_id}
                    type="button"
                    onClick={() => setSelectedActivity(a)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 0", border: "none", background: "none", borderBottom: i < activitiesVisible.length - 1 ? `1px solid ${G.greyLight}` : "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <AIcon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: G.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.title || label}
                      </div>
                      <div style={{ fontSize: 11, color: G.grey }}>
                        {a.activity_date ? new Date(a.activity_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " : ""}{label}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>{fmtDist(a.distance)}</div>
                      <div style={{ fontSize: 11, color: G.grey }}>{fmtDur(a.duration)}</div>
                      {a.pace && <div style={{ fontSize: 11, color }}>{fmtPace(a.pace)}</div>}
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: G.greyXLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Eye size={16} color={G.greyMid} />
                    </div>
                  </button>
                );
              })}
              {activities.length > STRAVA_ACTIVITIES_PREVIEW && !activitiesOpen && (
                <button
                  type="button"
                  onClick={() => setActivitiesOpen(true)}
                  style={{
                    width: "100%", marginTop: 10, minHeight: 44, borderRadius: 12,
                    border: `1px solid ${G.greyLight}`, background: G.bg,
                    color: G.blue, fontWeight: 700, fontSize: 13, cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Voir plus ({activities.length - STRAVA_ACTIVITIES_PREVIEW})
                </button>
              )}
              {activities.length > STRAVA_ACTIVITIES_PREVIEW && activitiesOpen && (
                <button
                  type="button"
                  onClick={() => setActivitiesOpen(false)}
                  style={{
                    width: "100%", marginTop: 8, minHeight: 40, border: "none", background: "none",
                    color: G.grey, fontWeight: 600, fontSize: 13, cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  Réduire
                </button>
              )}
            </div>
          ))}

          {/* Déconnexion */}
          <button
            onClick={disconnect}
            disabled={disconnecting}
            style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${G.greyLight}`, background: "none", color: G.grey, fontSize: 12, fontWeight: 500, cursor: disconnecting ? "not-allowed" : "pointer", opacity: disconnecting ? 0.5 : 1, fontFamily: FONT }}
          >
            {disconnecting ? "Déconnexion…" : "Déconnecter Strava"}
          </button>
        </>
      )}
          <StravaActivityModal
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            currentSessionRef={currentSessionRef}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            profile={profile}
            showHeartRate={healthOk}
          />
      {healthGateOpen && createPortal(
        <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && setHealthGateOpen(false)}>
          <div className="sheet-panel scale-in" style={{ background: G.surface, borderRadius: "24px 24px 0 0", padding: "28px 20px", paddingBottom: "max(28px, env(safe-area-inset-bottom))", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: G.greyLight, margin: "0 auto 20px" }} />
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, textTransform: "none", letterSpacing: "-0.03em", color: G.ink, marginBottom: 10 }}>
              {HEALTH_CONSENT_TITLE}
            </h3>
            <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.5, marginBottom: 14 }}>{HEALTH_CONSENT_BODY}</p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45, color: G.ink, marginBottom: 16 }}>
              <input type="checkbox" checked={healthGateChecked} onChange={(e) => setHealthGateChecked(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{HEALTH_CONSENT_CHECKBOX}</span>
            </label>
            <Btn variant="blue" onClick={persistHealthConsentAndConnect} disabled={!healthGateChecked}>
              Accepter et connecter Strava
            </Btn>
            <button type="button" onClick={() => setHealthGateOpen(false)} style={{ width: "100%", marginTop: 10, padding: "12px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 13 }}>
              Annuler
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

// ── AUTH (welcome email + reset password; AuthScreen in AuthScreen.jsx)

/** Welcome mail (email + Google OAuth), retry si session pas encore prête. */
async function ensureWelcomeEmail(user, { attempts = 3 } = {}) {
  if (!user?.id || !user?.email) return { ok: false, skipped: true, reason: "no_user" };
  if (user.app_metadata?.welcome_email_sent === true) {
    return { ok: true, skipped: true };
  }
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600 * i));
    try {
      // Laisse le JWT se stabiliser après redirect OAuth
      const { data: refreshData } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (!session?.access_token) {
        lastError = "no_session";
        continue;
      }
      const fresh = session.user ?? user;
      if (fresh.app_metadata?.welcome_email_sent === true) {
        return { ok: true, skipped: true };
      }
      const { data, error } = await supabase.functions.invoke("welcome-email");
      if (error) {
        lastError = error.message || String(error);
        console.warn("[welcome-email] invoke failed:", lastError, `(try ${i + 1}/${attempts})`);
        continue;
      }
      if (data?.ok || data?.skipped) return { ok: true, ...(data || {}) };
      lastError = data?.error || "unknown";
      console.warn("[welcome-email] bad response:", lastError, `(try ${i + 1}/${attempts})`);
    } catch (e) {
      lastError = e?.message || String(e);
      console.warn("[welcome-email] unexpected:", lastError, `(try ${i + 1}/${attempts})`);
    }
  }
  return { ok: false, error: lastError };
}

const ResetPasswordScreen = ({ onDone, showBrandHeader = true }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]  = useState("");
  const [loading, setLoading]  = useState(false);
  const [error, setError]    = useState(null);

  const handle = async () => {
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    if (password !== confirm)  { setError("Les deux mots de passe ne correspondent pas."); return; }
    setError(null); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (e) { setError(e.message || "Une erreur est survenue."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 20px", paddingTop: showBrandHeader ? 64 : 96, paddingBottom: 40 }}>
      {showBrandHeader && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          <BrandLogo variant="wordmark" height={22} />
        </div>
      )}
      <div className="fade-up">
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: G.ink, marginBottom: 8, lineHeight: 1.1 }}>Nouveau mot de passe</h2>
        <p style={{ color: G.grey, fontSize: 15, marginBottom: 28 }}>Choisis un nouveau mot de passe pour ton compte.</p>
        {error && <div style={{ background: G.coralLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: G.coral, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <PasswordInput placeholder="Nouveau mot de passe" value={password} onChange={e => setPassword(e.target.value)} onEnter={handle} autoComplete="new-password" />
          <PasswordInput placeholder="Confirmer le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} onEnter={handle} autoComplete="new-password" />
        </div>
        <Btn onClick={handle} disabled={loading || !password || !confirm} variant="blue">
          {loading ? "…" : "Enregistrer le mot de passe"}
        </Btn>
      </div>
    </div>
  );
};

// ── ONBOARDING ────────────────────────────────────────────────────────────
// ── STEP 1 : CATÉGORIE ────────────────────────────────────────────────────
const Step1_Category = ({ onSelect }) => {
  const { t } = useTranslation("onboarding");
  return (
  <div className="fade-up">
    <h1 style={{ ...onboardingTitleStyle(), marginBottom: 10 }}>{t("category.title")}</h1>
    <p style={{ fontSize: 15, color: G.grey, marginBottom: 22, lineHeight: 1.5 }}>
      {t("category.lead")}
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {CATEGORIES.map(cat => {
        const soon = !!cat.comingSoon;
        return (
        <button key={cat.id} type="button" disabled={soon}
          onClick={() => { if (!soon) onSelect(cat.id); }}
          aria-label={soon ? `${t(`category.${cat.id}`)}. ${t("category.comingSoon")}` : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 16px",
            borderRadius: 18, border: `1px solid ${G.greyLight}`, background: G.surface,
            cursor: soon ? "not-allowed" : "pointer", textAlign: "left", minHeight: 72,
          }}>
          <span style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: G.blueLight, color: soon ? G.greyMid : G.blue,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <cat.Icon size={20} strokeWidth={2} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: soon ? G.grey : G.ink }}>
              {t(`category.${cat.id}`)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: G.grey, lineHeight: 1.35 }}>
              {t(`category.${cat.id}Desc`)}
            </span>
          </span>
          {soon ? (
            <span style={{
              flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: G.greyMid, whiteSpace: "nowrap",
            }}>
              {t("category.comingSoon")}
            </span>
          ) : (
            <ArrowRight size={16} color={G.greyMid} style={{ flexShrink: 0 }} />
          )}
        </button>
        );
      })}
    </div>
  </div>
  );
};

// ── STEP 2 : SOUS-OBJECTIF ────────────────────────────────────────────────
const Step2_SubGoal = ({ category, onSelect, onBack }) => {
  const { t } = useTranslation("onboarding");
  const subs = SUB_GOALS[category] || [];
  const titles = {
    triathlon: t("subGoal.triathlon"),
    eau_libre: t("subGoal.eau_libre"),
    diplome: t("subGoal.diplome"),
  };
  return (
    <div className="fade-up">
      <h2 style={{ ...onboardingTitleStyle(), marginBottom: 24 }}>{titles[category] || t("subGoal.fallback")}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {subs.map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderRadius: 14, border: `1px solid ${G.greyLight}`, background: G.surface, cursor: "pointer", textAlign: "left", gap: 12 }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: G.ink }}>{t(`subGoal.${s.id}.label`)}</span>
              {s.dist && <span style={{ fontSize: 12, fontWeight: 500, color: G.grey, lineHeight: 1.35 }}>{t(`subGoal.${s.id}.dist`)}</span>}
            </span>
            <ChevronDown size={16} color={G.greyMid} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
          </button>
        ))}
      </div>
      <button onClick={onBack} style={{ width: "100%", padding: "12px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 14 }}>{t("common.backShort")}</button>
    </div>
  );
};


const dateSelectStyle = {
  flex: 1,
  minWidth: 0,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1.5px solid ${G.greyLight}`,
  background: G.greyXLight,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
  color: G.ink,
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
};

const Step2_Date = ({ value, onChange, onNext, onBack }) => {
  const { t, i18n } = useTranslation("onboarding");
  const dateLocale = i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
  const monthNames = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => t(`months.${n}`));
  const weekdayNames = t("weekdays", { returnObjects: true });
  const minD = eventMinDate();
  const maxYear = minD.getFullYear() + 2;
  const selected = parseISODate(value);
  const initialView = selected && selected >= minD ? selected : minD;

  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!value) return;
    const d = parseISODate(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const weeks = weeksUntil(value);
  const years = [];
  for (let y = minD.getFullYear(); y <= maxYear; y++) years.push(y);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const calendarCells = [];
  for (let i = 0; i < firstDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const pickDate = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    if (date < minD) {
      setErr(t("date.minWeeks"));
      onChange("");
      return;
    }
    setErr("");
    onChange(toISODate(viewYear, viewMonth + 1, day));
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canPrevMonth = viewYear > minD.getFullYear() || (viewYear === minD.getFullYear() && viewMonth > minD.getMonth());
  const maxMonth = new Date(maxYear, 11, 31);
  const canNextMonth = viewYear < maxYear || (viewYear === maxYear && viewMonth < 11);

  const dayOptions = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    date.setHours(0, 0, 0, 0);
    if (date >= minD && date <= maxMonth) dayOptions.push(d);
  }

  const selectedDay = selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth
    ? selected.getDate()
    : "";

  const isDaySelected = (day) =>
    !!selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day;

  return (
    <div className="fade-up">
      <p style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>{t("date.kicker")}</p>
      <h2 style={{ ...onboardingTitleStyle(), fontSize: 32, marginBottom: 10 }}>{t("date.title")}</h2>
      <p style={{ color: G.grey, fontSize: 16, marginBottom: 36 }}>{t("date.lead")}</p>
      <div style={{ background: G.surface, borderRadius: 16, padding: "20px", marginBottom: 12, border: `1.5px solid ${err ? "#FF4757" : weeks ? G.blue : G.greyLight}`, transition: "border-color 0.2s" }}>
        <label style={{ fontSize: 11, color: G.grey, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 12 }}>{t("date.label")}</label>

        {value && !err && (
          <div style={{ fontSize: 15, fontWeight: 600, color: G.blue, marginBottom: 14, textTransform: "capitalize" }}>
            {parseISODate(value)?.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select
            value={viewMonth}
            onChange={e => setViewMonth(Number(e.target.value))}
            style={dateSelectStyle}
            aria-label={t("date.month")}
          >
            {monthNames.map((name, i) => {
              const monthStart = new Date(viewYear, i, 1);
              const monthEnd = new Date(viewYear, i + 1, 0);
              monthEnd.setHours(23, 59, 59, 999);
              if (monthEnd < minD || monthStart > maxMonth) return null;
              return <option key={name} value={i}>{name}</option>;
            })}
          </select>
          <select
            value={viewYear}
            onChange={e => setViewYear(Number(e.target.value))}
            style={{ ...dateSelectStyle, flex: "0 0 96px" }}
            aria-label={t("date.year")}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canPrevMonth}
            aria-label={t("date.prevMonth")}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${G.greyLight}`, background: G.surface, color: G.ink, cursor: canPrevMonth ? "pointer" : "not-allowed", opacity: canPrevMonth ? 1 : 0.35, fontSize: 18, lineHeight: 1 }}
          >‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: G.inkLight }}>{monthNames[viewMonth]} {viewYear}</span>
          <button
            type="button"
            onClick={nextMonth}
            disabled={!canNextMonth}
            aria-label={t("date.nextMonth")}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${G.greyLight}`, background: G.surface, color: G.ink, cursor: canNextMonth ? "pointer" : "not-allowed", opacity: canNextMonth ? 1 : 0.35, fontSize: 18, lineHeight: 1 }}
          >›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 14 }}>
          {(Array.isArray(weekdayNames) ? weekdayNames : WEEKDAYS_FR).map(w => (
            <div key={w} style={{ fontSize: 11, fontWeight: 700, color: G.grey, textAlign: "center", padding: "4px 0" }}>{w}</div>
          ))}
          {calendarCells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const disabled = new Date(viewYear, viewMonth, day) < minD;
            const isSel = isDaySelected(day);
            const isToday = (() => {
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const d = new Date(viewYear, viewMonth, day);
              return d.getTime() === now.getTime();
            })();
            return (
              <button
                key={`d-${day}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => pickDate(day)}
                aria-label={`${day} ${monthNames[viewMonth]} ${viewYear}`}
                aria-pressed={isSel}
                style={{
                  aspectRatio: "1",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isSel ? 700 : 500,
                  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: isSel ? G.blue : isToday ? G.blueLight : "transparent",
                  color: isSel ? G.white : disabled ? G.greyMid : G.ink,
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: G.grey, flexShrink: 0 }}>{t("date.day")}</span>
          <select
            value={selectedDay}
            onChange={e => { const d = Number(e.target.value); if (d) pickDate(d); }}
            style={{ ...dateSelectStyle, flex: 1 }}
            aria-label={t("date.day")}
          >
            <option value="">{t("date.pickDay")}</option>
            {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {err && <div style={{ fontSize: 13, color: "#FF4757", marginBottom: 12, paddingLeft: 4 }}>{err}</div>}
      {weeks && !err && (
        <div style={{
          background: G.blueLight,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: `1px solid ${G.greyLight}`,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: G.ink }}>{t("date.weeks", { count: weeks })}</div>
            <div style={{ fontSize: 12, color: G.grey, marginTop: 2 }}>{t("date.weeksHint")}</div>
          </div>
          <Calendar size={20} color={G.blue} />
        </div>
      )}
      <Btn onClick={onNext} disabled={!value}>{t("common.generate")}</Btn>
      <button onClick={onBack} style={{ width: "100%", marginTop: 10, padding: "14px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 14 }}>{t("common.back")}</button>
    </div>
  );
};

const Step3_Level = ({ value, onChange, onNext, onBack, total = 6, disabledLevels = [] }) => {
  const { t } = useTranslation("onboarding");
  return (
  <div className="fade-up">
    <h2 style={onboardingTitleStyle()}>{t("level.title")}</h2>
    <p style={{ fontSize: 14, color: G.inkLight, lineHeight: 1.5, marginBottom: 20 }}>
      {t("level.lead")}
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
      {ONBOARDING_LEVELS.map(l => {
        const isActive = value === l.id;
        const isDisabled = disabledLevels.includes(l.id);
        return (
          <button key={l.id}
            type="button"
            onClick={() => !isDisabled && onChange(l.id)}
            disabled={isDisabled}
            style={{
              padding: "14px 16px", borderRadius: 14,
              border: `2px solid ${isDisabled ? G.greyLight : isActive ? G.blue : G.greyLight}`,
              background: isDisabled ? G.greyXLight : isActive ? G.blueLight : G.surface,
              cursor: isDisabled ? "default" : "pointer", textAlign: "left", opacity: isDisabled ? 0.55 : 1,
            }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: isDisabled ? G.grey : isActive ? G.blue : G.ink }}>{t(`level.${l.id}.label`)}</div>
            {isDisabled ? (
              <div style={{ fontSize: 13, color: G.grey, marginTop: 4, lineHeight: 1.4 }}>{t("level.beginnerBlocked")}</div>
            ) : (
              <div style={{ fontSize: 13, color: isActive ? G.inkLight : G.grey, marginTop: 2 }}>{t(`level.${l.id}.desc`)}</div>
            )}
          </button>
        );
      })}
    </div>
    <Btn onClick={onNext} disabled={!value || disabledLevels.includes(value)}>{t("common.continue")}</Btn>
    <button type="button" onClick={onBack} style={{ width: "100%", marginTop: 10, padding: "12px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 14 }}>{t("common.backShort")}</button>
  </div>
  );
};


// ── Helpers temps /100 m (T100) ───────────────────────────────────────────
function parsePaceInput(raw, maxSecs = 9 * 60) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return { val: null, err: "" };
  // "155" → 1:55 ; "1045" → 10:45
  let mins, secs;
  if (digits.length <= 3) { mins = parseInt(digits[0]); secs = parseInt(digits.slice(1)); }
  else { mins = parseInt(digits.slice(0, 2)); secs = parseInt(digits.slice(2)); }
  if (secs >= 60) return { val: null, err: "Les secondes doivent être entre 00 et 59" };
  const total = mins * 60 + secs;
  if (total < 30) return { val: null, err: "Trop rapide, minimum 30 secondes" };
  if (total > maxSecs) return { val: null, err: `Maximum ${Math.floor(maxSecs/60)} minutes` };
  return { val: total, err: "" };
}
function fmtDigits(raw, maxLen = 3) {
  const digits = raw.replace(/\D/g, "").slice(0, maxLen);
  if (digits.length <= 2) return digits;
  const split = maxLen === 4 ? 2 : 1;
  return digits.slice(0, split) + ":" + digits.slice(split);
}
function secToDisplay(secs) {
  if (!secs) return "";
  return `${Math.floor(secs/60)}:${Math.round(secs%60).toString().padStart(2,'0')}`;
}

// Composant input pace réutilisable
function PaceInput({ label, hint, placeholder, value, onChange, maxLen = 3, minSec = 30, maxSec = 9 * 60, disabled = false }) {
  const [raw, setRaw] = useState(value ? secToDisplay(value) : "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setRaw(value ? secToDisplay(value) : "");
  }, [value]);

  const handle = (input) => {
    if (disabled) return;
    const digits = input.replace(/\D/g, "").slice(0, maxLen);
    const formatted = fmtDigits(input, maxLen);
    setRaw(formatted);
    if (digits.length < (maxLen === 4 ? 3 : 3)) { onChange(null); setErr(""); return; }
    const { val, err: e } = parsePaceInput(input, maxSec);
    if (val && val < minSec) { setErr(`Minimum ${Math.floor(minSec/60)}:${String(minSec%60).padStart(2,'0')}`); onChange(null); return; }
    setErr(e);
    onChange(val);
  };

  return (
    <div style={{ marginBottom: 4 }}>
      {(label || hint) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>{label}</span>
          <span style={{ fontSize: 12, color: G.grey }}>{hint}</span>
        </div>
      )}
      <input
        type="text" inputMode="numeric"
        placeholder={placeholder}
        value={raw}
        disabled={disabled}
        onChange={e => handle(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "16px 14px", fontSize: 24,
          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontWeight: 700,
          textAlign: "center", letterSpacing: "0.06em",
          border: `2px solid ${err ? "#FF3B30" : value && !disabled ? G.blue : G.greyLight}`,
          borderRadius: 14, outline: "none",
          background: disabled ? G.greyXLight : G.surface,
          color: disabled ? G.greyMid : G.ink,
          transition: "border-color 0.2s",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.85 : 1,
        }}
      />
      {err && <p style={{ color: "#FF3B30", fontSize: 12, marginTop: 4 }}>{err}</p>}
    </div>
  );
}

const Step4_Frequency = ({ value, onChange, onNext, onBack, isLast = false, total = 6, isPremium, onUpgrade }) => {
  const { t } = useTranslation("onboarding");
  return (
  <div className="fade-up">
    <h2 style={onboardingTitleStyle()}>{t("frequency.title")}</h2>
    <p style={{ fontSize: 14, color: G.grey, marginBottom: 20, lineHeight: 1.45 }}>
      {t("frequency.lead")}
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
      {FREQUENCIES.map(f => {
        const locked = false;
        const isActive = value === f.id;
        return (
          <button key={f.id} onClick={() => onChange(f.id)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderRadius: 16,
            border: `2px solid ${isActive ? G.blue : locked ? G.greyLight : G.greyLight}`,
            background: isActive ? G.blue : locked ? G.greyXLight : G.surface,
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: isActive ? "0 4px 16px rgba(0,87,255,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
            opacity: locked ? 0.8 : 1,
          }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isActive ? G.white : locked ? G.greyMid : G.ink }}>{t("frequency.n", { count: f.id })}</div>
            </div>
            {isActive && !locked && <Check size={16} color={G.white} />}
            {locked && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: G.gold + "22", borderRadius: 100, padding: "4px 10px" }}>
                <Lock size={11} color={G.gold} />
                <span style={{ fontSize: 11, fontWeight: 700, color: G.gold }}>Premium</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
    <Btn variant="blue" onClick={onNext} disabled={!value}>{isLast ? t("common.generate") : t("common.continue")}</Btn>
    <button onClick={onBack} style={{ width: "100%", marginTop: 10, padding: "12px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 14 }}>{t("common.back")}</button>
  </div>
  );
};


/**
 * Questionnaire plan, plein écran (visiteur) ou onglet Programme (compte).
 * mode="full" : profil nageur + objectif (1re fois)
 * mode="goal" : objectif seulement (profil déjà connu)
 * Distance habituelle = profil.
 */
const OnboardingWizard = ({
  profile,
  step,
  setStep,
  update,
  patchProfile,
  error,
  isPremium,
  onUpgrade,
  onGenerate,
  onCancel = null,
  mode = "full",
  onEditProfile = null,
}) => {
  const { t } = useTranslation("onboarding");
  const isGoalMode = mode === "goal";
  const isProgression = profile.category === "progression";
  const isDiplome = profile.category === "diplome";
  const noDate = isProgression;
  const disabledLevels = isBeginnerBlockedForGoal(profile.goal) ? ["régulier"] : [];

  const totalSteps = isGoalMode
    ? (isProgression ? 1 : 3)
    : (isProgression ? 3 : isDiplome ? 4 : 5);

  const progressStep = (() => {
    if (isGoalMode) {
      if (isProgression) return 1;
      return ({ 1: 1, 2: 2, 6: 3 })[step] || 1;
    }
    if (isProgression) return ({ 1: 1, 3: 2, 5: 3 })[step] || 1;
    if (isDiplome) return ({ 1: 1, 2: 2, 5: 3, 6: 4 })[step] || 1;
    return ({ 1: 1, 2: 2, 3: 3, 5: 4, 6: 5 })[step] || 1;
  })();

  const generateNow = (extra = {}) => {
    const patch = extra && typeof extra === "object" && extra.nativeEvent == null ? extra : {};
    const next = applyFirstPlanDefaults({ ...profile, trainingWish: "", trainingWishMeta: null, ...patch });
    patchProfile(next);
    onGenerate(next);
  };

  const goAfterCategory = (cat) => {
    if (CATEGORIES.find((c) => c.id === cat)?.comingSoon) return;
    if (cat === "progression") {
      const extra = { category: cat, goal: "progression", pace100: null };
      patchProfile(extra);
      if (isGoalMode) generateNow(extra);
      else setStep(3);
    } else {
      patchProfile({ category: cat, goal: "", pace100: null });
      setStep(2);
    }
  };

  const goAfterSubGoal = (goalId) => {
    if (isGoalMode) {
      if (isDiplome) patchProfile({ goal: goalId, level: "sportif" });
      else update("goal", goalId);
      if (noDate) generateNow();
      else setStep(6);
      return;
    }
    if (isDiplome) {
      patchProfile({ goal: goalId, level: "sportif" });
      setStep(5);
    } else {
      const next = { goal: goalId };
      if (isBeginnerBlockedForGoal(goalId) && isBeginnerLevelId(profile.level)) {
        next.level = "";
      }
      patchProfile(next);
      setStep(3);
    }
  };

  return (
    <>
      {onCancel && step === 1 && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginBottom: 16, padding: "10px 0", background: "none", border: "none",
            color: G.grey, cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}
        >
          {t("common.cancel")}
        </button>
      )}
      {step > 0 && <Progress step={progressStep} total={totalSteps} />}
      {error && (
        <div style={{ background: G.coralLight, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: G.coral, fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1_Category onSelect={goAfterCategory} />
      )}

      {step === 2 && !isProgression && (
        <Step2_SubGoal
          category={profile.category}
          onSelect={goAfterSubGoal}
          onBack={() => setStep(1)} />
      )}

      {!isGoalMode && step === 3 && !isDiplome && (
        <Step3_Level
          value={profile.level} onChange={v => {
            const implied = impliedSwimStyleForLevel(v);
            patchProfile(implied ? { level: v, swimStyle: implied } : { level: v });
          }}
          total={totalSteps}
          disabledLevels={disabledLevels}
          onNext={() => {
            update("pace100", null);
            setStep(5);
          }}
          onBack={() => isProgression ? setStep(1) : setStep(2)} />
      )}

      {!isGoalMode && step === 5 && (
        <Step4_Frequency
          value={profile.sessionsPerWeek}
          onChange={v => update("sessionsPerWeek", v)}
          total={totalSteps}
          onNext={() => (noDate ? generateNow() : setStep(6))}
          onBack={() => setStep(isDiplome ? 2 : 3)}
          isLast={noDate}
          isPremium={isPremium}
          onUpgrade={onUpgrade}
        />
      )}

      {step === 6 && !noDate && (
        <Step2_Date
          value={profile.eventDate}
          onChange={v => update("eventDate", v)}
          onNext={() => generateNow()}
          onBack={() => {
            if (isGoalMode) setStep(2);
            else setStep(5);
          }}
        />
      )}
    </>
  );
};

// ── SHARE MODAL ───────────────────────────────────────────────────────────
const ShareModal = ({ session, goalLabel, badge = null, onClose }) => {
  const tm = getTypeMeta(session.type);
  const badgeMeta = badge
    ? (BADGE_DEFS.find((d) => d.id === badge) || { label: badge, color: G.gold })
    : null;
  const canvasBadge = badgeMeta ? { label: badgeMeta.label, color: badgeMeta.color } : null;
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReferralInvite().then((inv) => {
      if (!cancelled) setInvite(inv);
    });
    return () => { cancelled = true; };
  }, []);

  const pack = buildSessionSharePack(session, invite || {}, {
    badgeLabel: badgeMeta?.label || null,
  });

  const handleDownload = () => {
    const canvas = createShareCanvas(session, goalLabel, canvasBadge, invite);
    const link = document.createElement("a");
    link.download = "myswym-seance.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  const handleShare = async () => {
    const canvas = createShareCanvas(session, goalLabel, canvasBadge, invite);
    if (!navigator.share) { handleDownload(); return; }
    canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], "myswym-seance.png", { type: "image/png" });
        const payload = {
          files: [file],
          title: "Ma séance MySWYM",
          text: pack.caption,
        };
        if (navigator.canShare && !navigator.canShare(payload)) {
          await navigator.share({ title: payload.title, text: pack.caption });
          return;
        }
        await navigator.share(payload);
      } catch { handleDownload(); }
    });
  };
  const handleCopyStrava = async () => {
    const ok = await copySessionText(session, pack.clipboardText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-panel scale-in" style={{ background: G.surface, borderRadius: "24px 24px 0 0", padding: "28px 20px", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: G.greyLight, margin: "0 auto 24px" }} />
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: G.ink, marginBottom: 18, textAlign: "center" }}>
          Partage ta séance
        </h3>
        <div style={{ background: `linear-gradient(145deg, #06101F 0%, #0033A0 100%)`, borderRadius: 20, padding: 24, marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(0,87,253,0.35)" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: G.mint, borderRadius: 20, padding: "5px 12px" }}>
              <Check size={12} color={G.white} /><span style={{ fontSize: 12, fontWeight: 700, color: G.white }}>Séance terminée</span>
            </div>
            {badgeMeta && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,184,0,0.18)", border: `1px solid ${badgeMeta.color}`, borderRadius: 20, padding: "5px 12px" }}>
                <Trophy size={12} color={badgeMeta.color} />
                <span style={{ fontSize: 12, fontWeight: 700, color: badgeMeta.color }}>{badgeMeta.label}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: tm.color, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>{session.type}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: G.white, marginBottom: 16 }}>{session.title}</div>
          <div style={{ display: "flex", gap: 10, marginBottom: invite?.code ? 14 : 0 }}>
            {[{ v: session.distance, l: "Distance" }, { v: formatDuration(session.duration), l: "Durée" }, { v: session.intensity, l: "Intensité" }].map((s, i) => (
              <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: G.white }}>{s.v}</div>
              </div>
            ))}
          </div>
          {invite?.code && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
              Invite · code <strong style={{ color: G.white }}>{invite.code}</strong>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <Btn onClick={handleDownload} variant="secondary" style={{ flex: 1 }}>Télécharger</Btn>
          <Btn onClick={handleShare} variant="blue" style={{ flex: 1 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Share2 size={14} /> Partager</span>
          </Btn>
        </div>
        <button
          type="button"
          onClick={handleCopyStrava}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, marginBottom: 6,
            border: `1px solid ${copied ? G.mint : G.greyLight}`,
            background: copied ? G.mint : G.greyXLight,
            color: copied ? G.white : G.inkLight, fontWeight: 600, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {copied
            ? <><CheckCheck size={14} /> Copié (séance + invite)</>
            : <><Copy size={14} /> Copier pour Strava / WhatsApp</>}
        </button>
        <button onClick={onClose} style={{ width: "100%", marginTop: 4, padding: "12px", background: "none", border: "none", color: G.grey, cursor: "pointer", fontSize: 13 }}>Fermer</button>
      </div>
    </div>
  );
};




// ── BADGE CÉLÉBRATION + EXPORT + SEMAINE ───────────────────────────────────
const BadgeCelebrateSheet = ({ badgeId, session = null, onShare, onClose }) => {
  const b = BADGE_DEFS.find((d) => d.id === badgeId);
  if (!b) return null;
  const Icon = b.icon;
  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sheet-panel scale-in" style={{
        background: G.surface, borderRadius: "24px 24px 0 0", padding: "32px 22px",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))", textAlign: "center",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: G.greyLight, margin: "0 auto 28px" }} />
        <div className="badge-pop" style={{
          width: 88, height: 88, borderRadius: "50%", margin: "0 auto 18px",
          background: b.color, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 12px 40px ${b.color}55`,
        }}>
          <Icon size={40} color="#fff" />
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: G.gold, margin: "0 0 8px" }}>
          Badge débloqué
        </p>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: G.ink, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          {b.label}
        </h3>
        <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.45, margin: "0 0 24px" }}>{b.desc}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {onShare && (
            <Btn
              variant="blue"
              onClick={() => { onShare(session || null, badgeId); onClose?.(); }}
              style={{ width: "100%" }}
            >
              Partager mon badge
            </Btn>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${G.greyLight}`,
              background: G.greyXLight, color: G.inkLight, fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
};

const SessionExportBar = ({
  session, isPremium, onUpgrade, onShare,
}) => {
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (!isPremium) return undefined;
    let cancelled = false;
    fetchReferralInvite().then((inv) => {
      if (!cancelled) setInvite(inv);
    });
    return () => { cancelled = true; };
  }, [isPremium]);

  const runCopy = async (e) => {
    e?.stopPropagation?.();
    if (!isPremium) { onUpgrade?.("session_locked"); return; }
    const pack = buildSessionSharePack(session, invite || {});
    const ok = await copySessionText(session, pack.clipboardText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const runShareImage = (e) => {
    e?.stopPropagation?.();
    if (!isPremium) { onUpgrade?.("session_locked"); return; }
    if (onShare) onShare(session);
  };
  const btn = {
    flex: 1, minWidth: 110, padding: "10px 12px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    border: `1px solid ${G.greyLight}`, background: G.surface, color: G.inkLight,
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={runCopy} style={{ ...btn, background: copied ? G.mint : G.surface, borderColor: copied ? G.mint : G.greyLight, color: copied ? G.white : G.inkLight }}>
          {copied ? <><CheckCheck size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
        </button>
        <button type="button" onClick={runShareImage} style={btn}>
          <Share2 size={13} /> Partager
        </button>
      </div>
    </div>
  );
};

const WeekProjectionCard = ({ plan, profile, onOpenPlan }) => {
  const proj = buildWeekProjection(plan, profile);
  if (!proj?.sessions?.length) return null;
  const distLabel = proj.totalMeters >= 1000
    ? `${(proj.totalMeters / 1000).toFixed(1)} km`
    : `${proj.totalMeters} m`;

  const statusStyle = (status, current) => {
    if (status === "done") return { border: `1.5px solid ${G.mint}`, background: `${G.mint}14` };
    if (status === "skipped") return { border: `1.5px solid ${G.gold}`, background: `${G.gold}12` };
    if (current || status === "todo") return { border: `1.5px solid ${G.blue}`, background: G.blueLight };
    return { border: `1px dashed ${G.greyLight}`, background: G.greyXLight };
  };

  return (
    <div style={{
      background: G.surface, borderRadius: 18, padding: "16px", marginBottom: 16,
      border: `1px solid ${G.greyLight}`,
      boxShadow: "0 1px 3px rgba(25,28,30,0.03), 0 6px 16px rgba(53,93,163,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Ma semaine
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: G.ink, marginTop: 2 }}>
            {proj.label}
            {proj.focus ? <span style={{ fontSize: 13, fontWeight: 600, color: G.blue }}> · {proj.focus}</span> : null}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: G.blue }}>{proj.doneCount}/{proj.totalCount}</div>
          <div style={{ fontSize: 11, color: G.greyMid }}>{distLabel}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {proj.sessions.map((s, i) => {
          const tm = getTypeMeta(s.type);
          const TypeIcon = tm.Icon;
          return (
            <div
              key={`${s.title}-${i}`}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 12, ...statusStyle(s.status, s.isCurrent),
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: s.status === "upcoming" ? G.greyLight : tm.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.status === "done" ? <Check size={14} color={G.mint} />
                  : s.status === "upcoming" ? <Calendar size={13} color={G.greyMid} />
                  : <TypeIcon size={14} color={tm.color} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: G.greyMid }}>
                  {s.status === "upcoming"
                    ? "Séance à venir"
                    : [s.type, s.distance].filter(Boolean).join(" · ")}
                  {s.isCurrent && s.status === "todo" ? " · aujourd’hui" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {onOpenPlan && (
        <button
          type="button"
          onClick={onOpenPlan}
          style={{
            width: "100%", marginTop: 12, padding: "10px", borderRadius: 12, border: "none",
            background: G.blueLight, color: G.blue, fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          Voir le détail dans Programme
        </button>
      )}
    </div>
  );
};

// ── ACCÈS ──────────────────────────────────────────────────────────────────
// Modèle live = essai 7j sans carte à l'inscription, puis pause (abonnement pour continuer).
// FREE_* ci-dessous : remnants / helpers legacy, ne gate plus l’UX (voir access.js).
const FREE_WEEKS_LIMIT = 4;
const FREE_FREQ_LIMIT = 3;
const FREE_LOOP_SESSION_CAP = 8;
const FREE_LOOP_WEEKLY_CAP = 2;
const SOFT_PAYWALL_STORAGE_KEY = "myswym_soft_paywall_v1"; // legacy soft-after-1st (inatteignable sans Premium)
const PENDING_ONBOARDING_KEY = "myswym_pending_onboarding";
const PLAN_VERSION = 49; // v49 = Soft Sheet 01-13 + semaine boucle N + tip allure
// false : one-shot = version < PLAN_VERSION. Ne jamais s'en servir pour bypasser le merge.
const FORCE_PLAN_REGEN = false;
/** Incrémenter pour forcer un resync Stripe + scrub isPremium sur chaque appareil. */
const ACCESS_CLIENT_EPOCH = 2;
const ACCESS_EPOCH_KEY = (userId) => `myswym_access_epoch_${userId}`;

const stampPlansAccess = (arr, userIsPremium) =>
  (arr || []).map((e) => (
    e?.plan
      ? { ...e, plan: { ...e.plan, isPremium: !!userIsPremium } }
      : e
  ));

const readAccessEpoch = (userId) => {
  try {
    const raw = localStorage.getItem(ACCESS_EPOCH_KEY(userId));
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const writeAccessEpoch = (userId, epoch = ACCESS_CLIENT_EPOCH) => {
  try { localStorage.setItem(ACCESS_EPOCH_KEY(userId), String(epoch)); } catch { /* ignore */ }
};

const stashPendingOnboarding = (payload) => {
  try {
    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({
      ...payload,
      at: Date.now(),
    }));
  } catch { /* ignore */ }
};

const readPendingOnboarding = () => {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.at && Date.now() - data.at > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PENDING_ONBOARDING_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const clearPendingOnboarding = () => {
  try { localStorage.removeItem(PENDING_ONBOARDING_KEY); } catch { /* ignore */ }
};

const FREE_TIER_LINES = [
  "Après 7 jours : séances en pause",
  "Plus aucun plan ni séance visible",
  "Abonnement pour continuer",
];

const countCompletedSessions = (p) =>
  (p?.weeks || []).reduce((n, w) => n + (w.sessions || []).filter((s) => s.completed).length, 0);

const PREMIUM_TIER_LINES = [
  `Essai 7 jours sans carte, puis ${PRICING_SUMMARY_FR}`,
  "Séances complètes + allures à la seconde (T100)",
  "Adaptation coach après feedback séance / semaine",
  "Plan jusqu’à ton événement · jusqu’à 5× / semaine",
  "Projection d’allures · plans complets · vidéos technique",
];

const PlanTierComparison = ({ compact = false }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 8 : 10, marginBottom: compact ? 0 : 20 }}>
    <div style={{ border: `1px solid ${G.greyLight}`, borderRadius: 14, padding: compact ? "10px 8px" : "12px 10px", background: G.surface }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: G.grey, letterSpacing: "0.08em", marginBottom: 8 }}>APRÈS L’ESSAI</div>
      {FREE_TIER_LINES.map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: i < FREE_TIER_LINES.length - 1 ? 6 : 0 }}>
          <Check size={11} color={G.greyMid} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: compact ? 10 : 11, color: G.grey, lineHeight: 1.4 }}>{line}</span>
        </div>
      ))}
    </div>
    <div style={{ border: `2px solid ${G.blue}`, borderRadius: 14, padding: compact ? "10px 8px" : "12px 10px", background: G.blueLight }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: G.blue, letterSpacing: "0.08em", marginBottom: 8 }}>PREMIUM</div>
      {PREMIUM_TIER_LINES.map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: i < PREMIUM_TIER_LINES.length - 1 ? 6 : 0 }}>
          <Check size={11} color={G.blue} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: compact ? 10 : 11, color: G.ink, fontWeight: 600, lineHeight: 1.4 }}>{line}</span>
        </div>
      ))}
    </div>
  </div>
);

const SubscriptionStatusCard = ({ isPremium, plan, onUpgrade, onRefreshStatus }) => {
  if (isPremium) {
    return (
      <div style={{ background: G.blueLight, borderRadius: 16, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${G.greyLight}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: G.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Zap size={18} color={G.white} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: G.ink }}>Premium actif</div>
          <div style={{ fontSize: 12, color: G.grey, marginTop: 2 }}>Plan complet · départs D… · adaptation coach</div>
        </div>
      </div>
    );
  }
  const totalWeeks = plan?.totalRealWeeks ?? plan?.weeks?.length ?? 0;
  return (
    <div style={{ background: G.surface, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${G.greyLight}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Ton abonnement</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: G.ink }}>Essai terminé</div>
          <div style={{ fontSize: 12, color: G.grey, marginTop: 4 }}>
            {totalWeeks > 0
              ? `Séances en pause · ${totalWeeks} semaine${totalWeeks > 1 ? "s" : ""} à débloquer`
              : "Abonne-toi pour reprendre tes plans et séances"}
          </div>
        </div>
        <button onClick={onUpgrade} style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: G.blue, color: G.white, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          S’abonner
        </button>
      </div>
      <PlanTierComparison compact />
      {onRefreshStatus && (
        <button onClick={onRefreshStatus} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: `1px solid ${G.greyLight}`, background: G.greyXLight, color: G.grey, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Actualiser le statut (déjà payé ?)
        </button>
      )}
    </div>
  );
};

const ReferralShareCard = () => {
  const [code, setCode] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inv = await fetchReferralInvite();
        if (!inv) throw new Error("Impossible de charger le lien");
        if (!cancelled) {
          setCode(inv.code);
          setShareUrl(inv.shareUrl);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "Impossible de charger le lien");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      const text = [
        "Rejoins-moi sur MySWYM",
        shareUrl,
        code ? `Code parrain : ${code} (−20 % sur la 1re facture)` : null,
      ].filter(Boolean).join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div style={{
      marginTop: 10, padding: 14, borderRadius: 14,
      border: `1px solid ${G.greyLight}`, background: G.surface,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, marginBottom: 4 }}>Parraine un nageur</div>
      <div style={{ fontSize: 12, color: G.grey, lineHeight: 1.45, marginBottom: 10 }}>
        Ton ami bénéficie de −20% sur sa 1ère facture. Tu reçois 4,99€ de crédit quand il s’abonne.
      </div>
      {loading && <div style={{ fontSize: 12, color: G.greyMid }}>Chargement du lien…</div>}
      {err && <div style={{ fontSize: 12, color: G.coral }}>{err}</div>}
      {code && shareUrl && (
        <>
          <div style={{
            fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.12em",
            color: G.blue, marginBottom: 8,
          }}>{code}</div>
          <button
            type="button"
            onClick={copy}
            style={{
              width: "100%", padding: "11px 12px", borderRadius: 12, border: `1.5px solid ${G.blue}`,
              background: G.blueLight, color: G.blue, fontWeight: 700, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {copied ? <><CheckCheck size={15} /> Message d’invite copié</> : <><Copy size={15} /> Copier le message d’invitation</>}
          </button>
        </>
      )}
    </div>
  );
};



const PremiumTeaser = ({ onUpgrade }) => (
  <div style={{ margin: "0 0 16px", borderRadius: 20, overflow: "hidden", border: `1px solid ${G.greyLight}` }}>
    <div style={{ background: G.blueLight, padding: "20px 18px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: G.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Lock size={20} color={G.white} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: G.ink, marginBottom: 2 }}>Ton coach a préparé tes séances</div>
        <div style={{ fontSize: 13, color: G.grey }}>Essai 7 jours · adaptation + allures · puis {PRICING_SUMMARY_FR}</div>
      </div>
      <button type="button" onClick={onUpgrade} style={{ background: G.blue, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: G.white, cursor: "pointer", flexShrink: 0 }}>
        Essai
      </button>
    </div>
  </div>
);

const PremiumBanner = ({ onUpgrade, weeks = 0 }) => (
  <div style={{ margin: "0 0 16px", background: "linear-gradient(135deg, #006bfd 0%, #003d99 100%)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
    <Lock size={24} color={G.white} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: G.white }}>
        {weeks > 4 ? `Débloque tes ${weeks} semaines de coaching` : "Débloque ton coach personnel"}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}>Séances · allures · adaptation feedback · essai 7 jours</div>
    </div>
    <button type="button" onClick={onUpgrade} style={{ background: G.surface, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: G.blue, cursor: "pointer", flexShrink: 0 }}>Essai</button>
  </div>
);

const LockedWeeksPreview = ({ weeks, totalBlocked, daysToEvent, onUpgrade }) => {
  if (!weeks?.length) return null;
  const extra = Math.max(0, totalBlocked - weeks.length);
  return (
    <div style={{ position: "relative", marginBottom: 16, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
        {weeks.map((week, j) => (
          <WeekCard key={j} week={week} weekIndex={FREE_WEEKS_LIMIT + j} onComplete={() => {}} onShare={() => {}} isCurrentWeek={false} />
        ))}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(248,249,252,0.72)", padding: "24px 20px", textAlign: "center",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: G.surface, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: "0 4px 16px rgba(53,93,163,0.12)" }}>
          <Lock size={22} color={G.blue} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: G.ink, marginBottom: 6 }}>
          {totalBlocked} semaine{totalBlocked > 1 ? "s" : ""} pour arriver prêt
        </div>
        <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.5, marginBottom: 4, maxWidth: 280 }}>
          {weeks[0]?.focus ? `Sem. ${weeks[0].number} : ${weeks[0].focus}` : "La suite de ton programme t'attend"}
          {weeks[1]?.focus ? ` · Sem. ${weeks[1].number} : ${weeks[1].focus}` : ""}
        </p>
        {daysToEvent !== null && (
          <p style={{ fontSize: 12, color: G.blue, fontWeight: 600, marginBottom: 14 }}>J−{daysToEvent} avant ton objectif</p>
        )}
        {extra > 0 && (
          <p style={{ fontSize: 11, color: G.greyMid, marginBottom: 14 }}>+ {extra} autre{extra > 1 ? "s" : ""} semaine{extra > 1 ? "s" : ""} ensuite</p>
        )}
        <button type="button" onClick={onUpgrade} style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: G.blue, color: G.white, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px rgba(53,93,163,0.28)" }}>
          S’abonner pour continuer
        </button>
      </div>
    </div>
  );
};

// ── SESSION DETAIL PARSER ──────────────────────────────────────────────────
// Transforme "4×50m crawl, R20", respiration 3 temps" en blocs propres
// (plus de · /, en chaîne dans l'UI).
const REST_CHUNK_RE = /^(R\d+["']?|repos\s+\d+\s*(?:s|sec|min)?|D(?:toutes les )?\d+['′]\d+"|D\d+")$/i;
const DEPART_INLINE_RE = /D(?:toutes les )?(\d+['′]\d+"|\d+")/g;

const parseIntensity = (raw) => {
  if (!raw) return { zone: null, cue: null };
  const parts = String(raw).split(/\s*[—–]\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return { zone: null, cue: null };
  const zone = parts[0];
  const cue = parts.slice(1).join(". ") || null;
  return { zone, cue };
};

const parseSessionDetail = (raw) => {
  const text = stripDetailPrefix(raw);
  if (!text) return null;

  let kind = "work";
  let label = null;
  let body = text;

  if (/^échauffement\s*:/i.test(text)) {
    kind = "warm";
    label = "Échauffement";
    body = text.replace(/^échauffement\s*:\s*/i, "");
  } else if (/^retour(\s+au\s+calme)?\s*:/i.test(text)) {
    kind = "cool";
    label = "Retour au calme";
    body = text.replace(/^retour(\s+au\s+calme)?\s*:\s*/i, "");
  }

  // Enlève le « : » final d'un titre de bloc (« 400m éducatif + jambes : »)
  body = body.replace(/\s*:\s*$/, "");

  const chunks = body.split(/\s*[—–]\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean);
  let main = chunks[0] || body;
  const restParts = [];
  const cues = [];

  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i];
    if (REST_CHUNK_RE.test(c)) restParts.push(c.replace(/^Dtoutes les /i, "D"));
    else cues.push(c.replace(/\s*·\s*/g, " · ").replace(/\s+/g, " ").trim());
  }

  // Rest parfois collé dans le main ("… crawl R20"" ou "…, repos 15s")
  if (!restParts.length) {
    const embedded = main.match(/\s+(R\d+["']?|repos\s+\d+\s*(?:s|sec|min)?|D(?:toutes les )?\d+['′]\d+"|D\d+")\s*$/i);
    if (embedded) {
      restParts.push(embedded[1].replace(/^Dtoutes les /i, "D"));
      main = main.slice(0, embedded.index).trim();
    }
  }

  // Séries progressives "1 lent · 2 ↗ · 3 ↗ · 4 rapide" → chips
  // (pas les enchaînements Arthur « 100m · 2×100m · 300m », gérés via expandCompoundDetailLines)
  let steps = null;
  const stepSource = main.includes(":") ? main.slice(main.indexOf(":") + 1).trim() : main;
  const stepSplit = stepSource.split(/\s*·\s*/).map(s => s.trim()).filter(Boolean);
  const isProgressiveChip = (s) =>
    s.length <= 14 && /^\d/.test(s) && !/\d+\s*m\b/i.test(s) && !/\d+\s*[x×]/i.test(s);
  if (stepSplit.length >= 3 && stepSplit.every(isProgressiveChip)) {
    steps = stepSplit;
    main = main.includes(":") ? main.slice(0, main.indexOf(":")).trim() : null;
  }

  return {
    kind,
    label,
    main,
    steps,
    rest: restParts[0] || null,
    cues,
  };
};

const RestPill = ({ value }) => {
  if (!value) return null;
  const isDepart = /^D/i.test(value);
  const pill = (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: isDepart ? G.blueLight : G.greyXLight,
      color: isDepart ? G.blue : G.inkLight,
      fontSize: 11, fontWeight: 700, padding: "3px 8px",
      borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0,
      letterSpacing: "0.01em",
    }}>
      {isDepart && <Clock size={10} color={G.blue} />}
      {value}
    </span>
  );
  if (!isDepart) return pill;
  return (
    <a href="/blog/depart-interval-natation" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      {pill}
    </a>
  );
};

const RichText = ({ text }) => {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let match;
  DEPART_INLINE_RE.lastIndex = 0;
  while ((match = DEPART_INLINE_RE.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", val: text.slice(last, match.index) });
    parts.push({ type: "depart", val: `D${match[1]}` });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", val: text.slice(last) });
  if (!parts.length) return <span>{text}</span>;
  return (
    <>
      {parts.map((p, i) =>
        p.type === "text" ? <span key={i}>{p.val}</span> : <RestPill key={i} value={p.val} />
      )}
    </>
  );
};

const SessionBlock = ({ detail, index, workIndex, accent, children = null }) => {
  const parsed = parseSessionDetail(detail);
  if (!parsed) return null;
  const isSection = parsed.kind === "warm" || parsed.kind === "cool";
  const childLines = Array.isArray(children) ? children : [];
  const pyramid = parsePyramidLine(detail);

  if (isSection) {
    return (
      <div style={{
        padding: "12px 14px",
        background: parsed.kind === "warm" ? "rgba(0,180,216,0.06)" : "rgba(0,196,140,0.06)",
        borderRadius: 12,
        border: `1px solid ${parsed.kind === "warm" ? "rgba(0,180,216,0.12)" : "rgba(0,196,140,0.12)"}`,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
          color: parsed.kind === "warm" ? "#0097A7" : "#00897B", marginBottom: 6,
        }}>
          {parsed.label}
        </div>
        {parsed.main && (
          <div style={{ fontSize: 14, fontWeight: 600, color: G.ink, lineHeight: 1.35 }}>
            <RichText text={parsed.main} />
          </div>
        )}
        {parsed.cues.map((c, i) => (
          <div key={i} style={{ fontSize: 12, color: G.grey, lineHeight: 1.45, marginTop: 4 }}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 4px",
      borderTop: index > 0 ? `1px solid ${G.greyLight}` : "none",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: accent.bg, color: accent.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, marginTop: 1,
      }}>
        {workIndex}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {parsed.main && (
              <div style={{ fontSize: 14, fontWeight: 700, color: G.ink, lineHeight: 1.35 }}>
                <RichText text={parsed.main} />
              </div>
            )}
            {parsed.steps && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: parsed.main ? 8 : 0 }}>
                {parsed.steps.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 600, color: G.inkLight,
                    background: G.greyXLight, padding: "4px 8px", borderRadius: 8,
                  }}>{s}</span>
                ))}
              </div>
            )}
            {pyramid && (
              <PyramidBlockViz
                steps={pyramid.steps}
                peak={pyramid.peak}
                volume={pyramid.volume}
                rest={pyramid.rest}
                label={pyramid.label}
                accent={accent?.color || G.blue}
              />
            )}
            {/* Sous-séries du même bloc (ex. éducatif + jambes), pas de tiret/point ni de n° */}
            {childLines.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {childLines.map((child, ci) => {
                  const cp = parseSessionDetail(child);
                  if (!cp?.main) return null;
                  return (
                    <div key={ci} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: G.inkLight, lineHeight: 1.4, flex: 1 }}>
                        <RichText text={cp.main} />
                      </div>
                      <RestPill value={cp.rest} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {childLines.length === 0 && <RestPill value={parsed.rest} />}
        </div>
        {parsed.cues.map((c, i) => (
          <div key={i} style={{ fontSize: 12, color: G.grey, lineHeight: 1.45, marginTop: 5 }}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SESSION CARD ──────────────────────────────────────────────────────────
const SessionCard = ({
  session, weekIndex, sessionIndex, onComplete, onShare, onEditFeedback,
  isPremium = false, onUpgrade, hideCheckbox = false,
  analyticsCtx = null,
  displayTitle = null,
}) => {
  const done = session.completed;
  const skipped = session.skipped;
  const resolved = isSessionResolved(session);
  const tm = getTypeMeta(session.type);
  const titleShown = displayTitle || session.title;
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const viewedRef = useRef(false);
  const startedRef = useRef(false);
  const intensity = parseIntensity(session.intensity);
  const details = expandCompoundDetailLines(session.details || []);
  const detailGroups = groupSessionDetails(details);
  const blockCount = detailGroups.reduce((n, g) => {
    if (g.type === "block") return n + 1;
    if (g.type === "work") return n + g.lines.length;
    return n;
  }, 0);

  const sessionOnceBase = analyticsCtx
    ? `${analyticsCtx.planId || "plan"}:${weekIndex}:${sessionIndex}`
    : null;
  const poolSessionKey = sessionOnceBase || `session_${weekIndex}_${sessionIndex}`;

  const emitSessionViewed = () => {
    if (!analyticsCtx || viewedRef.current) return;
    viewedRef.current = true;
    track("session_viewed", sessionAnalyticsProps(analyticsCtx.profile, session, {
      planWeek: analyticsCtx.planWeek,
      sessionIndex,
      phase: analyticsCtx.phase || session?.phase,
    }), { onceKey: `session_viewed:${sessionOnceBase}` });
  };

  const emitSessionStarted = () => {
    if (!analyticsCtx || startedRef.current) return;
    startedRef.current = true;
    const props = sessionAnalyticsProps(analyticsCtx.profile, session, {
      planWeek: analyticsCtx.planWeek,
      sessionIndex,
      phase: analyticsCtx.phase || session?.phase,
    });
    track("session_started", {
      level: props.level,
      objective: props.objective,
      planWeek: props.planWeek,
      sessionIndex: props.sessionIndex,
      volume: props.volume,
    }, { onceKey: `session_started:${sessionOnceBase}` });
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (!isPremium) {
      onUpgrade?.("session_locked");
      return;
    }
    if (resolved) {
      onComplete(weekIndex, sessionIndex, "reset");
      setShowMenu(false);
    } else {
      emitSessionStarted();
      setShowMenu(true);
    }
  };

  const pickStatus = (id) => {
    onComplete(weekIndex, sessionIndex, id);
    setShowMenu(false);
  };

  const checkboxColor = done ? G.mint : skipped === "missed" ? G.gold : skipped === "not_done" ? G.greyMid : G.greyLight;
  const locked = !isPremium;
  const skeletonBars = Math.min(Math.max(blockCount || 3, 3), 5);

  return (
    <div
      className={`ms-session-card${resolved ? " is-resolved" : ""}${locked ? " is-locked" : ""}`}
      style={{
        transition: "opacity 0.25s",
        position: "relative",
        background: resolved || locked ? G.greyXLight : undefined,
      }}
    >
      {!resolved && !locked && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: tm.color, borderRadius: "3px 0 0 3px",
        }} />
      )}
      {locked && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 2,
          width: 28, height: 28, borderRadius: 10,
          background: G.greyLight, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock size={13} color={G.greyMid} />
        </div>
      )}

      {/* Header, squelette toujours visible (titre / type / distance) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 16px 14px 18px" }}>
        <button
          onClick={() => !locked && setShowTooltip(v => !v)}
          aria-label={`Type ${session.type}`}
          style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: resolved || locked ? G.greyLight : tm.bg,
            border: "none", cursor: locked ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
        >
          <tm.Icon size={18} color={resolved || locked ? G.greyMid : tm.color} />
          {!locked && showTooltip && tm.tooltip && (
            <div
              onClick={e => { e.stopPropagation(); setShowTooltip(false); }}
              style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50,
                background: G.surface, color: G.ink, fontSize: 12, lineHeight: 1.5,
                padding: "10px 14px", borderRadius: 12, width: 230,
                border: `1px solid ${G.greyLight}`,
                boxShadow: "0 8px 28px rgba(0,0,0,0.45)", cursor: "pointer",
                textAlign: "left", fontWeight: 400,
              }}
            >
              {tm.tooltip}
            </div>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: locked ? 28 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: resolved || locked ? G.greyMid : tm.color, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>{session.type}</div>
              <div style={{ fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif", fontSize: 20, fontWeight: 700, color: resolved || locked ? G.grey : G.ink, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{titleShown}</div>
              {skipped && (
                <span style={{ display: "inline-block", marginTop: 5, fontSize: 10, fontWeight: 700, color: skipped === "missed" ? G.gold : G.grey, background: skipped === "missed" ? G.goldLight : G.greyXLight, padding: "2px 8px", borderRadius: 100 }}>
                  {SKIP_LABELS[skipped]}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, position: "relative" }}>
              {!hideCheckbox && (
              <button
                type="button"
                onClick={handleCheckboxClick}
                aria-label={locked ? "Débloque Premium pour marquer la séance" : resolved ? "Annuler le statut" : "Marquer la séance"}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: `2px solid ${locked ? G.greyLight : (resolved ? checkboxColor : G.blue)}`,
                  background: locked ? G.greyXLight : (resolved ? checkboxColor : "transparent"),
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                {locked && <Lock size={14} color={G.greyMid} />}
                {!locked && done && <Check size={16} color={G.white} />}
                {!locked && skipped === "missed" && <RotateCcw size={15} color={G.white} />}
                {!locked && skipped === "not_done" && <X size={15} color={G.white} />}
                {!locked && !resolved && <Check size={16} color={G.blue} style={{ opacity: 0.35 }} />}
              </button>
              )}
            </div>
          </div>

          {showMenu && !locked && (
            <SessionMarkSheet
              sessionTitle={titleShown}
              onClose={() => setShowMenu(false)}
              onPick={pickStatus}
            />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: resolved || locked ? G.greyMid : tm.color,
              background: resolved || locked ? G.greyLight : tm.bg, padding: "4px 9px", borderRadius: 8,
            }}>{session.distance}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: G.grey, background: G.greyXLight,
              padding: "4px 9px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Timer size={11} color={G.greyMid} />
              {formatDuration(session.duration)}
            </span>
            {!locked && Array.isArray(session.equipmentUsed) && session.equipmentUsed.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: G.inkLight, background: G.surface,
                border: `1px solid ${G.greyLight}`, padding: "4px 9px", borderRadius: 8,
              }}>
                Matos : {session.equipmentUsed
                  .map((id) => eqLabel(id))
                  .join(" · ")}
              </span>
            )}
          </div>
          {!locked && intensity.cue && (
            <p style={{ fontSize: 12, color: G.grey, marginTop: 8, lineHeight: 1.4, marginBottom: 0 }}>
              {intensity.cue.charAt(0).toUpperCase() + intensity.cue.slice(1)}
            </p>
          )}
          {!locked && done && onEditFeedback && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditFeedback(weekIndex, sessionIndex); }}
              style={{
                marginTop: 10, padding: 0, border: "none", background: "none",
                color: G.blue, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textAlign: "left",
              }}
            >
              {session.feedback ? "Modifier mon retour" : "Donner mon avis"}
            </button>
          )}
        </div>
      </div>

      {/* Exercices : contenu réel Premium / squelette gris verrouillé sinon */}
      {(blockCount > 0 || locked) && (
        <>
          {locked ? (
            <button
              type="button"
              onClick={() => onUpgrade?.("session_locked")}
              aria-label="Débloque Premium pour voir les exercices"
              style={{
                width: "100%", padding: "14px 16px 16px",
                background: G.greyXLight,
                border: "none", borderTop: `1px solid ${G.greyLight}`,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: G.greyMid, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Lock size={13} color={G.greyMid} />
                  {blockCount > 0 ? `${blockCount} bloc${blockCount > 1 ? "s" : ""} verrouillés` : "Séance verrouillée"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: G.blue }}>Voir</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: skeletonBars }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: i === 0 || i === skeletonBars - 1 ? 36 : 48,
                      borderRadius: 12,
                      background: i % 2 === 0 ? G.greyLight : G.surface,
                      width: `${88 - (i % 3) * 12}%`,
                    }}
                  />
                ))}
              </div>
              <div style={{
                marginTop: 14, padding: "10px 12px", borderRadius: 12,
                background: G.surface, border: `1px solid ${G.greyLight}`,
                fontSize: 12, fontWeight: 700, color: G.inkLight,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Lock size={12} color={G.greyMid} />
                Abonne-toi pour accéder à la séance
              </div>
            </button>
          ) : (
            <>
          <div className="ms-session-card-cta" style={{ padding: "0 16px 16px" }}>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                emitSessionViewed();
                setPrepOpen(true);
              }}
            >
              {resolved ? "Voir la séance" : "Préparer la séance"}
            </button>
          </div>
          <SessionPrepSheet
            open={prepOpen}
            session={session}
            colors={G}
            accent={{ bg: tm.bg, color: tm.color }}
            isPremium={isPremium}
            profile={analyticsCtx?.profile || null}
            planId={analyticsCtx?.planId || null}
            showStart={!resolved}
            onClose={() => setPrepOpen(false)}
            onUpgrade={() => onUpgrade?.("session_locked")}
            onTooHard={
              !resolved && isPremium
                ? () => {
                    setPrepOpen(false);
                    onEditFeedback?.(weekIndex, sessionIndex);
                  }
                : undefined
            }
            onStart={() => {
              if (!isPremium) {
                onUpgrade?.("session_locked");
                return;
              }
              emitSessionStarted();
              setPrepOpen(false);
              setPoolOpen(true);
            }}
            exportBar={(
              <div style={{ marginTop: 14 }}>
                <SessionExportBar
                  session={session}
                  isPremium={isPremium}
                  onUpgrade={onUpgrade}
                  onShare={onShare}
                />
              </div>
            )}
          />
          {poolOpen && (
            <Suspense fallback={null}><PoolMode
              session={session}
              sessionKey={poolSessionKey}
              colors={G}
              accent={{ bg: tm.bg, color: tm.color }}
              onClose={() => setPoolOpen(false)}
              onFinish={() => {
                setPoolOpen(false);
                if (!resolved && isPremium) onComplete?.(weekIndex, sessionIndex, "done");
              }}
              onTooHard={
                !resolved && isPremium
                  ? () => {
                      setPoolOpen(false);
                      onEditFeedback?.(weekIndex, sessionIndex);
                    }
                  : undefined
              }
            /></Suspense>
          )}
            </>
          )}
        </>
      )}
      {!locked && blockCount === 0 && (
        <div style={{ padding: "0 14px 12px" }}>
          <SessionExportBar
            session={session}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            onShare={onShare}
          />
        </div>
      )}
    </div>
  );
};

// ── WEEK CARD ──────────────────────────────────────────────────────────────
const WeekCard = ({ week, weekIndex, onComplete, onShare, onEditFeedback, isCurrentWeek, isPremium = false, onUpgrade, analyticsCtx = null, weekLocalTitles = false }) => {
  const [open, setOpen] = useState(isCurrentWeek);
  useEffect(() => {
    if (isCurrentWeek) setOpen(true);
  }, [isCurrentWeek]);
  const done = week.sessions.filter(isSessionResolved).length;
  const total = week.sessions.length;
  const allDone = done === total && total > 0;
  const allActuallyDone = total > 0 && week.sessions.every(s => s.completed && !s.skipped);
  const totalDist = week.sessions.reduce((acc, s) => acc + (parseInt(s.distance) || 0), 0);
  const distLabel = totalDist >= 1000 ? `${(totalDist / 1000).toFixed(1)} km` : `${totalDist} m`;
  const progress = total > 0 ? done / total : 0;

  return (
    <div
      className={`ms-week-card${isCurrentWeek ? " is-current" : ""}`}
      style={{
      borderRadius: 26,
      overflow: "hidden",
      border: isCurrentWeek
        ? undefined
        : allDone ? `1px solid ${allActuallyDone ? G.mint : G.gold}45` : undefined,
      marginBottom: 12,
    }}>
      {isCurrentWeek && (
        <div style={{ height: 3, background: `linear-gradient(90deg, ${G.blue}, ${G.blueMid})` }} />
      )}
      {allDone && !isCurrentWeek && (
        <div style={{ height: 3, background: allActuallyDone ? G.mint : G.gold }} />
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "16px", background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 700, fontFamily: FONT_DISPLAY, color: G.ink, letterSpacing: "-0.03em" }}>Semaine {week.number}</span>
              {isCurrentWeek && (
                <span className="ms-chip is-active" style={{ height: 24, fontSize: 10, padding: "0 10px" }}>En cours</span>
              )}
              {allDone && !isCurrentWeek && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: allActuallyDone ? G.mint : G.gold,
                  background: allActuallyDone ? G.mintLight : G.goldLight,
                  padding: "3px 8px", borderRadius: 6, letterSpacing: "0.04em",
                }}>
                  {allActuallyDone ? "Terminée" : "Passée"}
                </span>
              )}
            </div>
            {week.focus && !/^Séance(\s+n°)?\s*\d+/i.test(String(week.focus)) && (
              <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.4, margin: "0 0 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {week.focus}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: week.focus && !/^Séance(\s+n°)?\s*\d+/i.test(String(week.focus)) ? 0 : 4 }}>
              {totalDist > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: isCurrentWeek ? G.blue : G.inkLight,
                  background: isCurrentWeek ? G.blueLight : G.greyXLight,
                  padding: "3px 9px", borderRadius: 8,
                }}>
                  {distLabel}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, color: G.grey,
                background: G.greyXLight, padding: "3px 9px", borderRadius: 8,
              }}>
                {total} séance{total > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 15, fontWeight: 800,
                color: allDone ? (allActuallyDone ? G.mint : G.gold) : G.blue,
                fontVariantNumeric: "tabular-nums",
              }}>{done}/{total}</span>
              <div style={{ color: G.greyMid }}>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
            {/* Mini progress bar */}
            <div style={{ width: 48, height: 4, borderRadius: 4, background: G.greyLight, overflow: "hidden" }}>
              <div style={{
                width: `${Math.round(progress * 100)}%`, height: "100%", borderRadius: 4,
                background: allDone ? (allActuallyDone ? G.mint : G.gold) : G.blue,
                transition: "width 0.35s ease",
              }} />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {week.sessions.map((s, i) => (
            <SessionCard
              key={i}
              session={s}
              weekIndex={weekIndex}
              sessionIndex={i}
              displayTitle={weekLocalTitles ? formatLoopWeekSessionTitle(i) : null}
              onComplete={onComplete}
              onShare={onShare}
              onEditFeedback={onEditFeedback}
              isPremium={isPremium}
              onUpgrade={onUpgrade}
              analyticsCtx={analyticsCtx ? {
                ...analyticsCtx,
                planWeek: week?.number ?? weekIndex + 1,
                phase: week?.phase || s?.phase,
              } : null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── RESET / CHANGER D'OBJECTIF ────────────────────────────────────────────
/** Free : carte douce au-dessus du plan. Premium : lien discret en bas. */
const ResetConfirmButton = ({ onReset, variant = "subtle" }) => {
  const [confirm, setConfirm] = useState(false);
  const isCard = variant === "card";

  if (confirm) {
    return (
      <div style={{
        marginBottom: isCard ? 16 : 0,
        marginTop: isCard ? 0 : 8,
        background: isCard ? G.surface : G.coralLight,
        border: `1px solid ${isCard ? G.greyLight : G.coral}`,
        borderRadius: isCard ? 18 : 12,
        padding: isCard ? "16px 16px 14px" : "16px 18px",
        boxShadow: isCard ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
      }}>
        <p style={{
          fontSize: 14, fontWeight: 700, marginBottom: 4,
          color: isCard ? G.ink : G.coral,
        }}>
          Remplacer ton plan actuel ?
        </p>
        <p style={{ fontSize: 13, color: G.inkLight, lineHeight: 1.5, marginBottom: 14 }}>
          Tu repartiras du questionnaire pour créer un nouveau plan. La progression de celui-ci ne sera pas conservée.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            style={{
              flex: 1, padding: "11px", background: G.surface,
              border: `1.5px solid ${G.greyLight}`, borderRadius: 10,
              fontSize: 13, color: G.grey, cursor: "pointer", fontWeight: 600, minHeight: 44,
            }}
          >
            Garder mon plan
          </button>
          <button
            type="button"
            onClick={onReset}
            style={{
              flex: 1, padding: "11px", background: G.blue, border: "none", borderRadius: 10,
              fontSize: 13, color: G.white, cursor: "pointer", fontWeight: 700, minHeight: 44,
            }}
          >
            Nouveau plan
          </button>
        </div>
      </div>
    );
  }

  if (isCard) {
    return (
      <div style={{
        marginBottom: 16,
        background: G.surface,
        border: `1px solid ${G.greyLight}`,
        borderRadius: 18,
        padding: "16px 16px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: G.blueLight, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RotateCcw size={16} color={G.blue} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: G.ink, margin: "0 0 4px" }}>
              Pas le bon objectif ?
            </p>
            <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.45, margin: "0 0 12px" }}>
              Tu peux refaire le questionnaire en 2 minutes et générer un plan plus adapté.
            </p>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, cursor: "pointer",
                background: G.blueLight, border: `1.5px solid ${G.blue}33`,
                color: G.blue, fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44,
              }}
            >
              Changer d&apos;objectif
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      style={{
        width: "100%", marginTop: 8, padding: "14px", background: "none",
        border: `1px solid ${G.greyLight}`, borderRadius: 12, color: G.grey, cursor: "pointer",
        fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44,
      }}
    >
      <RotateCcw size={14} color={G.greyMid} /> Changer d&apos;objectif
    </button>
  );
};

// ── COACH CARD ────────────────────────────────────────────────────────────
// ── MODE BOUCLE « Nager & Progresser » ─────────────────────────────────────
const LoopPaywallScreen = ({ reason = "cap", onUpgrade, onClose }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.55)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  }}>
    <div style={{
      width: "100%", maxWidth: 440, background: G.surface, borderRadius: "24px 24px 0 0",
      padding: "28px 22px calc(28px + var(--safe-bottom))",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
    }}>
      {reason === "weekly" ? (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: G.ink, margin: "0 0 10px", lineHeight: 1.2 }}>
            Limite atteinte
          </h2>
          <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.55, margin: "0 0 18px" }}>
            Pour générer de nouvelles séances, abonne-toi à Premium : {PRICING_SUMMARY_FR}.
          </p>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: G.ink, margin: "0 0 10px", lineHeight: 1.2 }}>
            Continue avec Premium
          </h2>
          <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.55, margin: "0 0 16px" }}>
            Pour de nouvelles séances personnalisées : {PRICING_SUMMARY_FR}.
          </p>
          <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Génération illimitée",
              "Régénération des séances",
              "Progression personnalisée",
              "Historique complet",
              "Nouvelles fonctionnalités à venir",
            ].map((line) => (
              <li key={line} style={{ fontSize: 13, fontWeight: 600, color: G.ink, display: "flex", alignItems: "center", gap: 8 }}>
                <Check size={14} color={G.mint} /> {line}
              </li>
            ))}
          </ul>
        </>
      )}
      <Btn variant="blue" onClick={onUpgrade} style={{ width: "100%", marginBottom: 10 }}>S’abonner : dès {PRICING.monthlyCommit.label}/mois</Btn>
      {onClose && (
        <button type="button" onClick={onClose} style={{
          width: "100%", border: "none", background: "transparent", color: G.grey,
          fontSize: 13, fontWeight: 600, padding: 12, cursor: "pointer",
        }}>
          Plus tard
        </button>
      )}
    </div>
  </div>
);

const ProgressionLoopView = ({
  plan,
  profile,
  plans,
  activePlanId,
  isPremium,
  onComplete,
  onAdvanceLoop,
  onSwitchPlan,
  onDeletePlan,
  onRegenerate,
  onUpgrade,
  onReset,
  onShare,
  onEditFeedback,
  showHistory: _showHistory = true,
  embed = false,
  user,
  onOpenMenu,
  onTabChange,
}) => {
  const week0 = plan?.weeks?.[0];
  const weekSessions = week0?.sessions || [];
  const multiSessionWeek = weekSessions.length > 1;
  const openSessionIndex = weekSessions.findIndex((s) => !isSessionResolved(s));
  const session = multiSessionWeek
    ? (openSessionIndex >= 0 ? weekSessions[openSessionIndex] : weekSessions[0])
    : (loopDisplaySession(plan) || weekSessions[0]);
  const resolved = session ? isSessionResolved(session) : true;
  const [poolOpen, setPoolOpen] = useState(false);

  const loopPad = {
    paddingBottom: embed ? 16 : "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 24px)",
    minHeight: embed ? 0 : "100dvh",
  };
  const LoopShell = embed ? "div" : AppTabShell;

  if (!session) {
    return (
      <LoopShell style={loopPad}>
        {!embed && (
          <AppTopBar
            user={user}
            onOpenMenu={onOpenMenu}
            onAvatarClick={onTabChange ? () => onTabChange("profile") : undefined}
            plan={plan}
            onTabChange={onTabChange}
            onUpgrade={onUpgrade}
            immersive
          />
        )}
        <div className="app-shell" style={{ paddingTop: 24 }}>
          <p style={{ color: G.grey }}>Aucune séance. Régénère ton programme.</p>
          <ResetConfirmButton onReset={onReset} variant="card" />
        </div>
      </LoopShell>
    );
  }

  return (
    <LoopShell style={loopPad}>
      {!embed && (
        <AppTopBar
          user={user}
          onOpenMenu={onOpenMenu}
          onAvatarClick={onTabChange ? () => onTabChange("profile") : undefined}
          plan={plan}
          onTabChange={onTabChange}
          onUpgrade={onUpgrade}
          immersive
        />
      )}
      {!embed && (
        <div className="ms-app-subhead">
          <div className="app-shell" style={{ paddingTop: 14, paddingBottom: 12 }}>
            <PlanSelector
              plans={plans}
              activePlanId={activePlanId}
            />
          </div>
        </div>
      )}

      <div className="app-shell" style={{ paddingTop: embed ? 0 : 16 }}>
        {multiSessionWeek ? (
          <WeekCard
            week={week0}
            weekIndex={0}
            onComplete={onComplete}
            onShare={onShare}
            onEditFeedback={onEditFeedback}
            isCurrentWeek
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            weekLocalTitles
            analyticsCtx={{ planId: activePlanId, profile }}
          />
        ) : (
          <>
        <div className="ms-session-card is-glass" style={{ marginBottom: 14, padding: "16px 18px 18px" }}>
          <WorkoutPrepView
            session={session}
            colors={G}
            accent={{ bg: getTypeMeta(session.type).bg, color: getTypeMeta(session.type).color }}
            isPremium={isPremium}
            showStart={!resolved}
            loopCursor={loopSessionOrdinalIndex(plan)}
            profile={profile}
            planId={activePlanId}
            startLabel={isPremium ? "Commencer la séance" : "S’abonner pour nager"}
            onUpgrade={onUpgrade}
            onStart={() => {
              if (!isPremium) {
                onUpgrade?.();
                return;
              }
              if (resolved) return;
              const props = sessionAnalyticsProps(profile, session, { planWeek: 1, sessionIndex: 0 });
              track("session_started", {
                level: props.level,
                objective: props.objective,
                planWeek: 1,
                sessionIndex: 0,
                volume: props.volume,
              }, { onceKey: `session_started:${activePlanId || "loop"}:0:0` });
              setPoolOpen(true);
            }}
          />
          <div style={{ marginTop: 14 }}>
            <SessionExportBar
              session={session}
              isPremium={isPremium}
              onUpgrade={onUpgrade}
              onShare={onShare}
            />
          </div>
        </div>

        {poolOpen && (
          <Suspense fallback={null}><PoolMode
            session={session}
            sessionKey={`${activePlanId || "loop"}:today`}
            colors={G}
            accent={{ bg: getTypeMeta(session.type).bg, color: getTypeMeta(session.type).color }}
            onClose={() => setPoolOpen(false)}
            onFinish={() => {
              setPoolOpen(false);
              onComplete("done");
            }}
          /></Suspense>
        )}

        {!resolved && isPremium && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => onComplete("done")}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${G.greyLight}`, background: G.surface,
                color: G.inkLight, fontSize: 14, fontWeight: 700,
              }}
            >
              Terminée
            </button>
            <button
              type="button"
              onClick={() => onComplete("not_done")}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${G.greyLight}`, background: G.surface,
                color: G.grey, fontSize: 14, fontWeight: 700,
              }}
            >
              L&apos;abandonner
            </button>
          </div>
        )}

        {resolved && isPremium && (
          <div style={{
            background: G.mintLight, borderRadius: 16, padding: "16px", marginBottom: 14,
            border: `1px solid ${G.mint}33`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Check size={16} color={G.mint} />
              <div style={{ fontSize: 14, fontWeight: 800, color: G.ink }}>Séance terminée</div>
            </div>
            <p style={{ fontSize: 13, color: G.inkLight, lineHeight: 1.45, margin: "0 0 12px" }}>
              Cette séance est déjà validée. Passe à la suivante pour continuer.
            </p>
            <button
              type="button"
              onClick={() => onAdvanceLoop?.()}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
                border: "none", background: G.blue, color: G.white,
                fontSize: 14, fontWeight: 800, minHeight: 48,
              }}
            >
              Passer à la séance suivante
            </button>
          </div>
        )}
          </>
        )}

        {!isPremium && (
          <div style={{
            background: G.blueLight, borderRadius: 16, padding: "16px", marginBottom: 14,
            border: `1px solid rgba(53,93,163,0.15)`,
          }}>
            <p style={{ fontSize: 13, color: G.ink, lineHeight: 1.5, margin: "0 0 12px" }}>
              Ton essai est terminé. Abonne-toi pour reprendre ta séance et continuer avec ton coach.
            </p>
            <Btn variant="blue" onClick={onUpgrade} style={{ width: "100%" }}>S’abonner : dès {PRICING.monthlyCommit.label}/mois</Btn>
          </div>
        )}
      </div>
    </LoopShell>
  );
};

const PlanSelector = ({
  plans,
  activePlanId,
}) => {
  const planList = plans || [];
  const activeEntry = planList.find((entry) => entry.id === activePlanId) || planList[0] || null;
  const primary = getPlanPrimaryLabel(activeEntry);
  const secondary = getPlanSecondaryLabel(activeEntry);

  if (!planList.length) return null;

  return (
    <div className="ms-glass-card" style={{
      width: "100%",
      minHeight: 56,
      padding: "12px 16px",
      borderRadius: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 12,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.grey, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
          Plan actif
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT_DISPLAY, color: G.ink, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {primary}
        </div>
        {secondary && (
          <div style={{ fontSize: 12, fontWeight: 600, color: G.grey, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
};


function registerAppTabUi() {
  registerTabUi({
    AppTopBar,
    OnboardingWizard,
    ProgressionLoopView,
    PlanSelector,
    PremiumBanner,
    PremiumTeaser,
    WeekProjectionCard,
    ResetConfirmButton,
    UpdateProgramCard,
    WeekCard,
    MonAllureCard,
    StravaSection,
    GOALS,
    CATEGORIES,
    BADGE_DEFS,
    computeStats,
    checkBadges,
    getTypeMeta,
  });
}
registerAppTabUi();

// ── BADGES TAB ─────────────────────────────────────────────────────────────
const BadgesTab = ({ plan }) => {
  const stats = computeStats(plan);
  const earned = checkBadges(stats);
  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: G.blue, padding: "52px 20px 28px" }}>
        <div className="fade-up" style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: 2, marginBottom: 5, fontWeight: 700, textTransform: "uppercase" }}>Tes récompenses</div>
        <h1 className="fade-up-1" style={{ fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "0.03em", color: G.white, marginBottom: 4 }}>Badges</h1>
        <p className="fade-up-2" style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{earned.length}/{BADGE_DEFS.length} débloqués</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {BADGE_DEFS.map(b => (
            <div key={b.id} style={{ width: 32, height: 32, borderRadius: "50%", background: earned.includes(b.id) ? b.color : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", filter: earned.includes(b.id) ? "none" : "opacity(0.35)" }}>
              {earned.includes(b.id) && <b.icon size={16} color={G.white} />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 16px 0" }}>
        {earned.length > 0 && (
          <>
            <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: G.ink, marginBottom: 12 }}>Débloqués</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {BADGE_DEFS.filter(b => earned.includes(b.id)).map(b => (
                <div key={b.id} className="scale-in" style={{ background: G.surface, borderRadius: 16, padding: 16, textAlign: "center", border: `2px solid ${b.color}20`, boxShadow: `0 4px 16px ${b.color}18` }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${b.color}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <b.icon size={24} color={b.color} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, marginBottom: 3 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: G.grey, lineHeight: 1.4 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {BADGE_DEFS.filter(b => !earned.includes(b.id)).length > 0 && (
          <>
            <h3 style={{ fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: G.ink, marginBottom: 12 }}>À débloquer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {BADGE_DEFS.filter(b => !earned.includes(b.id)).map(b => (
                <div key={b.id} style={{ background: G.greyXLight, borderRadius: 16, padding: 16, textAlign: "center", border: `1px solid ${G.greyLight}` }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: G.greyLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <Lock size={20} color={G.greyMid} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: G.greyMid, marginBottom: 3 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: G.greyMid, lineHeight: 1.4 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── PLAN GENERATOR ─────────────────────────────────────────────────────────
const BASE_DISTANCES = {
  // Niveau 0 : Découverte : séances courtes, fun, sans pression
  découverte:   { endurance: 700, seuil: 550, vitesse: 450, technique: 600, récupération: 500, bnssa: 700  },
  // Niveau 1 : Régulier (= ancien Débutant)
  beginner:     { endurance: 1200, seuil: 900, vitesse: 700, technique: 1000, récupération: 700, bnssa: 1000 },
  régulier:     { endurance: 1200, seuil: 900, vitesse: 700, technique: 1000, récupération: 700, bnssa: 1000 },
  // Niveau 2 : Sportif (= ancien Intermédiaire)
  intermediate: { endurance: 2000, seuil: 1800, vitesse: 1400, technique: 1600, récupération: 1200, bnssa: 1500 },
  sportif:      { endurance: 2000, seuil: 1800, vitesse: 1400, technique: 1600, récupération: 1200, bnssa: 1500 },
  // Niveau 3 : Performance (= ancien Confirmé)
  advanced:     { endurance: 3200, seuil: 2600, vitesse: 2000, technique: 2400, récupération: 1600, bnssa: 2000 },
  performance:  { endurance: 3200, seuil: 2600, vitesse: 2000, technique: 2400, récupération: 1600, bnssa: 2000 },
};
// Alias bnssa pour tests_pompiers / CAEPMNS (même type de séance sauvetage)
Object.keys(BASE_DISTANCES).forEach(k => {
  BASE_DISTANCES[k].tests_pompiers = BASE_DISTANCES[k].bnssa;
  BASE_DISTANCES[k].caepmns = BASE_DISTANCES[k].bnssa;
});

// pace100[lvl][zone] = secondes aux 100m (0=découverte 1=régulier 2=sportif 3=performance)
const PACE = {
  easy:      [220, 170, 130, 105],
  threshold: [200, 155, 112, 90],
  sprint:    [180, 140, 95, 75],
};

// ── Paces personnalisées ─────────────────────────────────────────────────
// Set par generatePlan quand profile.pace100 (T100) est renseigné.
// null = fallback sur le tableau PACE par niveau.
let _pace100 = null;
let _isPremium = false;

// Facteurs de zone : recalculés via appZoneMultForT100(_pace100), plus tolérants si T100 rapide
let _zoneMult = { easy: 1.35, threshold: 1.08, sprint: 0.95 };

// Formate des secondes en m'ss"
const fmtS = s => `${Math.floor(s/60)}'${Math.round(s%60).toString().padStart(2,'0')}"`;

// Departure interval: swim time + rest, rounded up to 5s
// Quand _pace100 est set, affiche aussi l'allure cible /100m
const di = (meters, lvl, zone = 'easy') => {
  const rest = zone === 'sprint' ? 90 : zone === 'threshold' ? 15 : 20;
  let secsPer100;
  if (_pace100 !== null) {
    secsPer100 = _pace100 * (_zoneMult[zone] ?? 1.35);
  } else {
    secsPer100 = PACE[zone][lvl];
  }
  const totalSecs = Math.ceil((meters * secsPer100 / 100 + rest) / 5) * 5;
  if (_pace100 !== null) {
    return `${fmtS(totalSecs)} · allure cible ${fmtS(Math.round(secsPer100))}/100m`;
  }
  return `${fmtS(totalSecs)}`;
};

// Récupération simple pour les plans gratuits (pas de départ)
const REST_SECS = { sprint: 90, threshold: 30, easy: 20 };
const ri = (zone = 'easy') => fmtS(REST_SECS[zone] ?? 20);

// dep() = D départ (premium) ou R récup (gratuit)
const dep = (meters, lvl, zone = 'easy') =>
  _isPremium ? `D${di(meters, lvl, zone)}` : `R${ri(zone)}`;
// Round to nearest pool-length multiple, min 1 length
const snap = (d, P) => Math.max(P, Math.round(d / P) * P);

// Calcule la vraie distance totale d'une séance en lisant ses détails
const calcSessionDistance = (details = []) => {
  let total = 0;
  for (let i = 0; i < details.length; i++) {
    const line = details[i];
    // Titre de bloc (« 400m éducatif ») : la distance est dans les sous-séries, ne pas compter 2×
    if (classifyDetailLine(line) === "header") {
      const hasSubs = i + 1 < details.length && classifyDetailLine(details[i + 1]) === "sub";
      if (hasSubs) continue;
    }
    let rest = line;
    // 1. N×Xm (ex : "8×50m", "4×25m")
    rest = rest.replace(/(\d+)\s*[×x]\s*(\d+)\s*m/g, (_, n, x) => {
      total += parseInt(n) * parseInt(x); return '';
    });
    // 2. Pyramide "25-50-75-100-75-50-25m"
    rest = rest.replace(/(\d+(?:\s*[–\-]\s*\d+)+)\s*m/g, (_, seq) => {
      seq.split(/[–\-]/).forEach(v => { const n = parseInt(v.trim()); if (!isNaN(n)) total += n; });
      return '';
    });
    // 3. Xm simples restants (ex : "200m", "100m")
    rest.replace(/\b(\d+)\s*m\b/g, (_, x) => { total += parseInt(x); });
  }
  return total;
};

// Eau libre & triathlon : IM piscine seulement si le nageur a déclaré les 4 nages
// (legacy SESSION_TEMPLATES, le composeur lit swimStyle / strokeFocus).
const isOpenWaterGoal = (g) => g?.startsWith("open_water") || g?.startsWith("eau_libre");
const isTriathlonGoal = (g) => g?.startsWith("triathlon");
const shouldUsePoolIMBlock = (g, swimStyle = null) => {
  if (isOpenWaterGoal(g) || isTriathlonGoal(g)) {
    return swimStyle === "4_nages" || swimStyle === "4n";
  }
  return true;
};

// Banque confirmé (ex-OW_BASE_SESSIONS) : src/lib/swim-session-generator.js, branchée via swim-plan-bridge.


const SESSION_TEMPLATES = {

  // ── ENDURANCE ────────────────────────────────────────────────────────────
  // 5 variants, rotation formula spreads across weeks without exact repeats
  endurance: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const isDecouverte = level === "découverte";
    const isBeg = level === "beginner" || level === "régulier" || isDecouverte;
    const isAdv = level === "advanced" || level === "performance";
    const P = pool, lvl = getLvlIndex(level);
    const v = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;

    // ── DÉCOUVERTE : séances courtes, simples, distributeur d'idées ──────
    if (isDecouverte) {
      const nLaps = Math.max(2, Math.round(dist / (2 * P)));
      const vd = (Math.floor(weekIdx / 8) * 3 + (weekIdx % 8)) % 5;
      return {
        type: "ENDURANCE",
        ...[
          {
            title: "Nage à ton rythme",
            intensity: "Très facile, tu dois pouvoir parler",
            details: [
              `${Math.max(2, nLaps - 1)}× ${2*P}m crawl, repose ${P <= 25 ? "30\"" : "40\""} entre chaque, nage sans te presser, comme une promenade`,
              `${Math.max(1, Math.round(nLaps * 0.3))}× ${2*P}m dos, repose 30", regarde le plafond, flotte`,
              `Fin : 1 longueur très lente, sens l'eau autour de toi`,
            ],
          },
          {
            title: "Crawl & dos en alternance",
            intensity: "Très facile, change de nage pour varier",
            details: [
              `Répète ${Math.max(3, Math.round(dist / (4 * P)))} fois : ${2*P}m crawl + ${2*P}m dos, repose 30" après chaque paire`,
              `Bonus si tu te sens bien : ${P}m crawl à allure plus vive, juste pour voir`,
              `Fin : ${P}m dos très lent, bras tendus`,
            ],
          },
          {
            title: "Tiens 10 minutes",
            intensity: "Modéré, essaie sans t'arrêter",
            details: [
              `Objectif : nager 10 minutes sans pause, choisis ton allure toi-même`,
              `Si tu dois t'arrêter : repose 20" et repars, c'est normal au début`,
              `${Math.max(1, Math.round(nLaps * 0.25))}× ${2*P}m dos, récupération douce à la fin`,
            ],
          },
          {
            title: "Longueurs progressives",
            intensity: "Facile → modéré, tu accélères au fil des longueurs",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.5))}× ${2*P}m crawl lent, repose 30", mise en jambes`,
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl un peu plus vite, repose 25"`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m crawl à ton meilleur rythme, repose 30"`,
              `Fin : ${P}m dos tranquille`,
            ],
          },
          {
            title: "Nage libre & exploration",
            intensity: "Facile, fais ce que tu veux, navigue",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.4))}× ${2*P}m crawl, repose 30", concentre-toi sur ta respiration`,
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${P}m dos, repose 20", ferme les yeux une longueur si tu oses`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m nage de ton choix (crawl, dos, brasse), repose 30"`,
              `Fin : flotte 1 minute sur le dos, bras en croix`,
            ],
          },
        ][vd],
      };
    }

    // ── RÉGULIER : 8 variants clairs, progressifs, sans jargon ─────────────
    if (isBeg) {
      const nLaps = Math.max(3, Math.round(dist / (2 * P)));
      const rest  = P <= 25 ? "25\"" : "30\"";
      const nA = Math.max(3, Math.round(nLaps * 0.65));
      const nB = Math.max(2, Math.round(nLaps * 0.25));
      const nC = Math.max(2, Math.round(nLaps * 0.5));
      const nD = Math.max(2, Math.round(nLaps * 0.5));
      const vb = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;
      return {
        type: "ENDURANCE",
        ...[
          {
            title: "Bâtis ton fond",
            intensity: "Allure confortable, tu pourrais parler",
            details: [
              `Échauffement : ${2*P}m crawl très lent + ${P}m dos`,
              `${nA}× ${2*P}m crawl, repose ${rest}, allure constante, ni trop lent ni essoufflé`,
              `${nB}× ${2*P}m dos, repose ${rest}, récupération active`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
          {
            title: "La pyramide",
            intensity: "Allure confortable, monte les distances puis redescends",
            details: [
              `Échauffement : ${2*P}m crawl tranquille`,
              `${P}m · ${2*P}m · ${3*P}m · ${2*P}m · ${P}m crawl, ${rest} entre chaque, même sensation du début à la fin`,
              `${nB}× ${2*P}m dos, récup douce`,
              `Fin : ${P}m à ton rythme`,
            ],
          },
          {
            title: "Crawl & dos en alternance",
            intensity: "Facile, change de nage, récup naturelle",
            details: [
              `Échauffement : ${2*P}m crawl lent`,
              `Répète ${Math.max(4, Math.round(nLaps * 0.4))} fois : ${2*P}m crawl + ${2*P}m dos, repose ${rest} après chaque paire`,
              `Fin : ${P}m de ton choix, très lent`,
            ],
          },
          {
            title: "Arrive plus fort",
            intensity: "Facile → modéré, la 2e longueur toujours plus vite",
            details: [
              `Échauffement : ${2*P}m crawl lent + ${P}m dos`,
              `${nA}× ${2*P}m crawl, repose ${rest}, 1re longueur calme, 2e longueur un cran plus vite : arrive plus fort que tu n'es parti`,
              `${Math.max(1, Math.round(nLaps * 0.15))}× ${2*P}m dos lent, récup`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
          {
            title: "Longues séquences",
            intensity: "Modéré, tiens la distance entière",
            details: [
              `Échauffement : ${2*P}m crawl tranquille`,
              `${Math.max(2, Math.round(nLaps * 0.5))}× ${4*P}m crawl, repose 40", gère ton rythme, ne parte pas trop vite`,
              `${nB}× ${2*P}m dos, ${rest}, récup active`,
              `Fin : ${P}m très lent`,
            ],
          },
          {
            title: "3 blocs qui montent",
            intensity: "Progressif, chaque bloc est un cran au-dessus",
            details: [
              `Échauffement : ${2*P}m crawl lent`,
              `Bloc 1 : ${Math.max(2, Math.round(nLaps * 0.22))}× ${2*P}m crawl tranquille, repose ${rest}`,
              `Bloc 2 : ${Math.max(2, Math.round(nLaps * 0.22))}× ${2*P}m crawl allure normale, repose ${rest}`,
              `Bloc 3 : ${Math.max(2, Math.round(nLaps * 0.22))}× ${2*P}m crawl vif sans être à fond, repose 35"`,
              `Fin : ${P}m dos très lent`,
            ],
          },
          {
            title: "20 minutes non-stop",
            intensity: "Modéré, objectif : tenir sans s'arrêter",
            details: [
              `Échauffement : ${2*P}m crawl + ${P}m dos`,
              `Nage ${nC}× ${2*P}m sans pause, allure que tu peux tenir de bout en bout, si tu dois t'arrêter : 15" max et repars`,
              `${Math.max(1, Math.round(nLaps * 0.15))}× ${2*P}m dos, récup douce`,
              `Fin : ${P}m à fleur d'eau, très lent`,
            ],
          },
          {
            title: "3 nages en circuit",
            intensity: "Facile, crawl, dos, brasse en rotation",
            details: [
              `Répète ${Math.max(3, Math.round(nLaps * 0.32))} fois : ${2*P}m crawl + ${2*P}m dos + ${2*P}m brasse, repose 30" après chaque trio`,
              `${Math.max(1, Math.round(nLaps * 0.08))}× ${2*P}m crawl confort, récup finale`,
              `Fin : ${P}m de ton choix`,
            ],
          },
        ][vb],
      };
    }

    // ── PERFORMANCE / EXPERT : endurance + 4 nages (piscine polyvalente uniquement) ──
    if (isAdv && shouldUsePoolIMBlock(goal)) {
      const vp = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;
      const WARM = 500, COOL = 200, avail = dist - WARM - COOL;
      const echu = `200m crawl + 100m dos + 100m brasse + 4×25m papillon, 20" récup`;
      const repL  = Math.min(8*P, 400);
      const repM2 = Math.min(6*P, 300);
      const repS  = Math.min(4*P, 200);
      const nL    = Math.max(3, Math.min(8, Math.floor(avail * 0.72 / repL)));
      const nM2   = Math.max(4, Math.min(10, Math.floor(avail * 0.72 / repM2)));
      const nS2   = Math.max(6, Math.min(14, Math.floor(avail * 0.72 / repS)));
      const nActif = Math.max(2, Math.min(6, Math.round(avail * 0.18 / (2*P))));
      const imRep = 4*P;
      const nIM   = Math.max(3, Math.min(6, Math.floor(avail * 0.65 / imRep)));
      return {
        type: "ENDURANCE",
        ...[
          {
            title: "Fond en séries",
            intensity: "Allure confortable, tiens sur la durée",
            details: [
              `Échauffement : ${echu}`,
              `${nL}×${repL}m crawl, ${dep(repL, lvl, 'easy')}, allure régulière, respiration 3 temps`,
              `${nActif}×${2*P}m dos + brasse alternance, 15" récup, récupération active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Pyramide aérobie",
            intensity: "Régulier de bout en bout",
            details: [
              `Échauffement : ${echu}`,
              `${2*P}–${4*P}–${6*P}–${4*P}–${2*P}m crawl, 15" récup entre paliers, même effort à la montée et à la descente`,
              `${nActif}×${2*P}m pull buoy, 15" récup, bras seuls, relâche les jambes`,
              `Retour calme : 200m dos`,
            ],
          },
          {
            title: "Négatifs splits",
            intensity: "2e moitié plus vite que la 1re",
            details: [
              `Échauffement : ${echu}`,
              `${nM2}×${repM2}m crawl, ${dep(repM2, lvl, 'easy')}, 1re moitié retiens-toi, 2e moitié accélère`,
              `${nActif}×${2*P}m dos, 15" récup, récupération active, rotation consciente`,
              `Retour calme : 200m dos`,
            ],
          },
          {
            title: "Longue distance",
            intensity: "Z2, reps longues, gestion mentale",
            details: [
              `Échauffement : ${echu}`,
              `${nL}×${repL}m crawl, ${dep(repL, lvl, 'easy')}, allure maîtrisée sur la totalité, sans relâche en fin de rep`,
              `${nActif}×${2*P}m 4 nages, 15" récup, dos puis brasse en alternance`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Alternée 4 nages",
            intensity: "Polyvalence, endurance toutes nages",
            details: [
              `Échauffement : ${echu}`,
              `${nIM}×${imRep}m en rotation : dos · brasse · crawl, 15" récup, 1 nage par rep, 1 tour complet = 3 reps`,
              `${nActif}×${imRep}m 4 nages (${P}m papillon + ${P}m dos + ${P}m brasse + ${P}m crawl), 30" récup`,
              `Retour calme : 200m dos lent`,
            ],
          },
        ][vp],
      };
    }

    const isDiplome   = goal === "bnssa" || goal === "bpjeps_aan" || goal === "tests_pompiers" || goal === "caepmns";
    const isBNSSA     = goal === "bnssa" || goal === "tests_pompiers" || goal === "caepmns";
    const isTriathlon = isTriathlonGoal(goal);
    const isOpenWater = isOpenWaterGoal(goal);

    const vp  = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;
    const r3  = Math.min(12*P, 300);
    const r2  = Math.min(8*P, 200);
    const r1  = Math.min(4*P, 100);
    const nR3   = Math.max(3, Math.min(7, Math.round(dist * 0.55 / r3)));
    const nR2   = Math.max(4, Math.min(10, Math.round(dist * 0.55 / r2)));
    const nFill = Math.max(2, Math.min(8, Math.round(dist * 0.18 / r1)));
    const rLong = Math.min(16*P, 400);
    const nLong = Math.max(2, Math.min(5, Math.round(dist * 0.55 / rLong)));

    // ── DIPLÔME : séances orientées examen ──────────────────────────────
    if (isDiplome) {
      const n400 = Math.max(2, Math.min(5, Math.round(dist * 0.55 / 400)));
      const n100 = Math.max(4, Math.min(10, Math.round(dist * 0.50 / 100)));
      const nFdDip = Math.max(2, Math.min(6, Math.round((dist - 300) * 0.20 / (2*P))));
      return {
        type: "ENDURANCE",
        ...[
          {
            title: isBNSSA ? "Endurance + simulation sauvetage" : "Blocs 400m, gestion d'allure",
            intensity: isBNSSA ? "Régulier + explosif court" : "Endurance, vise l'allure exam (≈1'55\"/100m)",
            details: isBNSSA ? [
              `Échauffement : 200m crawl + 100m dos`,
              `${n100}×100m crawl, R30", allure régulière`,
              `${Math.max(4, Math.round(n100 * 0.4))}×${2*P}m palmes + tuba, R20"`,
              `Apnée : 6×15m, R1'30", immersion complète`,
              `Simulation : 25m vite → sortie eau → récup 1', ×3`,
              `Retour calme : 100m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 50m jambes`,
              `${n400}×400m NL, R1'30", vise le même temps à chaque rep, gère depuis le 1er mètre (objectif < 7'40")`,
              `${nFdDip}×${2*P}m dos, R15", récup active`,
              `Retour calme : 100m dos lent`,
            ],
          },
          {
            title: isBNSSA ? "100m répétés, objectif exam" : "Montée en distance vers 400m",
            intensity: isBNSSA ? "Efforts soutenus sur 100m" : "Accumulation progressive",
            details: isBNSSA ? [
              `Échauffement : 200m crawl + 100m dos`,
              `${n100}×100m NL, R30", allure stable, chaque rep identique`,
              `1 simulation chrono : 100m NL à fond, objectif < 1'35"`,
              `Retour calme : 100m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos`,
              `200m NL R30" → 300m NL R40" → 400m NL R1'30", même allure par 100m à chaque palier`,
              `${nFdDip}×${2*P}m dos, R15"`,
              `Retour calme : 100m dos lent`,
            ],
          },
          {
            title: isBNSSA ? "Continuité + enchaînement sauvetage" : "3×400m NL, régularité",
            intensity: isBNSSA ? "Endurance + simulation complète" : "Même allure ×3, note tes temps",
            details: isBNSSA ? [
              `Échauffement : 200m crawl + 100m battements`,
              `4×50m NL, R15", allure régulière`,
              `Enchaînement : 25m rapide → sortie → marche 10m → rentrée → 25m rapide, ×4, R1'`,
              `200m dos ou brasse continu, récup active`,
              `Retour calme : 100m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos`,
              `3×400m NL, R2', note ton temps à chaque rep, vise la régularité`,
              `${nFdDip}×${2*P}m dos, R15"`,
              `Retour calme : 100m dos lent`,
            ],
          },
          {
            title: isBNSSA ? "Volume & résistance" : "Long fractionné",
            intensity: isBNSSA ? "Endurance continue" : "Distance longue, gestion mentale",
            details: isBNSSA ? [
              `Échauffement : 200m crawl + 100m dos`,
              `${n100}×100m NL, R25", maintiens le rythme jusqu'à la dernière rep`,
              `50m NL vite + 50m lent, ×${Math.max(2, Math.round(dist * 0.15 / 100))}, contraste d'allure`,
              `Retour calme : 100m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos`,
              `${nLong}×${rLong}m NL, R1', reps longues, gère ton allure sur la totalité`,
              `${nFdDip}×${2*P}m dos, R15"`,
              `Retour calme : 100m dos lent`,
            ],
          },
          {
            title: isBNSSA ? "Négatifs + test vitesse" : "Négatifs splits 400m",
            intensity: isBNSSA ? "Gestion d'effort + explosivité" : "2e moitié plus rapide",
            details: isBNSSA ? [
              `Échauffement : 200m crawl + 100m dos`,
              `${n100}×100m NL, R30", 1re moitié gérée, 2e moitié accélère`,
              `1×100m NL chrono, effort max, note le temps`,
              `Retour calme : 100m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos`,
              `${n400}×400m NL, R1'30", 1re moitié tranquille, 2e moitié accélère : arrive plus fort que tu n'es parti`,
              `${nFdDip}×${2*P}m dos, R15"`,
              `Retour calme : 100m dos lent`,
            ],
          },
        ][vp],
      };
    }

    // ── NAGER & PROGRESSER / TRIATHLON / EAU LIBRE ──────────────────────
    const goalCue = isTriathlon
      ? ", régularité course, imagine la bouée"
      : isOpenWater
        ? ", respiration bilatérale, compte tes cycles"
        : "";
    const vpG = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;
    const nR3b = Math.max(2, Math.min(6, Math.round(dist * 0.50 / r3)));
    const nR2b = Math.max(3, Math.min(8, Math.round(dist * 0.50 / r2)));

    return {
      type: "ENDURANCE",
      ...[
        {
          title: "Fond en séries",
          intensity: "Endurance, allure conversation",
          details: [
            `Échauffement : 200m crawl progressif + 100m battements de jambes`,
            `${nR3}×${r3}m crawl, R20", allure régulière${goalCue}`,
            `${nFill}×${r1}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Pyramide aérobie",
          intensity: "Endurance, régulier à la montée et à la descente",
          details: [
            `Échauffement : 100m crawl + 100m dos + 4×25m accélérations`,
            `${r1}m, ${r2}m, ${r3}m, ${r2}m, ${r1}m crawl, R15" entre paliers, même effort à chaque palier`,
            `${nFill}×${r1}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Arrive plus fort",
          intensity: "Endurance, 2e moitié toujours plus rapide",
          details: [
            `Échauffement : 200m crawl + 100m battements`,
            `${nR2}×${r2}m crawl, R20", 1re moitié gérée, 2e moitié accélère${goalCue}`,
            `${nFill}×${r1}m battements mains en flèche, R20", fouet des chevilles`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isOpenWater ? "Séance eau libre, test combinaison" : "Reps longues",
          intensity: isOpenWater ? "Découverte OW, flottaison, navigation, sighting" : "Endurance, gestion sur la distance",
          details: isOpenWater ? [
            `À faire en eau libre (lac, rivière calme, mer protégée)`,
            `10' d'adaptation : nage lente avec la combi, ressens la flottaison`,
            `3×5' de nage continue, récup 2', sighting toutes les 6-8 bras`,
            `Effort : allure conversation, objectif orientation`,
            `Récup : retour au départ en crawl ou dos très lent`,
          ] : [
            `Échauffement : 200m crawl + 100m dos + 4×${P}m accélérations`,
            `${nLong}×${rLong}m crawl, R15", allure maîtrisée sur la totalité${isTriathlon ? ", maintiens ton allure de compétition" : ""}`,
            `${nFill}×${r1}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isOpenWater ? "Séance eau libre, endurance" : "Crawl & dos alternés",
          intensity: isOpenWater ? "Endurance OW, tenir l'allure sans repères" : "Endurance, polyvalence, récup naturelle",
          details: isOpenWater ? [
            `À faire en eau libre`,
            `Échauffement : 10' de nage lente, teste tes repères visuels`,
            `20-30' de nage continue, sighting toutes les 8 bras, gère ton allure de A à Z`,
            `Si combi : teste les transitions (enlever la combi en 2')`,
            `Récup : 5' de crawl ou dos très lent`,
          ] : [
            `Échauffement : 200m crawl + 100m jambes`,
            `${nR2}×${r2}m crawl, R20", régulier${goalCue}`,
            `${Math.max(2, Math.round(nR2 * 0.7))}×${r2}m dos, R20", épaule sort en premier, rotation du bassin`,
            `Retour calme : 150m crawl très lent`,
          ],
        },
        {
          title: "3 blocs progressifs",
          intensity: "Endurance, chaque bloc un cran au-dessus",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            `Bloc 1 : ${nR3b}×${r3}m crawl, R25", allure confortable${goalCue}`,
            `Bloc 2 : ${nR2b}×${r2}m crawl, R20", allure normale, un cran au-dessus`,
            `Bloc 3 : ${Math.max(2, Math.round(nR2b * 0.7))}×${r2}m crawl, R15", soutenu, tiens jusqu'au bout`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isTriathlon ? "Simulation sortie de l'eau" : "Longue distance, gestion mentale",
          intensity: isTriathlon ? "Race-sim, gère l'allure de A à Z" : "Endurance, mental, tiens la distance",
          details: isTriathlon ? [
            `Échauffement : 200m crawl progressif + 100m dos`,
            `${nLong}×${rLong}m crawl, R20", nage comme si c'était ta compétition : départ maîtrisé, milieu constant, fin plus forte`,
            `${nFill}×${r1}m dos, R15", récup`,
            `Retour calme : 200m dos lent`,
          ] : [
            `Échauffement : 200m crawl + 100m dos`,
            `${Math.max(2, Math.round(dist * 0.60 / Math.min(20*P, 500)))}×${Math.min(20*P, 500)}m crawl, R30", reps très longues, gestion mentale sur la totalité`,
            `${nFill}×${r1}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        isOpenWater ? {
          title: "Prépa eau libre, crawl en bassin",
          intensity: "Endurance OW, sighting et allure tenue",
          details: [
            `Échauffement : 300m crawl progressif + 4×${P}m sighting (tête hors de l'eau tous les 6 bras)`,
            `${nR3b}×${r3}m crawl, R20", sighting tous les 8 bras, allure tenue${goalCue}`,
            `${Math.max(2, Math.round(nR2b * 0.7))}×${r2}m crawl, R20", respiration bilatérale, même allure`,
            `${nFill}×${r1}m dos, R15", récup active`,
            `Retour calme : 200m crawl très lent`,
          ],
        } : {
          title: "Endurance 3 nages",
          intensity: "Endurance, polyvalence crawl, dos, brasse",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            `${nR3b}×${r3}m crawl, R20", allure régulière`,
            `${Math.max(2, Math.round(nR2b * 0.6))}×${r2}m dos, R20", nage active, épaule qui sort`,
            `${Math.max(2, Math.round(nR2b * 0.5))}×${r2}m brasse, R20", coulée longue après chaque traction`,
            `Retour calme : 100m dos lent`,
          ],
        },
      ][vpG],
    };
  },

  // ── SEUIL ────────────────────────────────────────────────────────────────
  // 5 variants : CSS, pyramide, blocs T-pace, séries descendantes, over-distance
  seuil: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const isDecouverte = level === "découverte";
    const isBeg = level === "beginner" || level === "régulier" || isDecouverte;
    const isAdv = level === "advanced" || level === "performance";
    const P = pool, lvl = getLvlIndex(level);
    const v = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;

    // ── DÉCOUVERTE : pas de "seuil" au sens technique, juste "un peu plus vite" ──
    if (isDecouverte) {
      const nLaps = Math.max(2, Math.round(dist / (2 * P)));
      const vd = (Math.floor(weekIdx / 8) * 3 + (weekIdx % 8)) % 3;
      return {
        type: "ENDURANCE",
        ...[
          {
            title: "Un peu plus vite aujourd'hui",
            intensity: "Facile/Modéré, légèrement plus vite que d'habitude",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.4))}× ${2*P}m crawl à ton rythme, repose 30"`,
              `${Math.max(2, Math.round(nLaps * 0.4))}× ${2*P}m crawl un cran plus vite, repose 30", tu dois sentir l'effort sans souffrir`,
              `Fin : ${P}m dos lent pour récupérer`,
            ],
          },
          {
            title: "Accélération progressive",
            intensity: "Facile → Modéré, monte en puissance",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl lent, repose 25"`,
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl rythme normal, repose 25"`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m crawl à fond (courtes), repose 40"`,
              `Fin : ${P}m dos`,
            ],
          },
          {
            title: "Intervalles simples",
            intensity: "Modéré, effort, repos, effort",
            details: [
              `${Math.max(3, Math.round(nLaps * 0.5))}× ${2*P}m crawl, repose 40", nage à une allure qui "pique" légèrement`,
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${P}m dos, repose 20", récupération active`,
              `Fin : ${P}m crawl lent`,
            ],
          },
        ][vd],
      };
    }

    // ── RÉGULIER : seuil simplifié, 8 variants progressifs ──────────────────
    if (isBeg) {
      const nLaps = Math.max(3, Math.round(dist / (2 * P)));
      const nS  = Math.max(3, Math.round(nLaps * 0.65));
      const nSp = Math.max(5, Math.round(nLaps * 0.70));
      const nT  = Math.max(2, Math.round(nLaps * 0.55));
      const vb  = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;
      return {
        type: "SEUIL",
        ...[
          {
            title: "Un cran au-dessus",
            intensity: "Modéré, effort qui pousse sans être à fond",
            details: [
              `Échauffement : ${2*P}m crawl lent + ${P}m dos`,
              `${nS}× ${2*P}m crawl, repose 30", allure soutenue, tu dois sentir l'effort sans souffrir`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m dos, récup douce`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
          {
            title: "Montée en puissance",
            intensity: "Progressif, chaque bloc plus fort que le précédent",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.28))}× ${2*P}m crawl lent, repose 20"`,
              `${Math.max(2, Math.round(nLaps * 0.28))}× ${2*P}m crawl rythme normal, repose 25"`,
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl soutenu, repose 35"`,
              `Fin : ${P}m très lent`,
            ],
          },
          {
            title: "Effort/récup alternés",
            intensity: "Modéré, sandwichs effort + récup",
            details: [
              `Échauffement : ${2*P}m crawl`,
              `Répète ${Math.max(3, Math.round(nLaps * 0.5))} fois : ${2*P}m crawl soutenu + ${P}m dos lent`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m crawl confort, récup finale`,
              `Fin : ${P}m dos`,
            ],
          },
          {
            title: "Longueurs rapides",
            intensity: "Vif, chaque longueur à 80% de ton max",
            details: [
              `Échauffement : ${2*P}m crawl tranquille`,
              `${nSp}× ${P}m crawl, repose 30", pousse à chaque longueur, récup complète entre`,
              `${Math.max(2, Math.round(nLaps * 0.2))}× ${2*P}m dos, récup`,
              `Fin : ${P}m lent`,
            ],
          },
          {
            title: "Tempo continu",
            intensity: "Soutenu, même allure du début à la fin",
            details: [
              `Échauffement : ${2*P}m crawl lent`,
              `${nT}× ${3*P}m crawl à allure soutenue, repose 40", garde le même rythme du 1er au dernier`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m dos, récup active`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
          {
            title: "Pyramide soutenue",
            intensity: "Modéré, distances courtes à soutenu, longues à normal",
            details: [
              `Échauffement : ${2*P}m crawl`,
              `${P}m soutenu R25" · ${2*P}m normal R30" · ${3*P}m normal R35" · ${2*P}m soutenu R30" · ${P}m à fond R45"`,
              `${Math.max(1, Math.round(nLaps * 0.15))}× ${2*P}m dos, récup douce`,
              `Fin : ${P}m lent`,
            ],
          },
          {
            title: "Séries qui descendent",
            intensity: "Vif, chaque série un peu plus rapide",
            details: [
              `Échauffement : ${2*P}m crawl lent + ${P}m dos`,
              `${nS}× ${2*P}m crawl, repose 30", vise 2" de mieux à chaque rep : 1re conservatrice, dernière à fond`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m dos, récup`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
          {
            title: "Séances 100m, objectif constant",
            intensity: "Modéré/soutenu, même effort sur chaque 100m",
            details: [
              `Échauffement : ${2*P}m crawl + ${P}m dos`,
              `${Math.max(5, Math.round(nLaps * 0.65))}× ${2*P}m crawl, repose 25", allure soutenue identique à chaque rep, note si tu tiens`,
              `${Math.max(1, Math.round(nLaps * 0.18))}× ${2*P}m dos, récup`,
              `Fin : ${P}m crawl lent`,
            ],
          },
        ][vb],
      };
    }

    // ── PERFORMANCE / EXPERT : seuil + 4 nages (piscine polyvalente uniquement) ──
    if (isAdv && shouldUsePoolIMBlock(goal)) {
      const vp = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;
      const WARM = 500, COOL = 200, avail = dist - WARM - COOL;
      const echu = `200m crawl + 100m dos + 100m brasse + 4×25m papillon, 20" récup`;
      const cssRep = Math.min(4*P, 200);
      const nCSS   = Math.max(6, Math.min(14, Math.floor(avail * 0.65 / cssRep)));
      const nFin   = Math.max(2, Math.min(6, Math.round(Math.max(0, avail - nCSS*cssRep) / (2*P))));
      const nBloc  = Math.max(3, Math.min(5, Math.floor(avail * 0.60 / (4*cssRep))));
      const nSprSeuil = Math.max(4, Math.min(8, Math.round(avail * 0.30 / cssRep)));
      const nRecupIM  = Math.max(2, Math.min(4, Math.round(avail * 0.20 / (2*P))));
      const overRep   = Math.min(8*P, 400);
      const nOver     = Math.max(3, Math.min(6, Math.floor(avail * 0.65 / overRep)));
      return {
        type: "SEUIL",
        ...[
          {
            title: "CSS, allure critique",
            intensity: "Seuil, effort soutenu et constant",
            details: [
              `Échauffement : ${echu}`,
              `${nCSS}×${cssRep}m crawl, ${dep(cssRep, lvl, 'threshold')}, allure 1500m, régularité absolue`,
              `${nFin}×${2*P}m 4 nages, 15" récup, dos puis brasse en alternance`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Pyramide seuil",
            intensity: "Intensité croissante puis décroissante",
            details: [
              `Échauffement : ${echu}`,
              `${2*P}–${4*P}–${6*P}–${4*P}–${2*P}m crawl, 20" récup entre paliers, allure seuil à chaque palier`,
              `${nRecupIM}×${4*P}m 4 nages (${P}m par nage), 25" récup, récupération active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Blocs compétition",
            intensity: "Z4, allure race, séries courtes",
            details: [
              `Échauffement : ${echu}`,
              `${nBloc}×(4×${cssRep}m crawl, 10" intra), 1' entre blocs, allure compétition, régularité absolue`,
              `${nSprSeuil}×${P}m sprint, 45" récup, terminer par des sprints pour activer les fibres rapides`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Séries descendantes",
            intensity: "Patient au départ, explosif à l'arrivée",
            details: [
              `Échauffement : ${echu}`,
              `${nCSS}×${cssRep}m crawl, ${dep(cssRep, lvl, 'threshold')}, vise −1 à 2s de mieux à chaque rep`,
              `${nFin}×${2*P}m dos, 15" récup, récup active entre les blocs`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Over-distance seuil",
            intensity: "Légèrement sous le seuil, travaille la résistance",
            details: [
              `Échauffement : ${echu}`,
              `${nOver}×${overRep}m crawl, ${dep(overRep, lvl, 'threshold')}, distance supérieure à tes reps CSS, allure légèrement conservatrice`,
              `${nRecupIM}×${4*P}m 4 nages (${P}m par nage), 25" récup, polyvalence active`,
              `Retour calme : 200m dos lent`,
            ],
          },
        ][vp],
      };
    }

    const isDiplomeS   = goal === "bnssa" || goal === "bpjeps_aan" || goal === "tests_pompiers" || goal === "caepmns";
    const isBNSSAS     = goal === "bnssa" || goal === "tests_pompiers" || goal === "caepmns";
    const isTriathlon  = isTriathlonGoal(goal);
    const isOpenWater  = isOpenWaterGoal(goal);

    const vp  = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;
    const r2S = Math.min(8*P, 200);
    const r3S = Math.min(12*P, 300);
    const nR2S   = Math.max(4, Math.min(10, Math.round(dist * 0.60 / r2S)));
    const nR3S   = Math.max(3, Math.min(8, Math.round(dist * 0.60 / r3S)));
    const nFillS = Math.max(2, Math.min(8, Math.round(dist * 0.15 / (2*P))));

    // ── DIPLÔME : séances orientées examen ──────────────────────────────
    if (isDiplomeS) {
      const n400S = Math.max(2, Math.min(5, Math.round(dist * 0.60 / 400)));
      const n100S = Math.max(4, Math.min(10, Math.round(dist * 0.55 / 100)));
      const n4N   = Math.max(3, Math.round(dist * 0.55 / (4*P)));
      return {
        type: "SEUIL",
        ...[
          {
            title: isBNSSAS ? "Effort soutenu, allure 100m exam" : "Séries 400m, allure exam",
            intensity: isBNSSAS ? "Soutenu, objectif < 1'35\" sur 100m" : "Soutenu, vise < 7'40\" sur 400m",
            details: isBNSSAS ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n100S}×100m NL, R30", allure soutenue, objectif exam < 1'35" à chaque rep`,
              `${nFillS}×${2*P}m dos, R15", récup active`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n400S}×400m NL, R1'30", allure cible exam : ≈ 1'55"/100m, régularité absolue`,
              `${nFillS}×${2*P}m dos, R15", récup active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAS ? "Pyramide 50→100→50m" : "Pyramide 100→200→300→200→100m",
            intensity: "Effort soutenu à chaque palier",
            details: isBNSSAS ? [
              `Échauffement : 200m crawl + 100m dos`,
              `50m NL R20", 100m NL R30", 50m NL R20", ×${Math.max(2, Math.round((dist - 300) / 200))}, même effort par palier`,
              `${nFillS}×${2*P}m dos, R15"`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos`,
              `100m, 200m, 300m, 200m, 100m NL, R20" entre paliers, allure soutenue à chaque palier`,
              `${nFillS}×${2*P}m dos, R15"`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAS ? "Blocs intenses, récup active" : "Blocs à allure soutenue",
            intensity: "Effort net, inconfortable mais contrôlé",
            details: isBNSSAS ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
              `${n100S}×100m NL, R25", effort soutenu, maintiens sur toutes les reps`,
              `${nFillS}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${nR2S}×${r2S}m NL, R20", allure soutenue, effort maintenu sur toutes les reps`,
              `${nFillS}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAS ? "Séries descendantes, 100m" : "Séries descendantes",
            intensity: "Patient au départ, plus fort à la fin",
            details: isBNSSAS ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n100S}×100m NL, R25", vise 2" de mieux à chaque rep : 1re conservatrice, dernière à fond`,
              `${nFillS}×${2*P}m dos, R15"`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${nR2S}×${r2S}m NL, R20", vise 2" de mieux à chaque rep : 1re conservatrice, dernière à fond`,
              `${nFillS}×${2*P}m dos, R15"`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAS ? "4 nages soutenu" : "Blocs 4 nages, seuil polyvalent",
            intensity: "Effort soutenu toutes nages",
            details: [
              `Échauffement : 200m crawl + 100m dos`,
              `${n4N}×${4*P}m 4 nages (${P}m par nage), R30", allure soutenue à chaque nage`,
              `${nFillS}×${2*P}m dos, R15"`,
              `Retour calme : 200m dos lent`,
            ],
          },
        ][vp],
      };
    }

    // ── NAGER & PROGRESSER / TRIATHLON / EAU LIBRE ──────────────────────
    const goalCueS = isTriathlon
      ? ", allure nage triathlon, régularité absolue"
      : isOpenWater
        ? ", respiration bilatérale, même effort de bout en bout"
        : "";
    const vpGS = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;
    const nR2Sb = Math.max(3, Math.min(8, Math.round(dist * 0.55 / r2S)));
    const nR3Sb = Math.max(2, Math.min(6, Math.round(dist * 0.55 / r3S)));
    const r1S   = Math.min(4*P, 100);

    return {
      type: "SEUIL",
      ...[
        {
          title: "Séries à allure soutenue",
          intensity: "Effort soutenu, inconfortable mais contrôlé",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nR2S}×${r2S}m crawl, R20", allure soutenue, chaque rep identique${goalCueS}`,
            `${nFillS}×${2*P}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Pyramide seuil",
          intensity: "Effort croissant puis décroissant",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            `${r1S}m, ${r2S}m, ${r3S}m, ${r2S}m, ${r1S}m crawl, R20" entre paliers, soutenu à chaque palier`,
            `${nFillS}×${2*P}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Tiens sur la distance",
          intensity: "Endurance soutenue, même rythme de bout en bout",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nR3S}×${r3S}m crawl, R20", allure soutenue, identique du 1er au dernier${goalCueS}`,
            `${nFillS}×${2*P}m dos, R20", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Séries descendantes",
          intensity: "Patient au départ, plus fort rep après rep",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nR2S}×${r2S}m crawl, R20", vise 2" de mieux à chaque rep : 1re conservatrice, dernière à fond`,
            `${nFillS}×${2*P}m dos, R15", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isOpenWater ? "Blocs eau libre, effort continu" : "Récup courte, corps qui enchaîne",
          intensity: "Endurance soutenue, récup courte",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            isOpenWater
              ? `${nR3S}×${r3S}m NL, R15", soutenu de bout en bout, respiration bilatérale régulière`
              : `${nR3S}×${r3S}m crawl, R15", effort soutenu, récup courte : ton corps s'adapte à enchaîner`,
            `${nFillS}×${2*P}m dos, R20"`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "3 blocs, chaque bloc plus fort",
          intensity: "Progressif, soutenu qui monte",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            `Bloc 1 : ${nR3Sb}×${r3S}m crawl, R25", allure confortable soutenue`,
            `Bloc 2 : ${nR2Sb}×${r2S}m crawl, R20", monte d'un cran`,
            `Bloc 3 : ${Math.max(2, Math.round(nR2Sb * 0.7))}×${r2S}m crawl, R15", soutenu, tiens jusqu'au bout`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isTriathlon ? "Simulation allure triathlon" : "Tempo 3×5 minutes",
          intensity: isTriathlon ? "Race-sim, reproduis l'effort de compétition" : "Soutenu continu, 3 blocs de 5 min",
          details: isTriathlon ? [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `3×(${Math.max(2, Math.round(dist * 0.18 / r3S))}×${r3S}m crawl, R15"), 1'30" entre blocs, allure race, régularité absolue`,
            `${nFillS}×${2*P}m dos, R15"`,
            `Retour calme : 200m dos lent`,
          ] : [
            `Échauffement : 200m crawl + 100m dos`,
            `3 blocs de 5' de nage continue à allure soutenue, récup 1'30" entre blocs, même allure sur les 3`,
            `${nFillS}×${2*P}m dos, R20"`,
            `Retour calme : 200m dos lent`,
          ],
        },
        isOpenWater ? {
          title: "Seuil crawl, allure tenue",
          intensity: "Soutenu, prépa eau libre en bassin",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×${P}m accélérations`,
            `${nR2S}×${r2S}m crawl, ${dep(r2S, lvl, 'threshold')}, allure tenue, sighting tous les 8 bras`,
            `${nFillS}×${2*P}m dos, R20"`,
            `Retour calme : 200m dos lent`,
          ],
        } : {
          title: "Seuil 4 nages, polyvalence",
          intensity: "Soutenu toutes nages, crawl, dos, brasse en rotation",
          details: [
            `Échauffement : 200m crawl + 100m dos`,
            `${Math.max(3, Math.round(dist * 0.55 / (4*P)))}×${4*P}m IM (${P}m crawl + ${P}m dos + ${P}m brasse + ${P}m crawl), R30", soutenu à chaque nage`,
            `${nFillS}×${2*P}m dos, R20"`,
            `Retour calme : 200m dos lent`,
          ],
        },
      ][vpGS],
    };
  },

  // ── VITESSE ──────────────────────────────────────────────────────────────
  // 5 variants par niveau
  vitesse: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const isDecouverte = level === "découverte";
    const isBeg = level === "beginner" || level === "régulier" || isDecouverte;
    const isAdv = level === "advanced" || level === "performance";
    const P = pool, lvl = getLvlIndex(level);
    const v = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;

    // ── DÉCOUVERTE : "sprints ludiques", courtes longueurs fun ───────────
    if (isDecouverte) {
      const nLaps = Math.max(2, Math.round(dist / (2 * P)));
      const vd = weekIdx % 3;
      return {
        type: "VITESSE",
        ...[
          {
            title: "Course contre toi-même",
            intensity: "Fun, sprint sur une longueur, récup complète",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl lent, repose 20", mise en jambes`,
              `${Math.max(4, Math.round(nLaps * 0.4))}× ${P}m sprint (une longueur à fond), repose 45", qualité, pas quantité`,
              `Fin : ${2*P}m dos calme`,
            ],
          },
          {
            title: "Accélérations fun",
            intensity: "Modéré → rapide, décollage sur chaque longueur",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl tranquille, repose 25"`,
              `${Math.max(4, Math.round(nLaps * 0.5))}× ${2*P}m : 1re longueur normale + 2e longueur à fond, repose 40"`,
              `Fin : ${P}m dos pour souffler`,
            ],
          },
          {
            title: "Départ aux murs",
            intensity: "Fun, explosivité au départ de chaque longueur",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl pour te chauffer`,
              `${Math.max(4, Math.round(nLaps * 0.45))}× ${P}m : pousse fort du mur + nage à fond, repose 40", visualise que tu dépasses quelqu'un`,
              `${Math.max(2, Math.round(nLaps * 0.2))}× ${2*P}m dos calme, récupération`,
            ],
          },
        ][vd],
      };
    }

    // ── RÉGULIER : 8 variants de vitesse, fun et accessibles ───────────────
    if (isBeg) {
      const nLaps = Math.max(4, Math.round(dist / (2 * P)));
      const nSpr  = Math.max(4, Math.round(nLaps * 0.45));
      const nAcc  = Math.max(4, Math.round(nLaps * 0.50));
      const vb    = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;
      return {
        type: "VITESSE",
        ...[
          {
            title: "Accélérations fun",
            intensity: "Modéré → rapide, décollage sur la 2e longueur",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl tranquille, mise en jambes`,
              `${nAcc}× ${2*P}m : 1re longueur normale + 2e longueur à fond, repose 40", sens la différence`,
              `Fin : ${Math.max(2, Math.round(nLaps * 0.2))}× ${2*P}m dos calme`,
            ],
          },
          {
            title: "Course contre toi-même",
            intensity: "Fun, sprint une longueur, récup complète",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl lent, mise en jambes`,
              `${nSpr}× ${P}m sprint à fond, repose 45", qualité, pas quantité`,
              `Fin : ${Math.max(2, Math.round(nLaps * 0.2))}× ${2*P}m dos calme`,
            ],
          },
          {
            title: "Départ aux murs",
            intensity: "Fun, explosivité sur chaque départ",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.28))}× ${2*P}m crawl tranquille`,
              `${nSpr}× ${P}m : pousse fort du mur + nage à fond, repose 40", visualise que tu dépasses quelqu'un`,
              `${Math.max(2, Math.round(nLaps * 0.2))}× ${2*P}m dos calme`,
            ],
          },
          {
            title: "Sprints crawl & dos",
            intensity: "Varié, aller vite dans les deux nages",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl tranquille`,
              `${Math.max(3, Math.round(nLaps * 0.32))}× ${P}m crawl sprint, repose 40"`,
              `${Math.max(3, Math.round(nLaps * 0.32))}× ${P}m dos sprint, repose 40", bras larges, propulsion max`,
              `Fin : ${P}m crawl lent`,
            ],
          },
          {
            title: "Jeu de rythme",
            intensity: "Ludique, alterne lent et rapide",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl doux`,
              `${Math.max(4, Math.round(nLaps * 0.52))}× ${2*P}m : 1re moitié lente + 2e moitié sprint, repose 35"`,
              `Fin : ${Math.max(2, Math.round(nLaps * 0.15))}× ${2*P}m dos calme`,
            ],
          },
          {
            title: "Pyramide de vitesse",
            intensity: "Progressif, plus c'est court, plus c'est vite",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl tranquille`,
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl vif, repose 35"`,
              `${Math.max(3, Math.round(nLaps * 0.30))}× ${P}m crawl sprint, repose 40"`,
              `Fin : ${Math.max(2, Math.round(nLaps * 0.18))}× ${2*P}m dos calme`,
            ],
          },
          {
            title: "Ton chrono perso",
            intensity: "Compétition avec toi-même, note et bats ton record",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl pour te chauffer`,
              `${Math.max(3, Math.round(nLaps * 0.4))}× ${2*P}m crawl à fond, repose 1', chronomètre chaque rep, essaie de faire mieux que la précédente`,
              `Fin : ${Math.max(2, Math.round(nLaps * 0.15))}× ${2*P}m dos très lent`,
            ],
          },
          {
            title: "Sprint-récup-sprint",
            intensity: "Explosif, effort max, récup dos, rebelote",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.25))}× ${2*P}m crawl tranquille`,
              `Répète ${Math.max(4, Math.round(nLaps * 0.4))} fois : ${P}m sprint à fond + ${P}m dos lent, repose 20" après chaque paire`,
              `Fin : ${P}m crawl très lent`,
            ],
          },
        ][vb],
      };
    }

    // ── PERFORMANCE / EXPERT : vitesse + 4 nages (piscine polyvalente uniquement) ──
    if (isAdv && shouldUsePoolIMBlock(goal)) {
      const vp = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 5;
      const WARM = 500, COOL = 200, avail = dist - WARM - COOL;
      const echu = `200m crawl + 100m dos + 100m brasse + 4×25m papillon, 20" récup`;
      const nSpr   = Math.max(6, Math.min(12, Math.round(avail * 0.55 / P)));
      const nIM4   = Math.max(4, Math.min(10, Math.floor(avail * 0.50 / (2*P))));
      const nSpr4  = Math.max(4, Math.min(8, Math.round(avail * 0.30 / P)));
      const nPap   = Math.max(4, Math.min(8, Math.round(avail * 0.25 / P)));
      const nBuild = Math.max(4, Math.min(10, Math.floor(avail * 0.55 / (2*P))));
      const nRecup = Math.max(2, Math.min(6, Math.round(avail * 0.20 / (2*P))));
      return {
        type: "VITESSE",
        ...[
          {
            title: "Sprints maximaux",
            intensity: "Sprint total, récup complète",
            details: [
              `Échauffement : ${echu}`,
              `${nSpr}×${P}m sprint crawl, R1', qualité absolue, chaque longueur comme si c'était la seule`,
              `${nRecup}×${2*P}m dos + brasse alternance, 20" récup, récupération active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Vitesse 4 nages",
            intensity: "Explosivité, toutes nages en rotation",
            details: [
              `Échauffement : ${echu}`,
              `${nIM4}×${2*P}m en rotation dos · brasse · crawl, 40" récup, 1 nage par rep, sprint à chaque`,
              `${nPap}×${P}m papillon, R2', ondulation hanches, récup complète, qualité absolue`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Puissance 4 nages",
            intensity: "Puissance, palettes + sprint mains nues",
            details: [
              `Échauffement : ${echu}`,
              `${nIM4}×${2*P}m palettes + pull buoy, 20" récup, coude haut, pression max sur les paumes`,
              `${nSpr4}×${P}m sprint mains nues, R1', reproduis la prise d'eau des palettes, engage l'avant-bras`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Accélérations construites",
            intensity: "Montée en puissance progressive",
            details: [
              `Échauffement : ${echu}`,
              `${nBuild}×${2*P}m crawl, ${dep(2*P, lvl, 'threshold')}, 1re moitié Z2, 2e moitié accélère à 95%`,
              `${nSpr4}×${P}m sprint 4 nages rotation, R1', 1 nage par sprint, rotation complète`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: "Départs & explosivité",
            intensity: "Z5/Z6, explosivité maximale",
            details: [
              `Échauffement : ${echu}`,
              `${nPap}×${P}m papillon, R2', ondulation pure, 3 coups de bras max, stop si la forme se dégrade`,
              `${nSpr}×${P}m sprint crawl départ mur, R1', pousse fort, torpille gainée, 3 premiers bras à fond`,
              `Retour calme : 200m dos lent`,
            ],
          },
        ][vp],
      };
    }

    const isDiplomeV   = goal === "bnssa" || goal === "bpjeps_aan" || goal === "tests_pompiers" || goal === "caepmns";
    const isBNSSAV     = goal === "bnssa" || goal === "tests_pompiers" || goal === "caepmns";
    const isTriathlonV = isTriathlonGoal(goal);
    const isOpenWaterV = isOpenWaterGoal(goal);

    const WARMV = 300, COOLV = 200, availV = dist - WARMV - COOLV;
    const nSprV = Math.max(6, Math.min(10, Math.round(availV * 0.5 / P)));
    const nSecV = Math.max(2, Math.min(8, Math.round(Math.max(0, availV - nSprV*P) / (2*P))));
    const nBldV = Math.max(4, Math.min(10, Math.floor(availV * 0.6 / (2*P))));
    const nKckV = Math.max(2, Math.min(8, Math.round(Math.max(0, availV - nBldV*(2*P)) / (2*P))));
    const n4NV  = Math.max(4, Math.round(availV * 0.45 / (4*P)));

    // ── DIPLÔME : séances orientées examen ──────────────────────────────
    if (isDiplomeV) {
      const n50V  = Math.max(6, Math.min(14, Math.round(availV * 0.5 / P)));
      const n100V = Math.max(4, Math.min(10, Math.round(availV * 0.5 / (2*P))));
      return {
        type: "VITESSE",
        ...[
          {
            title: isBNSSAV ? "Sprints 50m, construis ta vitesse" : "Accélérations, vitesse sur 100m",
            intensity: isBNSSAV ? "Sprint, qualité sur chaque longueur" : "Allure rapide, vise < 1'55\"/100m",
            details: isBNSSAV ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
              `${n50V}×${P}m sprint crawl, R1', effort max à chaque longueur, récup complète`,
              `${nSecV}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n100V}×${2*P}m NL soutenu, R1', effort fort sur chaque rep, récup complète`,
              `${nSecV}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAV ? "Accélérations progressives" : "Montée en vitesse",
            intensity: "Arrive plus vite que tu n'es parti",
            details: isBNSSAV ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n50V}×${P}m crawl, R45", 1re moitié modérée, 2e moitié à fond`,
              `${nSecV}×${2*P}m dos, R20"`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${nBldV}×${2*P}m NL, R45", 1re moitié soutenue, 2e moitié à fond`,
              `${nKckV}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAV ? "Départs eau + sprint" : "Vitesse 4 nages",
            intensity: isBNSSAV ? "Explosivité départ" : "Sprint toutes nages",
            details: isBNSSAV ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
              `Départs eau : pousse le mur, torpille 3m, sprint ${P}m, R1'30", ×${n50V}, qualité de départ`,
              `${nSecV}×${2*P}m dos, R20"`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 50m jambes`,
              `${n4NV}×${4*P}m 4 nages (${P}m par nage), R30", vite à chaque nage, récup complète`,
              `${nSprV}×${P}m sprint crawl, R1', qualité absolue`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAV ? "100m chrono, test exam" : "Blocs vitesse, effort total",
            intensity: isBNSSAV ? "Effort maximal, chrono" : "Sprint répété, récup complète",
            details: isBNSSAV ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${n100V}×100m NL, R1', effort max, note chaque chrono, objectif < 1'35"`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${nSprV}×${P}m sprint, R1', effort total à chaque longueur, récup complète`,
              `${nSecV}×${2*P}m dos, R20", récup active`,
              `Retour calme : 200m dos lent`,
            ],
          },
          {
            title: isBNSSAV ? "Sprints + 4 nages" : "Explosivité & relâche",
            intensity: "Vitesse et polyvalence",
            details: isBNSSAV ? [
              `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
              `${n50V}×${P}m sprint crawl, R1', qualité, pas quantité`,
              `${Math.max(2, Math.round(availV * 0.25 / (4*P)))}×${4*P}m 4 nages, R30", transition rapide entre nages`,
              `Retour calme : 200m dos lent`,
            ] : [
              `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
              `${nSprV}×${P}m sprint crawl, R1', pousse fort le mur, 1ers bras à fond`,
              `${nSecV}×${2*P}m NL lent, R20", récup totale entre les sprints`,
              `Retour calme : 200m dos lent`,
            ],
          },
        ][v],
      };
    }

    // ── NAGER & PROGRESSER / TRIATHLON / EAU LIBRE ──────────────────────
    const goalCueV = isTriathlonV
      ? ", simule ton départ de compétition, bras à fond dès la 1re foulée"
      : isOpenWaterV
        ? ", explosivité de départ, enclenche tes bras rapidement"
        : "";
    const vG = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 8;

    return {
      type: "VITESSE",
      ...[
        {
          title: "Sprints, récup complète",
          intensity: "Sprint, qualité absolue",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nSprV}×${P}m sprint crawl, R1', effort total à chaque longueur${goalCueV}`,
            `${nSecV}×${2*P}m dos, R20", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Accélérations progressives",
          intensity: "Montée en puissance sur chaque rep",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nBldV}×${2*P}m crawl, R45", 1re moitié soutenue, 2e moitié à fond`,
            `${nKckV}×${2*P}m dos, R20", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isTriathlonV ? "Sprints sortie eau, transition" : "Vitesse + récup dos",
          intensity: isTriathlonV ? "Explosivité transition" : "Sprint + récupération active",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
            isTriathlonV
              ? `${nSprV}×${P}m sprint crawl, R1', simule ta sortie eau : bras à fond sans hésiter au départ`
              : `${nSprV}×${P}m sprint crawl, R1', qualité absolue`,
            `${nSecV}×${2*P}m dos, R20", récup active en nageant`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Vitesse 4 nages",
          intensity: "Explosivité, toutes nages en rotation",
          details: [
            `Échauffement : 200m crawl + 100m dos + 50m jambes`,
            `${n4NV}×${4*P}m 4 nages (${P}m par nage), R30", sprint à chaque nage`,
            `${nSprV}×${P}m sprint crawl, R1', qualité totale`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isOpenWaterV ? "Départs, eau libre" : "Départs & explosivité",
          intensity: "Explosivité maximale",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            isOpenWaterV
              ? `${nSprV}×${P}m sprint NL, R1'30", pousse fort le mur, enchaîne les premiers bras sans hésitation`
              : `${nSprV}×${P}m sprint crawl départ mur, R1', pousse fort, torpille gainée, 1ers bras à fond`,
            `${nSecV}×${2*P}m dos, R20", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Séries descendantes",
          intensity: "Chaque rep plus rapide, progressif jusqu'au max",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `${nSprV}×${P}m crawl, R1', vise 1" de mieux à chaque rep : 1re à ~80%, dernière à fond`,
            `${nSecV}×${2*P}m dos, R20", récup active`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: isTriathlonV ? "Simulation départ triathlon" : "Sprint-dos-sprint",
          intensity: isTriathlonV ? "Race-sim, explosivité de compétition" : "Explosif, récup dos entre sprints",
          details: isTriathlonV ? [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `3×(${Math.max(2, Math.round(availV * 0.15 / P))}×${P}m sprint, R1'), 2' entre blocs, simule tes 3 départs de compétition`,
            `${nSecV}×${2*P}m dos, R20"`,
            `Retour calme : 200m dos lent`,
          ] : [
            `Échauffement : 200m crawl + 100m dos + 4×25m accélérations`,
            `Répète ${Math.max(4, Math.round(availV * 0.45 / (3*P)))} fois : ${P}m sprint crawl R45" + ${P}m dos lent + ${P}m sprint crawl R45"`,
            `${nSecV}×${2*P}m dos, R20", récup`,
            `Retour calme : 200m dos lent`,
          ],
        },
        {
          title: "Vitesse & puissance bras",
          intensity: "Puissance, palettes puis mains nues",
          details: [
            `Échauffement : 200m crawl + 100m dos + 4×25m sprints`,
            `${Math.max(3, Math.round(availV * 0.40 / (2*P)))}×${2*P}m palettes + pull buoy, R25", coude haut, pression max, sens la portance`,
            `${nSprV}×${P}m sprint mains nues, R1', reproduis la prise des palettes, engage l'avant-bras`,
            `Retour calme : 200m dos lent`,
          ],
        },
      ][vG],
    };
  },

  // ── TECHNIQUE ────────────────────────────────────────────────────────────
  // Découverte : 5 variants simples | Beginner : 5 variants | Inter/Adv : 5 variants
  technique: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const isDecouverte = level === "découverte";
    const isBeg = level === "beginner" || level === "régulier" || isDecouverte;
    const isAdv = level === "advanced" || level === "performance";
    const P = pool, lvl = getLvlIndex(level);

    // ── DÉCOUVERTE : observations simples, pas de drill complexe ─────────
    if (isDecouverte) {
      const nLaps = Math.max(2, Math.round(dist / (2 * P)));
      const vd = (Math.floor(weekIdx / 6) * 3 + (weekIdx % 6)) % 5;
      return {
        type: "TECHNIQUE",
        ...[
          {
            title: "Compte tes bras",
            intensity: "Très facile, observe ta nage",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.4))}× ${2*P}m crawl, repose 20", compte le nombre de bras par longueur`,
              `Note ton chiffre. Essaie maintenant de faire 2 bras de moins par longueur en allant aussi vite`,
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m en visant ce nouveau chiffre, repose 25"`,
              `Fin : ${P}m dos lent`,
            ],
          },
          {
            title: "Jambes à fond",
            intensity: "Facile, travail des jambes mains en flèche",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl pour te chauffer, repose 20"`,
              `${Math.max(3, Math.round(nLaps * 0.45))}× ${2*P}m jambes seules mains en flèche, repose 25", bras tendus autour des oreilles, pieds pointés, fouet des chevilles`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m crawl complet, sens si tes jambes te poussent mieux`,
              `Fin : ${P}m dos`,
            ],
          },
          {
            title: "La coulée magique",
            intensity: "Facile, profite de chaque poussée de mur",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.3))}× ${2*P}m crawl, repose 20"`,
              `${Math.max(3, Math.round(nLaps * 0.45))}× ${2*P}m : pousse fort du mur + glisse 3 secondes avant de nager, repose 25"`,
              `Tu vas sentir que tu avances plus vite quand tu te laisses glisser`,
              `Fin : ${P}m dos`,
            ],
          },
          {
            title: "Respire mieux",
            intensity: "Facile, coordination bras/respiration",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl, essaie d'expirer sous l'eau (bulles), inspirer au virage`,
              `Repose 25" entre chaque, c'est normal si c'est nouveau, ça demande de la pratique`,
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m dos, repose 20", tu peux respirer librement, profites-en`,
              `Fin : ${P}m de ton choix`,
            ],
          },
          {
            title: "Nage sur le dos",
            intensity: "Très facile, exploration du dos crawlé",
            details: [
              `${Math.max(2, Math.round(nLaps * 0.35))}× ${2*P}m crawl lent, repose 20"`,
              `${Math.max(3, Math.round(nLaps * 0.45))}× ${2*P}m dos crawlé, repose 25", regard au plafond, une épaule sort de l'eau à chaque bras`,
              `${Math.max(1, Math.round(nLaps * 0.2))}× ${2*P}m dos plat (bras le long du corps, jambes), flottaison pure`,
              `Fin : ${P}m crawl tranquille`,
            ],
          },
        ][vd],
      };
    }

    const repR = 2*P;
    const WARM = 2*repR, COOL = repR, avail = dist - WARM - COOL;
    const nPerBlock = Math.max(3, Math.min(8, Math.round(avail / (4*repR))));
    const nInteg    = Math.min(8, Math.max(2, Math.round(Math.max(0, avail - 3*nPerBlock*repR) / repR)));
    const rot = (n) => (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % n;

    // ── DÉBUTANT (7 variants : ~90% éducatif) ────────────────────────────
    if (isBeg) {
      const v = rot(7);
      return {
        type: "TECHNIQUE",
        ...[
          {
            title: "Un bras, allongement et prise d'eau",
            intensity: "Facile, isolation d'un bras, allongement maximal",
            details: [
              `Échauffement : ${repR}m NL très lent + ${repR}m dos lent`,
              `${nPerBlock}×${repR}m un bras gauche, R15", bras droit tendu devant, tire uniquement le gauche jusqu'à la cuisse puis reviens en avant, 6 battements entre chaque traction`,
              `${nPerBlock}×${repR}m un bras droit, R15", même exercice côté droit`,
              `${nInteg}×${repR}m NL complet, R10", retrouve l'allongement à chaque entrée de main, attends que le bras avant soit bien tendu`,
              `Retour au calme : ${repR}m dos très lent`,
            ],
          },
          {
            title: "Flèche jambes, tuba frontal",
            intensity: "Facile, battements en position flèche",
            details: [
              `Échauffement : ${repR}m NL très lent + ${repR}m dos lent`,
              `${nPerBlock}×${repR}m tuba frontal + bras en flèche, R15", jambes seules, corps à plat, talons à la surface, expire régulièrement dans le tuba`,
              `${nPerBlock}×${repR}m tuba frontal + flèche + palmes, R15", ajoute les palmes, ressens la propulsion des jambes`,
              `${nInteg}×${repR}m NL complet, R10", garde le rythme de jambes actif, corps à plat`,
              `Retour au calme : ${repR}m dos très lent`,
            ],
          },
          {
            title: "Grand chien, tuba frontal",
            intensity: "Facile, coordination des bras sans contrainte respiratoire",
            details: [
              `Échauffement : ${repR}m NL très lent + ${repR}m dos lent`,
              `${nPerBlock}×${repR}m grand chien + tuba frontal, R15", un bras tendu devant, l'autre tire lentement jusqu'à la cuisse, échange complet avant de repartir`,
              `${nPerBlock}×${repR}m grand chien + tuba frontal, R15", focus : sens l'eau sous la paume à la prise, tire sous l'axe du corps`,
              `${nInteg}×${repR}m NL sans tuba, R10", reproduis la lenteur et la précision du grand chien`,
              `Retour au calme : ${repR}m dos très lent`,
            ],
          },
          {
            title: "Palmes & tuba frontal, battements et position",
            intensity: "Facile, battements, corps à plat",
            details: [
              `Échauffement : ${repR}m NL très lent + ${repR}m dos lent`,
              `${nPerBlock}×${repR}m palmes + tuba frontal, R15", talons à la surface, fouet des chevilles, expire sous l'eau à chaque virage`,
              `${nPerBlock}×${repR}m palmes seules (sans tuba), R15", maintiens le rythme de jambes, coordonne avec les bras`,
              `${nInteg}×${repR}m NL complet sans matériel, R10", garde la sensation des jambes actives, vise la fluidité`,
              `Retour au calme : ${repR}m dos très lent`,
            ],
          },
          {
            title: "Fist drill, sentir l'eau",
            intensity: "Facile, ressentir l'avant-bras",
            details: [
              `Échauffement : ${repR}m NL lent + ${repR}m tuba frontal + flèche`,
              `${nPerBlock}×${repR}m fist drill, R10", poings fermés, l'avant-bras accroche l'eau`,
              `${nPerBlock}×${repR}m mains ouvertes, R10", ressens le grip retrouvé, note la différence`,
              `${nInteg}×${repR}m NL complet, R10", garde la sensation de prise profonde et précoce`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Respiration bilatérale",
            intensity: "Facile, coordination respiratoire",
            details: [
              `Échauffement : ${repR}m NL lent + ${repR}m tuba frontal + flèche`,
              `${nPerBlock}×${repR}m NL resp. 3 temps, R10", inspire à droite sur 3 longueurs, à gauche sur 3 longueurs`,
              `${nPerBlock}×${repR}m dos crawlé lent, R10", bras tendu, rotation douce, expire en surface`,
              `${nInteg}×${repR}m NL, R10", alterne 3 temps et 2 temps, sens la différence d'équilibre`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "6-kick switch, équilibre & rotation",
            intensity: "Facile, équilibre latéral",
            details: [
              `Échauffement : ${repR}m NL lent + ${repR}m tuba frontal + flèche`,
              `${nPerBlock}×${repR}m 6-kick drill, R15", 6 battements sur le flanc, tête dans l'axe, équilibre sans forcer`,
              `${nPerBlock}×${repR}m switch drill, R15", rotation complète à chaque coup de bras, 1 battement de cheville`,
              `${nInteg}×${repR}m NL, R10", imagine que tu roules sur un axe, pas que tu te tords`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
        ][v],
      };
    }

    // ── INTERMÉDIAIRE (+ perf eau libre / triathlon : crawl, pas blocs 4 nages brasse) ──
    if (!isAdv || !shouldUsePoolIMBlock(goal)) {
      const v = rot(7);
      return {
        type: "TECHNIQUE",
        ...[
          {
            title: "Flèche jambes, tuba frontal",
            intensity: "Faible, battements en position flèche",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m tuba frontal + bras en flèche, R15", jambes seules, corps à plat, talons à la surface, 5m de glisse depuis le mur avant de battre`,
              `${nPerBlock}×${repR}m tuba frontal + palmes + flèche, R15", ajoute les palmes, maintiens corps gainé, ressens la propulsion`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, garde le rythme de jambes actif hérité des longueurs en flèche`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Grand chien, tuba frontal",
            intensity: "Faible, coordination et prise d'eau",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m grand chien + tuba frontal, R10", un bras tendu devant, tire lentement jusqu'à la cuisse, échange complet`,
              `${nPerBlock}×${repR}m grand chien + tuba, R10", focus coude haut à la prise, sens l'eau sur la paume et l'avant-bras`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, reproduis le rythme lent et précis du grand chien`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Hypoxie 3-5-7-9",
            intensity: "Modéré, contrôle respiratoire progressif",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m hypoxie 3, R15", 1 respiration toutes les 3 tractions (confortable, pose les bases)`,
              `${nPerBlock}×${repR}m hypoxie 5, R20", 1 respiration toutes les 5 tractions (modéré)`,
              `${Math.max(2, nPerBlock - 1)}×${repR}m hypoxie 7, R25", 1 respiration toutes les 7 tractions (difficile, arrête si inconfort)`,
              `Retour au calme : ${repR}m NL respiration normale + ${repR}m dos lent`,
            ],
          },
          {
            title: "Catch-up drill & DPS",
            intensity: "Faible, distance par cycle (DPS)",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m catch-up drill, R10", bras tendu devant, attend la main adverse avant de repartir`,
              `${nPerBlock}×${repR}m DPS comptage, R10", vise 18-22 cycles/longueur`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, réduis d'1 cycle/longueur vs ta normale, même vitesse`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Fist drill & prise d'eau",
            intensity: "Faible, qualité de la prise",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m fist drill, R10", poings fermés, accroche avec l'avant-bras, coude haut`,
              `${nPerBlock}×${repR}m palmes + tuba frontal, R15", coude haut à la sortie de l'eau, sens la propulsion des jambes`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, prise précoce et profonde, tire sous l'axe du corps`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "6-kick drill & rotation",
            intensity: "Faible, alignement et rotation",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m 6-kick drill, R10", 6 battements sur le côté, nez au fond, rotation consciente`,
              `${nPerBlock}×${repR}m rotation exagérée, R10", épaule passe au-dessus de l'eau, 2s de glisse`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, vise 18-22 cycles/longueur, même temps`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Virages & coulées",
            intensity: "Faible, travail des virages",
            details: [
              `Échauffement : ${repR}m NL + ${repR}m palmes + tuba frontal`,
              `${nPerBlock}×${repR}m coulées, R10", flèche max gainée, 5m en apnée avant le 1er bras`,
              `${nPerBlock}×${repR}m flip turns, R15", culbute à 1m du mur, poussée + flèche`,
              `${nInteg}×${repR}m NL, ${dep(repR,lvl,'easy')}, chaque virage = relance d'élan, zéro perte de vitesse`,
              `Retour au calme : ${repR}m dos lent`,
            ],
          },
        ][v],
      };
    }

    // ── PERF eau libre / triathlon : technique crawl & sighting ───────────
    if (isAdv && !shouldUsePoolIMBlock(goal)) {
      const v = rot(6);
      return {
        type: "TECHNIQUE",
        ...[
          {
            title: "Technique crawl, prise & rotation",
            intensity: "Faible, qualité de nage OW",
            details: [
              `Échauffement : ${repR}m crawl + ${repR}m dos`,
              `${nPerBlock}×${repR}m catch-up drill, R10", allongement, attente la main adverse`,
              `${nPerBlock}×${repR}m sighting tous les 6 bras, R15", tête stable, vise un repère au fond`,
              `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, intègre sighting + allongement`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Sighting & respiration",
            intensity: "Faible, prépa navigation eau libre",
            details: [
              `Échauffement : ${repR}m crawl progressif`,
              `${nPerBlock}×${repR}m crawl respiration bilatérale, R10", 3 bras / 5 bras en alternance`,
              `${nPerBlock}×${repR}m crawl sighting, R15", lève la tête sans casser l'allure`,
              `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, même effort, technique propre`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Allonge & DPS",
            intensity: "Faible, économie de nage",
            details: [
              `Échauffement : ${repR}m crawl + ${repR}m palmes`,
              `${nPerBlock}×${repR}m DPS comptage, R10", vise moins de cycles à même allure`,
              `${nPerBlock}×${repR}m fist drill, R10", avant-bras, coude haut`,
              `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, glisse entre les cycles`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Nage en ligne & orientation",
            intensity: "Faible, prépa mer / triathlon",
            details: [
              `Échauffement : ${repR}m crawl + ${repR}m dos`,
              `${nPerBlock}×${repR}m crawl sighting, R15", lève la tête tous les 6-8 bras, sans casser l'allure`,
              `${nPerBlock}×${repR}m crawl, ${dep(repR,lvl,'easy')}, rythme régulier, respiration bilatérale`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Virages & coulées",
            intensity: "Faible, relance sans perdre l'allure",
            details: [
              `Échauffement : ${repR}m crawl + ${repR}m palmes`,
              `${nPerBlock}×${repR}m coulées, R10", flèche gainée depuis le mur`,
              `${nPerBlock}×${repR}m crawl virages, R15", enchaîne sans t'arrêter au milieu`,
              `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, allure régulière`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
          {
            title: "Tempo & cycles crawl",
            intensity: "Modéré, efficacité",
            details: [
              `Échauffement : ${repR}m crawl + ${repR}m dos`,
              `${nPerBlock}×${repR}m crawl, R10", compte tes cycles par longueur`,
              `${nPerBlock}×${repR}m crawl, ${dep(repR,lvl,'easy')}, même cycles, un peu plus vite`,
              `${nInteg}×${repR}m crawl sighting, ${dep(repR,lvl,'easy')}, intègre la tête haute`,
              `Retour calme : ${repR}m dos lent`,
            ],
          },
        ][v],
      };
    }

    // ── EXPERT / PERFORMANCE piscine : technique 4 nages (6 variants) ─────
    const v = rot(6);
    return {
      type: "TECHNIQUE",
      ...[
        {
          title: "Technique dos",
          intensity: "Faible, sortie du bras, rotation épaule",
          details: [
            `Échauffement : ${repR}m crawl + ${repR}m brasse lente`,
            `${nPerBlock}×${repR}m dos, R10", épaule sort de l'eau à chaque bras, regard au plafond`,
            `${nPerBlock}×${repR}m dos palmes, R10", fouet des chevilles, corps gainé, rotation de bassin`,
            `${nInteg}×${repR}m dos, ${dep(repR,lvl,'easy')}, amplitude complète, pas de coude qui rentre à l'entrée`,
            `Retour calme : ${repR}m crawl lent`,
          ],
        },
        {
          title: "Technique brasse",
          intensity: "Faible, traction coude haut, coulée longue",
          details: [
            `Échauffement : ${repR}m crawl + ${repR}m dos lent`,
            `${nPerBlock}×${repR}m brasse, R15", bras tirent, jambes poussent, jamais en même temps`,
            `${nPerBlock}×${repR}m brasse coulée longue, R15", prolonge la glisse 2 secondes avant le prochain cycle`,
            `${nInteg}×${repR}m brasse, ${dep(repR,lvl,'easy')}, amplitude + coulée, économise l'énergie`,
            `Retour calme : ${repR}m crawl lent`,
          ],
        },
        {
          title: "Technique papillon",
          intensity: "Faible, ondulation hanches, pas épaules",
          details: [
            `Échauffement : ${repR}m crawl + ${repR}m dos + 4×${P}m ondulations jambes`,
            `${nPerBlock}×${P}m papillon, R30", ondulation vient des hanches, les épaules suivent`,
            `${nPerBlock}×${P}m papillon, R30", 2 battements de jambes par cycle, sens la propulsion`,
            `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, intégration après le travail papillon`,
            `Retour calme : ${repR}m dos lent`,
          ],
        },
        {
          title: "Séance 4 nages par bloc",
          intensity: "Modéré, un bloc par nage",
          details: [
            `Échauffement : ${repR}m crawl`,
            `${nPerBlock}×${repR}m dos, R10", rotation épaule, fouet chevilles`,
            `${nPerBlock}×${repR}m brasse, R15", bras + jambes séparés, coulée`,
            `${nPerBlock}×${P}m papillon, R30", ondulation hanches`,
            `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, intégration finale`,
            `Retour calme : ${repR}m dos lent`,
          ],
        },
        {
          title: "Enchaînement 4 nages complet",
          intensity: "Modéré, fluidité entre les nages",
          details: [
            `Échauffement : ${repR}m crawl + ${repR}m dos`,
            `${nPerBlock}×${4*P}m 4 nages (${P}m par nage), R25", papillon · dos · brasse · crawl, fluidité à chaque transition`,
            `${nPerBlock}×${repR}m crawl, ${dep(repR,lvl,'easy')}, repose sur le crawl après les 4 nages`,
            `Retour calme : ${repR}m dos lent`,
          ],
        },
        {
          title: "Tempo & cycles crawl",
          intensity: "Modéré, plus vite sans plus de cycles",
          details: [
            `Échauffement : ${repR}m crawl + ${repR}m 4 nages (${P}m par nage)`,
            `${nPerBlock}×${repR}m crawl, R10", compte tes cycles par longueur`,
            `${nPerBlock}×${repR}m crawl, ${dep(repR,lvl,'easy')}, accélère le rythme de bras en gardant le même nombre de cycles`,
            `${nInteg}×${repR}m crawl, ${dep(repR,lvl,'easy')}, objectif : 2s plus rapide, même nombre de cycles`,
            `Retour calme : ${repR}m dos lent`,
          ],
        },
      ][v],
    };
  },

  // ── BNSSA ────────────────────────────────────────────────────────────────
  bnssa: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const P = pool, v = weekIdx % 5;
    const nApnee  = Math.max(4, Math.min(12, Math.round(dist * 0.18 / 15)));
    const nRem    = Math.max(3, Math.min(8, Math.round(dist * 0.15 / P)));
    const nPalmes = Math.max(4, Math.min(10, Math.round(dist * 0.30 / (2*P))));
    const nNL     = Math.max(3, Math.min(8, Math.round(dist * 0.22 / (2*P))));
    const nTuba   = Math.max(4, Math.min(8, Math.round(dist * 0.20 / (2*P))));

    return {
      type: "BNSSA",
      ...[
        {
          title: "Simulation parcours 100m",
          intensity: "Apnée & remorquage, qualité de parcours",
          details: [
            `Échauffement : 200m NL progressif + 100m battements`,
            `Apnée dynamique : ${nApnee}×15m immersion complète, R2', tracé fond, sans appui`,
            `Simulation 100m : 25m NL → 15m apnée → virage → 15m apnée → 25m remorquage, R3'`,
            `Remorquage : ${nRem}×${P}m, R1'30", position dorsale, visage hors de l'eau`,
            `Retour au calme : 200m dos lent`,
          ],
        },
        {
          title: "Prépa 250m palmes & plongée",
          intensity: "Endurance équipée + apnée",
          details: [
            `Échauffement : 200m NL + 100m battements`,
            `${nPalmes}×${2*P}m palmes + masque + tuba, R20", touche le mur à chaque virage`,
            `Plongée canard : 6× plongée → fond → saisie mannequin → remontée, R2'`,
            `Remorquage : ${nRem}×${P}m position dorsale, R1'30"`,
            `Retour au calme : 200m dos lent`,
          ],
        },
        {
          title: "Endurance & apnée sous fatigue",
          intensity: "Tenir les apnées après l'effort",
          details: [
            `Échauffement : 200m NL progressif + 100m battements`,
            `${nNL}×${2*P}m NL, R20", endurance de base`,
            `Apnée dynamique : ${nApnee}×15m, R2', immersion complète sans appui`,
            `${nRem}×${P}m remorquage, R1'30", position dorsale`,
            `Retour au calme : 200m dos lent`,
          ],
        },
        {
          title: "Palmes + tuba, volume équipé",
          intensity: "Endurance masque/tuba + apnées courtes",
          details: [
            `Échauffement : 200m NL + 100m palmes souples`,
            `${nTuba}×${2*P}m palmes + masque + tuba, R15", respiration tuba régulière, virages propres`,
            `Apnée : ${nApnee}×15m, R1'30", après fatigue équipée`,
            `${nRem}×${P}m remorquage dorsale, R1'`,
            `Retour au calme : 200m dos sans matériel`,
          ],
        },
        {
          title: "Enchaînement exam, palmes → apnée → remorquage",
          intensity: "Simulation complète sous fatigue",
          details: [
            `Échauffement : 200m NL + 100m battements`,
            `${Math.max(3, Math.round(nPalmes * 0.6))}×${2*P}m palmes + tuba, R20"`,
            `Bloc exam : 50m palmes → 15m apnée → ${P}m remorquage, ×${Math.max(3, Math.min(6, nRem))}, R2'30"`,
            `Apnée isolée : ${Math.max(4, Math.round(nApnee * 0.7))}×15m, R2'`,
            `Retour au calme : 200m dos lent`,
          ],
        },
      ][v],
    };
  },

  // ── RÉCUPÉRATION ─────────────────────────────────────────────────────────
  // 3 variants per level, rotation via improved weekIdx formula
  récupération: (dist, pool, level = "intermediate", weekIdx = 0, goal = "") => {
    const isBeg = level === "beginner" || level === "régulier" || level === "découverte";
    const P = pool;
    const v = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 3;
    const repR = 2*P;
    const nA = Math.max(2, Math.round(dist * 0.30 / repR));
    const nB = Math.max(2, Math.round(dist * 0.30 / repR));
    const nC = Math.max(2, Math.round(dist * 0.25 / repR));
    const nD = Math.min(6, Math.max(2, Math.round(Math.max(0, dist - (nA+nB+nC)*repR) / repR)));

    if (isBeg) {
      return {
        type: "RÉCUPÉRATION",
        ...[
          {
            title: "Nage libre douce",
            intensity: "Très facile, récupère",
            details: [
              `${nA}×${repR}m NL lent, R10", si tu souffles c'est trop vite, réduis l'allure`,
              `${nB}×${repR}m dos crawlé, R10", bras tendus, regard au plafond, flotte`,
              `${nC}×${repR}m alternance 25 crawl / 25 dos, R10", change de nage à chaque longueur`,
              `Fin : flotte 2 min en étoile sur le dos`,
            ],
          },
          {
            title: "Dos & respiration",
            intensity: "Très facile",
            details: [
              `${nA}×${repR}m dos crawlé, R10", jambes molles, pense à flotter`,
              `${nB}×${repR}m godilles avant, R10", mains en figure 8, sens la portance de l'eau`,
              `${nC}×${repR}m NL lent, R10", 1 long. resp 2 temps / 1 long. resp 3 temps`,
              `Fin : flotte 2 min en étoile sur le dos`,
            ],
          },
          {
            title: "Déconnexion totale",
            intensity: "Très facile, sans chrono, sans pression",
            details: [
              `${nA}×${repR}m NL, sans chrono, nage à l'intuition, arrête si besoin`,
              `${nB}×${repR}m dos crawlé, sans chrono, pense à autre chose, déconnecte complètement`,
              nC > 0 ? `${nC}×${repR}m battements dos bras le long, jambes molles, flottaison totale` : `2 min de flottaison sur le dos, bras en croix, expire profondément`,
              `Fin : étirements passifs 3 min au bord du bassin`,
            ],
          },
        ][v],
      };
    }

    // ── PERFORMANCE / EXPERT : récup active + 4 nages (piscine polyvalente) ──
    if (!isBeg && (level === "performance" || level === "advanced") && shouldUsePoolIMBlock(goal)) {
      const vp = (Math.floor(weekIdx / 10) * 3 + (weekIdx % 10)) % 3;
      return {
        type: "RÉCUPÉRATION",
        ...[
          {
            title: "Récupération 4 nages",
            intensity: "Très facile, maintien du mouvement",
            details: [
              `${nA}×${repR}m dos, 15" récup, jambes molles, rotation douce`,
              `${nB}×${repR}m brasse, 15" récup, coulée longue, jamais de précipitation`,
              `${nC}×${repR}m crawl très lent, 10" récup, expire sous l'eau, relâche les épaules`,
              `Fin : 100m dos bras le long, flottaison pure`,
            ],
          },
          {
            title: "Nage croisée douce",
            intensity: "Très facile, polyvalence en récup",
            details: [
              `${nA}×${repR}m en rotation dos · brasse · crawl, 15" récup, 1 nage par longueur, sans effort`,
              `${nB}×${repR}m crawl lent, 10" récup, pense à la technique, pas à la vitesse`,
              `${nC}×${repR}m dos, 10" récup, regard au plafond, décompresse`,
              `Fin : flotte 2 min sur le dos, bras en croix`,
            ],
          },
          {
            title: "Descente douce",
            intensity: "Très facile, sans montre",
            details: [
              `${nA}×${repR}m crawl, sans pression, allure intuitive, arrête si besoin`,
              `${nB}×${repR}m dos, 10" récup, pense à autre chose, déconnecte`,
              `${nC}×${repR}m brasse coulée, 15" récup, 1 cycle · coulée · 1 cycle, le plus lent possible`,
              `Fin : étirements passifs 3 min au bord du bassin`,
            ],
          },
        ][vp],
      };
    }

    return {
      type: "RÉCUPÉRATION",
      ...[
        {
          title: "Récupération active",
          intensity: "Z1, très facile",
          details: [
            `${nA}×${repR}m nage croisée, R10", change de nage à chaque longueur`,
            `${nB}×${repR}m dos crawlé, R10", épaule sort en premier, scan corporel`,
            `${nC}×${repR}m NL lent, R10", coulée max après chaque virage`,
            `${nD}×${repR}m battements mains en flèche, R10", jambes libres, expire dans l'eau`,
          ],
        },
        {
          title: "Godilles & relâchement",
          intensity: "Z1, ressentir l'eau",
          details: [
            `${nA}×${P}m godilles, R10", mains en 'figure 8', sens la portance`,
            `${nB}×${repR}m dos lent, R10", jambes molles, récupère mentalement`,
            `${nC}×${repR}m NL lent, R10", méditation active, compte les longueurs`,
            `${nD}×${repR}m alternance 25 dos / 25 crawl, R10", nage croisée, jambes souples`,
          ],
        },
        {
          title: "Descente douce",
          intensity: "Z1, allure intuitive, pas de montre",
          details: [
            `${nA}×${repR}m NL, sans pression, Z1 confort, pense à ta posture`,
            `${nB}×${repR}m dos crawlé, R10", focus rotation du bassin, relâche les épaules`,
            nC > 0 ? `${nC}×${P}m godilles dos, R10", mains au niveau des hanches, sens la portance` : `${repR}m NL très lent libre`,
            `Fin : 200m NL très lent, aucune contrainte de temps`,
          ],
        },
      ][v],
    };
  },
};

const TIPS = {
  debut:       "Priorité à la régularité sur l'intensité. Concentre-toi sur la position du corps dans l'eau, plus tu es horizontal, moins tu freines.",
  aerobie:     "Travaille la respiration bilatérale (3 temps). Un appui symétrique des deux côtés améliore la rotation et l'efficacité de nage.",
  endurance:   "Si tu dois t'arrêter, c'est que tu vas trop vite. Ralentis jusqu'à trouver une allure où tu pourrais tenir une conversation courte.",
  seuil:       "Le seuil doit être inconfortable mais régulier. Utilise un chrono, la constance des temps de passage est le seul indicateur qui compte.",
  vitesse:     "Récupération complète entre chaque sprint. Sans ça, tu travailles l'endurance, pas la vitesse. Qualité absolue > quantité.",
  volume:      "Semaine de charge maximale. Mange +15 % de glucides, vise 8 h de sommeil, c'est pendant la récupération que le corps s'adapte.",
  affutage:    "Réduis le volume de 40 % mais maintiens 2-3 accélérations par séance pour garder la réactivité musculaire.",
  competition: "Dernière semaine avant l'événement : 1-2 séances courtes, volume bas, rappels de vitesse (12,5 m max). Ne t'inquiète pas : si tu as suivi le plan, le travail est fait.",
  test:        "Semaine chrono : note ton T100 (100 m, départ dans l'eau). Compare avec le test précédent, c'est la seule façon de voir si tu évolues vraiment.",
};

// Ratios par niveau, découverte : fun + endurance légère, pas de seuil/vitesse au début
const PHASE_PATTERNS = {
  // Découverte, endurance légère + technique simple + récupération douce
  découverte: {
    base:        { 1: ["endurance"], 2: ["endurance","récupération"], 3: ["endurance","technique","récupération"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    development: { 1: ["endurance"], 2: ["endurance","technique"], 3: ["endurance","endurance","technique"], 4: ["endurance","seuil","technique","récupération"], 5: ["endurance","seuil","technique","récupération","endurance"] },
    peak:        { 1: ["endurance"], 2: ["endurance","vitesse"], 3: ["endurance","vitesse","technique"], 4: ["endurance","vitesse","technique","récupération"], 5: ["endurance","vitesse","technique","récupération","endurance"] },
    taper:       { 1: ["récupération"], 2: ["endurance","récupération"], 3: ["endurance","récupération","récupération"], 4: ["endurance","technique","récupération","récupération"], 5: ["endurance","technique","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["endurance","seuil","récupération"], 4: ["endurance","seuil","technique","récupération"], 5: ["endurance","seuil","technique","récupération","endurance"] },
  },
  // Régulier = alias de beginner
  régulier: {
    base:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","endurance"], 4: ["endurance","technique","technique","récupération"], 5: ["endurance","technique","technique","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["technique","endurance"], 3: ["technique","seuil","endurance"], 4: ["technique","seuil","endurance","technique"], 5: ["technique","seuil","endurance","technique","récupération"] },
    peak:        { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","vitesse"], 4: ["technique","seuil","vitesse","endurance"], 5: ["technique","seuil","vitesse","endurance","récupération"] },
    taper:       { 1: ["endurance"], 2: ["technique","récupération"], 3: ["technique","endurance","récupération"], 4: ["technique","endurance","récupération","récupération"], 5: ["technique","endurance","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","endurance"] },
  },
  // Sportif = alias de intermediate
  sportif: {
    base:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","endurance"], 4: ["endurance","technique","technique","récupération"], 5: ["endurance","technique","technique","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","endurance"], 4: ["technique","seuil","endurance","technique"], 5: ["technique","seuil","endurance","technique","récupération"] },
    peak:        { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","vitesse"], 4: ["technique","seuil","vitesse","endurance"], 5: ["technique","seuil","vitesse","endurance","récupération"] },
    taper:       { 1: ["endurance"], 2: ["technique","récupération"], 3: ["technique","endurance","récupération"], 4: ["technique","endurance","récupération","récupération"], 5: ["technique","endurance","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","endurance"] },
  },
  // Performance = alias de advanced
  performance: {
    base:        { 1: ["endurance"], 2: ["endurance","technique"], 3: ["endurance","endurance","technique"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["endurance","seuil","technique"], 4: ["endurance","seuil","vitesse","technique"], 5: ["endurance","seuil","vitesse","technique","endurance"] },
    peak:        { 1: ["seuil"], 2: ["seuil","vitesse"], 3: ["endurance","seuil","vitesse"], 4: ["endurance","seuil","vitesse","seuil"], 5: ["endurance","seuil","vitesse","seuil","récupération"] },
    taper:       { 1: ["endurance"], 2: ["endurance","récupération"], 3: ["endurance","technique","récupération"], 4: ["endurance","technique","récupération","récupération"], 5: ["endurance","technique","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["seuil","endurance"], 3: ["seuil","vitesse","récupération"], 4: ["endurance","seuil","vitesse","récupération"], 5: ["endurance","seuil","vitesse","récupération","endurance"] },
  },
  beginner: {
    base:        { 1: ["technique"], 2: ["technique","technique"], 3: ["technique","technique","endurance"], 4: ["technique","technique","technique","endurance"], 5: ["technique","technique","technique","endurance","récupération"] },
    development: { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","endurance"], 4: ["technique","technique","endurance","récupération"], 5: ["technique","technique","technique","endurance","récupération"] },
    peak:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","endurance","technique"], 4: ["technique","technique","endurance","récupération"], 5: ["technique","technique","endurance","technique","récupération"] },
    taper:       { 1: ["technique"], 2: ["technique","récupération"], 3: ["technique","technique","récupération"], 4: ["technique","technique","récupération","récupération"], 5: ["technique","technique","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","technique"] },
  },
  intermediate: {
    base:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","endurance"], 4: ["endurance","technique","technique","récupération"], 5: ["endurance","technique","technique","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","endurance"], 4: ["technique","seuil","endurance","technique"], 5: ["technique","seuil","endurance","technique","récupération"] },
    peak:        { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","vitesse"], 4: ["technique","seuil","vitesse","endurance"], 5: ["technique","seuil","vitesse","endurance","récupération"] },
    taper:       { 1: ["endurance"], 2: ["technique","récupération"], 3: ["technique","endurance","récupération"], 4: ["technique","endurance","récupération","récupération"], 5: ["technique","endurance","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","endurance"] },
  },
  advanced: {
    base:        { 1: ["endurance"], 2: ["endurance","technique"], 3: ["endurance","endurance","technique"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["endurance","seuil","technique"], 4: ["endurance","seuil","vitesse","technique"], 5: ["endurance","seuil","vitesse","technique","endurance"] },
    peak:        { 1: ["seuil"], 2: ["seuil","vitesse"], 3: ["endurance","seuil","vitesse"], 4: ["endurance","seuil","vitesse","seuil"], 5: ["endurance","seuil","vitesse","seuil","récupération"] },
    taper:       { 1: ["endurance"], 2: ["endurance","récupération"], 3: ["endurance","technique","récupération"], 4: ["endurance","technique","récupération","récupération"], 5: ["endurance","technique","récupération","récupération","endurance"] },
    competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
    test:        { 1: ["seuil"], 2: ["seuil","endurance"], 3: ["seuil","vitesse","récupération"], 4: ["endurance","seuil","vitesse","récupération"], 5: ["endurance","seuil","vitesse","récupération","endurance"] },
  },
};

// Eau libre 5k/10k, patterns crawl (legacy ; contenu confirmé = banque dans swim-session-generator)
const OPEN_WATER_PATTERNS = {
  régulier: PHASE_PATTERNS.régulier,
  beginner: PHASE_PATTERNS.régulier,
  sportif: PHASE_PATTERNS.sportif,
  intermediate: PHASE_PATTERNS.sportif,
  performance: PHASE_PATTERNS.performance,
  advanced: PHASE_PATTERNS.performance,
  découverte: PHASE_PATTERNS.régulier,
};

const BNSSA_PATTERNS = {
  base:        { 1: ["bnssa"], 2: ["endurance", "bnssa"], 3: ["bnssa", "endurance", "bnssa"], 4: ["endurance", "bnssa", "bnssa", "récupération"], 5: ["endurance", "bnssa", "bnssa", "récupération", "endurance"] },
  development: { 1: ["bnssa"], 2: ["bnssa", "bnssa"], 3: ["endurance", "bnssa", "bnssa"], 4: ["endurance", "bnssa", "bnssa", "bnssa"], 5: ["endurance", "seuil", "bnssa", "bnssa", "récupération"] },
  peak:        { 1: ["bnssa"], 2: ["bnssa", "bnssa"], 3: ["bnssa", "bnssa", "bnssa"], 4: ["endurance", "bnssa", "bnssa", "bnssa"], 5: ["endurance", "seuil", "bnssa", "bnssa", "récupération"] },
  taper:       { 1: ["bnssa"], 2: ["endurance", "bnssa"], 3: ["endurance", "bnssa", "récupération"], 4: ["endurance", "bnssa", "récupération", "récupération"], 5: ["endurance", "bnssa", "récupération", "récupération", "endurance"] },
  competition: { 1: ["récupération"], 2: ["récupération"], 3: ["récupération"], 4: ["récupération","récupération"], 5: ["récupération","récupération"] },
  test:        { 1: ["bnssa"], 2: ["bnssa", "endurance"], 3: ["bnssa", "endurance", "récupération"], 4: ["bnssa", "bnssa", "endurance", "récupération"], 5: ["bnssa", "bnssa", "endurance", "récupération", "bnssa"] },
};

const WELLNESS_PATTERNS = {
  beginner: {
    base:        { 1: ["technique"], 2: ["technique","récupération"], 3: ["technique","technique","récupération"], 4: ["technique","technique","technique","récupération"], 5: ["technique","technique","technique","récupération","endurance"] },
    development: { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","endurance"], 4: ["technique","technique","endurance","récupération"], 5: ["technique","technique","endurance","récupération","technique"] },
    test:        { 1: ["endurance"], 2: ["technique","endurance"], 3: ["technique","endurance","récupération"], 4: ["technique","endurance","récupération","technique"], 5: ["technique","endurance","récupération","technique","endurance"] },
  },
  intermediate: {
    base:        { 1: ["technique"], 2: ["endurance","technique"], 3: ["technique","endurance","récupération"], 4: ["endurance","technique","technique","récupération"], 5: ["endurance","technique","technique","récupération","endurance"] },
    development: { 1: ["endurance"], 2: ["technique","endurance"], 3: ["technique","endurance","endurance"], 4: ["technique","endurance","endurance","récupération"], 5: ["technique","endurance","endurance","récupération","endurance"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","endurance"] },
  },
  advanced: {
    base:        { 1: ["endurance"], 2: ["endurance","récupération"], 3: ["endurance","technique","récupération"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    development: { 1: ["endurance"], 2: ["endurance","technique"], 3: ["endurance","endurance","technique"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    test:        { 1: ["seuil"], 2: ["seuil","endurance"], 3: ["seuil","endurance","récupération"], 4: ["endurance","seuil","technique","récupération"], 5: ["endurance","seuil","technique","récupération","endurance"] },
  },
};

const PROGRESSION_PATTERNS = {
  beginner: {
    base:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","technique","récupération"], 4: ["technique","technique","endurance","récupération"], 5: ["technique","technique","endurance","récupération","technique"] },
    development: { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","endurance","technique"], 4: ["technique","endurance","technique","récupération"], 5: ["technique","technique","endurance","récupération","endurance"] },
    peak:        { 1: ["technique"], 2: ["technique","seuil"], 3: ["technique","seuil","endurance"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","technique"] },
    bilan:       { 1: ["récupération"], 2: ["récupération","technique"], 3: ["récupération","technique","endurance"], 4: ["récupération","technique","technique","endurance"], 5: ["récupération","technique","technique","endurance","endurance"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","technique"] },
  },
  intermediate: {
    base:        { 1: ["technique"], 2: ["technique","endurance"], 3: ["technique","endurance","récupération"], 4: ["endurance","technique","endurance","récupération"], 5: ["endurance","technique","endurance","récupération","endurance"] },
    development: { 1: ["seuil"], 2: ["technique","seuil"], 3: ["technique","seuil","endurance"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","technique","récupération"] },
    peak:        { 1: ["vitesse"], 2: ["technique","vitesse"], 3: ["vitesse","seuil","endurance"], 4: ["technique","vitesse","seuil","récupération"], 5: ["technique","vitesse","seuil","endurance","récupération"] },
    bilan:       { 1: ["récupération"], 2: ["récupération","technique"], 3: ["récupération","technique","endurance"], 4: ["récupération","technique","endurance","technique"], 5: ["récupération","technique","endurance","technique","endurance"] },
    test:        { 1: ["seuil"], 2: ["endurance","seuil"], 3: ["technique","seuil","récupération"], 4: ["technique","seuil","endurance","récupération"], 5: ["technique","seuil","endurance","récupération","endurance"] },
  },
  advanced: {
    base:        { 1: ["endurance"], 2: ["endurance","technique"], 3: ["endurance","technique","récupération"], 4: ["endurance","endurance","technique","récupération"], 5: ["endurance","endurance","technique","récupération","endurance"] },
    development: { 1: ["endurance"], 2: ["seuil","endurance"], 3: ["seuil","endurance","technique"], 4: ["seuil","endurance","technique","récupération"], 5: ["seuil","endurance","technique","récupération","endurance"] },
    peak:        { 1: ["vitesse"], 2: ["vitesse","seuil"], 3: ["vitesse","seuil","endurance"], 4: ["vitesse","seuil","endurance","récupération"], 5: ["vitesse","seuil","endurance","récupération","vitesse"] },
    bilan:       { 1: ["récupération"], 2: ["récupération","technique"], 3: ["récupération","technique","endurance"], 4: ["récupération","technique","endurance","technique"], 5: ["récupération","technique","endurance","technique","endurance"] },
    test:        { 1: ["seuil"], 2: ["seuil","endurance"], 3: ["seuil","vitesse","récupération"], 4: ["endurance","seuil","vitesse","récupération"], 5: ["endurance","seuil","vitesse","récupération","endurance"] },
  },
};

const buildProgressionPhases = () => {
  // 12 semaines : base → test → développement → test → peak → bilan (affûtage léger)
  const phases = [];
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    phases.push({ phase: "base", focus: t < 0.5 ? "Mise en place" : "Construction du volume", progression: 1.0 + t * 0.18, tipKey: t < 0.5 ? "debut" : "aerobie", isBilan: false, isTest: false });
  }
  phases.push({ phase: "test", focus: "Test de progression", progression: 1.05, tipKey: "test", isBilan: false, isTest: true });
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    phases.push({ phase: "development", focus: t < 0.5 ? "Développement" : "Travail au seuil", progression: 1.20 + t * 0.18, tipKey: "seuil", isBilan: false, isTest: false });
  }
  phases.push({ phase: "test", focus: "Contrôle allure", progression: 1.25, tipKey: "test", isBilan: false, isTest: true });
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    phases.push({ phase: "peak", focus: t < 0.5 ? "Intensité max" : "Volume maximum", progression: 1.40 + t * 0.12, tipKey: "vitesse", isBilan: false, isTest: false });
  }
  phases.push({ phase: "bilan", focus: "Bilan & récupération", progression: 1.0, tipKey: "affutage", isBilan: true, isTest: false });
  return phases;
};

const buildWellnessPhases = (totalWeeks) => {
  const phases = [];
  const testAt = totalWeeks >= 6 ? Math.floor(totalWeeks / 2) : -1;
  for (let i = 0; i < totalWeeks; i++) {
    if (i === testAt) {
      phases.push({
        phase: "test",
        focus: "Test de progression",
        progression: 1.1,
        tipKey: "test",
        isTest: true,
      });
      continue;
    }
    const t = totalWeeks > 1 ? i / (totalWeeks - 1) : 0;
    const isBase = t < 0.5;
    phases.push({
      phase: isBase ? "base" : "development",
      focus: t < 0.25 ? "Mise en mouvement" : t < 0.5 ? "Construction" : t < 0.75 ? "Progression" : "Consolidation",
      progression: 1.0 + t * 0.35,
      tipKey: t < 0.4 ? "debut" : "endurance",
      isTest: false,
    });
  }
  return phases;
};

const buildPlanPhases = (totalWeeks) => {
  if (totalWeeks === 1) return [{ phase: "competition", focus: "Semaine de compétition", progression: 0.60, tipKey: "competition" }];
  if (totalWeeks === 2) return [{ phase: "base", focus: "Mise en jambes", progression: 1.00, tipKey: "debut" }, { phase: "competition", focus: "Semaine de compétition", progression: 0.60, tipKey: "competition" }];
  if (totalWeeks === 3) return [
    { phase: "base", focus: "Mise en jambes", progression: 1.00, tipKey: "debut" },
    { phase: "development", focus: "Développement", progression: 1.20, tipKey: "endurance" },
    { phase: "competition", focus: "Semaine de compétition", progression: 0.60, tipKey: "competition" },
  ];
  if (totalWeeks === 4) return [
    { phase: "base", focus: "Mise en jambes", progression: 1.00, tipKey: "debut" },
    { phase: "development", focus: "Développement", progression: 1.20, tipKey: "endurance" },
    { phase: "test", focus: "Test de progression", progression: 1.10, tipKey: "test", isTest: true },
    { phase: "competition", focus: "Semaine de compétition", progression: 0.60, tipKey: "competition" },
  ];

  // Affûtage : 2 semaines si plan long (≥10), sinon 1 dès 6 semaines
  const compWeeks = 1;
  const taperWeeks = totalWeeks >= 10 ? 2 : totalWeeks >= 6 ? 1 : 0;
  // Tests : 2 si ≥10 sem, 1 si ≥5
  const testSlots = totalWeeks >= 10 ? 2 : totalWeeks >= 5 ? 1 : 0;
  const remaining = totalWeeks - compWeeks - taperWeeks - testSlots;
  const peakCount = Math.max(1, Math.round(remaining * 0.20));
  const devCount = Math.max(1, Math.round(remaining * 0.38));
  const baseCount = Math.max(1, remaining - peakCount - devCount);
  const phases = [];

  for (let i = 0; i < baseCount; i++) {
    const t = baseCount > 1 ? i / (baseCount - 1) : 0;
    phases.push({ phase: "base", focus: t < 0.45 ? "Mise en jambes" : "Construction aérobie", progression: 1.0 + t * 0.28, tipKey: t < 0.45 ? "debut" : "aerobie", isTest: false });
  }
  if (testSlots >= 1) {
    phases.push({ phase: "test", focus: "Test de progression", progression: 1.10, tipKey: "test", isTest: true });
  }
  for (let i = 0; i < devCount; i++) {
    const t = devCount > 1 ? i / (devCount - 1) : 0;
    phases.push({ phase: "development", focus: t < 0.5 ? "Développement endurance" : "Travail au seuil", progression: 1.28 + t * 0.22, tipKey: t < 0.5 ? "endurance" : "seuil", isTest: false });
  }
  if (testSlots >= 2) {
    phases.push({ phase: "test", focus: "Contrôle allure", progression: 1.30, tipKey: "test", isTest: true });
  }
  for (let i = 0; i < peakCount; i++) {
    const t = peakCount > 1 ? i / (peakCount - 1) : 0;
    phases.push({ phase: "peak", focus: t < 0.5 ? "Intensité & vitesse" : "Volume maximum", progression: 1.50 + t * 0.10, tipKey: t < 0.5 ? "vitesse" : "volume", isTest: false });
  }
  if (taperWeeks === 2) {
    phases.push({ phase: "taper", focus: "Affûtage, volume ↓", progression: 1.10, tipKey: "affutage", isTest: false });
    phases.push({ phase: "taper", focus: "Affûtage final", progression: 0.90, tipKey: "affutage", isTest: false });
  } else if (taperWeeks === 1) {
    phases.push({ phase: "taper", focus: "Affûtage", progression: 1.05, tipKey: "affutage", isTest: false });
  }
  phases.push({ phase: "competition", focus: "Semaine de compétition", progression: 0.60, tipKey: "competition", isTest: false });
  return phases;
};

const FREE_MAX_WEEKS = FREE_WEEKS_LIMIT;

const computePlanTotalWeeks = (profile, referenceTime = Date.now()) => {
  const { goal } = profile;
  const wellness = isWellnessGoal(goal);
  const progression = isProgressionGoal(goal);

  if (progression) return 12;

  if (wellness) {
    if (goal === "perte_de_poids") {
      const loss = Math.max(0, (parseFloat(profile.weightCurrent) || 0) - (parseFloat(profile.weightGoal) || 0));
      return loss > 0 ? Math.min(16, Math.max(4, Math.ceil(loss * 2))) : 8;
    }
    if (goal === "reprendre") return 6;
    return 8;
  }

  const eventDate = profile.eventDate ? new Date(profile.eventDate) : null;
  if (!eventDate || Number.isNaN(eventDate.getTime())) return 8;
  const refDate = new Date(referenceTime);
  return Math.min(52, Math.max(1, Math.ceil((eventDate - refDate) / (7 * 86400000))) || 8);
};

const generatePlan = async (profile, isPremium = false, referenceTime = Date.now(), { skipDelay = false } = {}) => {
  const templatesP = loadSessionTemplates(supabase);
  prefetchNatationCatalogue();
  if (!skipDelay) await new Promise(r => setTimeout(r, 1800));
  await templatesP;
  const { level, sessionsPerWeek: freq, pool, goal } = profile;

  // Active les paces personnalisées pour toute la génération du plan
  _pace100 = profile.pace100 && profile.pace100 > 0 ? profile.pace100 : null;
  _zoneMult = appZoneMultForT100(_pace100);
  _isPremium = !!isPremium;
  const wellness = isWellnessGoal(goal);
  const progression = isProgressionGoal(goal);
  const sessionLoop = usesSessionLoop(profile) || progression;

  // ── Mode boucle : une seule séance à la fois (Nager & Progresser, triathlon, eau libre, diplôme)
  // Pas d'accès à la semaine complète → évite l'impression de séances qui se répètent.
  if (sessionLoop) {
    const cursor = 0;
    const wkKey = isoWeekKey(new Date(referenceTime));
    const { week, sheetError, sheetErrorMessage } = await buildProgressionLoopWeek(
      { ...profile, taste: profile.taste, volumeAdj: profile.volumeAdj },
      cursor,
      isPremium,
      { ordinalIndex: 0, history: [], planStart: referenceTime },
    );
    if (sheetError || !week?.sessions?.length) {
      throw new Error(sheetErrorMessage || "Catalogue Google Sheet indisponible");
    }
    return {
      weeks: [week],
      previewWeeks: [],
      totalRealWeeks: 1,
      isPremium,
      isProgression: progression,
      isSessionLoop: true,
      sessionCursor: Math.max(0, week.sessions.length - 1),
      freeSessionsUsed: isPremium ? 0 : 1,
      weekGenKey: wkKey,
      weekGenCount: isPremium ? 0 : 1,
      history: [],
      startDate: Date.now(),
      version: PLAN_VERSION,
    };
  }

  const rawWeeks = computePlanTotalWeeks(profile, referenceTime);

  const baseDist = BASE_DISTANCES[level] || BASE_DISTANCES.régulier;
  const phaseList = wellness ? buildWellnessPhases(rawWeeks) : buildPlanPhases(rawWeeks);
  // Résolution du levelKey pour les patterns : priorité aux nouveaux niveaux, fallback anciens
  const levelKey = (PHASE_PATTERNS[level] ? level : (level === "advanced" ? "performance" : level === "beginner" ? "régulier" : level === "intermediate" ? "sportif" : "régulier"));
  // WELLNESS_PATTERNS sont indexés par "beginner"/"intermediate"/"advanced"
  const progLvlKey = getLvlIndex(level) >= 3 ? "advanced" : getLvlIndex(level) >= 2 ? "intermediate" : "beginner";
  const patterns = wellness   ? (WELLNESS_PATTERNS[progLvlKey] || WELLNESS_PATTERNS.intermediate)
                 : (goal === "bnssa" || goal === "tests_pompiers" || goal === "caepmns") ? BNSSA_PATTERNS
                 : isOpenWaterGoal(goal) ? (OPEN_WATER_PATTERNS[levelKey] || OPEN_WATER_PATTERNS.sportif)
                 : (PHASE_PATTERNS[levelKey] || PHASE_PATTERNS.régulier);
  const f = Math.min(freq || 3, 5);
  const buildWeeks = (phases) => phases.map((phase, wi) => {
    // Semaine compétition : 1 séance (≤3×/sem) ou 2 (>3), volume ultra-bas
    if (phase.phase === "competition") {
      const n = competitionSessionCount(f);
      const isBeg = level === "découverte" || level === "beginner";
      return {
        number: wi + 1,
        focus: phase.focus,
        tip: COMPETITION_TIP,
        feedback: null,
        isBilan: phase.isBilan ?? false,
        isTest: phase.isTest ?? false,
        sessions: buildCompetitionSessions(pool, n, wi + 1, phase.focus, isBeg),
      };
    }
    const types = patterns[phase.phase]?.[f] || patterns.base[f] || ["endurance"];
    return {
      number: wi + 1, focus: phase.focus, tip: TIPS[phase.tipKey], feedback: null, isBilan: phase.isBilan ?? false, isTest: phase.isTest ?? false,
      sessions: types.map((type, si) => {
        const distBase = Math.round(baseDist[type] * phase.progression / 50) * 50;
        let sessionData = SESSION_TEMPLATES[type](distBase, pool, level, wi * 10 + si, goal);
        const realDist = calcSessionDistance(sessionData.details);
        const deficit = distBase - realDist;
        const fillRep = deficit >= 2000 ? 400 : deficit >= 800 ? 200 : pool * 2;
        const nFill = deficit >= fillRep ? Math.round(deficit / fillRep) : 0;
        let details = sessionData.details;
        if (nFill > 0) {
          const last = details[details.length - 1];
          const hasCooldown = last && (last.toLowerCase().includes('calme') || last.toLowerCase().includes('retour'));
          const fillLine = `${nFill}×${fillRep}m NL, R20", allure régulière, respiration toutes les 3 tractions`;
          details = hasCooldown
            ? [...details.slice(0, -1), fillLine, last]
            : [...details, fillLine];
        }
        const dist = calcSessionDistance(details);
        return { ...sessionData, details, distance: `${dist}m`, duration: Math.max(30, Math.min(120, Math.round(dist / 38))), completed: false, skipped: null };
      }),
    };
  });
  const allWeeks = shouldUseCoachGenerator(goal)
    ? buildCoachPlanWeeks(profile, phaseList, isPremium, TIPS, 5)
    : buildWeeks(phaseList);
  return { weeks: allWeeks, previewWeeks: [], totalRealWeeks: rawWeeks, isPremium, isProgression: false, isSessionLoop: false, startDate: Date.now(), version: PLAN_VERSION };
};

/** Peut-on générer une nouvelle séance (boucle gratuit) ? */
const loopCanGenerateNext = (plan, premium) => {
  if (premium) return { ok: true };
  return { ok: false, reason: "expired" };
};

/** Applique compteurs freemium après une génération de séance boucle. */
const withLoopGenerationCounters = (plan, premium) => {
  if (premium) {
    return { ...plan, weekGenKey: isoWeekKey(), weekGenCount: plan.weekGenCount || 0 };
  }
  const wk = isoWeekKey();
  const prevCount = plan.weekGenKey === wk ? (plan.weekGenCount || 0) : 0;
  return {
    ...plan,
    freeSessionsUsed: (plan.freeSessionsUsed || 0) + 1,
    weekGenKey: wk,
    weekGenCount: prevCount + 1,
  };
};

const loopSessionKey = (s) => (s ? `${s.title || ""}|${s.distance || ""}` : "");

/** Archive + génère la séance suivante. Idempotent si la séance est déjà dans l'historique. */
const buildAdvancedLoopPlan = async (entryPlan, entryProfile, archivedSession, isPremium, tasteProfile) => {
  const prevHist = entryPlan.history || [];
  const alreadyInHist = !!(archivedSession && prevHist.some(
    (s) => loopSessionKey(s) === loopSessionKey(archivedSession),
  ));
  const history = alreadyInHist || !archivedSession
    ? prevHist
    : [...prevHist, { ...archivedSession, archivedAt: new Date().toISOString() }];
  const base = { ...entryPlan, history };
  const gate = loopCanGenerateNext(base, isPremium);
  if (!gate.ok) {
    return { plan: { ...base, weeks: entryPlan.weeks, loopBlocked: gate.reason }, blockedReason: gate.reason };
  }
  const nextCursor = Math.max(
    (entryPlan.sessionCursor ?? 0) + (alreadyInHist ? 0 : 1),
    history.length,
  );
  const { week, sheetError, sheetErrorMessage } = await buildProgressionLoopWeek(
    { ...entryProfile, taste: entryPlan.taste || tasteProfile, volumeAdj: entryPlan.volumeAdj },
    nextCursor,
    isPremium,
    {
      ordinalIndex: history.length,
      history,
      currentSheetN: archivedSession?.sheetMeta?.n,
      currentEducatif:
        archivedSession?.sheetMeta?.educatif ||
        archivedSession?.sheetEducatif?.name ||
        null,
      planStart: entryPlan.startDate,
    },
  );
  if (sheetError || !week?.sessions?.length) {
    return {
      plan: { ...base, weeks: entryPlan.weeks, loopBlocked: null },
      blockedReason: null,
      sheetError: true,
      sheetErrorMessage: sheetErrorMessage || "Catalogue Google Sheet indisponible",
    };
  }
  let next = {
    ...base,
    sessionCursor: nextCursor,
    weeks: [week],
    loopBlocked: null,
  };
  next = withLoopGenerationCounters(next, isPremium);
  return { plan: next, blockedReason: null };
};

// ── APP ───────────────────────────────────────────────────────────────────
const BLANK_PROFILE = {
  category: "",
  goal: "",
  eventDate: "",
  trainingFocus: null,
  level: "",
  pool: 25,
  sessionsPerWeek: null,
  weightCurrent: "",
  weightGoal: "",
  pace100: null,
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  age: "",
  gender: "",
  weightKg: "",
  heightCm: "",
  injuryStatus: null, // "aucune" | "oui"
  injuryZone: null,
  injurySeverity: null,
  injuries: [],
  injuryNote: "", // legacy, plus collecté en free-text
  healthConsent: false,
  healthConsentAt: null,
  healthDeclaration: false,
  swimStyle: null, // "crawl" | "4_nages"
  preferredStroke: null, // "papillon" | "dos" | "brasse" | "crawl"
  /** null = inventaire inconnu ; [] = aucun matos ; sinon ids sports-engine */
  equipment: null,
  /** Distance moyenne souhaitée / séance (m), null = non renseigné (legacy) */
  targetSessionDistance: null,
  /** Demande libre onboarding */
  trainingWish: "",
  trainingWishMeta: null,
};

export default function App() {
  useEffect(() => {
    // Re-register après HMR (évite crash getTabUi / écran blanc)
    registerAppTabUi();
  }, []);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [accessSynced, setAccessSynced] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeSoftContext, setUpgradeSoftContext] = useState(null);
  const [showPlanReady, setShowPlanReady] = useState(false);
  const [planReadyLoading, setPlanReadyLoading] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [whatsNewLoading, setWhatsNewLoading] = useState(false);
  const [planReveal, setPlanReveal] = useState(null);
  const [sessionCelebrate, setSessionCelebrate] = useState(null);
  const [softPaywallPending, setSoftPaywallPending] = useState(false);
  const [cancelSurveyOpen, setCancelSurveyOpen] = useState(false);
  const [loopPaywall, setLoopPaywall] = useState(null); // null | "cap" | "weekly"
  const forceAuthRef = useRef(false);
  /** Empêche le bounce /app→onboarding pendant / juste après signOut. */
  const signingOutRef = useRef(false);
  const checkoutAbandonedRef = useRef(false);
  const welcomeEmailInFlightRef = useRef(null);
  const planRevealPaywallRef = useRef(false);
  const pendingFeedbackRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;
  const authOpenedFromUrlRef = useRef(false);
  const [screen, setScreen] = useState(() => {
    if (isAuthPath(window.location.pathname)) return "auth";
    return "onboarding";
  });
  const [activeTab, setActiveTab] = useState("home");
  const lastDockTabRef = useRef("home");
  /** Navigation onglets : remonte en haut (y compris re-tap sur l’onglet actif). */
  const goTab = (tab) => {
    if (tab === activeTab) {
      scrollAppToTop();
      return;
    }
    if (activeTab === "home" || activeTab === "plan" || activeTab === "analyse" || activeTab === "history") {
      lastDockTabRef.current = activeTab;
    }
    setActiveTab(tab);
  };
  const [step, setStep] = useState(1);
  // Onboarding draft profile (reset à chaque nouveau plan)
  const [profile, setProfile] = useState(BLANK_PROFILE);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [planHistory, setPlanHistory] = useState([]);
  const [addingPlan, setAddingPlan] = useState(false);
  const [questionnaireMode, setQuestionnaireMode] = useState("full");
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [error, setError] = useState(null);
  const [feedbackWeek, setFeedbackWeek] = useState(null);
  const [sessionFeedbackTarget, setSessionFeedbackTarget] = useState(null);
  /** Goûts compte (EMA retours), miroir aussi sur plan.taste pour offline / régénération */
  const [tasteProfile, setTasteProfile] = useState(() => blankTaste());
  const [shareSession, setShareSession] = useState(null);
  const [shareBadgeId, setShareBadgeId] = useState(null);
  const [newBadgeId, setNewBadgeId] = useState(null);
  const lastCompletedSessionRef = useRef(null);

  const openShare = (session, badgeId = null) => {
    const target = session || lastCompletedSessionRef.current || {
      title: badgeId ? "Badge MySWYM" : "Séance MySWYM",
      type: "Partage",
      distance: null,
      duration: null,
      details: [],
    };
    setShareSession(target);
    setShareBadgeId(badgeId || null);
  };
  const [toast, setToast] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const showToast = (msg, duration = 5000) => { setToast(msg); setTimeout(() => setToast(null), duration); };
  /** Horodatage local immédiat, bat un remote stale au visibility sync. */
  const stampPlansLocalCache = (nextPlans, nextActiveId = activePlanId) => {
    if (!user?.id || !Array.isArray(nextPlans)) return;
    try {
      const now = new Date().toISOString();
      localStorage.setItem(`myswym_plans_${user.id}`, JSON.stringify(nextPlans));
      if (nextActiveId) localStorage.setItem(`myswym_active_${user.id}`, nextActiveId);
      localStorage.setItem(`myswym_plans_updated_${user.id}`, now);
    } catch { /* ignore */ }
  };
  const prevBadgesRef = useRef([]);
  const plansHydratedRef = useRef(false);
  const deletedPlanIdsRef = useRef(new Set());
  /** Incrémente à chaque tentative de save, empêche un upsert obsolète d'écraser un 3× tout juste régénéré. */
  const plansSaveGenRef = useRef(0);
  const plansRef = useRef(plans);
  const lastPlanVisibilitySyncAtRef = useRef(0);
  const activePlanIdRef = useRef(activePlanId);
  const planHistoryRef = useRef(planHistory);
  plansRef.current = plans;
  activePlanIdRef.current = activePlanId;
  planHistoryRef.current = planHistory;
  /** Évite un double enchaînement (effet + bouton, Strict Mode). */
  const loopAdvanceKeyRef = useRef(null);
  /** Reprise questionnaire → checkout / génération après auth ou Stripe (évite stale closures). */
  const resumePendingRef = useRef(async () => false);

  // Valeurs dérivées du plan actif
  const accessState = getAccessState(user);
  const waitingForAccess = Boolean(user && isAccessMetadataPending(user) && !accessSynced);
  const isFrozen = Boolean(user && !accessState.hasPremiumAccess && !isAccessMetadataPending(user));
  const canGenerateProgram = !!user && accessState.canGenerateProgram;
  const canUpdateProgram = !!user && accessState.canUpdateProgram;
  const activePlanEntry = plans.find(e => e.id === activePlanId) ?? null;
  const plan            = activePlanEntry?.plan    ?? null;
  const activeProfile   = activePlanEntry?.profile ?? BLANK_PROFILE;

  useEffect(() => {
    if (activeTab !== "buddies") return;
    const n = plan ? computeStats(plan).totalSessions : 0;
    if (n < 1) setActiveTab("home");
  }, [activeTab, plan]);

  // Sprint A, scroll top à chaque changement d’onglet / d’écran principal
  useEffect(() => {
    scrollAppToTop();
  }, [activeTab]);

  useEffect(() => {
    if (screen === "app" || screen === "onboarding" || screen === "auth") {
      scrollAppToTop();
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== "onboarding") return undefined;
    const prev = document.title;
    document.title = "Créer mon plan | MySWYM";
    return () => { document.title = prev; };
  }, [screen]);

  // Sprint C, jamais rester bloqué sur Loading / sync accès
  useEffect(() => {
    if (screen !== "loading") return undefined;
    const t = setTimeout(() => {
      setScreen((prev) => (prev === "loading" ? "app" : prev));
      showToast("Ça a pris trop longtemps. Réessaie.", 6000);
      track("generation_failed", { reason: "timeout", context: "loading_screen" });
    }, 25000);
    return () => clearTimeout(t);
  }, [screen]);

  useEffect(() => {
    if (!waitingForAccess) return undefined;
    const t = setTimeout(() => {
      setAccessSynced(true);
      showToast("Connexion lente, tu peux continuer.", 5000);
    }, 12000);
    return () => clearTimeout(t);
  }, [waitingForAccess]);

  // Routes auth : /connexion, /inscription (+ anciens liens ?auth=…)
  // Priorité absolue : ces URLs ne doivent JAMAIS afficher le questionnaire.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const legacyAuth = params.get("auth");
    if (legacyAuth === "login") {
      navigate("/connexion", { replace: true });
      return;
    }
    if (legacyAuth === "register") {
      navigate("/app", { replace: true });
      return;
    }
    if (isAuthPath(location.pathname)) {
      // Déjà connecté → /app, SAUF pendant une déconnexion (forceAuth déjà true).
      // Sinon : navigate(/connexion) avant signOut → bounce /app → quiz.
      if (user && !forceAuthRef.current) {
        forceAuthRef.current = false;
        authOpenedFromUrlRef.current = false;
        navigate("/app", { replace: true });
        return;
      }
      authOpenedFromUrlRef.current = true;
      forceAuthRef.current = true;
      setScreen("auth");
      return;
    }
    // /connexion|/inscription → /app (CTA Commencer) : même composant App, il faut quitter l’écran auth.
    // Ne pas traiter un bounce tardif post-déconnexion (signingOutRef / forceAuth + user null).
    if (!user && location.pathname.startsWith("/app") && forceAuthRef.current && !signingOutRef.current) {
      forceAuthRef.current = false;
      authOpenedFromUrlRef.current = false;
      setScreen("onboarding");
      const prefill = readPersistedOnboardingPrefill();
      if (prefill) {
        setProfile((prev) => ({ ...prev, ...profilePatchFromPrefill(prefill) }));
        setStep(stepFromPrefill(prefill));
      } else {
        setStep(1);
      }
    }
  }, [location.pathname, location.search, navigate, user]);

  const onboardingPrefillRef = useRef(false);
  useEffect(() => {
    const fromUrl = parseOnboardingPrefill(location.search);
    if (fromUrl) persistOnboardingPrefill(fromUrl);
    if (isAuthPath(location.pathname)) return;
    if (!location.pathname.startsWith("/app")) return;
    const prefill = fromUrl || readPersistedOnboardingPrefill();
    if (!prefill) return;
    if (onboardingPrefillRef.current && !fromUrl) return;
    onboardingPrefillRef.current = true;
    setProfile((prev) => ({ ...prev, ...profilePatchFromPrefill(prefill) }));
    setStep(stepFromPrefill(prefill));
    if (fromUrl) navigate("/app", { replace: true });
  }, [location.pathname, location.search, navigate]);

  const openAuth = (mode = "password") => {
    forceAuthRef.current = true;
    navigate(mode === "register" ? "/inscription" : "/connexion");
  };

  const openUpgrade = (softContext = null) => {
    trackEvent("paywall_shown", {
      context: softContext || "generic",
      access_status: accessState.status,
    });
    track("paywall_viewed", {
      context: softContext || "generic",
      access_status: accessState.status,
      level: personPropertiesFromProfile(activeProfile).level,
      objective: personPropertiesFromProfile(activeProfile).objective,
      premium: !!isPremium,
    }, { onceKey: `paywall_viewed:${softContext || "generic"}:${activePlanId || "none"}` });
    setUpgradeSoftContext(softContext);
    setShowUpgrade(true);
  };
  const closeUpgrade = () => {
    setShowUpgrade(false);
    setUpgradeSoftContext(null);
  };

  // Soft paywall après la 1ʳᵉ séance : attendre la fermeture des sheets feedback.
  useEffect(() => {
    if (!softPaywallPending || isPremium || showUpgrade) return;
    if (sessionFeedbackTarget !== null || feedbackWeek !== null) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      try {
        if (localStorage.getItem(SOFT_PAYWALL_STORAGE_KEY)) {
          setSoftPaywallPending(false);
          return;
        }
        localStorage.setItem(SOFT_PAYWALL_STORAGE_KEY, "1");
      } catch { /* ignore */ }
      setSoftPaywallPending(false);
      openUpgrade("after_first_session");
    }, 1100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [softPaywallPending, isPremium, showUpgrade, sessionFeedbackTarget, feedbackWeek]);

  // Pop « Nouveautés » one-shot / compte (pas de reset plan / quiz).
  useEffect(() => {
    if (screen !== "app" || !user || !plan) return;
    if (showWhatsNew) return;
    if (hasSeenWhatsNew(user)) {
      void syncWhatsNewSeenIfNeeded(user).then((u) => {
        if (u) setUser(u);
      });
      return;
    }
    if (showUpgrade || showPlanReady || softPaywallPending) return;
    if (sessionCelebrate || sessionFeedbackTarget !== null || feedbackWeek !== null) return;
    if (loopPaywall || replaceConfirmOpen || deletePlanId) return;
    const t = setTimeout(() => setShowWhatsNew(true), 600);
    return () => clearTimeout(t);
  }, [
    screen,
    user,
    plan,
    showWhatsNew,
    showUpgrade,
    showPlanReady,
    softPaywallPending,
    sessionCelebrate,
    sessionFeedbackTarget,
    feedbackWeek,
    loopPaywall,
    replaceConfirmOpen,
    deletePlanId,
  ]);

  const exitAuthToQuiz = () => {
    forceAuthRef.current = false;
    authOpenedFromUrlRef.current = false;
    setScreen("onboarding");
    setStep(1);
    navigate("/app");
  };

  const handleAuthNavigateMode = (mode) => {
    navigate(mode === "register" ? "/inscription" : "/connexion", { replace: true });
  };

  const handleAuthBack = () => {
    forceAuthRef.current = false;
    const openedFromUrl = authOpenedFromUrlRef.current;
    authOpenedFromUrlRef.current = false;
    if (plans.length > 0) {
      setScreen("app");
      navigate("/app", { replace: true });
      return;
    }
    if (user) {
      setScreen("app");
      setActiveTab("plan");
      navigate("/app", { replace: true });
      return;
    }
    // Depuis le questionnaire → rester sur le quiz ; lien direct /connexion → landing
    setScreen("onboarding");
    navigate(openedFromUrl ? "/" : "/app", { replace: true });
  };

  const handleAuthSuccess = (u) => {
    const isSignup = location.pathname === "/inscription";
    trackEvent(isSignup ? "signup_completed" : "login_completed", {}, { essential: true });
    if (isSignup) {
      track("signup_completed", {}, { onceKey: `signup_completed:${u?.id || "anon"}` });
    }
    setUser(u);
    forceAuthRef.current = false;
    authOpenedFromUrlRef.current = false;
    navigate("/app", { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;
    window.history.replaceState({}, "", window.location.pathname);

    const applyUser = (u) => {
      if (!u) return;
      setUser(u);
      const premium = checkIsPremium(u);
      setIsPremium(premium);
      if (premium) closeUpgrade();
      return premium;
    };

    const syncAndApply = () => syncSubscriptionFromStripe()
      .then(async (u) => {
        const premium = applyUser(u);
        if (payment === "success" && premium) {
          setShowPlanReady(false);
          // Legacy / race : si un pending quiz reste, générer. Sinon le plan aperçu est déjà là.
          if (readPendingOnboarding()) {
            await resumePendingRef.current(u);
          } else {
            clearPendingOnboarding();
          }
        }
      })
      .catch(() => supabase.auth.refreshSession().then(({ data }) => applyUser(data?.user)));

    if (payment === "success" || payment === "portal") {
      if (payment === "success") {
        trackEvent("checkout_returned_success", {}, { essential: true });
      }
      syncAndApply();
      if (payment === "success") {
        showToast("Premium activé, ton plan est débloqué.", 8000);
      }
      const retry = (ms) => setTimeout(syncAndApply, ms);
      const t1 = retry(2000);
      const t2 = retry(5000);
      const t3 = retry(10000);
      const t4 = retry(20000);
      const t5 = retry(30000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
    }

    if (payment === "cancel") {
      trackEvent("checkout_abandoned", {}, { essential: true });
      // Sortie définitive du tunnel paiement, plus de pending / plus de re-checkout auto
      clearPendingOnboarding();
      checkoutAbandonedRef.current = true;
      setAuthLoading(false);
      showToast("Pas de souci, tu peux activer l’essai quand tu veux.", 8000);
      // Aperçu déjà généré → sheet. Sinon questionnaire + modal (jamais Loading bloqué).
      setShowPlanReady(true);
      openUpgrade("trial_required");
      if (!(isAuthPath(locationRef.current.pathname) || forceAuthRef.current)) {
        setScreen((prev) => {
          if (prev === "loading" || prev === "auth") return "app";
          return prev;
        });
        setActiveTab((tab) => tab || "plan");
      }
    }
    supabase.auth.refreshSession().then(({ data }) => applyUser(data?.user));
  }, []);

  // ── Strava OAuth callback ────────────────────────────────────────────────
  // Strava redirige vers {origin}?code=...&state=strava_connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    const state  = params.get("state");
    if (state !== "strava_connect" || !code) return;

    // Nettoie l'URL immédiatement
    window.history.replaceState({}, "", window.location.pathname);

    const handle = async () => {
      // Attend que la session soit prête (l'utilisateur était déjà connecté avant le redirect)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast("Erreur Strava : session expirée, reconnecte-toi.", 8000); return; }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/app`,
            }),
          }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const syncNote = json.initial_sync?.error
          ? " · sync manuelle depuis Profil si besoin"
          : json.initial_sync?.synced
            ? ` · ${json.initial_sync.synced} activité(s) importée(s)`
            : "";
        showToast(`Strava connecté${json.athlete ? `, Bonjour ${json.athlete}` : ""}${syncNote}`, 8000);
        window.dispatchEvent(new Event("myswym:strava-connected"));
        setActiveTab("home");
      } catch (e) {
        showToast(`Erreur Strava : ${e.message}`, 8000);
        setActiveTab("home");
      }
    };

    // Petit délai pour laisser onAuthStateChange s'initialiser si nécessaire
    const t = setTimeout(handle, 400);
    return () => clearTimeout(t);
  }, []);

  // Régénère le plan actif quand le premium est débloqué et que le plan était tronqué
  // (plans multi-semaines uniquement, la boucle Nager & Progresser a toujours 1 semaine)
  useEffect(() => {
    if (!activePlanEntry) return;
    const { plan: ap, profile: aprof } = activePlanEntry;
    if (!aprof?.goal || !ap?.weeks) return;
    if (ap.isSessionLoop || ap.isProgression || usesSessionLoop(aprof)) return;
    const originalStartDate = ap.startDate ?? activePlanEntry.startDate ?? Date.now();
    const expectedWeeks = computePlanTotalWeeks(aprof, originalStartDate);
    const storedWeeks = ap.totalRealWeeks ?? 0;
    const needsLegacyRepair = expectedWeeks > ap.weeks.length;
    const needsMoreWeeks = Math.max(storedWeeks, expectedWeeks) > ap.weeks.length;
    const needsMetadataRepair = storedWeeks > 0 && storedWeeks < expectedWeeks;
    if (!needsLegacyRepair && !needsMoreWeeks && !needsMetadataRepair) return;
    let cancelled = false;
    setScreen("loading");
    const taste = ap.taste || tasteProfile;
    generatePlan({ ...aprof, taste }, true, originalStartDate)
      .then(newPlan => {
        if (cancelled) return;
        const mergedWeeks = mergePreservingProgress(ap.weeks ?? [], newPlan.weeks);
        const planWithDate = {
          ...newPlan,
          taste,
          weeks: mergedWeeks,
          previewWeeks: [],
          ...(originalStartDate ? { startDate: originalStartDate } : {}),
        };
        setPlans(prev => prev.map(e => e.id === activePlanId ? { ...e, plan: planWithDate } : e));
        setScreen("app"); setActiveTab("home");
      })
      .catch(() => {
        if (!cancelled) {
          setScreen("app");
          track("generation_failed", { reason: "exception", context: "week_repair" });
        }
      });
    return () => { cancelled = true; };
  }, [activePlanId, tasteProfile, plan?.isSessionLoop, plan?.weeks?.length, plan?.totalRealWeeks]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Lien de réinitialisation cliqué → afficher l'écran de nouveau mot de passe
        setUser(session?.user ?? null);
        setIsRecovery(true);
        setAuthLoading(false);
        return;
      }
      const u = session?.user ?? null;
      setUser(u);
      setIsPremium(checkIsPremium(u));
      if (u) {
        setAccessSynced(!isAccessMetadataPending(u));
        // Si on est sur /connexion alors qu’une session existe, renvoyer à l’app
        // (ne jamais laisser loadUserData coller le quiz sous l’URL auth).
        if (isAuthPath(locationRef.current.pathname)) {
          forceAuthRef.current = false;
          authOpenedFromUrlRef.current = false;
          navigate("/app", { replace: true });
        } else {
          forceAuthRef.current = false;
        }
        loadUserData(u.id, checkIsPremium(u)).finally(() => setAuthLoading(false));
        // Resync Stripe → app_metadata à chaque session (ferme les falsifications user_metadata)
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          // Welcome email (email + Google), retry OAuth-safe, pas de catch silencieux
          if (!welcomeEmailInFlightRef.current && u.app_metadata?.welcome_email_sent !== true) {
            welcomeEmailInFlightRef.current = ensureWelcomeEmail(u)
              .then((res) => {
                if (!res.ok && !res.skipped) {
                  console.error("[welcome-email] abandoned after retries:", res.error);
                }
              })
              .finally(() => { welcomeEmailInFlightRef.current = null; });
          }
          syncSubscriptionFromStripe()
            .then(async (synced) => {
              const effective = synced || u;
              if (!effective) return;
              if (synced) {
                setUser(synced);
                const premium = checkIsPremium(synced);
                setIsPremium(premium);
                const syncedAccess = getAccessState(synced);
                if (syncedAccess.status === ACCESS_STATUS.TRIAL) {
                  trackEvent("trial_started", {
                    trial_ends_at: syncedAccess.trialEndsAt,
                  }, { essential: true });
                  track("trial_started", {
                    trial_ends_at: syncedAccess.trialEndsAt,
                    premium: true,
                  }, { onceKey: `trial_started:${synced.id}` });
                }
                if (syncedAccess.status === ACCESS_STATUS.ACTIVE) {
                  track("subscription_started", {
                    premium: true,
                  }, { onceKey: `subscription_started:${synced.id}` });
                }
                if (premium !== checkIsPremium(u)) loadUserData(synced.id, premium);
              }
              // Quiz stashed → générer l’aperçu (même si sync a partiellement échoué)
              if (
                (event === "SIGNED_IN" || event === "INITIAL_SESSION")
                && readPendingOnboarding()
                && !checkoutAbandonedRef.current
              ) {
                await resumePendingRef.current(effective);
              }
            })
            .catch(async () => {
              // Sync KO : ne jamais laisser un pending coller l’UI sur Loading
              if (readPendingOnboarding() && !checkoutAbandonedRef.current) {
                try { await resumePendingRef.current(u); }
                catch {
                  clearPendingOnboarding();
                  if (!(isAuthPath(locationRef.current.pathname) || forceAuthRef.current)) {
                    setStep(1);
                    setScreen("app");
                    setActiveTab("plan");
                  }
                }
              }
            })
            .finally(() => setAccessSynced(true));
        }
      } else if (forceAuthRef.current || isAuthPath(locationRef.current.pathname) || event === "SIGNED_OUT") {
        setAccessSynced(false);
        setScreen("auth");
        setAuthLoading(false);
        // Déconnexion explicite → /connexion (pas le questionnaire /app)
        if (event === "SIGNED_OUT") {
          signingOutRef.current = true;
          plansHydratedRef.current = false;
          resetAnalytics();
          setPlans([]);
          setActivePlanId(null);
          setPlanHistory([]);
          setAddingPlan(false);
          setQuestionnaireMode("full");
          setTasteProfile(blankTaste());
          setProfile(BLANK_PROFILE);
          setStep(1);
          forceAuthRef.current = true;
          authOpenedFromUrlRef.current = true;
          setScreen("auth");
          navigate("/connexion", { replace: true });
          setTimeout(() => { signingOutRef.current = false; }, 500);
        }
      } else {
        plansHydratedRef.current = false;
        resetAnalytics();
        setAccessSynced(false);
        setScreen("onboarding");
        const prefill = readPersistedOnboardingPrefill();
        if (prefill) {
          setProfile({ ...BLANK_PROFILE, ...profilePatchFromPrefill(prefill) });
          setStep(stepFromPrefill(prefill));
        } else {
          setStep(1);
          setProfile(BLANK_PROFILE);
        }
        setPlans([]); setActivePlanId(null); setPlanHistory([]); setAddingPlan(false); setQuestionnaireMode("full"); setTasteProfile(blankTaste()); setAuthLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Filet : ne jamais rester bloqué sur le spinner Waves si auth ne répond pas
  useEffect(() => {
    if (!authLoading) return undefined;
    const t = setTimeout(() => {
      setAuthLoading(false);
      if (isAuthPath(locationRef.current.pathname) || forceAuthRef.current) {
        setScreen("auth");
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [authLoading]);

  // Analytics V1, app_opened (1× / session navigateur)
  useEffect(() => {
    trackAppOpened({ premium: !!isPremium });
  }, []);

  // Analytics V1, identify + person props (non sensibles)
  useEffect(() => {
    if (!user?.id) return;
    identify(user.id, personPropertiesFromProfile(activeProfile, { premium: !!isPremium }));
  }, [user?.id, isPremium, activeProfile?.level, activeProfile?.goal, activeProfile?.sessionsPerWeek, activeProfile?.pool]);

  // Analytics V1, onboarding_started
  useEffect(() => {
    const inAppQuiz = screen === "app" && (!plan || addingPlan) && activeTab === "plan" && step === 1;
    const fullscreenQuiz = screen === "onboarding" && step === 1;
    if (!inAppQuiz && !fullscreenQuiz) return;
    track("onboarding_started", personPropertiesFromProfile(profile), {
      onceKey: `onboarding_started:${user?.id || "anon"}`,
    });
  }, [screen, step, user?.id, activeTab, plan, addingPlan]);

  // Compte connecté : ne jamais rester bloqué sur le questionnaire plein écran (perte paramètres)
  useEffect(() => {
    if (!user || screen !== "onboarding") return;
    setScreen("app");
    // Plans encore en chargement : ne pas écraser l'onglet courant (loadUserData
    // envoie lui-même sur Programme quand le compte n'a réellement aucun plan).
    const confirmedNoPlan = plansHydratedRef.current && plans.length === 0;
    if (confirmedNoPlan || addingPlan) setActiveTab("plan");
  }, [user, screen, plans.length, addingPlan]);

  // Analytics V1, plan_viewed
  useEffect(() => {
    if (screen !== "app" || !plan || !activePlanId) return;
    if (activeTab !== "plan" && activeTab !== "home") return;
    track("plan_viewed", {
      ...personPropertiesFromProfile(activeProfile, { premium: !!isPremium }),
      totalWeeks: plan.totalRealWeeks ?? plan.weeks?.length ?? null,
    }, { onceKey: `plan_viewed:${activePlanId}` });
  }, [screen, activeTab, activePlanId, plan?.weeks?.length]);

  // Banque séances Supabase (lecture publique), avant / pendant generatePlan
  useEffect(() => {
    loadSessionTemplates(supabase);
    prefetchNatationCatalogue();
  }, []);

  async function loadUserData(userId, userIsPremium = false) {
    const enforce = (p) => p;
    deletedPlanIdsRef.current = readDeletedPlanIds(userId);

    // Goûts compte (Supabase), fallback localStorage du compte uniquement
    let loadedTaste = blankTaste();
    try {
      const { data: tasteRow, error: tasteErr } = await supabase
        .from("user_taste_profile")
        .select("scores")
        .eq("user_id", userId)
        .maybeSingle();
      if (tasteErr) {
        if (import.meta.env.DEV) console.warn("[taste] load failed, using localStorage", tasteErr.message);
        const raw = localStorage.getItem(`myswym_taste_${userId}`);
        if (raw) loadedTaste = normalizeTaste(JSON.parse(raw));
      } else if (tasteRow?.scores) {
        loadedTaste = normalizeTaste(tasteRow.scores);
      } else {
        const raw = localStorage.getItem(`myswym_taste_${userId}`);
        if (raw) loadedTaste = normalizeTaste(JSON.parse(raw));
      }
    } catch {
      try {
        const raw = localStorage.getItem(`myswym_taste_${userId}`);
        if (raw) loadedTaste = normalizeTaste(JSON.parse(raw));
      } catch {}
    }
    setTasteProfile(loadedTaste);
    if (loadedTaste.sampleCount > 0) {
      try { localStorage.setItem(`myswym_taste_${userId}`, JSON.stringify(loadedTaste)); } catch {}
      supabase.from("user_taste_profile").upsert({
        user_id: userId,
        scores: loadedTaste,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) {
          if (import.meta.env.DEV) console.warn("[taste] upsert failed (local kept)", error.message);
          return;
        }
      });
    }
    const finalize = (existing, existingActive, existingHistory = []) => {
      let merged = stampPlansAccess(dedupePlans(existing || []), userIsPremium);
      let active = existingActive || null;
      const enforced = enforceSingleActivePlan(merged, active, existingHistory);
      merged = enforced.plans;
      active = enforced.activeId;
      setPlanHistory(enforced.history || []);
      try {
        localStorage.setItem(`myswym_plan_history_${userId}`, JSON.stringify(enforced.history || []));
      } catch { /* ignore */ }
      if (merged.length > 0) {
        setPlans(merged);
        setActivePlanId(active || merged[0].id);
        setScreen("app");
        plansHydratedRef.current = true;
        return true;
      }
      return false;
    };

    const enforceAll = (arr) => (arr || []).map(e => ({ ...e, plan: enforce(e.plan) }));
    const cachePlans = (arr, activeId, updatedAt) => {
      try {
        const ts = updatedAt || new Date().toISOString();
        localStorage.setItem(`myswym_plans_${userId}`, JSON.stringify(arr));
        localStorage.setItem(`myswym_active_${userId}`, activeId || arr[0].id);
        localStorage.setItem(`myswym_plans_updated_${userId}`, ts);
      } catch {}
    };

    // 1. localStorage (cache hors-ligne)
    let localPlans = null, localActive = null, localUpdatedAt = 0;
    try {
      const raw = localStorage.getItem(`myswym_plans_${userId}`);
      localActive = localStorage.getItem(`myswym_active_${userId}`);
      const ts = localStorage.getItem(`myswym_plans_updated_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) localPlans = parsed;
      }
      if (ts) localUpdatedAt = new Date(ts).getTime() || 0;
    } catch {}

    // 2. Supabase, source de vérité cross-device (blob seulement si plus récent que le cache)
    let remotePlans = null, remoteActive = null, remoteUpdatedAt = 0;
    let remoteHistory = [];
    try {
      const loaded = await loadRemotePlansIfNewer(supabase, userId, localUpdatedAt);
      if (!loaded.error && loaded.fetchedBlob && loaded.data) {
        const parsed = parseUserPlansBlob(loaded.data);
        remoteUpdatedAt = parsed.updatedAt;
        remoteHistory = parsed.history;
        if (parsed.plans.length > 0) {
          remotePlans = parsed.plans;
          remoteActive = parsed.active;
        } else {
          const { data: legacy } = await fetchUserPlansLegacy(supabase, userId);
          if (legacy?.profile && legacy?.plan) {
            const id = `plan_${Date.now()}`;
            remotePlans = [{ id, profile: legacy.profile, plan: legacy.plan }];
            remoteActive = id;
          }
        }
      } else if (loaded.skipped) {
        remoteUpdatedAt = loaded.remoteTime || 0;
        remoteActive = loaded.activePlanId || null;
      }
    } catch {}

    let localHistory = [];
    try {
      const rawH = localStorage.getItem(`myswym_plan_history_${userId}`);
      if (rawH) {
        const parsedH = JSON.parse(rawH);
        if (Array.isArray(parsedH)) localHistory = parsedH;
      }
    } catch {}

    const histById = new Map();
    for (const h of [...remoteHistory, ...localHistory]) {
      if (h?.id) histById.set(h.id, h);
    }
    const mergedHistorySeed = [...histById.values()];

    let chosenPlans = null, chosenActive = null, chosenUpdatedIso = null;
    if (localPlans || remotePlans) {
      const merged = mergePlanLists(
        localPlans, remotePlans, localActive, remoteActive, localUpdatedAt, remoteUpdatedAt, null, deletedPlanIdsRef.current
      );
      const single = enforceSingleActivePlan(merged.plans, merged.active, mergedHistorySeed);
      chosenPlans = single.plans;
      chosenActive = single.activeId;
      chosenUpdatedIso = merged.updatedAt;
      // Remplace mergedHistorySeed par l'historique enrichi (plans archivés)
      mergedHistorySeed.length = 0;
      mergedHistorySeed.push(...single.history);
    }

    if (chosenPlans?.length) {
      const enforced = enforceAll(chosenPlans);
      // Étape K : reconstruire _engineHistory depuis les faits Supabase (si migration appliquée)
      let withFacts = enforced;
      let sportRowFields = {};
      try {
        const { ok, facts } = await sportsPersistence.loadSportsFacts(userId, chosenActive);
        if (ok && facts) {
          sportRowFields = rowToSportProfileFields(facts.sportProfile);
          withFacts = enforced.map((e) => {
            const hydratedProfile = {
              ...e.profile,
              ...hydrateSwimmerFromSources({
                sportRowFields,
                planProfile: e.profile,
              }),
            };
            return {
              ...e,
              profile: sportsPersistence.attachEngineHistoryToProfile(hydratedProfile, e.plan, facts),
              plan: {
                ...e.plan,
                _engineHistory: sportsPersistence.attachEngineHistoryToProfile(hydratedProfile, e.plan, facts)._engineHistory,
                volumeAdj: e.plan?.volumeAdj ?? 1,
              },
            };
          });
        } else {
          // Compat blob : s'assurer que profile porte volumeAdj + history plan
          withFacts = enforced.map((e) => ({
            ...e,
            profile: sportsPersistence.attachEngineHistoryToProfile(e.profile, e.plan, null),
          }));
        }
      } catch {
        withFacts = enforced.map((e) => ({
          ...e,
          profile: sportsPersistence.attachEngineHistoryToProfile(e.profile, e.plan, null),
        }));
      }
      cachePlans(withFacts, chosenActive, chosenUpdatedIso);
      try {
        localStorage.setItem(`myswym_plan_history_${userId}`, JSON.stringify(mergedHistorySeed));
      } catch {}
      const remoteIds = new Set((remotePlans || []).map((e) => e.id));
      const localHadExtra = withFacts.some((e) => !remoteIds.has(e.id));
      const needsSinglePersist = (remotePlans || []).length > 1 || withFacts.length > 1;
      if (localHadExtra || !remotePlans?.length || needsSinglePersist) {
        persistAccountPlans(userId, withFacts, chosenActive, deletedPlanIdsRef.current, mergedHistorySeed).then(({ plans: synced, active, history }) => {
          if (history) setPlanHistory(history);
          if (synced?.length && (synced.length !== withFacts.length || active !== chosenActive)) {
            setPlans(synced);
            setActivePlanId(active);
          }
        }).catch(() => {});
      }
      if (finalize(withFacts, chosenActive, mergedHistorySeed)) return;
    }

    // 3. Ancien localStorage mono-plan (migration)
    try {
      const sp  = localStorage.getItem(`myswym_profile_${userId}`);
      const spl = localStorage.getItem(`myswym_plan_${userId}`);
      if (sp && spl) {
        const id = `plan_${Date.now()}`;
        const entry = { id, profile: JSON.parse(sp), plan: enforce(JSON.parse(spl)) };
        if (finalize([entry], id, mergedHistorySeed)) return;
      }
    } catch {}

    // 4. Aucun plan existant, reprendre le pending (quiz) plutôt que reset éternel à l’étape 1
    if (!finalize([], null, mergedHistorySeed)) {
      plansHydratedRef.current = true;
      // Race : resumePending a pu écrire le plan pendant ce load
      try {
        const raw = localStorage.getItem(`myswym_plans_${userId}`);
        const activeId = localStorage.getItem(`myswym_active_${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (finalize(enforceAll(parsed), activeId, mergedHistorySeed)) return;
          }
        }
      } catch {}

      // /connexion|/inscription gagne toujours, ne jamais écraser AuthScreen
      if (isAuthPath(locationRef.current.pathname) || forceAuthRef.current) {
        setScreen("auth");
        return;
      }

      const pending = readPendingOnboarding();
      if (pending?.profile && !checkoutAbandonedRef.current) {
        // Reprendre ICI (source unique), ne pas attendre sync-subscription
        // sinon sync KO / hang = spinner Loading éternel.
        setScreen("loading");
        try {
          const { data } = await supabase.auth.getUser();
          const u = data?.user;
          if (u) {
            const ok = await resumePendingRef.current(u);
            if (ok) return;
          }
        } catch { /* fall through */ }
        clearPendingOnboarding();
      }

      // Abandon paiement : ne JAMAIS vider un aperçu déjà généré / hydraté
      if (checkoutAbandonedRef.current) {
        checkoutAbandonedRef.current = false;
        clearPendingOnboarding();
        setScreen("app");
        setActiveTab("plan");
        plansHydratedRef.current = true;
        return;
      }
      setPlans([]);
      setActivePlanId(null);
      setPlanHistory(mergedHistorySeed);
      setProfile(BLANK_PROFILE);
      setStep(1);
      setQuestionnaireMode("full");
      setScreen("app");
      setActiveTab("plan");
    }
  }

  // Vérifie le statut abonnement automatiquement (retour sur l'app + toutes les 5 min)
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const u = await syncSubscriptionFromStripe();
        if (u) {
          setUser(u);
          setIsPremium(checkIsPremium(u));
          setAccessSynced(true);
        }
      } catch {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
          setIsPremium(checkIsPremium(data.user));
          setAccessSynced(true);
        }
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, [user?.id]);

  useEffect(() => {
    if (!user || plans.length === 0 || !plansHydratedRef.current) return;
    const timeoutId = setTimeout(() => {
      const saveGen = ++plansSaveGenRef.current;
      const snapshot = plansRef.current;
      const activeSnap = activePlanIdRef.current;
      const historySnap = planHistoryRef.current;
      (async () => {
        const { plans: merged, active, history, error } = await persistAccountPlans(
          user.id, snapshot, activeSnap, deletedPlanIdsRef.current, historySnap
        );
        if (saveGen !== plansSaveGenRef.current) return;
        if (error) {
          if (import.meta.env.DEV) console.warn("[plans] autosave failed", error.message);
          return;
        }
        deletedPlanIdsRef.current = new Set();
        if (Array.isArray(history)) setPlanHistory(history);
        const mergedIds = merged.map((e) => e.id).sort().join(",");
        const currentIds = snapshot.map((e) => e.id).sort().join(",");
        if (mergedIds !== currentIds || active !== activeSnap) {
          setPlans(merged);
          setActivePlanId(active);
        }
      })();
    }, PLANS_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [plans, activePlanId, planHistory, user]);

  // Re-sync au retour sur l'app : blob JSON seulement si remote nettement plus récent (throttle)
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const syncFromRemote = async () => {
      try {
        const now = Date.now();
        if (now - lastPlanVisibilitySyncAtRef.current < PLAN_VISIBILITY_SYNC_MIN_MS) return;
        lastPlanVisibilitySyncAtRef.current = now;

        const currentPlans = plansRef.current;
        const currentActive = activePlanIdRef.current;
        const currentHistory = planHistoryRef.current;
        let localPlans = [];
        const localRaw = localStorage.getItem(`myswym_plans_${userId}`);
        const localActive = localStorage.getItem(`myswym_active_${userId}`);
        const localTime = storedPlansUpdatedAtMs(userId);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) localPlans = parsed;
        }

        const loaded = await loadRemotePlansIfNewer(supabase, userId, localTime);
        if (loaded.error || loaded.skipped || !loaded.data) return;
        const parsedRemote = parseUserPlansBlob(loaded.data);
        const remotePlans = parsedRemote.plans;
        const remoteHistory = parsedRemote.history;
        const remoteTime = parsedRemote.updatedAt;
        if (!localPlans.length && !remotePlans.length) return;

        const enforce = (p) => p;
        const { plans: merged, active, updatedAt } = mergePlanLists(
          localPlans, remotePlans, localActive, parsedRemote.active, localTime, remoteTime, currentActive, deletedPlanIdsRef.current
        );
        const histSeed = [...currentHistory];
        for (const h of remoteHistory) {
          if (h?.id && !histSeed.some((x) => x?.id === h.id)) histSeed.push(h);
        }
        const single = enforceSingleActivePlan(merged, active, histSeed);
        const enforced = single.plans.map(e => ({ ...e, plan: enforce(e.plan) }));

        const mergedIds = enforced.map(e => e.id).sort().join(",");
        const currentIds = currentPlans.map(e => e.id).sort().join(",");
        const mergedProgress = enforced.reduce((s, e) => s + planProgressScore(e), 0);
        const currentProgress = currentPlans.reduce((s, e) => s + planProgressScore(e), 0);
        const localFreq = currentPlans.find(e => e.id === currentActive)?.profile?.sessionsPerWeek;
        const mergedFreq = enforced.find(e => e.id === single.activeId)?.profile?.sessionsPerWeek;

        if (!shouldApplyRemotePlanSync({
          localTime,
          remoteTime,
          currentProgress,
          mergedProgress,
        })) return;

        if (
          mergedIds === currentIds
          && enforced.length === currentPlans.length
          && mergedProgress <= currentProgress
          && (mergedProgress < currentProgress || localFreq === mergedFreq || localTime >= remoteTime)
        ) return;

        const syncInfo = describePlanSyncChange({
          beforePlans: currentPlans,
          afterPlans: enforced,
          beforeActiveId: currentActive,
          afterActiveId: single.activeId,
        });
        setPlans(enforced);
        setActivePlanId(single.activeId);
        setPlanHistory(single.history);
        localStorage.setItem(`myswym_plans_${userId}`, JSON.stringify(enforced));
        if (single.activeId) localStorage.setItem(`myswym_active_${userId}`, single.activeId);
        localStorage.setItem(`myswym_plan_history_${userId}`, JSON.stringify(single.history));
        localStorage.setItem(`myswym_plans_updated_${userId}`, updatedAt);
        if (syncInfo?.message) {
          showToast(syncInfo.message, 4500);
          track("plan_sync_applied", {
            reason: syncInfo.reason,
            context: "visibility_sync",
          });
        }
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") syncFromRemote(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user?.id]);


  // Migration : plans version < PLAN_VERSION, régénère le contenu, merge séance par séance.
  // FORCE_PLAN_REGEN ne bypass plus le merge (hotfix 2026-08-15) : une séance validée est toujours conservée.
  // Aussi : objectifs boucle (progression / triathlon / eau libre / diplôme) multi-semaines → séance unique.
  useEffect(() => {
    if (plans.length === 0 || screen !== "app") return;
    const needsUpdate = plans.filter((e) => {
      if (!e.plan) return false;
      // Option A (hotfix 2026-08-15) : FORCE_PLAN_REGEN reste false, pas de regen à chaque ouverture.
      // Un true fusionnerait tous les plans séance par séance, y compris version déjà à jour (option B).
      if (FORCE_PLAN_REGEN) return true;
      if ((e.plan.version ?? 0) < PLAN_VERSION) return true;
      // Ancien plan multi-semaines → boucle séance unique
      if (usesSessionLoop(e.profile) && !e.plan.isSessionLoop) return true;
      return false;
    });
    if (needsUpdate.length === 0) return;

    let cancelled = false;
    Promise.all(needsUpdate.map(async entry => {
      const p = entry.plan;
      const originalStartDate = p.startDate ?? entry.startDate ?? null;
      const premium = !!(entry.plan?.isPremium || isPremium);
      const taste = p.taste || tasteProfile;
      // Matériel : null legacy → [] (aucun) pour que le composeur n'autorise plus tout silencieusement
      const equipment = Array.isArray(entry.profile?.equipment)
        ? entry.profile.equipment.filter((e) =>
            EQUIPMENT_IDS.includes(e)
          )
        : [];
      const profileForGen = { ...entry.profile, taste, equipment };
      const generated = await generatePlan(
        profileForGen,
        premium,
        originalStartDate || Date.now(),
        { skipDelay: true },
      );
      const weeks = mergePreservingProgress(p.weeks ?? [], generated.weeks);
      // Force boucle : conserve historique / compteurs freemium si déjà en session loop
      const updated = {
        ...generated,
        taste,
        weeks,
        startDate: originalStartDate || generated.startDate,
        version: PLAN_VERSION,
      };
      if (generated.isSessionLoop && p.isSessionLoop) {
        const cursor = typeof p.sessionCursor === "number" ? p.sessionCursor : 0;
        const history = p.history || [];
        const spw = Math.max(1, Number(profileForGen.sessionsPerWeek) || 3);
        const { week, sheetError } = await buildProgressionLoopWeek(
          { ...profileForGen, volumeAdj: p.volumeAdj },
          cursor,
          premium,
          {
            ordinalIndex: history.length,
            history,
            planStart: originalStartDate || generated.startDate,
            weekIndex: Math.floor(history.length / spw),
          },
        );
        updated.history = history;
        updated.freeSessionsUsed = p.freeSessionsUsed ?? generated.freeSessionsUsed;
        updated.weekGenKey = p.weekGenKey ?? generated.weekGenKey;
        updated.weekGenCount = p.weekGenCount ?? generated.weekGenCount;
        updated.sessionCursor = cursor;
        updated.volumeAdj = p.volumeAdj ?? 1;
        // Sheet KO : garder la semaine actuelle plutôt qu'un composeur / semaine vide
        updated.weeks = sheetError || !week?.sessions?.length ? (p.weeks ?? [week]) : [week];
        updated.loopBlocked = p.loopBlocked ?? null;
      } else if (generated.isSessionLoop && !p.isSessionLoop) {
        // Legacy 12 sem. → boucle : reset compteurs, nouvelle 1ʳᵉ séance
        updated.history = [];
        updated.sessionCursor = 0;
        updated.freeSessionsUsed = premium ? 0 : 1;
        updated.weekGenKey = isoWeekKey();
        updated.weekGenCount = premium ? 0 : 1;
      }
      return {
        id: entry.id,
        updated,
        profilePatch: { equipment },
      };
    })).then(results => {
      if (cancelled) return;
      setPlans(prev => prev.map(e => {
        const r = results.find(x => x.id === e.id);
        if (!r) return e;
        return {
          ...e,
          profile: { ...e.profile, ...r.profilePatch },
          plan: r.updated,
          startDate: r.updated.startDate ?? e.startDate,
        };
      }));
      // Persiste le matériel normalisé pour les comptes existants
      if (user?.id) {
        results.forEach((r) => {
          const entry = needsUpdate.find((e) => e.id === r.id);
          if (!entry) return;
          sportsPersistence.upsertSportProfile(user.id, {
            ...entry.profile,
            ...r.profilePatch,
          }).then(() => {});
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, screen, isPremium, plans.length]);

  // Boucle : titres semaine = Séance 1/2/3 ; mono-séance = Séance n° (global)
  useEffect(() => {
    setPlans((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        if (!e.plan?.isSessionLoop) return e;
        const week0 = e.plan.weeks?.[0];
        const sessions = week0?.sessions || [];
        if (!sessions.length) return e;
        const histLen = loopSessionOrdinalIndex(e.plan);
        const multi = sessions.length > 1;
        const retitled = sessions.map((s, i) => {
          const title = multi
            ? formatLoopWeekSessionTitle(i)
            : formatLoopSessionTitle(histLen);
          return s.title === title ? s : { ...s, title };
        });
        const titlesChanged = retitled.some((s, i) => s !== sessions[i]);
        const keepFocus = multi
          || (week0.focus && !/^Séance n°\d+/i.test(String(week0.focus || "")));
        const nextFocus = keepFocus ? week0.focus : formatLoopSessionTitle(histLen);
        if (!titlesChanged && week0.focus === nextFocus) return e;
        changed = true;
        return {
          ...e,
          plan: {
            ...e.plan,
            weeks: [
              { ...week0, focus: nextFocus, sessions: retitled },
              ...(e.plan.weeks || []).slice(1),
            ],
          },
        };
      });
      return changed ? next : prev;
    });
  }, [plans.length, activePlanId, plan?.isSessionLoop, plan?.history?.length, plan?.weeks?.[0]?.sessions?.length]);

  // Boucle : compléter la semaine courante jusqu’à N séances (choix profil)
  useEffect(() => {
    if (screen !== "app" || !plan?.isSessionLoop || !activePlanId || !isPremium) return;
    const entry = plans.find((e) => e.id === activePlanId);
    if (!entry) return;
    let cancelled = false;
    (async () => {
      const expanded = await expandLoopWeekSessions(entry.plan, entry.profile, isPremium);
      if (cancelled || !expanded) return;
      setPlans((prev) => {
        const next = prev.map((e) => (e.id === activePlanId ? { ...e, plan: expanded } : e));
        stampPlansLocalCache(next, activePlanId);
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [screen, activePlanId, isPremium, plan?.isSessionLoop, plan?.weeks?.[0]?.sessions?.length, activeProfile?.sessionsPerWeek]);

  // Boucle progression : déblocage auto + filet « semaine validée sans enchaînement »
  const loopCurrentResolved = loopSessionNeedsAdvance(plan);
  useEffect(() => {
    if (screen !== "app" || !plan?.isSessionLoop) return;
    if (sessionFeedbackTarget !== null) return;
    const sessions = plan.weeks?.[0]?.sessions || [];
    if (!sessions.length || !sessions.every(isSessionResolved)) return;
    const cur = sessions[sessions.length - 1];
    const gate = loopCanGenerateNext(plan, isPremium);
    if (!gate.ok && !isPremium) return;
    const entry = plans.find((e) => e.id === activePlanId);
    if (!entry) return;
    const key = `${activePlanId}:${plan.sessionCursor ?? 0}:${loopSessionKey(cur)}:week`;
    if (loopAdvanceKeyRef.current === key) return;
    loopAdvanceKeyRef.current = key;
    let cancelled = false;
    (async () => {
      // Assure history complète avant génération
      let hist = entry.plan.history || [];
      for (const s of sessions) {
        if (!hist.some((h) => loopSessionKey(h) === loopSessionKey(s))) {
          hist = [...hist, {
            ...s,
            title: formatLoopSessionTitle(hist.length),
            archivedAt: new Date().toISOString(),
          }];
        }
      }
      const marked = { ...entry.plan, history: hist, weeks: entry.plan.weeks };
      const { plan: next, blockedReason, sheetError, sheetErrorMessage } = await buildAdvancedLoopPlan(
        marked,
        entry.profile,
        cur,
        isPremium,
        plan.taste || tasteProfile,
      );
      if (cancelled) return;
      if (sheetError) {
        loopAdvanceKeyRef.current = null;
        setToast(sheetErrorMessage || "Catalogue séances indisponible, réessaie dans un instant.");
        setTimeout(() => setToast(null), 4000);
        return;
      }
      setPlans((prev) => prev.map((e) => (e.id === activePlanId ? { ...e, plan: next } : e)));
      setLoopPaywall(blockedReason);
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, isPremium, loopCurrentResolved, plan?.loopBlocked, sessionFeedbackTarget, activePlanId]);

  useEffect(() => {
    if (!plan) return;
    const stats   = computeStats(plan);
    const current = checkBadges(stats);
    const prev    = prevBadgesRef.current;
    const newOnes = current.filter(b => !prev.includes(b));
    const unseenBadges = newOnes.filter((badgeId) => !readSeenNotifications(user)[`badge:${badgeId}`]);
    if (unseenBadges.length > 0 && prev.length > 0) {
      const nextSeen = { ...readSeenNotifications(user) };
      const stamp = Date.now();
      unseenBadges.forEach((badgeId) => { nextSeen[`badge:${badgeId}`] = stamp; });
      writeSeenNotifications(user, nextSeen);
      setNewBadgeId(unseenBadges[0]);
    }
    prevBadgesRef.current = current;
  }, [activePlanId, plan, user]);

  const update = (key, val) => setProfile(p => ({ ...p, [key]: val }));
  const patchProfile = (partial) => setProfile(p => ({ ...p, ...partial }));

  /** Compte connecté → shell app + questionnaire dans Programme. Visiteur → plein écran. */
  const enterQuestionnaire = ({ resetProfile = true, asAddingPlan = false, step: nextStep = 1, mode } = {}) => {
    const swimmerKnown = hydrateSwimmerFromSources({
      sportRowFields: {},
      planProfile: activePlanEntry?.profile || profile,
    });
    const resolvedMode = mode || resolveQuestionnaireMode(swimmerKnown, { replacing: asAddingPlan });
    setQuestionnaireMode(resolvedMode);

    if (resetProfile) {
      if (resolvedMode === "goal") {
        // Garder champs permanents, vider objectif
        setProfile(buildQuestionnaireDraft(extractSwimmerProfile(swimmerKnown), {}));
      } else if (Object.keys(extractSwimmerProfile(swimmerKnown)).some((k) => {
        const v = swimmerKnown[k];
        return v != null && v !== "" && !(Array.isArray(v) && v.length === 0 && k !== "equipment");
      })) {
        setProfile(buildQuestionnaireDraft(extractSwimmerProfile(swimmerKnown), {}));
      } else {
        setProfile({ ...BLANK_PROFILE });
      }
    }

    setStep(nextStep);
    setError(null);
    if (asAddingPlan) setAddingPlan(true);
    else setAddingPlan(false);
    if (user) {
      setScreen("app");
      setActiveTab("plan");
      // Hydrate depuis sport_profiles (async) pour compléter le draft
      if (resetProfile) {
        sportsPersistence.loadSportsFacts(user.id).then(({ ok, facts }) => {
          if (!ok || !facts?.sportProfile) return;
          const sportFields = rowToSportProfileFields(facts.sportProfile);
          const hydrated = hydrateSwimmerFromSources({
            sportRowFields: sportFields,
            planProfile: activePlanEntry?.profile || {},
          });
          setProfile((prev) => buildQuestionnaireDraft(hydrated, extractPlanObjective(prev)));
          const nextMode = mode || resolveQuestionnaireMode(hydrated, { replacing: asAddingPlan });
          setQuestionnaireMode(nextMode);
        }).catch(() => {});
      }
    } else {
      setScreen("onboarding");
    }
  };

  const queueSessionCelebrate = (session, planSnapshot) => {
    const meters = parseInt(String(session?.distance || "").replace(/\D/g, ""), 10) || 0;
    const statsNow = computeStats(planSnapshot);
    setSessionCelebrate({
      meters,
      streak: Math.max(1, (statsNow.streak || 0) + 1),
      first: (statsNow.totalSessions || 0) === 0,
    });
  };

  const dismissSessionCelebrate = () => {
    const pending = pendingFeedbackRef.current;
    pendingFeedbackRef.current = null;
    setSessionCelebrate(null);
    if (pending) setSessionFeedbackTarget(pending);
  };

  const dismissPlanReveal = () => {
    setPlanReveal(null);
    if (!hasSeenFirstSwimTip()) {
      setScreen("firstSwimTip");
      return;
    }
    const paywall = planRevealPaywallRef.current;
    planRevealPaywallRef.current = false;
    setScreen("app");
    setActiveTab("home");
    if (paywall) setShowPlanReady(true);
  };

  const dismissFirstSwimTip = () => {
    const paywall = planRevealPaywallRef.current;
    planRevealPaywallRef.current = false;
    setScreen("app");
    setActiveTab("home");
    if (paywall) setShowPlanReady(true);
  };

  const handleGenerate = async (overrideProfile = null) => {
    const sourceProfile = overrideProfile && typeof overrideProfile === "object" && overrideProfile.nativeEvent == null
      ? overrideProfile
      : profile;
    if (!user) {
      stashPendingOnboarding({ profile: sourceProfile, addingPlan, tasteProfile });
      trackEvent("signup_started", { source: "plan_generation_gate" }, { essential: true });
      track("signup_started", { source: "plan_generation_gate" }, { onceKey: "signup_started:plan_generation_gate" });
      openAuth("register");
      return;
    }
    clearOnboardingPrefill();
    // Remplacement d’un plan existant = Premium (1er plan = aperçu OK)
    if (addingPlan && plans.length > 0 && !canGenerateProgram) {
      openUpgrade("trial_required");
      return;
    }
    // Option B : aperçu d’abord, Stripe ensuite (évite boucle questionnaire si abandon)
    const openPaywallAfter = !canGenerateProgram;
    await generatePlanFromProfile(sourceProfile, {
      taste: tasteProfile,
      openPaywallAfter,
    });
  };

  const startMonthlyCheckout = async () => {
    if (planReadyLoading) return;
    setPlanReadyLoading(true);
    showToast("Redirection vers le paiement…");
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (!session) {
        setPlanReadyLoading(false);
        openAuth("register");
        return;
      }
      const referralCode = resolveReferralCode(session.user);
      trackEvent("checkout_started", {
        source: "plan_ready_sheet",
        price_id: PRICE_IDS.monthlyFlex,
      }, { essential: true });
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          origin: window.location.origin,
          priceId: PRICE_IDS.monthlyFlex,
          ...(referralCode ? { referralCode } : {}),
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setPlanReadyLoading(false);
      showToast(json.error || "Impossible d'ouvrir le paiement.", 8000);
      if (!json.alreadySubscribed) openUpgrade("trial_required");
    } catch {
      setPlanReadyLoading(false);
      showToast("Erreur réseau. Réessaie.", 8000);
      openUpgrade("trial_required");
    }
  };

  const generatePlanFromProfile = async (sourceProfile, { taste = null, openPaywallAfter = false } = {}) => {
    const showReveal = shouldShowPlanReveal({ addingPlan });
    planRevealPaywallRef.current = !!(showReveal && openPaywallAfter);
    if (showReveal) {
      setPlanReveal({ phase: "building" });
      setScreen("planReveal");
    } else {
      setScreen("loading");
    }
    setError(null);
    const revealStartedAt = Date.now();
    try {
      const source = applyFirstPlanDefaults(sourceProfile);
      const swimmer = extractSwimmerProfile(source);
      const objective = extractPlanObjective(source);
      let genProfile = mergeForGeneration(swimmer, objective, {
        ...source,
        taste: taste || tasteProfile,
      });
      if (usesSessionLoop(genProfile)) {
        genProfile = { ...genProfile, sessionsPerWeek: genProfile.sessionsPerWeek || 1 };
      }
      // Découverte : jamais de T100 (souvent incapables d'enchaîner 100 m)
      if (genProfile.level === "découverte" || genProfile.level === "beginner") {
        genProfile = { ...genProfile, pace100: null };
      }
      // Matériel : après questionnaire, toujours un tableau ( [] = aucun ). null = legacy uniquement.
      if (!Array.isArray(genProfile.equipment)) {
        genProfile = { ...genProfile, equipment: [] };
      } else {
        genProfile = {
          ...genProfile,
          equipment: genProfile.equipment.filter((e) =>
            EQUIPMENT_IDS.includes(e)
          ),
        };
      }
      // Demande libre → meta exploitable (tags) pour le moteur + analytics ultérieures
      if (typeof genProfile.trainingWish === "string" && genProfile.trainingWish.trim()) {
        const wishRaw = genProfile.trainingWish.trim().slice(0, 2000);
        genProfile = {
          ...genProfile,
          trainingWish: wishRaw,
          trainingWishMeta: parseTrainingWish(wishRaw),
        };
      } else {
        genProfile = { ...genProfile, trainingWish: "", trainingWishMeta: null };
      }
      if (!(Number(genProfile.targetSessionDistance) > 0)) {
        genProfile = { ...genProfile, targetSessionDistance: null };
      }
      const p  = await generatePlan(genProfile, true);
      trackEvent("plan_generated", {
        goal: genProfile.goal,
        level: genProfile.level,
        sessions_per_week: genProfile.sessionsPerWeek,
        age: genProfile.age || null,
        swim_style: genProfile.swimStyle || null,
        preferred_stroke: genProfile.preferredStroke || null,
        has_injury: undefined, // jamais envoyé aux analytics (données santé)
        preview: openPaywallAfter,
      }, { essential: true });
      const id = `plan_${Date.now()}`;
      track("onboarding_completed", personPropertiesFromProfile(genProfile), {
        onceKey: `onboarding_completed:${user?.id || "anon"}:${genProfile.goal || "goal"}`,
      });
      track("plan_created", {
        ...personPropertiesFromProfile(genProfile),
        frequency: genProfile.sessionsPerWeek ?? null,
        duration: genProfile.sessionDuration ?? genProfile.duration ?? null,
        totalWeeks: p?.totalRealWeeks ?? p?.weeks?.length ?? null,
        equipmentCount: Array.isArray(genProfile.equipment) ? genProfile.equipment.length : 0,
        hasEquipment: Array.isArray(genProfile.equipment) && genProfile.equipment.length > 0,
        targetSessionDistance: Number(genProfile.targetSessionDistance) > 0 ? Number(genProfile.targetSessionDistance) : null,
        hasTrainingWish: !!(genProfile.trainingWish && String(genProfile.trainingWish).trim()),
        trainingWishTagCount: Array.isArray(genProfile.trainingWishMeta?.tags)
          ? genProfile.trainingWishMeta.tags.length
          : 0,
      }, {
        onceKey: `plan_created:${id}`,
      });
      let entryProfile = { ...genProfile };
      delete entryProfile.taste; // goûts = compte (plan.taste + user_taste_profile), pas le profil onboarding
      if (entryProfile.pace100) {
        entryProfile = appendPaceHistory(entryProfile, {
          pace100: entryProfile.pace100,
          week: 1,
          source: "onboarding",
        });
      }
      const entryTaste = taste || tasteProfile;
      const livePremium = !!(user && checkIsPremium(user));
      // Aperçu avant paiement = contenu généré, mais flag isPremium = accès live (anti-voleur)
      const entry = {
        id,
        profile: entryProfile,
        plan: { ...p, taste: entryTaste, isPremium: livePremium },
        startDate: Date.now(),
      };
      // 1 user = 1 plan actif : remplace toujours (ancien → historique)
      const replaced = replaceActivePlan(plans, planHistory, entry, activePlanId);
      setPlans(replaced.plans);
      setPlanHistory(replaced.history);
      setActivePlanId(replaced.activeId);
      setAddingPlan(false);
      plansHydratedRef.current = true;
      // Persistance immédiate compte (cross-device) avant Stripe / reload
      if (user?.id) {
        try {
          const now = new Date().toISOString();
          localStorage.setItem(`myswym_plans_${user.id}`, JSON.stringify(replaced.plans));
          localStorage.setItem(`myswym_active_${user.id}`, replaced.activeId || id);
          localStorage.setItem(`myswym_plan_history_${user.id}`, JSON.stringify(replaced.history));
          localStorage.setItem(`myswym_plans_updated_${user.id}`, now);
          const { plans: synced, active, history, error } = await persistAccountPlans(
            user.id, replaced.plans, replaced.activeId, deletedPlanIdsRef.current, replaced.history
          );
          if (error && import.meta.env.DEV) console.warn("[plans] create persist failed", error.message);
          // Étape K, faits sportifs (profil nageur + séances planifiées + race target)
          sportsPersistence.upsertSportProfile(user.id, entryProfile).then(() => {});
          sportsPersistence.upsertPlannedSessionsFromPlan(user.id, id, entry.plan).then(() => {});
          if (entryProfile.raceTarget?.distance) {
            sportsPersistence.upsertRaceTarget(user.id, entryProfile.raceTarget).then(() => {});
          }
          if (Array.isArray(history)) setPlanHistory(history);
          if (synced?.length) {
            deletedPlanIdsRef.current = new Set();
            if (synced.length !== replaced.plans.length || active !== replaced.activeId) {
              setPlans(synced);
              setActivePlanId(active || id);
            }
          }
        } catch {}
      }
      // Sortie définitive du questionnaire, même si le paiement est abandonné plus tard
      clearPendingOnboarding();
      setActiveTab("home");
      if (showReveal) {
        const reduceMotion = typeof window !== "undefined"
          && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const wait = revealMinWaitMs(Date.now() - revealStartedAt, reduceMotion);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        setPlanReveal({ phase: "ready" });
        setScreen("planReveal");
      } else {
        setScreen("app");
        if (openPaywallAfter) setShowPlanReady(true);
      }
    } catch {
      setPlanReveal(null);
      planRevealPaywallRef.current = false;
      setError("Impossible de générer le plan. Réessaie !");
      track("generation_failed", { reason: "exception", context: "generate_plan" });
      const retryStep = sourceProfile.category === "progression" ? 3 : 5;
      setStep(retryStep);
      if (user) {
        setScreen("app");
        setActiveTab("plan");
      } else {
        setScreen("onboarding");
      }
    }
  };

  const resumePendingOnboarding = async (u) => {
    const pending = readPendingOnboarding();
    if (!pending?.profile) return false;
    // Clear tôt : évite boucle questionnaire / checkout si abandon Stripe
    clearPendingOnboarding();
    if (pending.tasteProfile) setTasteProfile(normalizeTaste(pending.tasteProfile));
    setProfile(pending.profile);
    if (pending.addingPlan) setAddingPlan(true);
    const needsPaywall = !checkIsPremium(u);
    // Remplacement sans Premium → upgrade (1er plan peut passer en aperçu)
    if (pending.addingPlan && needsPaywall) {
      openUpgrade("trial_required");
      setScreen("app");
      return true;
    }
    await generatePlanFromProfile(pending.profile, {
      taste: pending.tasteProfile ? normalizeTaste(pending.tasteProfile) : tasteProfile,
      openPaywallAfter: needsPaywall && !pending.addingPlan,
    });
    return true;
  };
  resumePendingRef.current = resumePendingOnboarding;

  const advanceProgressionLoop = async (entryPlan, entryProfile, archivedSession) => {
    const { plan: next, blockedReason, sheetError, sheetErrorMessage } = await buildAdvancedLoopPlan(
      entryPlan,
      entryProfile,
      archivedSession,
      isPremium,
      entryPlan.taste || tasteProfile,
    );
    if (sheetError) {
      setToast(sheetErrorMessage || "Catalogue séances indisponible, réessaie dans un instant.");
      setTimeout(() => setToast(null), 4000);
      return null;
    }
    if (blockedReason) setLoopPaywall(blockedReason);
    else setLoopPaywall(null);
    return next;
  };

  const finishLoopSessionAndAdvance = async (archivedSession, sessionIndex = 0) => {
    const entry = plans.find((e) => e.id === activePlanId);
    if (!entry?.plan?.isSessionLoop) return;
    const week0 = entry.plan.weeks?.[0] || { sessions: [] };
    const sessions = (week0.sessions || []).map((s, i) => (
      i === sessionIndex ? { ...archivedSession } : s
    ));
    const prevHist = entry.plan.history || [];
    const alreadyInHist = prevHist.some((s) => loopSessionKey(s) === loopSessionKey(archivedSession));
    // Historique = compteur global (Séance n°16…), pas le titre local « Séance 1 »
    const archivedForHist = {
      ...archivedSession,
      title: formatLoopSessionTitle(prevHist.length),
      archivedAt: new Date().toISOString(),
    };
    const history = alreadyInHist
      ? prevHist
      : [...prevHist, archivedForHist];

    const weekDone = sessions.length > 0 && sessions.every(isSessionResolved);
    if (!weekDone) {
      const nextPlan = {
        ...entry.plan,
        history,
        weeks: [{
          ...week0,
          sessions: sessions.map((s, i) => ({ ...s, title: formatLoopWeekSessionTitle(i) })),
        }],
        loopBlocked: null,
      };
      setPlans((prev) => {
        const next = prev.map((e) => (e.id === activePlanId ? { ...e, plan: nextPlan } : e));
        stampPlansLocalCache(next, activePlanId);
        return next;
      });
      loopAdvanceKeyRef.current = null;
      return;
    }

    // Semaine terminée → nouvelle semaine N séances
    const markedPlan = {
      ...entry.plan,
      history,
      weeks: [{ ...week0, sessions }],
    };
    const nextPlan = await advanceProgressionLoop(markedPlan, entry.profile, archivedForHist);
    if (!nextPlan) {
      loopAdvanceKeyRef.current = null;
      return;
    }
    setPlans((prev) => {
      const next = prev.map((e) => (e.id === activePlanId ? { ...e, plan: nextPlan } : e));
      stampPlansLocalCache(next, activePlanId);
      return next;
    });
  };

  const handleAdvanceLoopSession = () => {
    const entry = plans.find((e) => e.id === activePlanId);
    const sessions = entry?.plan?.weeks?.[0]?.sessions || [];
    const si = sessions.findIndex((s) => isSessionResolved(s) && !((entry.plan.history || []).some(
      (h) => loopSessionKey(h) === loopSessionKey(s),
    )));
    // Prefer last resolved not yet advanced, else first resolved
    let idx = si;
    if (idx < 0) {
      idx = sessions.findIndex((s) => isSessionResolved(s));
    }
    if (!entry?.plan?.isSessionLoop || idx < 0) return;
    const cur = sessions[idx];
    loopAdvanceKeyRef.current = `${activePlanId}:${entry.plan.sessionCursor ?? 0}:${loopSessionKey(cur)}`;
    void finishLoopSessionAndAdvance(cur, idx);
  };

  const handleRegenerateLoopSession = async () => {
    if (!canUpdateProgram) {
      openUpgrade("trial_expired");
      return;
    }
    const entry = plans.find((e) => e.id === activePlanId);
    if (!entry?.plan?.isSessionLoop) return;
    const sessions = entry.plan.weeks?.[0]?.sessions || [];
    const si = sessions.findIndex((s) => !isSessionResolved(s));
    const cur = si >= 0 ? sessions[si] : null;
    if (!cur) return;
    const nextCursor = (entry.plan.sessionCursor ?? 0) + 1;
    const ordinalIndex = loopSessionOrdinalIndex(entry.plan) + si;
    const { session: nextSession, sheetError, sheetErrorMessage } = await buildProgressionLoopSession(
      { ...entry.profile, taste: entry.plan.taste || tasteProfile, volumeAdj: entry.plan.volumeAdj },
      nextCursor,
      true,
      {
        ordinalIndex,
        history: [...(entry.plan.history || []), ...sessions.slice(0, si)],
        currentSheetN: cur?.sheetMeta?.n,
        currentEducatif: cur?.sheetMeta?.educatif || cur?.sheetEducatif?.name || null,
        planStart: entry.plan.startDate,
      },
    );
    if (sheetError || !nextSession) {
      setToast(sheetErrorMessage || "Catalogue séances indisponible, réessaie dans un instant.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setPlans((prev) => {
      const next = prev.map((e) => {
        if (e.id !== activePlanId || !e.plan?.isSessionLoop) return e;
        const week0 = e.plan.weeks[0];
        return {
          ...e,
          plan: {
            ...e.plan,
            sessionCursor: nextCursor,
            weeks: [{
              ...week0,
              sessions: (week0.sessions || []).map((s, i) => (i === si ? nextSession : s)),
            }],
          },
        };
      });
      stampPlansLocalCache(next, activePlanId);
      return next;
    });
    setToast("Séance remplacée, la précédente n’était pas validée.");
    setTimeout(() => setToast(null), 3200);
  };

  /** Continuer WhatsNew : 1× / compte — rafraîchit la semaine boucle (ouvert → Sheet), garde les validées. */
  const handleWhatsNewContinue = async () => {
    if (whatsNewLoading) return;
    const updatedUser = await markWhatsNewSeen(user);
    if (updatedUser) setUser(updatedUser);
    const entry = plans.find((e) => e.id === activePlanId);
    const loopOk = entry?.plan?.isSessionLoop && usesSessionLoop(entry.profile);

    if (!loopOk) {
      setShowWhatsNew(false);
      setToast("C’est noté, bonne nage !");
      setTimeout(() => setToast(null), 2800);
      return;
    }

    if (!canUpdateProgram) {
      setShowWhatsNew(false);
      openUpgrade("trial_expired");
      return;
    }

    const sessions = entry.plan.weeks?.[0]?.sessions || [];
    const openIdxs = sessions
      .map((s, i) => (!isSessionResolved(s) ? i : -1))
      .filter((i) => i >= 0);

    if (openIdxs.length === 0) {
      setShowWhatsNew(false);
      setToast("Semaine déjà validée, les nouvelles séances arriveront à la suivante.");
      setTimeout(() => setToast(null), 3600);
      return;
    }

    setWhatsNewLoading(true);
    try {
      const history = entry.plan.history || [];
      const spw = Math.max(1, Math.min(5, Number(entry.profile.sessionsPerWeek) || 3));
      const weekIndex = Math.floor(history.length / spw);
      const resolvedPrefix = sessions.filter(isSessionResolved);
      const lastResolved = resolvedPrefix[resolvedPrefix.length - 1] || null;
      const cursor0 = Math.max(entry.plan.sessionCursor ?? 0, history.length);
      const { week, sheetError, sheetErrorMessage } = await buildProgressionLoopWeek(
        { ...entry.profile, taste: entry.plan.taste || tasteProfile, volumeAdj: entry.plan.volumeAdj },
        cursor0,
        true,
        {
          ordinalIndex: history.length + resolvedPrefix.length,
          history: [...history, ...resolvedPrefix],
          sessionCount: openIdxs.length,
          currentSheetN: lastResolved?.sheetMeta?.n,
          currentEducatif:
            lastResolved?.sheetMeta?.educatif || lastResolved?.sheetEducatif?.name || null,
          planStart: entry.plan.startDate,
          weekIndex,
        },
      );
      if (sheetError || !week?.sessions?.length) {
        setToast(sheetErrorMessage || "Catalogue séances indisponible, réessaie dans un instant.");
        setTimeout(() => setToast(null), 4000);
        setShowWhatsNew(false);
        return;
      }

      let fill = 0;
      const mergedSessions = sessions.map((s, i) => {
        if (isSessionResolved(s)) return s;
        const next = week.sessions[fill++];
        return next
          ? { ...next, title: formatLoopWeekSessionTitle(i) }
          : s;
      });

      const week0 = entry.plan.weeks[0] || {};
      setPlans((prev) => {
        const next = prev.map((e) => {
          if (e.id !== activePlanId) return e;
          return {
            ...e,
            plan: {
              ...e.plan,
              sessionCursor: cursor0 + Math.max(0, week.sessions.length - 1),
              weeks: [{
                ...week0,
                ...week,
                number: week0.number || week.number,
                sessions: mergedSessions,
                feedback: week0.feedback || null,
              }],
            },
          };
        });
        stampPlansLocalCache(next, activePlanId);
        return next;
      });
      setShowWhatsNew(false);
      setToast("Semaine mise à jour avec le nouveau catalogue.");
      setTimeout(() => setToast(null), 3600);
    } catch {
      setShowWhatsNew(false);
      setToast("Mise à jour impossible pour le moment, réessaie plus tard.");
      setTimeout(() => setToast(null), 3600);
    } finally {
      setWhatsNewLoading(false);
    }
  };

  const handleComplete = (weekIndex, sessionIndex, status) => {
    const resolvedStatus = status || "done";
    if (!isPremium && resolvedStatus !== "reset") {
      openUpgrade("trial_required");
      return;
    }

    const activeForAnalytics = plans.find((e) => e.id === activePlanId);
    const sessForAnalytics = activeForAnalytics?.plan?.isSessionLoop
      ? activeForAnalytics?.plan?.weeks?.[0]?.sessions?.[
          Number.isFinite(sessionIndex) && sessionIndex >= 0
            ? sessionIndex
            : 0
        ]
      : activeForAnalytics?.plan?.weeks?.[weekIndex]?.sessions?.[sessionIndex];
    const weekForAnalytics = activeForAnalytics?.plan?.weeks?.[weekIndex]
      || activeForAnalytics?.plan?.weeks?.[0];
    const analyticsBase = sessionAnalyticsProps(activeForAnalytics?.profile, sessForAnalytics, {
      planWeek: weekForAnalytics?.number ?? weekIndex + 1,
      sessionIndex: sessionIndex ?? 0,
      phase: weekForAnalytics?.phase || sessForAnalytics?.phase,
    });
    const sessOnce = `${activePlanId || "plan"}:${weekIndex}:${sessionIndex}`;

    if (resolvedStatus === "done") {
      if (sessForAnalytics) lastCompletedSessionRef.current = sessForAnalytics;
      // Funnel: started avant completed si l'utilisateur valide sans copier
      track("session_started", {
        level: analyticsBase.level,
        objective: analyticsBase.objective,
        planWeek: analyticsBase.planWeek,
        sessionIndex: analyticsBase.sessionIndex,
        volume: analyticsBase.volume,
      }, { onceKey: `session_started:${sessOnce}` });
      track("session_completed", {
        level: analyticsBase.level,
        objective: analyticsBase.objective,
        planWeek: analyticsBase.planWeek,
        sessionIndex: analyticsBase.sessionIndex,
        plannedVolume: analyticsBase.volume,
        actualDistance: analyticsBase.volume,
        duration: sessForAnalytics?.duration ?? null,
        equipmentUsedCount: Array.isArray(sessForAnalytics?.equipmentUsed)
          ? sessForAnalytics.equipmentUsed.length
          : (Array.isArray(sessForAnalytics?.equipmentRequired) ? sessForAnalytics.equipmentRequired.length : 0),
      }, { onceKey: `session_completed:${sessOnce}` });
    } else if (resolvedStatus === "missed" || resolvedStatus === "not_done") {
      track("session_missed", {
        level: analyticsBase.level,
        objective: analyticsBase.objective,
        planWeek: analyticsBase.planWeek,
        sessionIndex: analyticsBase.sessionIndex,
        volume: analyticsBase.volume,
        reason: resolvedStatus,
      }, { onceKey: `session_missed:${sessOnce}:${resolvedStatus}` });
    }

    if (resolvedStatus === "done" && user) {
      try {
        const dayKey = `myswym_session_evt_${new Date().toISOString().slice(0, 10)}`;
        if (!sessionStorage.getItem(dayKey)) {
          sessionStorage.setItem(dayKey, "1");
          supabase.functions.invoke("marketing-event", {
            body: { event: "session.completed", sessionTitle: "" },
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }

    const active = plans.find((e) => e.id === activePlanId);

    // ── Boucle Nager & Progresser ──
    if (active?.plan?.isSessionLoop && resolvedStatus !== "reset") {
      const sessions = active.plan.weeks?.[0]?.sessions || [];
      const si = Number.isFinite(sessionIndex) && sessionIndex >= 0
        ? sessionIndex
        : sessions.findIndex((s) => !isSessionResolved(s));
      const cur = sessions[si >= 0 ? si : 0];
      if (!cur || isSessionResolved(cur)) return;

      const archived = {
        ...cur,
        completed: resolvedStatus === "done",
        skipped: resolvedStatus === "done" ? null : (resolvedStatus === "missed" ? "missed" : "not_done"),
      };

      // Soft paywall après 1ʳᵉ séance
      if (resolvedStatus === "done" && !isPremium) {
        const prevDone = (active.plan.history || []).filter((s) => s.completed).length;
        if (prevDone === 0) trackEvent("first_session_completed", { plan_type: "loop" }, { essential: true });
        if (prevDone === 1) trackEvent("second_session_completed", { plan_type: "loop" }, { essential: true });
        if (prevDone === 0) {
          try {
            if (!localStorage.getItem(SOFT_PAYWALL_STORAGE_KEY)) setSoftPaywallPending(true);
          } catch {
            setSoftPaywallPending(true);
          }
        }
      }

      // Marque résolue tout de suite (verrouille), garde les autres séances de la semaine
      setPlans((prev) => {
        const next = prev.map((entry) => {
          if (entry.id !== activePlanId) return entry;
          const week0 = entry.plan.weeks[0];
          return {
            ...entry,
            plan: {
              ...entry.plan,
              weeks: [{
                ...week0,
                sessions: (week0.sessions || []).map((s, i) => (i === si ? { ...archived } : s)),
              }],
            },
          };
        });
        stampPlansLocalCache(next, activePlanId);
        return next;
      });

      if (resolvedStatus === "done") {
        if (user) {
          sportsPersistence.markSessionStatus(user.id, {
            planId: activePlanId,
            weekIndex: 0,
            sessionIndex: si,
            status: "completed",
          }).then(() => {});
        }
        pendingFeedbackRef.current = {
          weekIndex: 0,
          sessionIndex: si,
          promptWeekAfter: false,
          loopMode: true,
          archived,
        };
        queueSessionCelebrate(archived, active.plan);
      } else {
        void finishLoopSessionAndAdvance(archived, si);
      }
      return;
    }

    if (resolvedStatus === "done" && !isPremium) {
      const activeClassic = plans.find((e) => e.id === activePlanId);
      const prevDone = countCompletedSessions(activeClassic?.plan);
      const alreadyDone = activeClassic?.plan?.weeks?.[weekIndex]?.sessions?.[sessionIndex]?.completed;
      if (!alreadyDone && prevDone === 0) trackEvent("first_session_completed", { plan_type: "classic" }, { essential: true });
      if (!alreadyDone && prevDone === 1) trackEvent("second_session_completed", { plan_type: "classic" }, { essential: true });
      if (!alreadyDone && prevDone === 0) {
        try {
          if (!localStorage.getItem(SOFT_PAYWALL_STORAGE_KEY)) setSoftPaywallPending(true);
        } catch {
          setSoftPaywallPending(true);
        }
      }
    }
    setPlans(prev => {
      const next = prev.map(entry => {
      if (entry.id !== activePlanId) return entry;
      const newPlan = {
        ...entry.plan,
        weeks: entry.plan.weeks.map((w, wi) => wi !== weekIndex ? w : {
          ...w, sessions: w.sessions.map((s, si) => {
            if (si !== sessionIndex) return s;
            if (resolvedStatus === "reset") return { ...s, completed: false, skipped: null, feedback: null };
            if (resolvedStatus === "done") return { ...s, completed: true, skipped: null };
            if (resolvedStatus === "missed") return { ...s, completed: false, skipped: "missed" };
            if (resolvedStatus === "not_done") return { ...s, completed: false, skipped: "not_done" };
            return { ...s, completed: true, skipped: null };
          }),
        }),
      };
      const updatedWeek = newPlan.weeks[weekIndex];
      // Séances manquées : politique moteur V1 (drop / reschedule / recompute)
      if (resolvedStatus === "missed" || resolvedStatus === "not_done") {
        const sess = entry.plan.weeks?.[weekIndex]?.sessions?.[sessionIndex];
        const missedInWeek = (updatedWeek.sessions || []).filter((s) => s.skipped).length;
        const totalMissed = (newPlan.weeks || []).reduce(
          (n, w) => n + (w.sessions || []).filter((s) => s.skipped).length,
          0,
        );
        newPlan._missedPolicy = missedSessionPolicy({
          isKeySession: !!sess?.isKeySession,
          missedInWeek,
          totalMissed,
        });
        if (newPlan._missedPolicy === "recompute" && isPremium) {
          newPlan._engineHistory = {
            ...(newPlan._engineHistory || {}),
            unfinishedRecent: Math.min(3, totalMissed),
            hardStreak: 0,
          };
        }
      }
      // Semaine complète hors "done" → bilan hebdo tout de suite.
      // Pour "done", on attend la fermeture du sheet séance.
      if (
        resolvedStatus !== "done"
        && resolvedStatus !== "reset"
        && updatedWeek.sessions.every(isSessionResolved)
        && !updatedWeek.feedback
      ) {
        setTimeout(() => setFeedbackWeek(weekIndex), 700);
      }
      return { ...entry, plan: newPlan };
    });
      stampPlansLocalCache(next, activePlanId);
      return next;
    });
    if (resolvedStatus === "done") {
      // Statut completed en base dès la validation, indépendant de la fiche de retour
      if (user) {
        sportsPersistence.markSessionStatus(user.id, {
          planId: activePlanId,
          weekIndex,
          sessionIndex,
          status: "completed",
        }).then(() => {});
      }
      pendingFeedbackRef.current = { weekIndex, sessionIndex, promptWeekAfter: true };
      queueSessionCelebrate(sessForAnalytics, active?.plan);
    }
  };

  const maybePromptWeekFeedback = (weekIndex) => {
    setTimeout(() => {
      setPlans(prev => {
        const entry = prev.find(e => e.id === activePlanId);
        const week = entry?.plan?.weeks?.[weekIndex];
        if (week?.sessions?.every(isSessionResolved) && !week.feedback) {
          setFeedbackWeek(weekIndex);
        }
        return prev;
      });
    }, 700);
  };

  const closeSessionFeedbackSheet = () => {
    const target = sessionFeedbackTarget;
    setSessionFeedbackTarget(null);
    scrollAppToTop();
    if (target?.loopMode && target.archived) {
      void finishLoopSessionAndAdvance(target.archived, target.sessionIndex ?? 0);
      return;
    }
    if (target?.promptWeekAfter) maybePromptWeekFeedback(target.weekIndex);
  };

  const persistTaste = (nextTaste, userId = user?.id) => {
    const normalized = normalizeTaste(nextTaste);
    setTasteProfile(normalized);
    if (userId) {
      try { localStorage.setItem(`myswym_taste_${userId}`, JSON.stringify(normalized)); } catch {}
      supabase.from("user_taste_profile").upsert({
        user_id: userId,
        scores: normalized,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error && import.meta.env.DEV) console.warn("[taste] persist failed (local kept)", error.message);
      });
    }
    return normalized;
  };

  const handleSessionFeedback = ({ rating, tags, comment }) => {
    if (!sessionFeedbackTarget) return;
    const { weekIndex, sessionIndex, promptWeekAfter, loopMode, archived } = sessionFeedbackTarget;
    const prevSession = archived || plan?.weeks?.[weekIndex]?.sessions?.[sessionIndex];
    const isFirstFeedback = !prevSession?.feedback;
    const legacyRating = normalizeFeedbackRating(rating);
    const hasPainTag = Array.isArray(tags) && tags.some((t) => /douleur|gêne|gene/i.test(t));
    const shouldNudge = isPremium && isFirstFeedback && (legacyRating === "easy" || legacyRating === "hard" || rating === "too_hard" || hasPainTag);

    const nextTaste = applySessionFeedbackToTaste(tasteProfile, {
      rating: normalizeFeedbackRating(rating),
      tags,
      comment,
      sessionType: prevSession?.type ?? null,
    });
    persistTaste(nextTaste);

    const feedback = {
      rating,
      tags: Array.isArray(tags) ? tags : [],
      comment: comment || null,
      at: new Date().toISOString(),
    };

    track("feedback_submitted", {
      difficulty: rating,
      completed: true,
      level: personPropertiesFromProfile(activeProfile).level,
      objective: personPropertiesFromProfile(activeProfile).objective,
      planWeek: (archived || plan?.weeks?.[weekIndex])?.number ?? weekIndex + 1,
      sessionIntent: prevSession?.intent || prevSession?.sessionIntent || prevSession?.type || null,
      ...(hasPainTag ? { pain: true } : {}),
    }, { onceKey: `feedback_submitted:${activePlanId || "plan"}:${weekIndex}:${sessionIndex}:${feedback.at}` });

    // Boucle progression : feedback sur la séance, puis avance (semaine ou séance suivante)
    if (loopMode) {
      const archivedWithFb = { ...(archived || prevSession), feedback };
      let volumeAdj = plan?.volumeAdj ?? 1;
      if (shouldNudge) {
        const step = rating === "easy" ? 1.03 : rating === "hard" ? 0.97 : 1;
        volumeAdj = Math.min(1.3, Math.max(0.7, volumeAdj * step));
      }
      const entry = plans.find((e) => e.id === activePlanId);
      if (!entry) {
        setSessionFeedbackTarget(null);
        return;
      }
      const si = sessionIndex ?? 0;
      setPlans((prev) => prev.map((e) => {
        if (e.id !== activePlanId) return e;
        const week0 = e.plan.weeks[0];
        return {
          ...e,
          plan: {
            ...e.plan,
            taste: nextTaste,
            volumeAdj,
            weeks: [{
              ...week0,
              sessions: (week0.sessions || []).map((s, i) => (i === si ? { ...archivedWithFb } : s)),
            }],
          },
        };
      }));
      setSessionFeedbackTarget(null);
      void finishLoopSessionAndAdvance(archivedWithFb, si);
      if (user) {
        sportsPersistence.insertSessionFeedback(user.id, {
          planId: activePlanId,
          weekIndex: 0,
          sessionIndex: si,
          sessionType: archivedWithFb?.type ?? null,
          sessionTitle: archivedWithFb?.title ?? null,
          difficulty: rating,
          rating,
          pain: hasPainTag,
          completed: true,
          tags: feedback.tags,
          comment: feedback.comment,
        }).then(() => {});
      }
      if (shouldNudge) showToast("Prochaines séances adaptées à tes goûts.", 4000);
      return;
    }

    // Régénère aussi si tags goûts (trop long / éducatifs…) même sans easy/hard, Premium only, semaines futures
    const tasteDriven =
      isPremium &&
      Array.isArray(tags) &&
      tags.some((t) => ["trop long", "trop court", "trop intensif", "éducatifs top", "incompréhensible"].includes(t));

    // Pré-calcule l'entrée active (pour persister adaptation K hors setState)
    let adaptedForPersist = null;
    if (shouldNudge && plan) {
      adaptedForPersist = adjustPlan(
        { ...plan, taste: nextTaste },
        weekIndex,
        rating,
        {
          ...activeProfile,
          taste: nextTaste,
          painFlag: hasPainTag || activeProfile?.injuryStatus === "oui",
        },
        isPremium,
        {
          sessionNudge: true,
          finished: true,
          skipReason: hasPainTag ? "pain" : null,
          isKeySession: !!prevSession?.isKeySession,
        },
      );
    }

    setPlans(prev => prev.map(e => {
      if (e.id !== activePlanId) return e;

      let base = { ...e.plan, taste: nextTaste };
      if (shouldNudge) {
        base = adaptedForPersist || adjustPlan(
          { ...e.plan, taste: nextTaste },
          weekIndex,
          rating,
          {
            ...e.profile,
            taste: nextTaste,
            painFlag: hasPainTag || e.profile?.injuryStatus === "oui",
          },
          isPremium,
          {
            sessionNudge: true,
            finished: true,
            skipReason: hasPainTag ? "pain" : null,
            isKeySession: !!prevSession?.isKeySession,
          },
        );
        base = { ...base, taste: nextTaste };
      } else if (tasteDriven && shouldUseCoachGenerator(e.profile?.goal) && !e.plan?.isSessionLoop) {
        // Applique goûts sans toucher volumeAdj (rating ok / tags seuls)
        try {
          const phaseList = phaseListForAdjust(e.profile, e.plan);
          const engineProfile = sportsPersistence.attachEngineHistoryToProfile(
            { ...e.profile, volumeAdj: e.plan.volumeAdj ?? 1, taste: nextTaste },
            e.plan,
          );
          const fresh = buildCoachPlanWeeks(
            engineProfile,
            phaseList,
            isPremium,
            TIPS,
            5,
          );
          base = {
            ...e.plan,
            taste: nextTaste,
            weeks: e.plan.weeks.map((w, i) => {
              if (i <= weekIndex || shouldPreserveWeek(w)) return w;
              return fresh[i] ?? w;
            }),
          };
        } catch {
          base = { ...e.plan, taste: nextTaste };
        }
      }

      return {
        ...e,
        profile: sportsPersistence.attachEngineHistoryToProfile(e.profile, {
          ...base,
          weeks: base.weeks.map((w, wi) => wi !== weekIndex ? w : {
            ...w,
            sessions: w.sessions.map((s, si) => si !== sessionIndex ? s : { ...s, feedback }),
          }),
        }),
        plan: {
          ...base,
          taste: nextTaste,
          weeks: base.weeks.map((w, wi) => wi !== weekIndex ? w : {
            ...w,
            sessions: w.sessions.map((s, si) => si !== sessionIndex ? s : { ...s, feedback }),
          }),
        },
      };
    }));

    if (user && adaptedForPersist?._weeklyAdaptation) {
      const wa = adaptedForPersist._weeklyAdaptation;
      track("adaptation_applied", {
        action: wa.action || adaptedForPersist._lastAdapt || null,
        primaryLever: wa.primaryLever || null,
        magnitude: wa.magnitude || null,
        confidence: wa.confidence || null,
        level: personPropertiesFromProfile(activeProfile).level,
        objective: personPropertiesFromProfile(activeProfile).objective,
        planWeek: plan?.weeks?.[weekIndex]?.number ?? weekIndex + 1,
      }, {
        onceKey: `adaptation_applied:${activePlanId || "plan"}:${weekIndex}:${wa.action || "act"}:${adaptedForPersist.volumeAdj}`,
      });
      sportsPersistence.insertWeeklyAdaptation(
        user.id,
        activePlanId,
        weekIndex,
        adaptedForPersist._weeklyAdaptation,
        adaptedForPersist.volumeAdj,
      ).then(() => {});
      if (adaptedForPersist._capacityDimensions) {
        sportsPersistence.insertCapacitySnapshot(user.id, {
          planId: activePlanId,
          dimensions: adaptedForPersist._capacityDimensions,
          reason: adaptedForPersist._weeklyAdaptation?.action || "adapt",
          confidence: adaptedForPersist._weeklyAdaptation?.confidence,
        }).then(() => {});
      }
    }

    if (user) {
      const week = plan?.weeks?.[weekIndex];
      const session = week?.sessions?.[sessionIndex];
      const hasPain = hasPainTag || false;
      // Étape K, faits bruts (difficulty 4 niveaux + pain) + miroir legacy rating
      sportsPersistence.insertSessionFeedback(user.id, {
        planId: activePlanId,
        weekIndex: week?.number ?? weekIndex + 1,
        sessionIndex,
        sessionType: session?.type ?? null,
        sessionTitle: session?.title ?? null,
        difficulty: rating,
        rating,
        pain: hasPain,
        completed: true,
        tags: Array.isArray(tags) ? tags : [],
        comment: comment || null,
      }).then(() => {});
      // markSessionStatus("completed") est déjà appelé dans handleComplete
    }

    if (!isPremium && (legacyRating === "easy" || legacyRating === "hard" || tasteDriven)) {
      showToast(formatFeedbackToast({ isPremium: false, legacyRating, hasPain: false, tasteDriven }), 5500);
    } else if (hasPainTag) {
      showToast(formatFeedbackToast({ isPremium, legacyRating, hasPain: true }), 5500);
    } else {
      const toast = formatFeedbackToast({
        isPremium,
        legacyRating,
        hasPain: false,
        tasteDriven,
        plan: adaptedForPersist || plan,
      });
      showToast(toast, 4500);
    }

    setSessionFeedbackTarget(null);
    if (promptWeekAfter) maybePromptWeekFeedback(weekIndex);
  };

  const handleEditSessionFeedback = (weekIndex, sessionIndex) => {
    setSessionFeedbackTarget({ weekIndex, sessionIndex, promptWeekAfter: false });
  };

  const handleFeedback = ({ rating, motivation, pain, comment }) => {
    if (feedbackWeek === null) return;
    const nextTaste = applyWeekFeedbackToTaste(tasteProfile, { rating, comment });
    persistTaste(nextTaste);
    let weekAdapted = null;
    setPlans(prev => prev.map(e => {
      if (e.id !== activePlanId) return e;
      const base = isPremium
        ? adjustPlan(
            { ...e.plan, taste: nextTaste },
            feedbackWeek,
            rating,
            { ...e.profile, taste: nextTaste },
            isPremium,
          )
        : { ...e.plan, taste: nextTaste };
      if (base?._weeklyAdaptation) weekAdapted = base._weeklyAdaptation;
      const withSatisfaction = {
        ...base,
        taste: nextTaste,
        weeks: base.weeks.map((w, i) => i !== feedbackWeek ? w : {
          ...w,
          feedback: rating,
          satisfaction: { motivation, pain, comment, at: new Date().toISOString() },
        }),
      };
      return { ...e, plan: withSatisfaction };
    }));
    if (weekAdapted) {
      track("adaptation_applied", {
        action: weekAdapted.action || null,
        primaryLever: weekAdapted.primaryLever || null,
        magnitude: weekAdapted.magnitude || null,
        confidence: weekAdapted.confidence || null,
        level: personPropertiesFromProfile(activeProfile).level,
        objective: personPropertiesFromProfile(activeProfile).objective,
        planWeek: plan?.weeks?.[feedbackWeek]?.number ?? feedbackWeek + 1,
      }, {
        onceKey: `adaptation_applied:week:${activePlanId || "plan"}:${feedbackWeek}:${weekAdapted.action || "act"}`,
      });
    }
    track("feedback_submitted", {
      difficulty: rating,
      completed: true,
      level: personPropertiesFromProfile(activeProfile).level,
      objective: personPropertiesFromProfile(activeProfile).objective,
      planWeek: plan?.weeks?.[feedbackWeek]?.number ?? feedbackWeek + 1,
      ...(pain ? { pain: true } : {}),
    }, { onceKey: `feedback_submitted:week:${activePlanId || "plan"}:${feedbackWeek}` });
    if (user) {
      supabase.from("week_feedback").insert({
        user_id: user.id,
        plan_id: activePlanId,
        week_number: plan?.weeks[feedbackWeek]?.number ?? feedbackWeek + 1,
        rating,
        motivation,
        pain,
        comment: comment || null,
        created_at: new Date().toISOString(),
      }).then(() => {});
    }
    if (!isPremium) {
      showToast(formatFeedbackToast({ isPremium: false, legacyRating: rating }), 5500);
    } else {
      showToast(formatFeedbackToast({ isPremium: true, legacyRating: rating, plan: weekAdapted || plan }), 4500);
    }
    setFeedbackWeek(null);
  };

  const handlePaceUpdate = (patchOrPace100) => {
    if (!activePlanEntry) return;
    if (!canUpdateProgram) {
      openUpgrade("trial_expired");
      return Promise.resolve();
    }
    const patch =
      patchOrPace100 && typeof patchOrPace100 === "object"
        ? patchOrPace100
        : { pace100: patchOrPace100 };
    const week = getCurrentWeekNumber(activePlanEntry.plan);
    const fromPace =
      Number(activePlanEntry.profile?.pace100) > 0
        ? Number(activePlanEntry.profile.pace100)
        : null;
    const nextPace100 =
      patch.pace100 !== undefined ? patch.pace100 : activePlanEntry.profile?.pace100;
    const toPace = Number(nextPace100) > 0 ? Number(nextPace100) : null;
    let nextProfile = {
      ...activePlanEntry.profile,
      ...(patch.pace100 !== undefined ? { pace100: patch.pace100 } : {}),
      ...(patch.pace50 !== undefined ? { pace50: patch.pace50 } : {}),
      ...(patch.pace400 !== undefined ? { pace400: patch.pace400 } : {}),
    };
    if (
      patch.pace100 !== undefined &&
      Number(patch.pace100) > 0 &&
      Number(patch.pace100) !== Number(activePlanEntry.profile?.pace100)
    ) {
      nextProfile = appendPaceHistory(nextProfile, {
        pace100: patch.pace100,
        week,
        source: "manual",
      });
    }

    // Recalcule D… / @… sur les séances déjà là (sans régénérer le contenu).
    let nextPlan = activePlanEntry.plan;
    if (
      isPremium &&
      fromPace &&
      toPace &&
      fromPace !== toPace &&
      nextPlan?.weeks
    ) {
      nextPlan = rewritePlanPaceMarkers(nextPlan, {
        fromPace100: fromPace,
        toPace100: toPace,
        isPremium: true,
        levelBand: levelBandFromProfile(nextProfile),
      });
    }

    setPlans((prev) =>
      prev.map((e) =>
        e.id !== activePlanId
          ? e
          : { ...e, profile: nextProfile, plan: nextPlan },
      ),
    );

    // Premier T100 seulement : matérialiser D/@ sur les semaines encore génériques.
    if (fromPace || !toPace || !canUpdateProgram || activePlanEntry.plan?.isSessionLoop) {
      return Promise.resolve();
    }

    const oldWeeks = activePlanEntry.plan?.weeks ?? [];
    const taste = activePlanEntry.plan?.taste || tasteProfile;
    const planIdToUpdate = activePlanId;
    const originalStartDate =
      activePlanEntry.plan?.startDate ?? activePlanEntry.startDate ?? Date.now();

    return generatePlan({ ...nextProfile, taste }, true, originalStartDate, {
      skipDelay: true,
    })
      .then((newPlan) => {
        const mergedWeeks = mergePreservingProgress(oldWeeks, newPlan.weeks);
        setPlans((prev) =>
          prev.map((e) => {
            if (e.id !== planIdToUpdate) return e;
            return {
              ...e,
              profile: nextProfile,
              plan: {
                ...newPlan,
                taste,
                weeks: mergedWeeks,
                ...(e.plan?.startDate ? { startDate: e.plan.startDate } : {}),
                history: e.plan?.history,
                freeSessionsUsed: e.plan?.freeSessionsUsed,
                weekGenKey: e.plan?.weekGenKey,
                weekGenCount: e.plan?.weekGenCount,
                sessionCursor: e.plan?.sessionCursor,
                loopBlocked: e.plan?.loopBlocked,
              },
            };
          }),
        );
      })
      .catch(() => {
        /* profil déjà sauvé */
      });
  };

  /** Régénère les séances non commencées après changement profil (pool / matos / nage). */
  const applyProfileToUpcomingSessions = (nextProfile, { toast = true } = {}) => {
    if (!activePlanEntry || !canUpdateProgram) return Promise.resolve();
    const taste = activePlanEntry.plan?.taste || tasteProfile;
    const planIdToUpdate = activePlanId;

    if (activePlanEntry.plan?.isSessionLoop) {
      const cur = activePlanEntry.plan.weeks?.[0]?.sessions?.[0];
      if (!cur || isSessionResolved(cur)) {
        if (toast) showToast("Profil enregistré, la prochaine séance utilisera ces réglages.", 4000);
        return Promise.resolve();
      }
      const nextCursor = (activePlanEntry.plan.sessionCursor ?? 0) + 1;
      const ordinalIndex = loopSessionOrdinalIndex(activePlanEntry.plan);
      return buildProgressionLoopSession(
        { ...nextProfile, sessionsPerWeek: 1, taste, volumeAdj: activePlanEntry.plan.volumeAdj },
        nextCursor,
        true,
        {
          ordinalIndex,
          history: activePlanEntry.plan.history || [],
          currentSheetN: cur?.sheetMeta?.n,
          currentEducatif: cur?.sheetMeta?.educatif || cur?.sheetEducatif?.name || null,
        },
      ).then(({ week, sheetError, sheetErrorMessage }) => {
        if (sheetError || !week?.sessions?.length) {
          setPlans((prev) => prev.map((e) => (e.id === planIdToUpdate ? { ...e, profile: nextProfile } : e)));
          if (toast) {
            showToast(sheetErrorMessage || "Profil enregistré, catalogue séances indisponible, séance inchangée.", 4500);
          }
          return;
        }
        setPlans((prev) => prev.map((e) => {
          if (e.id !== planIdToUpdate) return e;
          return {
            ...e,
            profile: nextProfile,
            plan: {
              ...e.plan,
              sessionCursor: nextCursor,
              weeks: [week],
            },
          };
        }));
        if (toast) showToast("Séance du jour mise à jour avec ton profil.", 4000);
      });
    }

    const oldWeeks = activePlanEntry.plan?.weeks ?? [];
    const originalStartDate = activePlanEntry.plan?.startDate ?? activePlanEntry.startDate ?? Date.now();
    return generatePlan({ ...nextProfile, taste }, true, originalStartDate, { skipDelay: true }).then((newPlan) => {
      const mergedWeeks = mergePreservingProgress(oldWeeks, newPlan.weeks);
      setPlans((prev) => prev.map((e) => {
        if (e.id !== planIdToUpdate) return e;
        return {
          ...e,
          profile: nextProfile,
          plan: {
            ...newPlan,
            taste,
            weeks: mergedWeeks,
            ...(e.plan?.startDate ? { startDate: e.plan.startDate } : {}),
            history: e.plan?.history,
            freeSessionsUsed: e.plan?.freeSessionsUsed,
            weekGenKey: e.plan?.weekGenKey,
            weekGenCount: e.plan?.weekGenCount,
            sessionCursor: e.plan?.sessionCursor,
            loopBlocked: e.plan?.loopBlocked,
            volumeAdj: e.plan?.volumeAdj,
            _lastAdapt: e.plan?._lastAdapt,
            _adaptSignals: e.plan?._adaptSignals,
          },
        };
      }));
      if (toast) showToast("Prochaines séances adaptées à ton profil (semaines déjà faites conservées).", 5000);
    }).catch(() => {
      if (toast) showToast("Profil enregistré.", 3000);
    });
  };

  /** Matériel profil, applique aux prochaines séances (pas de regen des semaines faites). */
  const handleEquipmentChange = (nextEquipment) => {
    const equipment = Array.isArray(nextEquipment)
      ? nextEquipment.filter((e) =>
          EQUIPMENT_IDS.includes(e)
        )
      : [];
    const nextProfile = { ...activeProfile, equipment };
    setPlans((prev) => prev.map((e) => {
      if (e.id !== activePlanId) return e;
      return { ...e, profile: { ...e.profile, equipment } };
    }));
    if (user?.id) {
      sportsPersistence.upsertSportProfile(user.id, nextProfile).then(() => {});
    }
    if (canUpdateProgram) {
      applyProfileToUpcomingSessions(nextProfile, { toast: false });
    }
  };

  /** Édition profil nageur depuis ProfileTab, applique aux prochaines si pool / nage / etc. */
  const handleSwimmerProfileChange = (partial) => {
    if (!partial || typeof partial !== "object") return;
    const swimmerPartial = extractSwimmerProfile(partial);
    const nextPatch = { ...swimmerPartial };
    for (const k of ["injuryStatus", "injuryZone", "injurySeverity", "injuries", "injuryNote", "healthConsent", "healthConsentAt", "healthDeclaration"]) {
      if (partial[k] !== undefined) nextPatch[k] = partial[k];
    }
    const nextProfile = { ...(activePlanEntry?.profile || activeProfile || {}), ...nextPatch };
    if (activePlanId) {
      setPlans((prev) => prev.map((e) => {
        if (e.id !== activePlanId) return e;
        return { ...e, profile: { ...e.profile, ...nextPatch } };
      }));
    }
    if (user?.id) {
      sportsPersistence.upsertSportProfile(user.id, nextProfile).then(() => {});
    }
    const shouldApply = canUpdateProgram && (
      nextPatch.pool !== undefined
      || nextPatch.level !== undefined
      || nextPatch.sessionsPerWeek !== undefined
      || nextPatch.swimStyle !== undefined
      || nextPatch.favoriteStroke !== undefined
      || nextPatch.knowsFourNages !== undefined
      || nextPatch.equipment !== undefined
    );
    if (shouldApply) {
      applyProfileToUpcomingSessions(nextProfile, { toast: false });
    }
  };

  const handleUpdateProgram = (newFreq, newPace100 = undefined) => {
    if (!activePlanEntry) return;
    if (!canUpdateProgram) {
      openUpgrade("trial_expired");
      return;
    }
    const oldWeeks = activePlanEntry.plan?.weeks ?? [];
    const week = getCurrentWeekNumber(activePlanEntry.plan);
    let newProfile = {
      ...activePlanEntry.profile,
      sessionsPerWeek: newFreq,
      ...(newPace100 !== undefined ? { pace100: newPace100 } : {}),
    };
    if (newPace100 !== undefined) {
      newProfile = appendPaceHistory(newProfile, {
        pace100: newPace100,
        week,
        source: "program",
      });
    }
    // Annule dès le clic les saves 2× en vol pendant la régénération (~1.8s).
    plansSaveGenRef.current += 1;
    setScreen("loading");
    const taste = activePlanEntry.plan?.taste || tasteProfile;
    const planIdToUpdate = activePlanId;
    generatePlan({ ...newProfile, taste }, isPremium)
      .then(async (newPlan) => {
        const originalStartDate = activePlanEntry.plan?.startDate ?? activePlanEntry.startDate ?? null;
        // Semaines : séances validées conservées, non validées régénérées (merge séance par séance).
        // Si la fréquence change (nombre de séances différent) → fallback semaine entière.
        const mergedWeeks = mergePreservingProgress(oldWeeks, newPlan.weeks);
        const planWithDate = { ...newPlan, taste, weeks: mergedWeeks, ...(originalStartDate ? { startDate: originalStartDate } : {}) };
        const now = new Date().toISOString();
        // Invalide tout save en cours (évite qu'un upsert 2× arrive après le cache 3×).
        plansSaveGenRef.current += 1;

        setPlans(prev => {
          const nextPlans = prev.map(e => e.id !== planIdToUpdate ? e : { ...e, profile: newProfile, plan: planWithDate });
          if (user) {
            try {
              localStorage.setItem(`myswym_plans_${user.id}`, JSON.stringify(nextPlans));
              localStorage.setItem(`myswym_active_${user.id}`, planIdToUpdate);
              localStorage.setItem(`myswym_plans_updated_${user.id}`, now);
            } catch {}
          }
          return nextPlans;
        });

        // Persistance remote immédiate à partir du cache (source de vérité post-changement)
        if (user) {
          plansSaveGenRef.current += 1;
          try {
            const raw = localStorage.getItem(`myswym_plans_${user.id}`);
            const parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
              await persistAccountPlans(user.id, parsed, planIdToUpdate, deletedPlanIdsRef.current, planHistory);
            }
          } catch {}
        }
        setScreen("app");
        setActiveTab("plan");
      })
      .catch((err) => {
        setScreen("app");
        setActiveTab("plan");
        showToast("Impossible de mettre à jour le programme. Réessaie.", 6000);
        track("generation_failed", {
          reason: String(err?.message || "exception").slice(0, 80),
          context: "update_program",
        });
      });
  };

  const handleAddPlan = () => {
    if (!user) { openAuth("register"); return; }
    if (!plans.length) {
      const sw = extractSwimmerProfile(activeProfile);
      enterQuestionnaire({
        resetProfile: true,
        asAddingPlan: false,
        mode: resolveQuestionnaireMode(sw, { replacing: false }),
      });
      return;
    }
    // Remplacement d'un plan existant → Premium (même gate que update)
    if (!canGenerateProgram) {
      openUpgrade("trial_expired");
      return;
    }
    setReplaceConfirmOpen(true);
  };

  const confirmReplacePlan = () => {
    setReplaceConfirmOpen(false);
    const sw = hydrateSwimmerFromSources({
      sportRowFields: {},
      planProfile: activeProfile,
    });
    const mode = isSwimmerProfileComplete(sw) ? "goal" : "full";
    enterQuestionnaire({ resetProfile: true, asAddingPlan: true, mode });
  };

  const handleCancelAddPlan = () => {
    setAddingPlan(false);
    setQuestionnaireMode("full");
    setProfile(BLANK_PROFILE);
    setStep(1);
    setError(null);
    setActiveTab("plan");
  };

  const handleSwitchPlan = () => {
    // 1 plan actif max, pas de bascule multi-plans
  };

  const handleDeletePlan = (id) => {
    // Archive le plan unique vers l'historique puis reset
    if (!id || !plans.length) return;
    handleReset();
  };

  const confirmDeletePlan = () => {
    setDeletePlanId(null);
  };

  const handleReset = () => {
    const removed = activePlanEntry || plans[0] || null;
    let nextHistory = planHistory;
    if (removed?.id) {
      nextHistory = enforceSingleActivePlan([], null, [
        ...planHistory,
        {
          ...removed,
          archivedAt: new Date().toISOString(),
          archiveReason: "reset",
        },
      ]).history;
      setPlanHistory(nextHistory);
      deletedPlanIdsRef.current.add(removed.id);
      if (user?.id) writeDeletedPlanIds(user.id, deletedPlanIdsRef.current);
    }
    if (user) {
      localStorage.removeItem(`myswym_plans_${user.id}`);
      localStorage.removeItem(`myswym_active_${user.id}`);
      localStorage.removeItem(`myswym_plans_updated_${user.id}`);
      localStorage.removeItem(`myswym_profile_${user.id}`);
      localStorage.removeItem(`myswym_plan_${user.id}`);
      try {
        localStorage.setItem(`myswym_plan_history_${user.id}`, JSON.stringify(nextHistory));
      } catch {}
      writeDeletedPlanIds(user.id, new Set());
      deletedPlanIdsRef.current = new Set();
      plansSaveGenRef.current += 1;
      persistAccountPlans(user.id, [], null, deletedPlanIdsRef.current, nextHistory)
        .then(({ history, error }) => {
          if (!error && Array.isArray(history)) setPlanHistory(history);
        })
        .catch(() => {});
    }
    setPlans([]); setActivePlanId(null);
    prevBadgesRef.current = [];
    // Garder le shell app, questionnaire dans Programme
    enterQuestionnaire({ resetProfile: true });
  };

  const handleSignOut = async () => {
    resetAnalytics();
    signingOutRef.current = true;
    forceAuthRef.current = true;
    authOpenedFromUrlRef.current = true;
    setSettingsOpen(false);
    // signOut AVANT navigate : sinon user encore set + /connexion → effet renvoie vers /app
    try {
      await supabase.auth.signOut();
    } finally {
      setScreen("auth");
      navigate("/connexion", { replace: true });
      // Laisse passer les effets de route en retard avant de relâcher
      setTimeout(() => { signingOutRef.current = false; }, 500);
    }
  };

  const handleDeleteAccount = async () => {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const session = refreshData?.session;
    if (!session) throw new Error("Reconnecte-toi pour supprimer ton compte.");
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: "{}",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Suppression impossible.");
    resetAnalytics();
    signingOutRef.current = true;
    forceAuthRef.current = true;
    authOpenedFromUrlRef.current = true;
    setSettingsOpen(false);
    try {
      await supabase.auth.signOut();
    } finally {
      setScreen("auth");
      navigate("/connexion", { replace: true });
      setTimeout(() => { signingOutRef.current = false; }, 500);
    }
    showToast("Compte supprimé.");
  };

  const handleRefreshStatus = async () => {
    showToast("Synchronisation avec Stripe…");
    try {
      const u = await syncSubscriptionFromStripe();
      if (u) {
        setUser(u);
        const premium = checkIsPremium(u);
        setIsPremium(premium);
        showToast(premium ? "Premium activé ✓" : "Pas d’abonnement actif", 5000);
        if (premium) closeUpgrade();
      }
    } catch {
      showToast("Impossible de synchroniser. Réessaie ou contacte support@myswym.app", 8000);
    }
  };

  const handlePortal = async () => {
    setCancelSurveyOpen(true);
  };

  const proceedToStripePortal = async (cancelReason = null) => {
    setCancelSurveyOpen(false);
    if (cancelReason) {
      trackEvent("cancel_survey", { reason: cancelReason }, { essential: true });
    }
    showToast("Redirection vers Stripe…");
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (!session) { showToast("Reconnecte-toi pour gérer ton abonnement."); return; }

      // Le serveur résout le customer via app_metadata ou email, pas de gate client
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ origin: window.location.origin, cancelReason }),
      });
      const json = await res.json();
      if (json.url) { window.location.href = json.url; return; }
      showToast(json.error || "Impossible d'ouvrir le portail Stripe.");
    } catch (e) {
      showToast("Erreur réseau. Réessaie.");
    }
  };

  const skipCancelSurvey = () => proceedToStripePortal(null);

  const goal  = findGoalById(activeProfile.goal);
  const stats = plan ? computeStats(plan) : null;
  const hasSwumNav = (stats?.totalSessions || 0) > 0;

  if (authLoading) return (
    <>
      <style>{css}</style>
      <Loading />
    </>
  );

  if (isRecovery) return (
    <>
      <style>{css}</style>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: G.bg }}>
        <ResetPasswordScreen showBrandHeader={false} onDone={() => {
          setIsRecovery(false);
          // Recharge les données utilisateur après reset
          supabase.auth.getUser().then(({ data }) => {
            const u = data?.user;
            if (u) { setUser(u); setIsPremium(checkIsPremium(u)); loadUserData(u.id, checkIsPremium(u)); }
          });
        }} />
      </div>
      <Footer />
    </>
  );

  // L'AuthScreen s'affiche quand l'utilisateur le demande explicitement
  // ou quand l'app doit rattacher le programme et l'essai 7j à un compte.
  if (screen === "auth") return (
    <>
      <style>{css}</style>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: G.bg, color: G.ink }} className="ms-screen-enter">
        <AuthScreen
          onAuth={handleAuthSuccess}
          initialMode={AUTH_PATHS[location.pathname] || "password"}
          onNavigateMode={handleAuthNavigateMode}
          onStartQuiz={exitAuthToQuiz}
          showBrandHeader={false}
          onBack={handleAuthBack}
        />
      </div>
      <Footer />
    </>
  );

  if (screen === "firstSwimTip") return (
    <>
      <style>{css}</style>
      <FirstSwimTip
        colors={G}
        sessionTitle={plan?.weeks?.[0]?.sessions?.[0]?.title || null}
        onContinue={dismissFirstSwimTip}
      />
    </>
  );

  if (screen === "planReveal") return (
    <>
      <style>{css}</style>
      <PlanRevealView
        phase={planReveal?.phase || "building"}
        plan={plan}
        profile={activeProfile}
        colors={G}
        onContinue={dismissPlanReveal}
      />
    </>
  );

  if (screen === "loading" || waitingForAccess) return <><style>{css}</style><Loading /></>;

  if (isFrozen) {
    const freezePreview = plan?.weeks?.[0]?.sessions?.[0]
      || plan?.history?.filter((s) => s)?.slice(-1)?.[0]
      || null;
    return (
    <>
      <style>{css}</style>
      <TrialExpiredFreeze
        onSubscribe={() => openUpgrade("trial_expired")}
        onSignOut={handleSignOut}
        preview={freezePreview}
      />
      {showUpgrade && (
        <UpgradeModal
          onClose={closeUpgrade}
          softContext="trial_expired"
          weeksBlocked={null}
          planWeeks={plan?.totalRealWeeks || plan?.weeks?.length || 0}
          trialEligible={false}
          canDismiss
        />
      )}
    </>
  );
  }

  if (screen === "onboarding") return (
    <>
      <style>{css}</style>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: G.bg, paddingTop: 64 }}>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ paddingTop: 84, paddingBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <BrandLogo variant="wordmark" height={22} />
              </div>
            </div>
            <OnboardingWizard
              profile={profile}
              step={step}
              setStep={setStep}
              update={update}
              patchProfile={patchProfile}
              error={error}
              isPremium={isPremium}
              onUpgrade={() => openUpgrade()}
              onGenerate={handleGenerate}
              mode={questionnaireMode}
              onEditProfile={() => goTab("profile")}
            />
          </div>
        </div>
      </div>
      {showUpgrade && (
        <UpgradeModal
          onClose={closeUpgrade}
          softContext={upgradeSoftContext}
          weeksBlocked={null}
          planWeeks={plan?.totalRealWeeks || plan?.weeks?.length || 0}
          trialEligible={!accessState.trialUsed}
        />
      )}
      <Footer />
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="myswym-app">
        {/* Compte sans plan : nudge inscription (l’essai 7j sans carte démarre au compte). */}
        {!user && plans.length > 0 && (
          <div className="app-shell" style={{ position: "sticky", top: 0, zIndex: 50, maxWidth: "100%", background: G.blue, color: G.white, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "var(--app-max)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 600 }}>
            <span style={{ flex: 1, lineHeight: 1.3 }}>
              Sauvegarde ton plan pour le retrouver sur tous tes appareils
            </span>
            <button onClick={() => { authOpenedFromUrlRef.current = false; openAuth("register"); }} style={{ background: G.white, color: G.blue, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              Créer mon compte
            </button>
            </div>
          </div>
        )}
        {user && isPremium && accessState.status === "trial" && accessState.trialDaysLeft > 0 && accessState.trialDaysLeft <= 2 && activeTab !== "home" && (
          <div style={{ background: G.blueLight, borderBottom: `1px solid ${G.greyLight}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "var(--app-max)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 600, color: G.blue }}>
              <span style={{ flex: 1, lineHeight: 1.35 }}>
                {accessState.trialDaysLeft === 1
                  ? "Dernier jour d’essai, demain tes séances se mettent en pause. Abonne-toi pour garder tes plans."
                  : `Plus que ${accessState.trialDaysLeft} jours d’essai. Ensuite tes séances se mettent en pause.`}
              </span>
              <button type="button" onClick={() => openUpgrade("trial_expired")} style={{ background: G.blue, color: G.white, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                S’abonner
              </button>
            </div>
          </div>
        )}
        {activeTab === "home"    && <Dashboard   plan={plan} profile={activeProfile} onTabChange={goTab} onShare={openShare} onSignOut={handleSignOut} user={user} isPremium={isPremium} onRegenerateLoop={handleRegenerateLoopSession} onUpgrade={(ctx) => openUpgrade(ctx || "trial_required")} onReset={handleReset} onEditFeedback={handleEditSessionFeedback} onPaceUpdate={handlePaceUpdate} onValidateSession={handleComplete} onOpenMenu={() => setSettingsOpen(true)} activePlanId={activePlanId} accessState={accessState} />}
        {activeTab === "plan"    && <PlanTab     plan={plan} profile={activeProfile} isPremium={isPremium} onComplete={handleComplete} onAdvanceLoop={handleAdvanceLoopSession} onShare={openShare} onEditFeedback={handleEditSessionFeedback} onReset={handleReset} onUpgrade={(ctx) => openUpgrade(ctx || "trial_required")} startDate={activePlanEntry?.startDate} plans={plans} activePlanId={activePlanId} onSwitchPlan={handleSwitchPlan} onAddPlan={handleAddPlan} onDeletePlan={handleDeletePlan} onRegenerateLoop={handleRegenerateLoopSession} onUpdateProgram={handleUpdateProgram} user={user} onOpenMenu={() => setSettingsOpen(true)} onTabChange={goTab} addingPlan={addingPlan} onCancelAddPlan={handleCancelAddPlan} onboardingProps={{
          profile,
          step,
          setStep,
          update,
          patchProfile,
          error,
          isPremium,
          onUpgrade: () => openUpgrade(),
          onGenerate: handleGenerate,
          mode: questionnaireMode,
          onEditProfile: () => goTab("profile"),
        }} />}
        {activeTab === "analyse" && (
          <AnalyseTab
            plan={plan}
            profile={activeProfile}
            user={user}
            isPremium={isPremium}
            onOpenMenu={() => setSettingsOpen(true)}
            onTabChange={goTab}
            onUpgrade={(ctx) => openUpgrade(ctx || "trial_required")}
            onPaceUpdate={handlePaceUpdate}
            onValidateSession={handleComplete}
          />
        )}
        {activeTab === "history" && (
          <HistoriqueTab
            plan={plan}
            profile={activeProfile}
            user={user}
            isPremium={isPremium}
            activePlanId={activePlanId}
            onOpenMenu={() => setSettingsOpen(true)}
            onTabChange={goTab}
            onUpgrade={(ctx) => openUpgrade(ctx || "trial_required")}
            onShare={openShare}
          />
        )}
        {activeTab === "profile" && (
          <ProfileTab
            plan={plan}
            profile={activeProfile}
            user={user}
            onUserUpdate={setUser}
            onTabChange={goTab}
            onBack={() => goTab(lastDockTabRef.current || "home")}
            onEquipmentChange={handleEquipmentChange}
            onSwimmerProfileChange={handleSwimmerProfileChange}
            isPremium={isPremium}
            onUpgrade={(ctx) => openUpgrade(ctx || "trial_required")}
            onPortal={handlePortal}
            onRefreshStatus={handleRefreshStatus}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
            referralSlot={<ReferralShareCard />}
          />
        )}
        <Suspense fallback={null}>
        {activeTab === "buddies" && hasSwumNav && <BuddyMatching user={user} profile={activeProfile} onOpenMenu={() => setSettingsOpen(true)} onTabChange={goTab} canUseBuddies={accessState.canUseBuddies} onUpgrade={(ctx) => openUpgrade(ctx || "buddies")} />}
        </Suspense>

        <Suspense fallback={null}><SupportBubble aboveBottomNav={activeTab !== "profile"} user={user} /></Suspense>
        {activeTab !== "profile" && (
          <BottomNav
            active={activeTab === "buddies" ? "analyse" : activeTab}
            onChange={goTab}
            newBadge={newBadgeId !== null}
          />
        )}
        <Suspense fallback={null}>
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          isPremium={isPremium}
          onUpgrade={() => openUpgrade()}
          onGoHome={() => goTab("home")}
          onGoPlan={() => goTab("plan")}
          onGoAnalyse={() => goTab("analyse")}
          onGoHistory={() => goTab("history")}
          onGoProfile={() => goTab("profile")}
          onGoBuddies={() => goTab("buddies")}
          showBuddies={hasSwumNav}
          lockBuddies={!accessState.canUseBuddies}
          showModifyPlan={!!plan || plans.length > 0}
          onModifyPlan={handleAddPlan}
        />
        </Suspense>

        {cancelSurveyOpen && (
          <CancelSurveySheet
            onChoose={(reason) => proceedToStripePortal(reason)}
            onSkip={skipCancelSurvey}
          />
        )}

        {sessionFeedbackTarget !== null && !sessionCelebrate && (() => {
          const s = sessionFeedbackTarget.archived
            || plan?.weeks?.[sessionFeedbackTarget.weekIndex]?.sessions?.[sessionFeedbackTarget.sessionIndex];
          return (
            <SessionFeedbackSheet
              key={`${sessionFeedbackTarget.weekIndex}-${sessionFeedbackTarget.sessionIndex}-${s?.feedback?.at || "new"}`}
              sessionTitle={s?.title}
              initial={s?.feedback || null}
              onSubmit={handleSessionFeedback}
              onSkip={closeSessionFeedbackSheet}
              isPremium={isPremium}
              healthConsent={hasHealthConsent(activeProfile) || hasHealthConsent(user)}
            />
          );
        })()}
        {feedbackWeek !== null && sessionFeedbackTarget === null && <FeedbackModal weekNumber={plan.weeks[feedbackWeek]?.number} onSubmit={handleFeedback} onSkip={() => setFeedbackWeek(null)} isPremium={isPremium} />}
        {shareSession && (
          <ShareModal
            session={shareSession}
            goalLabel={goal?.label}
            badge={shareBadgeId}
            onClose={() => { setShareSession(null); setShareBadgeId(null); }}
          />
        )}
        {newBadgeId && (
          <BadgeCelebrateSheet
            badgeId={newBadgeId}
            session={lastCompletedSessionRef.current || plan?.weeks?.[0]?.sessions?.[0] || null}
            onShare={openShare}
            onClose={() => setNewBadgeId(null)}
          />
        )}
        {sessionCelebrate && (
          <SessionCompleteView
            meters={sessionCelebrate.meters}
            streak={sessionCelebrate.streak}
            first={sessionCelebrate.first}
            onContinue={dismissSessionCelebrate}
          />
        )}
        {toast && (
          <div className="toast-in app-toast" style={{ background: G.surface, color: G.ink, borderRadius: 14, padding: "14px 16px", fontSize: 14, lineHeight: 1.5, boxShadow: "0 8px 32px rgba(0,0,0,0.28)", border: `1px solid ${G.greyLight}` }}>
            {toast}
          </div>
        )}
        {loopPaywall && (
          <LoopPaywallScreen
            reason={loopPaywall}
            onUpgrade={() => { setLoopPaywall(null); openUpgrade(); }}
            onClose={() => setLoopPaywall(null)}
          />
        )}
        {showPlanReady && !isPremium && plan && (
          <PlanReadySheet
            plan={plan}
            profile={activeProfile || profile}
            loading={planReadyLoading}
            onContinue={startMonthlyCheckout}
            onDismiss={() => setShowPlanReady(false)}
          />
        )}
        {showWhatsNew && !showPlanReady && !showUpgrade && (
          <WhatsNewSheet
            loading={whatsNewLoading}
            onContinue={() => { void handleWhatsNewContinue(); }}
          />
        )}
        {showUpgrade && (
          <UpgradeModal
            onClose={closeUpgrade}
            softContext={upgradeSoftContext}
            weeksBlocked={null}
            planWeeks={plan?.totalRealWeeks || plan?.weeks?.length || 0}
            trialEligible={!accessState.trialUsed}
            canDismiss={upgradeSoftContext !== "trial_expired"}
          />
        )}
        {replaceConfirmOpen && (
          <ConfirmSheet
            title="Remplacer ton plan ?"
            message="Tu as déjà un plan actif. Le remplacer archive l'ancien et génère un nouveau plan. Continuer ?"
            confirmLabel="Continuer"
            cancelLabel="Annuler"
            destructive={false}
            onConfirm={confirmReplacePlan}
            onCancel={() => setReplaceConfirmOpen(false)}
          />
        )}
        {deletePlanId && (
          <ConfirmSheet
            title="Supprimer ce plan ?"
            message="Cette action est définitive. Ton historique et ta progression sur ce plan seront perdus."
            confirmLabel="Supprimer le plan"
            onConfirm={confirmDeletePlan}
            onCancel={() => setDeletePlanId(null)}
          />
        )}
      </div>
    </>
  );
}
