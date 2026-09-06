/**
 * Modèle de l’écran trophée post-génération (DA landing).
 * Lecture seule, ne touche pas au moteur.
 */
import { buildWorkoutView } from "./workout-display.js";
import { isSessionResolved } from "./plan-progress-merge.js";
import { withLoopSessionTitle, loopSessionOrdinalIndex } from "./swim-plan-bridge.js";
import { canonicalizeGoal } from "./sports-engine/race-event.js";

const CATEGORY_LABELS = {
  progression: "Nager",
  triathlon: "Triathlon",
  eau_libre: "Eau libre",
  diplome: "Diplômes",
};

const GOAL_LABELS = {
  progression: "Nager",
  triathlon_xs: "Triathlon XS",
  triathlon_sprint: "Triathlon Sprint",
  triathlon_olympic: "Triathlon Olympique",
  triathlon_half: "Triathlon Half",
  triathlon_ironman: "Triathlon Full",
  open_water_short: "Eau libre courte",
  open_water_mid: "Eau libre moyenne",
  open_water_long: "Eau libre longue",
  open_water_500: "Eau libre courte",
  open_water_1k: "Eau libre courte",
  open_water_2_5k: "Eau libre moyenne",
  open_water_5k: "Eau libre moyenne",
  open_water_10k: "Eau libre longue",
  open_water_25k: "Eau libre longue",
  bnssa: "Prépa BNSSA",
  bpjeps_aan: "Prépa BPJEPS AAN",
  caepmns: "Prépa CAEPMNS",
  tests_pompiers: "Tests Pompiers",
  competition_maitre: "Compétition Maître",
  reprendre: "Reprendre la natation",
  perte_de_poids: "Activité physique",
};

const LEVEL_LABELS = {
  decouverte: "Découverte",
  découverte: "Découverte",
  beginner: "Débutant",
  regulier: "Débutant",
  régulier: "Débutant",
  sportif: "Intermédiaire",
  performance: "Avancé",
  advanced: "Avancé",
};

export const PLAN_REVEAL_MIN_MS = 1800;

export function shouldShowPlanReveal({ addingPlan = false } = {}) {
  return !addingPlan;
}

export function revealGoalLabel(profile = {}) {
  const goal = canonicalizeGoal(String(profile.goal || "").trim());
  if (GOAL_LABELS[goal]) return GOAL_LABELS[goal];
  const cat = String(profile.category || "").trim();
  return CATEGORY_LABELS[cat] || "Ton objectif";
}

export function revealLevelLabel(profile = {}) {
  const raw = String(profile.level || "").trim().toLowerCase();
  return LEVEL_LABELS[raw] || (profile.level ? String(profile.level) : "");
}

function clipDetail(text, max = 72) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

function sectionDetail(section) {
  const ex = section?.exercises?.[0];
  if (!ex) return "";
  if (ex.volumeLabel && ex.main && String(ex.main).includes(ex.volumeLabel)) {
    return clipDetail(ex.main);
  }
  return clipDetail([ex.volumeLabel, ex.main].filter(Boolean).join(" · "));
}

export function sessionCardModel(session) {
  if (!session) {
    return {
      title: "Séance 1",
      type: "Première séance",
      distanceLabel: null,
      durationLabel: null,
      blocks: [],
    };
  }
  const view = buildWorkoutView(session);
  const blocks = (view.sections || []).slice(0, 3).map((s) => ({
    label: s.label,
    // Total du bloc (échauff / corps / RAC), pas la 1ʳᵉ ligne d’exo
    detail: s.metersLabel || (s.meters > 0 ? `${s.meters} m` : sectionDetail(s)),
  })).filter((b) => b.detail);
  return {
    title: view.header.title || session.title || "Séance 1",
    type: view.header.type || session.type || "Première séance",
    distanceLabel: view.header.distanceLabel || (session.distance ? `${session.distance} m` : null),
    durationLabel: view.header.durationLabel || null,
    blocks,
  };
}

