/**
 * Bandeau Analyse : semaine calendaire Lun→Dim + slots séances (approche B).
 * Les séances de la semaine de plan sont projetées sur des jours fixes
 * selon la fréquence ; un point = séance completed (pas skipped).
 */
import { buildWeekProjection } from "./week-projection.js";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Index 0 = lundi … 6 = dimanche. */
export const SESSION_DAY_SLOTS = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Lundi 00:00 local de la semaine contenant `date`. */
export function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

/**
 * @param {number} sessionsPerWeek
 * @returns {number[]}
 */
export function daySlotsForFrequency(sessionsPerWeek) {
  const n = Math.max(1, Math.min(7, Number(sessionsPerWeek) || 3));
  return SESSION_DAY_SLOTS[n] || SESSION_DAY_SLOTS[3];
}

/**
 * @param {object|null} plan
 * @param {object} [profile]
 * @param {Date|number} [now]
 * @returns {Array<{
 *   key: string,
 *   label: string,
 *   dateNum: number,
 *   isToday: boolean,
 *   done: boolean,
 *   scheduled: boolean,
 * }> | null}
 */
export function buildWeekDayStrip(plan, profile = {}, now = Date.now()) {
  if (!plan?.weeks?.length) return null;

  const nowDate = now instanceof Date ? now : new Date(now);
  const monday = startOfWeekMonday(nowDate);
  const todayKey = [
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ].join("-");

  const projection = buildWeekProjection(plan, profile);
  const sessions = projection?.sessions || [];
  const freq = Math.max(
    1,
    Math.min(
      7,
      Number(profile.sessionsPerWeek) || sessions.length || 3,
    ),
  );
  const slots = daySlotsForFrequency(freq);

  const doneByDay = new Array(7).fill(false);
  const scheduledByDay = new Array(7).fill(false);

  sessions.forEach((session, i) => {
    if (i >= slots.length) return;
    const dayIndex = slots[i];
    scheduledByDay[dayIndex] = true;
    if (session.status === "done") doneByDay[dayIndex] = true;
  });

  return DAY_LABELS.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
    return {
      key,
      label,
      dateNum: date.getDate(),
      isToday: key === todayKey,
      done: doneByDay[i],
      scheduled: scheduledByDay[i],
    };
  });
}
