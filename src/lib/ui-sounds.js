/**
 * Sons UI soft (esthétique type ElevenLabs UI : ronds, chauds, courts).
 * Synthèse Web Audio, pas d’asset externe. Muteable + prefers-reduced-motion.
 */

const STORAGE_KEY = "myswym_ui_sounds";

let audioCtx = null;
let unlocked = false;

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
}

export function getUiSoundsEnabled() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v !== "0" && v !== "false";
  } catch {
    return true;
  }
}

export function setUiSoundsEnabled(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch { /* ignore */ }
}

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/** Débloque l’AudioContext au premier geste (iOS). */
export function unlockUiSounds() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  unlocked = true;
}

function tone(ctx, {
  freq = 440,
  type = "sine",
  start = 0,
  dur = 0.08,
  gain = 0.08,
  freqEnd = null,
}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2800;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), ctx.currentTime + start + dur);
  }
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.02);
}

/**
 * @param {"tap"|"nav"|"success"|"soft"} kind
 */
export function playUiSound(kind = "tap") {
  if (!getUiSoundsEnabled() || prefersReducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (!unlocked) unlocked = true;

  try {
    if (kind === "nav") {
      tone(ctx, { freq: 520, type: "triangle", dur: 0.055, gain: 0.045, freqEnd: 380 });
      return;
    }
    if (kind === "success") {
      tone(ctx, { freq: 420, type: "sine", dur: 0.09, gain: 0.06, freqEnd: 520 });
      tone(ctx, { freq: 620, type: "triangle", start: 0.07, dur: 0.14, gain: 0.05, freqEnd: 780 });
      return;
    }
    if (kind === "soft") {
      tone(ctx, { freq: 360, type: "sine", dur: 0.07, gain: 0.035, freqEnd: 300 });
      return;
    }
    // tap (CTA / boutons principaux)
    tone(ctx, { freq: 480, type: "sine", dur: 0.06, gain: 0.055, freqEnd: 340 });
    tone(ctx, { freq: 720, type: "triangle", start: 0.008, dur: 0.045, gain: 0.028, freqEnd: 500 });
  } catch { /* ignore */ }
}
