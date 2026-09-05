/**
 * Usage: node src/lib/week-day-strip.test.js
 */
import {
  buildWeekDayStrip,
  daySlotsForFrequency,
  startOfWeekMonday,
} from "./week-day-strip.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(daySlotsForFrequency(3).join(",") === "0,2,4", "3× → Lun Mer Ven");
assert(daySlotsForFrequency(2).join(",") === "1,4", "2× → Mar Ven");
assert(daySlotsForFrequency(99).join(",") === "0,1,2,3,4,5,6", "cap 7");

const mon = startOfWeekMonday(new Date(2026, 8, 5, 15)); // sam 5 sept 2026
assert(mon.getDay() === 1, "lundi");
assert(mon.getDate() === 31, "31 août 2026"); // semaine du 31 août

const plan = {
  weeks: [
    {
      number: 1,
      sessions: [
        { title: "A", distance: "2000m", completed: true },
        { title: "B", distance: "2200m", completed: false },
        { title: "C", distance: "2400m", completed: true },
      ],
    },
  ],
};

const strip = buildWeekDayStrip(plan, { sessionsPerWeek: 3 }, new Date(2026, 8, 5, 12));
assert(strip?.length === 7, "7 jours");
assert(strip[0].label === "Lun", "Lun");
assert(strip[5].isToday === true, "samedi = today");
assert(strip[0].done === true, "Lun fait (séance 1)");
assert(strip[0].scheduled === true, "Lun programmé");
assert(strip[2].done === false, "Mer pas fait (séance 2)");
assert(strip[2].scheduled === true, "Mer programmé");
assert(strip[4].done === true, "Ven fait (séance 3)");
assert(strip[1].done === false && strip[1].scheduled === false, "Mar hors slots");

const skippedPlan = {
  weeks: [
    {
      number: 1,
      sessions: [
        { title: "A", distance: "2000m", skipped: "missed" },
        { title: "B", distance: "2200m" },
        { title: "C", distance: "2400m" },
      ],
    },
  ],
};
const skippedStrip = buildWeekDayStrip(skippedPlan, { sessionsPerWeek: 3 }, new Date(2026, 8, 5, 12));
assert(skippedStrip[0].done === false, "skipped ≠ done");

console.log("week-day-strip.test.js OK");
