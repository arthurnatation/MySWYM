/**
 * Écran trophée post-génération.
 * Usage : node src/lib/plan-reveal.test.js
 */
import assert from "node:assert/strict";
import {
  shouldShowPlanReveal,
  revealGoalLabel,
  revealLevelLabel,
  revealMinWaitMs,
  PLAN_REVEAL_MIN_MS,
  buildPlanRevealModel,
  sessionPreviewFromPlan,
  findNextSession,
} from "./plan-reveal.js";

function ok(cond, msg) {
  assert.ok(cond, msg);
}

ok(shouldShowPlanReveal({}) === true, "first plan shows reveal");
ok(shouldShowPlanReveal({ addingPlan: false }) === true, "onboarding generate shows reveal");
ok(shouldShowPlanReveal({ addingPlan: true }) === false, "extra plan skips reveal");

ok(revealGoalLabel({ goal: "triathlon_sprint" }) === "Triathlon Sprint", "sprint label");
ok(revealGoalLabel({ goal: "open_water_25k" }) === "Eau libre longue", "legacy 25k → longue");
ok(revealGoalLabel({ goal: "open_water_short" }) === "Eau libre courte", "canonical short");
ok(revealGoalLabel({ category: "progression" }) === "Nager", "category fallback matches landing");
ok(revealGoalLabel({ category: "diplome" }) === "Diplômes", "diploma landing name");
ok(revealGoalLabel({}) === "Ton objectif", "empty fallback");

ok(revealLevelLabel({ level: "sportif" }) === "Intermédiaire", "sportif → intermédiaire");
ok(revealLevelLabel({ level: "régulier" }) === "Débutant", "régulier → débutant");
ok(revealLevelLabel({ level: "performance" }) === "Avancé", "performance → avancé");
ok(revealLevelLabel({ level: "découverte" }) === "Découverte", "accented level");
ok(revealLevelLabel({ level: "decouverte" }) === "Découverte", "unaccented level");

ok(revealMinWaitMs(0) === PLAN_REVEAL_MIN_MS, "full wait if generate is instant");
ok(revealMinWaitMs(PLAN_REVEAL_MIN_MS + 200) === 0, "no extra wait if generate was slow");
ok(revealMinWaitMs(0, true) === 0, "reduced motion skips wait");

const session = {
  title: "Pose les bases",
  type: "Endurance",
  distance: 1100,
  duration: 35,
  details: [
    "-200 m souple, échauffement",
    "-6 × 100 m crawl endurance",
    "-100 m souple, retour au calme",
  ],
};
const preview = sessionPreviewFromPlan({ weeks: [{ sessions: [session] }] });
ok(preview.title === "Pose les bases", "session title");
ok(preview.distanceLabel.includes("1") && preview.distanceLabel.toLowerCase().includes("m"), "distance");
ok(preview.durationLabel === "35 min", "duration");
ok(preview.blocks.length >= 2, `warm/main/cool blocks, got ${preview.blocks.length}`);
ok(preview.blocks.some((b) => /échauff/i.test(b.label)), "warm block present");
ok(preview.blocks.every((b) => /\d[\d\s]*m/i.test(b.detail)), "each block shows meter total");

const loop = buildPlanRevealModel(
  { isSessionLoop: true, weeks: [{ sessions: [session] }] },
  { category: "progression", goal: "progression", level: "regulier", sessionsPerWeek: 3 },
);
ok(loop.isLoop === true, "loop flag");
ok(loop.barCount === 0, "no fake week bars on loop");
ok(loop.goalLabel === "Nager", "loop goal");
ok(loop.frequency === 3, "freq");

const dated = buildPlanRevealModel(
  { totalRealWeeks: 9, weeks: Array.from({ length: 9 }, () => ({ sessions: [session] })) },
  { goal: "triathlon_sprint", level: "sportif", sessionsPerWeek: 2 },
);
ok(dated.weeks === 9 && dated.barCount === 9, "week bars cap to plan length");
ok(dated.goalLabel.includes("Sprint"), "dated goal");

const nextOpen = findNextSession({
  weeks: [
    { sessions: [{ title: "A", completed: true }, { title: "B" }] },
    { sessions: [{ title: "C" }] },
  ],
});
ok(nextOpen?.session?.title === "B" && nextOpen.weekIndex === 0 && nextOpen.resolved === false, "first unresolved");

const nextLoop = findNextSession({
  isSessionLoop: true,
  history: [],
  weeks: [{ sessions: [{ title: "Today" }] }],
});
ok(nextLoop?.weekIndex === 0 && nextLoop.session.title === "Séance n°1", "loop current → titre nageur");

const nextLoop2 = findNextSession({
  isSessionLoop: true,
  history: [{ title: "Séance n°1" }],
  weeks: [{ sessions: [{ title: "Whatever" }] }],
});
ok(nextLoop2?.session.title === "Séance n°2", "loop after 1 validation");

const nextDone = findNextSession({
  weeks: [{ sessions: [{ title: "A", completed: true }, { title: "B", skipped: "missed" }] }],
});
ok(nextDone?.resolved === true && nextDone.session.title === "B", "all resolved → last");
ok(findNextSession({ weeks: [] }) === null, "empty plan");

console.log("plan-reveal.test.js ok");
