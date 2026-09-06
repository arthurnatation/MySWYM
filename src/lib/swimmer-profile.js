/**
 * Profil nageur persistant vs objectif de plan.
 * Source de vérité compte : sport_profiles (+ miroir dans le plan actif pour offline).
 * Un utilisateur = un profil ; un seul plan actif (plans_json length ≤ 1).
 */

import { impliedSwimStyleForLevel } from "./onboarding-level-gate.js";
import { resolveInjuryFields } from "./health-data.js";

export const SWIMMER_PROFILE_KEYS = Object.freeze([
  "level",
  "pool",
  "sessionsPerWeek",
  "birthMonth",
  "birthDay",
  "birthYear",
  "age", // dérivé de birthDay/birthMonth/birthYear (miroir legacy)
  "gender", // homme | femme, optionnel (libellé UI : sexe)
  "weightKg",
  "heightCm",
  "equipment",
  "swimStyle",
  "preferredStroke",
  "targetSessionDistance",
  "injuryStatus",
  "injuryZone",
  "injurySeverity",
  "injuries",
  "injuryNote",
  "healthConsent",
  "healthConsentAt",
  "healthDeclaration",
  "pace100",
  "pace50",
  "pace400",
  "readinessProfile",
  "sessionDuration",
]);

export const BIRTH_MONTH_OPTIONS = Object.freeze([
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
]);

/** Nombre de jours dans le mois de naissance (31 si mois/année incomplets). */
export function daysInBirthMonth(birthMonth, birthYear) {
  const y = Number(birthYear);
  const m = Number(birthMonth);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
  return new Date(Math.round(y), Math.round(m), 0).getDate();
}

/**
 * Âge en années révolues depuis jour / mois / année de naissance.
 * Sans jour : anniversaire traité au 1er du mois de naissance.
 */