export function sessionWhyLine(session, profile = {}) {
  if (!session) return null;
  const type = String(session.type || "").toLowerCase();
  const focus = String(profile?.trainingFocus || profile?.goal || "").toLowerCase();
  if (type.includes("technique") || type.includes("éduc")) {
    return "Pourquoi cette séance : peaufiner la technique avant de monter la charge.";
  }
  if (type.includes("vitesse") || type.includes("sprint")) {
    return "Pourquoi cette séance : développer la puissance sur des efforts courts.";
  }
  if (type.includes("seuil")) {
    return "Pourquoi cette séance : tenir une allure soutenue sans exploser.";
  }
  if (type.includes("récup") || type.includes("recup")) {
    return "Pourquoi cette séance : récupérer en nageant, sans forcer.";
  }
  if (focus.includes("tri") || focus.includes("eau")) {
    return "Pourquoi cette séance : volume et endurance alignés sur ton objectif.";
  }
  return "Pourquoi cette séance : construire l’endurance de base, à allure confortable.";
}

export function sessionPreviewFromPlan(plan) {
  const raw = plan?.weeks?.[0]?.sessions?.[0] || null;
  const session = plan?.isSessionLoop
    ? withLoopSessionTitle(raw, loopSessionOrdinalIndex(plan))
    : raw;
  return sessionCardModel(session);
}

/** Prochaine séance à nager (boucle = séance courante). */
export function findNextSession(plan) {
  const weeks = plan?.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) return null;
  if (plan.isSessionLoop) {
    const sessions = weeks[0]?.sessions || [];
    if (!sessions.length) return null;
    let si = sessions.findIndex((s) => !isSessionResolved(s));
    const resolvedAll = si < 0;
    if (si < 0) si = sessions.length - 1;
    const raw = sessions[si];
    const session = withLoopSessionTitle(
      raw,
      resolvedAll
        ? Math.max(0, loopSessionOrdinalIndex(plan) - 1)
        : loopSessionOrdinalIndex(plan) + si,
    );
    return { weekIndex: 0, sessionIndex: si, session, resolved: resolvedAll || isSessionResolved(raw) };
  }
  const wi = weeks.findIndex((w) => !(w.sessions || []).every(isSessionResolved));
  if (wi < 0) {
    const lastW = weeks.length - 1;
    const sessions = weeks[lastW]?.sessions || [];
    if (!sessions.length) return null;
    const si = sessions.length - 1;
    return { weekIndex: lastW, sessionIndex: si, session: sessions[si], resolved: true };
  }
  const sessions = weeks[wi].sessions || [];
  const si = sessions.findIndex((s) => !isSessionResolved(s));
  if (si < 0) return null;
  return { weekIndex: wi, sessionIndex: si, session: sessions[si], resolved: false };
}

export function revealMinWaitMs(elapsedMs, reduceMotion = false) {
  if (reduceMotion) return 0;
  return Math.max(0, PLAN_REVEAL_MIN_MS - Math.max(0, elapsedMs));
}

export function buildPlanRevealModel(plan, profile) {
  const isLoop = !!(plan?.isSessionLoop || plan?.isProgression);
  const weeks = plan?.totalRealWeeks || plan?.weeks?.length || 0;
  const frequency = Number(profile?.sessionsPerWeek) || 0;
  return {
    goalLabel: revealGoalLabel(profile),
    levelLabel: revealLevelLabel(profile),
    weeks,
    frequency,
    isLoop,
    session: sessionCardModel(
      plan?.isSessionLoop
        ? withLoopSessionTitle(plan?.weeks?.[0]?.sessions?.[0] || null, loopSessionOrdinalIndex(plan))
        : (plan?.weeks?.[0]?.sessions?.[0] || null),
    ),
    barCount: isLoop ? 0 : Math.min(12, Math.max(0, weeks)),
  };
}