export function computeAgeFromBirth(birthMonth, birthYear, now = new Date(), birthDay) {
  const year = Number(birthYear);
  const month = Number(birthMonth);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const y = Math.round(year);
  const m = Math.round(month);
  const maxYear = now.getFullYear();
  if (y < 1900 || y > maxYear || m < 1 || m > 12) return null;
  const dim = new Date(y, m, 0).getDate();
  const rawDay = Number(birthDay);
  const day = Number.isFinite(rawDay) && rawDay >= 1 ? Math.min(Math.round(rawDay), dim) : 1;
  let age = maxYear - y;
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  if (nowMonth < m || (nowMonth === m && nowDay < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

/** Sexe déclaré (optionnel). Pas utilisé par le moteur de séances. */
export const GENDER_IDS = Object.freeze(["homme", "femme"]);

export const GENDER_OPTIONS = Object.freeze([
  { id: "homme", label: "Homme" },
  { id: "femme", label: "Femme" },
]);

export function normalizeGender(value) {
  if (value == null || value === "") return "";
  const s = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (s === "homme" || s === "male" || s === "man" || s === "h") return "homme";
  if (s === "femme" || s === "female" || s === "woman" || s === "f") return "femme";
  return "";
}

export function genderLabelFr(value) {
  const id = normalizeGender(value);
  if (id === "homme") return "Homme";
  if (id === "femme") return "Femme";
  return "Non renseigné";
}

export function ageBandLabel(age) {
  if (age == null || age === "") return "inconnu";
  const n = Number(age);
  if (!Number.isFinite(n) || n < 0 || n > 120) return "inconnu";
  if (n < 25) return "< 25";
  if (n < 35) return "25-34";
  if (n < 45) return "35-44";
  if (n < 55) return "45-54";
  return "55+";
}

/** Normalise jour/mois/année et recalcule `age` si possible (sinon conserve age legacy). */
export function withDerivedAge(profile = {}, now = new Date()) {
  if (!profile || typeof profile !== "object") return {};
  const out = { ...profile };

  const monthNum =
    profile.birthMonth != null && profile.birthMonth !== ""
      ? Math.round(Number(profile.birthMonth))
      : null;
  const yearNum =
    profile.birthYear != null && profile.birthYear !== ""
      ? Math.round(Number(profile.birthYear))
      : null;
  const dayNum =
    profile.birthDay != null && profile.birthDay !== ""
      ? Math.round(Number(profile.birthDay))
      : null;

  if (Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12) {
    out.birthMonth = monthNum;
  } else if (profile.birthMonth === "") {
    out.birthMonth = "";
  }

  const maxYear = now.getFullYear();
  if (Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= maxYear) {
    out.birthYear = yearNum;
  } else if (profile.birthYear === "") {
    out.birthYear = "";
  }

  const dim = daysInBirthMonth(out.birthMonth, out.birthYear);
  if (Number.isFinite(dayNum) && dayNum >= 1) {
    out.birthDay = Math.min(dayNum, dim);
  } else if (profile.birthDay === "") {
    out.birthDay = "";
  }

  const derived = computeAgeFromBirth(out.birthMonth, out.birthYear, now, out.birthDay);
  if (derived != null) {
    out.age = derived;
  } else if (profile.age != null && profile.age !== "") {
    const a = Number(profile.age);
    if (Number.isFinite(a)) out.age = Math.round(a);
  }
  return out;
}

export const PLAN_OBJECTIVE_KEYS = Object.freeze([
  "category",
  "goal",
  "eventDate",
  "raceTarget",
  "trainingFocus",
  "trainingWish",
  "trainingWishMeta",
]);

/** Champs indispensables pour générer sans re-questionnaire profil. */
export const REQUIRED_SWIMMER_FIELDS = Object.freeze([
  "level",
  "pool",
  "sessionsPerWeek",
  "swimStyle",
  "preferredStroke",
]);

/** Distance moyenne / séance si le nageur n’a pas encore choisi (palier du niveau). */
export function defaultSessionDistanceForLevel(level) {
  const l = String(level || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (l.includes("decouv") || l === "beginner" || l === "debutant") return 1000;
  if (l.includes("sportif")) return 2500;
  if (l.includes("perf") || l === "advanced") return 3000;
  return 2000;
}

/**
 * Complète les champs reportés après le questionnaire court
 * (bassin 25 m, aucun matos, nage selon le niveau, distance selon le niveau).
 * Débutant → crawl ; Avancé → 4 nages (écrase un ancien crawl). Intermédiaire : n’écrase pas un choix déjà fait.
 */
export function applyFirstPlanDefaults(profile = {}) {
  const next = { ...profile };
  const pool = Number(next.pool);
  next.pool = pool === 50 ? 50 : 25;
  if (!Array.isArray(next.equipment)) next.equipment = [];
  const implied = impliedSwimStyleForLevel(next.level);
  if (implied) next.swimStyle = implied;
  else if (!next.swimStyle) next.swimStyle = "crawl";
  if (!next.preferredStroke) next.preferredStroke = "crawl";
  if (!(Number(next.targetSessionDistance) > 0)) {
    next.targetSessionDistance = defaultSessionDistanceForLevel(next.level);
  }
  if (next.injuryStatus == null || next.injuryStatus === "") {
    next.injuryStatus = "aucune";
  }
  return next;
}

export const TRAINING_FOCUS_OPTIONS = Object.freeze([
  {
    id: "technique",
    label: "Technique & sensations",
    desc: "Éducatifs, fluidité, meilleure nage",
  },
  {
    id: "endurance",
    label: "Endurance & régularité",
    desc: "Volume maîtrisé, rythme durable",
  },
  {
    id: "intensite",
    label: "Intensité & vitesse",
    desc: "Allures, reprises, travail de vitesse",
  },
  {
    id: "plaisir",
    label: "Plaisir & variété",
    desc: "Séances variées, motivation, fun",
  },
]);

const EQUIPMENT_IDS = new Set([
  "planche",
  "pull",
  "palmes",
  "tuba",
  "plaquettes",
  "plaquettes_doigts",
  "elastique",
]);

function pick(obj, keys) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export function normalizeEquipment(equipment) {
  if (!Array.isArray(equipment)) return equipment == null ? null : [];
  return equipment.filter((id) => EQUIPMENT_IDS.has(id));
}

/** Extrait les champs stables du nageur depuis un profil / row / plan. */
export function extractSwimmerProfile(source = {}) {
  const raw = pick(source, SWIMMER_PROFILE_KEYS);
  if (raw.equipment !== undefined) {
    raw.equipment = normalizeEquipment(raw.equipment);
  }
  if (raw.pool != null) raw.pool = Number(raw.pool) === 50 ? 50 : 25;
  if (raw.sessionsPerWeek != null && raw.sessionsPerWeek !== "") {
    const n = Number(raw.sessionsPerWeek);
    if (Number.isFinite(n)) raw.sessionsPerWeek = Math.max(1, Math.min(5, n));
  }
  const withAge = withDerivedAge(raw);
  const out = { ...withAge, ...resolveInjuryFields(withAge) };
  const genderRaw = withAge.gender ?? source.gender;
  if (genderRaw !== undefined) out.gender = normalizeGender(genderRaw);
  return out;
}

/** Extrait l'objectif / préférences de cycle (plan). */
export function extractPlanObjective(source = {}) {
  return pick(source, PLAN_OBJECTIVE_KEYS);
}

/** Fusion pour le générateur : profil + objectif + contraintes. */
export function mergeForGeneration(swimmerProfile = {}, objective = {}, extras = {}) {
  const equipment = normalizeEquipment(
    swimmerProfile.equipment !== undefined ? swimmerProfile.equipment : extras.equipment,
  );
  return {
    ...extractSwimmerProfile(swimmerProfile),
    ...extractPlanObjective(objective),
    ...extras,
    equipment: Array.isArray(equipment) ? equipment : [],
  };
}

export function missingSwimmerProfileFields(profile = {}) {
  const missing = [];
  for (const key of REQUIRED_SWIMMER_FIELDS) {
    const v = profile[key];
    if (v == null || v === "") missing.push(key);
  }
  // equipment : null = inconnu (à demander) ; [] = aucun matos (ok)
  if (!Array.isArray(profile.equipment)) missing.push("equipment");
  return missing;
}

export function isSwimmerProfileComplete(profile) {
  return missingSwimmerProfileFields(profile).length === 0;
}

/**
 * Mode questionnaire :
 * - full : première fois / profil incomplet
 * - goal : profil complet → objectif + focus seulement
 */
export function resolveQuestionnaireMode(swimmerProfile, { replacing = false } = {}) {
  if (isSwimmerProfileComplete(swimmerProfile)) return "goal";
  if (replacing && isSwimmerProfileComplete(swimmerProfile)) return "goal";
  return "full";
}

/**
 * Garantit au plus un plan actif.
 * Les autres entrées vont en historique (sans doublon d'id).
 */
export function enforceSingleActivePlan(plans = [], activeId = null, history = []) {
  const list = Array.isArray(plans) ? plans.filter(Boolean) : [];
  const hist = Array.isArray(history) ? [...history] : [];
  if (list.length === 0) {
    return { plans: [], activeId: null, history: hist };
  }

  let active =
    (activeId && list.find((e) => e.id === activeId)) ||
    list[0];
  const activePlanId = active?.id || null;

  for (const e of list) {
    if (!e?.id || e.id === activePlanId) continue;
    if (!hist.some((h) => h?.id === e.id)) {
      hist.push({
        ...e,
        archivedAt: e.archivedAt || new Date().toISOString(),
        archiveReason: e.archiveReason || "single_active_enforced",
      });
    }
  }

  return {
    plans: active ? [active] : [],
    activeId: activePlanId,
    history: hist,
  };
}

/**
 * Remplace le plan actif : ancien → historique, nouveau devient seul actif.
 */
export function replaceActivePlan(plans = [], history = [], newEntry, previousActiveId = null) {
  const hist = Array.isArray(history) ? [...history] : [];
  const list = Array.isArray(plans) ? plans : [];
  const prevId = previousActiveId || list[0]?.id || null;

  for (const e of list) {
    if (!e?.id || e.id === newEntry?.id) continue;
    if (!hist.some((h) => h?.id === e.id)) {
      hist.push({
        ...e,
        archivedAt: new Date().toISOString(),
        archiveReason: e.id === prevId ? "replaced" : "single_active_enforced",
      });
    }
  }

  return {
    plans: newEntry ? [newEntry] : [],
    activeId: newEntry?.id || null,
    history: hist,
  };
}

/** Prefill questionnaire depuis profil persisté + objectif draft. */
export function buildQuestionnaireDraft(swimmerProfile = {}, objective = {}) {
  return {
    category: "",
    goal: "",
    eventDate: "",
    trainingFocus: null,
    level: "",
    pool: 25,
    sessionsPerWeek: null,
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    age: "",
    gender: "",
    weightKg: "",
    heightCm: "",
    injuryStatus: null,
    injuryZone: null,
    injurySeverity: null,
    injuries: [],
    injuryNote: "",
    healthConsent: false,
    healthConsentAt: null,
    healthDeclaration: false,
    swimStyle: null,
    preferredStroke: null,
    equipment: null,
    pace100: null,
    pace50: null,
    pace400: null,
    targetSessionDistance: null,
    trainingWish: "",
    trainingWishMeta: null,
    ...extractSwimmerProfile(swimmerProfile),
    ...extractPlanObjective(objective),
  };
}

/** Merge sport_profiles row fields + plan blob profile (blob wins for equipment if set). */
export function hydrateSwimmerFromSources({ sportRowFields = {}, planProfile = {} } = {}) {
  const fromSport = extractSwimmerProfile(sportRowFields);
  const fromPlan = extractSwimmerProfile(planProfile);
  const merged = { ...fromSport, ...fromPlan };
  // Prefer account sport_profiles for stable fields when plan lacks them
  for (const key of REQUIRED_SWIMMER_FIELDS) {
    if ((merged[key] == null || merged[key] === "") && fromSport[key] != null && fromSport[key] !== "") {
      merged[key] = fromSport[key];
    }
  }
  if (!Array.isArray(merged.equipment) && Array.isArray(fromSport.equipment)) {
    merged.equipment = fromSport.equipment;
  }
  for (const key of ["gender", "birthMonth", "birthDay", "birthYear", "age", "weightKg", "heightCm"]) {
    if ((merged[key] == null || merged[key] === "") && fromSport[key] != null && fromSport[key] !== "") {
      merged[key] = fromSport[key];
    }
  }
  // Compte = source de vérité santé (pas le blob plan).
  if (
    fromSport.injuryStatus != null
    || (Array.isArray(fromSport.injuries) && fromSport.injuries.length > 0)
  ) {
    return { ...merged, ...resolveInjuryFields(fromSport) };
  }
  return { ...merged, ...resolveInjuryFields(merged) };
}
