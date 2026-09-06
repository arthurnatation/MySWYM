/**
 * Affichage séance, parse rétrocompatible des `details` string[] existants.
 * Ne modifie pas le moteur : lecture seule pour l’UI.
 */
import { toCoachDetailLines } from "./sports-engine/coach-restitution.js";
import { prettifySessionDetailLine } from "./sports-engine/session-labels.js";
import { matchEducatif } from "../content/educatifs-catalog.js";
import {
  lineHasFourNagesEducatifs,
  parseFourNagesMode,
  stripFourNagesModeToken,
} from "./natation-sheet/parse.js";

const REST_CHUNK_RE = /^(R\d+["']?|repos\s+\d+\s*(?:s|sec|min)?|D(?:toutes les )?\d+['′]\d+"|D\d+")$/i;
const SWIM_SET_PART_RE = /^(?:\d+\s*[x×]\s*\d+\s*m|\d+\s*m)\b/i;

/** Même logique que PyramidBlockViz.parsePyramidLine (copie pure JS pour tests Node). */
export function parsePyramidLine(raw) {
  const text = String(raw || "").replace(/^[\s\-–—·]+/, "").trim();
  if (!/pyramide/i.test(text)) return null;
  const arrowMatch = text.match(/(\d+(?:\s*→\s*\d+)+)/);
  let steps = [];
  if (arrowMatch) {
    steps = arrowMatch[1]
      .split(/\s*→\s*/)
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  if (steps.length < 3) {
    const dotted = [...text.matchAll(/(\d+)\s*m\b/gi)].map((m) => parseInt(m[1], 10));
    if (dotted.length >= 4) {
      const maybeVol = dotted[0];
      const rest = dotted.slice(1);
      const sumRest = rest.reduce((a, b) => a + b, 0);
      steps = Math.abs(sumRest - maybeVol) <= 50 ? rest : dotted;
    }
  }
  if (steps.length < 3) return null;
  const volume = steps.reduce((a, b) => a + b, 0);
  const peak = Math.max(...steps);
  const restMatch = text.match(/repos\s+(\d+(?:\s*[–\-]\s*\d+)?)\s*s/i);
  const labelMatch = text.match(/pyramide\s+([^:—–]+)/i);
  return {
    steps,
    peak,
    volume,
    rest: restMatch ? `repos ${restMatch[1]}s` : null,
    label: (labelMatch?.[1] || "crawl").trim(),
  };
}

export function stripDetailPrefix(raw) {
  return String(raw || "").trim().replace(/^[-–—·]\s*/, "");
}

export function classifyDetailLine(raw) {
  const full = String(raw || "");
  const trimmed = full.trim();
  if (!trimmed) return "empty";
  const body = stripDetailPrefix(trimmed);
  const isSubPrefix = /^[·]/.test(trimmed) || (/^\s/.test(full) && !/^[-–—]/.test(trimmed));
  if (isSubPrefix) return "sub";
  const isNx = /^\d+\s*[x×]\s*\d+/i.test(body) || /^\d+\s*[x×]\s*\(/i.test(body);
  if (/^\d+\s*m\b/i.test(body) && !isNx) return "header";
  return "work";
}

function estimateSetPartMeters(part) {
  const t = String(part);
  let m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*m/i);
  if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
  m = t.match(/(\d+)\s*m\b/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Jeton opaque (sans le mot « souple ») pour survivre à humanizeArthurDisplayTerms. */
const SOUPLE_TOKEN = "__MS_RECUP__";
const PROGRESSIF_TOKEN = "__MS_PROG__";
const DESCENDANT_TOKEN = "__MS_DESC__";

const ALLURE_WORD_RE =
  "lent|moyen|rapide|vite|souple|progressif|descendant|facile|soutenu|sprint|sprints|à\\s*bloc|a\\s*bloc";

function normalizeAllureToken(raw, { mapViteToRapide = false } = {}) {
  let allure = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (allure === "a bloc") allure = "à bloc";
  if (allure === "sprints") allure = "sprint";
  if (mapViteToRapide && allure === "vite") allure = "rapide";
  return allure;
}

/**
 * Contraste d’allures dans une parenthèse Sheet :
 * « (75 m souple + 25 m progressif) », « (50 m moyen + 25 m vite + 25 m souple) ».
 * Ou enchaînement par reps : « (1 lent, 1 moyen, 1 rapide, 1 souple) ».
 * Ou suite libre : « crawl lent progressif », « crawl souple moyen vite ».
 * ≠ un simple « crawl souple » dans un mix de nages.
 */
export function hasContrastingPaces(text) {
  if (parseAllureEnchainement(text)) return true;
  const parens = String(text || "").match(/\(([^)]+)\)/g) || [];
  for (const block of parens) {
    const inner = block.slice(1, -1);
    const meterCount = [...inner.matchAll(/\d+\s*m\b/gi)].length;
    if (meterCount < 2) continue;
    const efforts = new Set();
    if (/\bsouple\b/i.test(inner)) efforts.add("souple");
    if (/\bprogressif\b/i.test(inner)) efforts.add("progressif");
    if (/\bdescendant\b/i.test(inner)) efforts.add("descendant");
    if (/\bmoyen\b/i.test(inner)) efforts.add("moyen");
    if (/\b(vite|rapide|à bloc|a bloc)\b/i.test(inner)) efforts.add("vite");
    if (/\blent\b/i.test(inner)) efforts.add("lent");
    if (/\bfacile\b/i.test(inner)) efforts.add("facile");
    if (/\bsoutenu\b/i.test(inner)) efforts.add("soutenu");
    if (/\bsprints?\b/i.test(inner)) efforts.add("sprint");
    if (efforts.size >= 2) return true;
  }
  return false;
}

/**
 * Série multi-allures type Sheet « (1 lent, 1 moyen, 1 rapide, 1 souple) ».
 * Lent ≠ souple : lent = allure lente ; souple = récup.
 * @returns {{ steps: { n: number, allure: string }[], cue: string, raw: string } | null}
 */
export function parseRepAllureEnchainement(text) {
  const s = String(text || "");
  const reParen = new RegExp(`\\(([^)]*(?:${ALLURE_WORD_RE})[^)]*)\\)`, "i");
  const m = s.match(reParen);
  const scope = m ? m[1] : s;
  const stepRe = new RegExp(`(\\d+)\\s*(${ALLURE_WORD_RE})`, "gi");
  const steps = [];
  const seenAllures = new Set();
  let match;
  while ((match = stepRe.exec(scope)) !== null) {
    const n = parseInt(match[1], 10);
    const allure = normalizeAllureToken(match[2], { mapViteToRapide: true });
    if (!Number.isFinite(n) || n <= 0 || !allure) continue;
    steps.push({ n, allure });
    seenAllures.add(allure);
  }
  if (steps.length < 2 || seenAllures.size < 2) return null;
  const cue = steps.map((st) => `${st.n} ${st.allure}`).join(" · ");
  return { steps, cue, raw: m ? m[0] : cue };
}

/**
 * Suite d’allures sans compteur : « lent progressif », « souple moyen vite »,
 * ou contraste mètres « (50 m moyen + 25 m vite + 25 m souple) ».
 * @returns {{ steps: { n: number, allure: string }[], cue: string, raw: string } | null}
 */
export function parseSequentialAllureEnchainement(text) {
  const s = String(text || "");
  if (!s.trim()) return null;
  const tokenRe = new RegExp(`\\b(${ALLURE_WORD_RE})\\b`, "gi");
  const ordered = [];
  const seen = new Set();
  let match;
  while ((match = tokenRe.exec(s)) !== null) {
    const allure = normalizeAllureToken(match[1], { mapViteToRapide: false });
    if (!allure || seen.has(allure)) continue;
    seen.add(allure);
    ordered.push(allure);
  }
  if (ordered.length < 2) return null;
  const steps = ordered.map((allure) => ({ n: 1, allure }));
  const cue = ordered.join(" · ");
  return { steps, cue, raw: cue };
}

/**
 * Enchaînement multi-allures : reps numérotées en priorité, sinon suite libre.
 * @returns {{ steps: { n: number, allure: string }[], cue: string, raw: string } | null}
 */
export function parseAllureEnchainement(text) {
  return parseRepAllureEnchainement(text) || parseSequentialAllureEnchainement(text);
}

/** Protège « souple » avant humanisation D9 (toCoach / prettify → facile). */
function protectSoupleForPipeline(raw) {
  const s = String(raw ?? "");
  if (hasContrastingPaces(s)) {
    // Garde les allures en place (pas de pastille unique) ; protège aussi progressif/descendant du cleanCueNoise.
    return s
      .replace(/\bsouple\b/gi, SOUPLE_TOKEN)
      .replace(/\bprogressif\b/gi, PROGRESSIF_TOKEN)
      .replace(/\bdescendant\b/gi, DESCENDANT_TOKEN);
  }
  if (!extractSoupleEffort(s)) return s;
  return s
    .replace(/(\w)\*+souple\b/gi, `$1 ${SOUPLE_TOKEN}`)
    .replace(/\*+souple\b/gi, ` ${SOUPLE_TOKEN}`)
    .replace(/\bsouple\b/gi, SOUPLE_TOKEN);
}

function restoreSoupleAfterPipeline(line) {
  const s = String(line ?? "");
  const hasTokens =
    s.includes(SOUPLE_TOKEN) || s.includes(PROGRESSIF_TOKEN) || s.includes(DESCENDANT_TOKEN);
  if (!hasTokens) return s;

  const restoredPreview = s
    .replace(new RegExp(SOUPLE_TOKEN, "g"), "souple")
    .replace(new RegExp(PROGRESSIF_TOKEN, "g"), "progressif")
    .replace(new RegExp(DESCENDANT_TOKEN, "g"), "descendant");

  // Contraste d’allures : remettre les mots dans la parenthèse (pas «, souple » en fin)
  if (
    s.includes(PROGRESSIF_TOKEN) ||
    s.includes(DESCENDANT_TOKEN) ||
    hasContrastingPaces(restoredPreview)
  ) {
    return restoredPreview.replace(/\s{2,}/g, " ").trim();
  }

  const cleaned = s
    .replace(new RegExp(`\\s*${SOUPLE_TOKEN}`, "g"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${cleaned}, souple`;
}

export function expandCompoundDetailLines(details = []) {
  const source = toCoachDetailLines((details || []).map(protectSoupleForPipeline));
  const out = [];
  for (const raw of source) {
    const full = String(raw ?? "");
    const text = full.trim();
    if (!text) continue;
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
  return out.map((line) => restoreSoupleAfterPipeline(prettifySessionDetailLine(line)));
}

export function groupSessionDetails(details = []) {
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
}

export function parseIntensity(raw) {
  if (!raw) return { zone: null, cue: null };
  const parts = String(raw).split(/\s*[—–]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { zone: null, cue: null };
  return { zone: parts[0], cue: parts.slice(1).join(". ") || null };
}

export function parseSessionDetail(raw) {
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

  body = body.replace(/\s*:\s*$/, "");
  const chunks = body.split(/\s*[—–]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  let main = chunks[0] || body;
  const restParts = [];
  const cues = [];

  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i];
    if (REST_CHUNK_RE.test(c)) restParts.push(c.replace(/^Dtoutes les /i, "D"));
    else cues.push(c.replace(/\s*·\s*/g, " · ").replace(/\s+/g, " ").trim());
  }

  if (!restParts.length) {
    const embedded = main.match(/\s+(R\d+["']?|repos\s+\d+\s*(?:s|sec|min)?|D(?:toutes les )?\d+['′]\d+"|D\d+")\s*$/i);
    if (embedded) {
      restParts.push(embedded[1].replace(/^Dtoutes les /i, "D"));
      main = main.slice(0, embedded.index).trim();
    }
  }

  let steps = null;
  const stepSource = main.includes(":") ? main.slice(main.indexOf(":") + 1).trim() : main;
  const stepSplit = stepSource.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
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
}

export function parseMetersFromLine(text) {
  const t = String(text || "");
  const nxm = t.match(/(\d+)\s*[×x]\s*(\d+)\s*m/i);
  if (nxm) return parseInt(nxm[1], 10) * parseInt(nxm[2], 10);
  const pyramid = parsePyramidLine(t);
  if (pyramid?.volume) return pyramid.volume;
  const single = t.match(/(\d+)\s*m\b/i);
  return single ? parseInt(single[1], 10) : 0;
}

export function formatDurationShort(mins) {
  const n = Number(mins) || 0;
  if (n <= 0) return null;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function formatRestLabel(rest) {
  if (!rest) return null;
  const s = String(rest);
  // D… / R… / repos → pastilles D2' / R30" (plus MetaPill « Récup. »)
  if (/^D/i.test(s)) return null;
  if (parseRestInterval(s)) return null;
  return s;
}

/**
 * Extrait une récupération fixe (R… / repos).
 * @returns {{ seconds: number, raw: string } | null}
 */
export function parseRestInterval(text) {
  const s = String(text || "");
  let m = s.match(/\bR\s*(\d+)\s*['′]\s*(\d{1,2})?\s*["″]?/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = m[2] != null && String(m[2]).length ? parseInt(m[2], 10) : 0;
    if (Number.isFinite(min) && min >= 0) {
      return { seconds: min * 60 + (Number.isFinite(sec) ? sec : 0), raw: m[0] };
    }
  }
  m = s.match(/\bR\s*(\d+)\s*["″]?\b/i);
  if (m) {
    const sec = parseInt(m[1], 10);
    if (Number.isFinite(sec) && sec > 0) return { seconds: sec, raw: m[0] };
  }
  m = s.match(/repos\s+(\d+)\s*min(?:utes?)?(?:\s+(\d+)\s*s(?:ec(?:ondes?)?)?)?/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isFinite(min) && min >= 0) {
      return { seconds: min * 60 + (Number.isFinite(sec) ? sec : 0), raw: m[0] };
    }
  }
  m = s.match(/repos\s+(\d+)\s*s(?:ec(?:ondes?)?)?/i);
  if (m) {
    const sec = parseInt(m[1], 10);
    if (Number.isFinite(sec) && sec > 0) return { seconds: sec, raw: m[0] };
  }
  return null;
}

/** Pastille récup : R30" / R1'30" */
export function formatRestChip(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m === 0) return `R${s}"`;
  if (s === 0) return `R${m}'`;
  return `R${m}'${String(s).padStart(2, "0")}"`;
}

/** Phrase tip récup */
export function formatRestHuman(seconds) {
  return formatDepartHuman(seconds);
}

/**
 * Extrait un intervalle de départ à la montre depuis une ligne Sheet / composeur.
 * @returns {{ seconds: number, raw: string } | null}
 */
export function parseDepartInterval(text) {
  const s = String(text || "");
  let m = s.match(/\bD\s*(\d+)\s*['′]\s*(\d{1,2})?\s*["″]?/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = m[2] != null && String(m[2]).length ? parseInt(m[2], 10) : 0;
    if (Number.isFinite(min) && min >= 0) return { seconds: min * 60 + (Number.isFinite(sec) ? sec : 0), raw: m[0] };
  }
  m = s.match(/d[ée]part\s+(?:toutes\s+les\s+)?(\d+)\s*min(?:utes?)?(?:\s+(\d+)\s*s(?:ec(?:ondes?)?)?)?/i);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isFinite(min) && min >= 0) return { seconds: min * 60 + (Number.isFinite(sec) ? sec : 0), raw: m[0] };
  }
  return null;
}

/** Pastille bassin : D2' / D1'30" */
export function formatDepartChip(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (s === 0) return `D${m}'`;
  return `D${m}'${String(s).padStart(2, "0")}"`;
}

/** Phrase tip : « 2 minutes » / « 1 minute 30 » */
export function formatDepartHuman(seconds) {
  const n = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return m === 1 ? "1 minute" : `${m} minutes`;
  return `${m} min ${s}`;
}

export function stripDepartMarkers(text) {
  if (!text) return text;
  return (
    String(text)
      .replace(/,?\s*d[ée]part\s+(?:toutes\s+les\s+)?\d+\s*min(?:utes?)?(?:\s+\d+\s*s(?:ec(?:ondes?)?)?)?/gi, "")
      .replace(/\bD\s*\d+\s*['′]\s*\d{0,2}\s*["″]?/gi, "")
      .replace(/\s*[,;·]+\s*$/g, "")
      .replace(/^\s*[,;·]+\s*/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
}

/** `@1:42-1:48` / `(Z2 @1:05-1:12)`, plage d’allure personnalisée (Sheet / Premium). */
const ALLURE_PACE_RANGE_RE = /@\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/;

function paceClockToSeconds(mmss) {
  const m = String(mmss || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  if (!Number.isFinite(min) || !Number.isFinite(sec) || sec > 59) return null;
  return min * 60 + sec;
}

/**
 * Extrait une plage d’allure `@mm:ss-mm:ss` depuis une ligne Sheet / composeur.
 * @returns {{ low: string, high: string, lowSeconds: number, highSeconds: number, raw: string } | null}
 */
export function parseAllurePaceRange(text) {
  const m = String(text || "").match(ALLURE_PACE_RANGE_RE);
  if (!m) return null;
  const lowSeconds = paceClockToSeconds(m[1]);
  const highSeconds = paceClockToSeconds(m[2]);
  if (lowSeconds == null || highSeconds == null) return null;
  return {
    low: m[1],
    high: m[2],
    lowSeconds,
    highSeconds,
    raw: m[0],
  };
}

/** Pastille : @1:42-1:48 */
export function formatAllurePaceChip(low, high) {
  const a = String(low || "").trim();
  const b = String(high || "").trim();
  if (!a || !b) return null;
  return `@${a}-${b}`;
}

export function stripAllurePaceMarkers(text) {
  if (!text) return text;
  return (
    String(text)
      // (Z2 @1:05-1:12) ou (facile @…) → retiré en bloc (pastille @)
      .replace(/\(\s*(?:Z[1-4]|facile|très facile|confortable|soutenu|rapide)?\s*@\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\s*\)/gi, "")
      .replace(/@\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/g, "")
      .replace(/\(\s*Z[1-4]\s*\)/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s*[,;·]+\s*$/g, "")
      .replace(/^\s*[,;·]+\s*/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
}

/** Retire R… / repos … du sous-texte (pastille R ou D porte l’info). */
export function stripRestMarkers(text) {
  if (!text) return text;
  return (
    String(text)
      .replace(/,?\s*repos\s+\d+\s*min(?:utes?)?(?:\s+\d+\s*s(?:ec(?:ondes?)?)?)?/gi, "")
      .replace(/,?\s*repos\s+\d+\s*s(?:ec(?:ondes?)?)?/gi, "")
      .replace(/\bR\s*\d+\s*['′]\s*\d{0,2}\s*["″]?/gi, "")
      .replace(/\bR\s*\d+\s*["″']?/gi, "")
      .replace(/\s*[,;·]+\s*$/g, "")
      .replace(/^\s*[,;·]+\s*/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
}

export function stripSprintMarkers(text) {
  if (!text) return text;
  return (
    String(text)
      .replace(/\bsprints?\b/gi, " ")
      .replace(/\s*[,;·]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[-–—·:,\s]+|[-–—·:,\s]+$/g, "")
      .trim() || null
  );
}

/**
 * Aligne le libellé UI sur le Sheet (plus de « crawl normal » / « dos normal »).
 * Retire aussi les virgules décoratives en fin de consigne (souvent dans le Sheet).
 * Normalise `crawl*souple` → `crawl souple` (astérisque Sheet).
 * Sheet « (1, 1 inversé) » → « 1× normal · 1× inversé ».
 */
export function scrubLegacyNormalWording(text) {
  if (!text) return text;
  return String(text)
    .replace(/(\w)\*+(\w)/g, "$1 $2")
    .replace(/\*/g, " ")
    .replace(/\b(crawl|dos|brasse|papillon|nage)\s+normal(e)?\b/gi, "$1")
    // (1, 1 inversé) / 2, 2 inversé → 1× normal · 1× inversé
    .replace(
      /\(?\s*(\d+)\s*,\s*(\d+)\s+invers[ée]s?\s*\)?/gi,
      (_, a, b) => `${a}× normal · ${b}× inversé`,
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,+\s*$/g, "")
    .trim();
}

/** Détecte une allure « souple » (récup / relâchement) dans une ligne Sheet ou composeur.
 * Pas de pastille si « souple » n’est qu’une des allures d’un contraste (75 m souple + 25 m progressif).
 */
export function extractSoupleEffort(...parts) {
  const blob = parts.filter(Boolean).join(" ");
  if (!blob) return null;
  const t = scrubLegacyNormalWording(blob).toLowerCase();
  if (!/\bsouple\b/.test(t)) return null;
  if (hasContrastingPaces(t)) {
    const outside = t.replace(/\([^)]*\)/g, " ");
    return /\bsouple\b/.test(outside) ? "souple" : null;
  }
  return "souple";
}

/** Retire le mot souple du texte affiché (la pastille porte l’info).
 * Ne touche pas aux contrastes d’allures dans une parenthèse.
 */
export function stripSoupleMarkers(text) {
  if (!text) return text;
  if (hasContrastingPaces(text)) return scrubLegacyNormalWording(text);
  return scrubLegacyNormalWording(text)
    .replace(/\bsouple\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[-–—·:,\s]+|[-–—·:,\s]+$/g, "")
    .trim() || null;
}

/**
 * Sous-texte d'intensité générique (pas d'info utile sous le volume).
 * Ex. « Facile, sans forcer », « Allure tenable, focus économie ».
 */
export function isSoftFillCue(cue) {
  const t = String(cue || "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (
    /^(facile|très facile|confortable|soutenu|relâché|relache|sans forcer|normal)(\s+(facile|sans forcer|relâché|relache|normal))*$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^nage normale?$/.test(t)) return true;
  if (/allure tenable/.test(t) && /economie|économie/.test(t)) return true;
  if (/^focus (economie|économie|geste)$/.test(t)) return true;
  if (/^(mise en route|retour au calme)$/.test(t)) return true;
  if (/^(nage libre|crawl|dos|brasse|mix|au choix)\s+(facile|souple)$/i.test(t)) return true;
  if (/^allure r[eé]guli[eè]re$/.test(t)) return true;
  return false;
}

/**
 * Cue qui ne fait que répéter une pastille d’allure (LENT, SOUPLE…).
 * Ne pas appliquer quand le cue est l’ordre d’un enchaînement (« lent · progressif »).
 */
export function isRedundantAllureCue(cue) {
  const t = String(cue || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  return /^(lent|moyen|souple|progressif|vite|rapide|facile|soutenu|descendant|a bloc|sprint|sprints)$/i.test(
    t,
  );
}

/** Mots d’allure déjà portés par une pastille LENT / MOYEN / … (pas l’enchaînement). */
const ALLURE_CHIP_WORD_RE = {
  lent: "lent",
  souple: "souple",
  moyen: "moyen",
  progressif: "progressif",
  vite: "vite|rapide",
  abloc: "à\\s*bloc|a\\s*bloc",
  sprint: "sprints?",
};

/**
 * Retire du sous-texte le mot d’allure déjà dans une pastille.
 * « Lent par 12,5 m » + pastille LENT → « par 12,5 m ».
 * L’enchaînement (« lent · progressif ») reste intact.
 */
export function stripAllureWordsDuplicatedByChips(cue, chipKeys = []) {
  const keys = Array.isArray(chipKeys) ? chipKeys : [];
  if (!cue) return cue;
  if (keys.includes("enchainement")) return cue;
  const parts = keys.map((k) => ALLURE_CHIP_WORD_RE[k]).filter(Boolean);
  if (!parts.length) return String(cue);
  const re = new RegExp(`\\b(?:${parts.join("|")})\\b`, "gi");
  return (
    String(cue)
      .replace(re, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[-–—·:,\s]+|[-–—·:,\s]+$/g, "")
      .trim() || null
  );
}

/**
 * Répartition MIXTE pour le sous-texte (style Sheet, entre parenthèses).
 * Ex. « en alternant (75 m crawl et 25 m dos) » → « (75 m crawl et 25 m dos) »
 * Ex. « crawl / dos » → « (crawl / dos) »
 * Ex. « 25 m crawl + 25 m au choix » → « (25 m crawl + 25 m au choix) »
 * @returns {string|null}
 */
export function formatMixteRepartitionCue(text) {
  const t = String(text || "");
  if (!t.trim()) return null;

  const paren = t.match(/\(([^)]*(?:crawl|dos|brasse|papillon|au\s+choix|nage\s+libre|nl)[^)]*)\)/i);
  if (paren) return `(${paren[1].replace(/\s+/g, " ").trim()})`;

  const pairs = [...t.matchAll(/(\d+)\s*m\s+(crawl|dos|brasse|papillon|au\s+choix|nage\s+libre|nl)\b/gi)];
  if (pairs.length >= 2) {
    return `(${pairs
      .map((m) => {
        const stroke = String(m[2]).toLowerCase().replace(/^nl$/, "crawl");
        return `${m[1]} m ${stroke}`;
      })
      .join(" + ")})`;
  }

  const slash = t.match(
    /\b(crawl|dos|brasse|papillon)\s*[\/·|]\s*(crawl|dos|brasse|papillon|au\s+choix)\b/i,
  );
  if (slash) return `(${slash[1].toLowerCase()} / ${slash[2].toLowerCase()})`;

  return null;
}

/**
 * Choix binaire crawl ↔ 4 nages (≠ nage libre, ≠ 4 nages imposé).
 * Accepte « crawl ou 4 nages » / « 4 nages ou crawl » (nl = crawl).
 */
export function isCrawlOrFourNagesChoice(text) {
  const t = String(text || "").toLowerCase();
  return (
    /\b(?:crawl|nl)\s+ou\s+4\s*nages\b/.test(t) || /\b4\s*nages\s+ou\s+(?:crawl|nl)\b/.test(t)
  );
}

const CRAWL_OR_4N_PREFIX_RE =
  /^(?:crawl|nl)\s+ou\s+4\s*nages\b|^4\s*nages\s+ou\s+(?:crawl|nl)\b/i;

/** Retire la locution du sous-texte (la pastille porte l’info). */
export function stripCrawlOrFourNagesPhrase(text) {
  if (!text) return text;
  return (
    String(text)
      .replace(/\b(?:crawl|nl)\s+ou\s+4\s*nages\b/gi, " ")
      .replace(/\b4\s*nages\s+ou\s+(?:crawl|nl)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[-–—·:,\s]+|[-–—·:,\s]+$/g, "")
      .trim() || null
  );
}

/**
 * Déduit le libellé nage pour l’UI :
 * - crawl ou 4 nages / 4 nages ou crawl → « CRAWL OU 4N »
 * - 4 nages / médley / 4 strokes → « 4 NAGES »
 * - ≥2 nages, ou 1 nage + au choix, ou « mix » → « MIXTE »
 * - sinon nage unique / nage au choix
 */
export function inferStrokeLabel(blob) {
  const text = String(blob || "").trim();
  if (!text) return { label: null, consumePrefix: null };

  const lower = text.toLowerCase();

  // Avant le match « 4 nages » seul
  if (isCrawlOrFourNagesChoice(text)) {
    const m = text.match(CRAWL_OR_4N_PREFIX_RE);
    return { label: "CRAWL OU 4N", consumePrefix: m ? m[0] : null };
  }

  if (/\b4\s*nages\b/.test(lower) || /\bm[eé]dley\b/.test(lower) || /(^|[^a-z])im([^a-z]|$)/i.test(lower)) {
    const m = text.match(/^(4\s*nages|m[eé]dley|im)\b/i);
    return { label: "4 NAGES", consumePrefix: m ? m[0] : null };
  }

  const strokes = new Set();
  if (/\bcrawl\b/.test(lower) || /\bnl\b/.test(lower)) strokes.add("crawl");
  if (/\bdos\b/.test(lower)) strokes.add("dos");
  if (/\bbrasse\b/.test(lower)) strokes.add("brasse");
  if (/\bpapillon\b/.test(lower)) strokes.add("papillon");
  const free = /\b(nage\s+libre|nage\s+au\s+choix|au\s+choix)\b/.test(lower);
  const mixWord = /\bmix(te)?\b/.test(lower);

  if (strokes.size >= 4) {
    return { label: "4 NAGES", consumePrefix: null };
  }

  const isMixte = strokes.size >= 2 || (strokes.size >= 1 && free) || mixWord;
  if (isMixte) {
    const m = text.match(/^(mix(te)?)\b/i);
    const onlyMixPrefix = m && strokes.size === 0 && !free;
    return { label: "MIXTE", consumePrefix: onlyMixPrefix ? m[0] : null };
  }

  const freeMatch = text.match(/^(nage\s+libre|nage\s+au\s+choix|au\s+choix)\b/i);
  if (freeMatch) {
    return { label: "NAGE AU CHOIX", consumePrefix: freeMatch[0] };
  }
  if (free) {
    return { label: "NAGE AU CHOIX", consumePrefix: null };
  }

  const strokeMatch = text.match(/^(crawl|dos|brasse|papillon|nl)\b/i);
  if (strokeMatch) {
    const raw = strokeMatch[1].toLowerCase();
    if (raw === "nl") return { label: "CRAWL", consumePrefix: strokeMatch[0] };
    return { label: strokeMatch[1].toUpperCase(), consumePrefix: strokeMatch[0] };
  }

  return { label: null, consumePrefix: null };
}

/** Extrait « 8 × 50 m » et « CRAWL » / « MIXTE » d’un main pour la hiérarchie visuelle. */
export function splitHeadline(main) {
  if (!main) return { volume: null, stroke: null, rest: main, effort: null };
  let text = scrubLegacyNormalWording(main);
  let volume = null;
  const nx = text.match(/^(\d+\s*[x×]\s*\d+\s*m)\b/i);
  const sm = text.match(/^(\d+\s*m)\b/i);
  if (nx) {
    volume = nx[1].replace(/x/gi, "×").replace(/\s+/g, " ");
    text = text.slice(nx[0].length).trim();
  } else if (sm) {
    volume = sm[1].replace(/\s+/g, " ");
    text = text.slice(sm[0].length).trim();
  }
  text = text.replace(/^[-–—·:,]\s*/, "");

  const effort = extractSoupleEffort(text);
  if (effort) text = stripSoupleMarkers(text) || "";

  const inferred = inferStrokeLabel(text);
  let stroke = inferred.label;
  if (inferred.consumePrefix) {
    text = text.slice(inferred.consumePrefix.length).trim().replace(/^[-–—·:,]\s*/, "");
  }
  let rest = stripSoupleMarkers(text);
  // MIXTE : répartition en sous-texte style Sheet « (75 m crawl et 25 m dos) »
  if (stroke === "MIXTE") {
    const repartCue = formatMixteRepartitionCue(text);
    if (repartCue) rest = repartCue;
  }
  if (stroke === "CRAWL OU 4N") {
    // Pastille déjà claire → pas de sous-texte doublon
    rest = stripCrawlOrFourNagesPhrase(rest);
  }
  return { volume, stroke, rest: rest || null, effort };
}

function sectionForKind(kind, cues, main) {
  if (kind === "warm") return "warm";
  if (kind === "cool") return "cool";
  const blob = `${main || ""} ${(cues || []).join(" ")}`.toLowerCase();
  if (/échauff|mise en route/.test(blob)) return "warm";
  if (/retour(\s+au\s+calme)?|cool\s*down/.test(blob)) return "cool";
  return "main";
}

/** Mappe les blocs moteur → sections UI (3 phases). */
export function sectionFromSetBlock(block) {
  const b = String(block || "").toLowerCase();
  if (b === "depart" || b === "warmup" || b === "warm") return "warm";
  if (b === "fin" || b === "rac" || b === "cooldown" || b === "cool") return "cool";
  return "main"; // technique, corps, …
}

/** Si `sets` est aligné 1:1 avec les exercices, impose la section depuis le moteur. */
function applySetBlockSections(exercises, sets = []) {
  if (!exercises?.length || !sets?.length || sets.length !== exercises.length) {
    return exercises;
  }
  return exercises.map((ex, i) => ({
    ...ex,
    section: sectionFromSetBlock(sets[i]?.block),
    setBlock: sets[i]?.block || null,
  }));
}

const SECTION_META = {
  warm: { id: "warm", label: "Échauffement" },
  main: { id: "main", label: "Corps de séance" },
  cool: { id: "cool", label: "Retour au calme" },
};

/**
 * Construit la vue workout à partir d’une séance existante (rétrocompatible).
 * @returns {{ header, sections, exercises, totalMeters }}
 */
export function buildWorkoutView(session = {}) {
  const intensity = parseIntensity(session.intensity);
  const lines = expandCompoundDetailLines(session.details || []);
  const groups = groupSessionDetails(lines);
  const exercises = [];
  let index = 0;

  const pushExercise = ({ raw, parsed, children = [], section }) => {
    const pyramid = parsePyramidLine(raw) || (children[0] ? parsePyramidLine(children[0]) : null);
    const childParsed = children.map((c) => parseSessionDetail(c)).filter(Boolean);
    const fourBlob = `${raw || ""} ${parsed?.main || ""} ${(parsed?.cues || []).join(" ")}`;
    let fourNagesMode = parseFourNagesMode(fourBlob);
    if (
      !fourNagesMode
      && (lineHasFourNagesEducatifs(raw) || lineHasFourNagesEducatifs(parsed?.main))
    ) {
      fourNagesMode = { kind: "per_rep" };
    }
    const meters =
      pyramid?.volume ||
      parseMetersFromLine(parsed?.main || raw) ||
      childParsed.reduce((a, c) => a + parseMetersFromLine(c.main), 0);
    const headline = splitHeadline(
      stripFourNagesModeToken(scrubLegacyNormalWording(parsed?.main)),
    );
    const firstCue = parsed?.cues?.[0] ? scrubLegacyNormalWording(parsed.cues[0]) : null;
    // Ne pas laisser un cue « souple » (pastille) écraser la répartition MIXTE (headline.rest)
    let cuePrimary = scrubLegacyNormalWording(
      (firstCue && !isSoftFillCue(firstCue) ? firstCue : null) || headline.rest || null,
    );

    // Enchaînement multi-allures (1 lent… ou lent progressif / souple moyen vite…)
    const enchainBlob = [parsed?.main, cuePrimary, raw, ...(parsed?.cues || [])].filter(Boolean).join(" ");
    const allureEnchainement = parseAllureEnchainement(enchainBlob);

    const effortLabel = allureEnchainement
      ? null
      : headline.effort ||
        extractSoupleEffort(parsed?.main, cuePrimary, ...(parsed?.cues || []), raw);
    if (effortLabel) {
      cuePrimary = stripSoupleMarkers(cuePrimary);
    }
    if (isSoftFillCue(cuePrimary)) cuePrimary = null;
    if (fourNagesMode) {
      cuePrimary = stripFourNagesModeToken(cuePrimary);
      if (/25\s*m/i.test(cuePrimary || "") && /\+/.test(cuePrimary || "")) cuePrimary = null;
    }
    let cues = (parsed?.cues || [])
      .map((c) => scrubLegacyNormalWording(c))
      .map((c) => (effortLabel ? stripSoupleMarkers(c) : c))
      .filter((c) => c && !isSoftFillCue(c));
    if (!cuePrimary && cues[0]) cuePrimary = cues[0];
    if (!cuePrimary && headline.rest && !isSoftFillCue(headline.rest)) {
      cuePrimary = headline.rest;
    }
    if (allureEnchainement) {
      // Reps numérotées / suite libre → cue « lent · progressif »
      // Contraste mètres « (75 m souple + 25 m progressif) » → garder les distances
      const isRepStyle = Boolean(parseRepAllureEnchainement(enchainBlob));
      const cueHasMeterSplit =
        /\d+\s*m\b[\s\S]*\d+\s*m\b/i.test(String(cuePrimary || "")) ||
        /\(\s*\d+\s*m\b[^)]*\d+\s*m\b/i.test(enchainBlob);
      if (isRepStyle || !cueHasMeterSplit) {
        cuePrimary = allureEnchainement.cue;
      }
    } else if (isRedundantAllureCue(cuePrimary)) {
      // Pastille LENT / SOUPLE / … déjà dans le titre → pas de doublon gris
      cuePrimary = null;
    }
    cues = cues.filter((c) => !isRedundantAllureCue(c));
    if (!cuePrimary && cues[0] && !isRedundantAllureCue(cues[0])) cuePrimary = cues[0];
    const mainClean = stripFourNagesModeToken(
      scrubLegacyNormalWording(parsed?.main || stripDetailPrefix(raw)),
    );

    // Départ à la montre → pastille D2' (pas dans le sous-texte)
    const departBlob = [parsed?.rest, cuePrimary, mainClean, raw, ...cues].filter(Boolean).join(" ");
    const departParsed =
      (parsed?.rest && /^D/i.test(String(parsed.rest)) ? parseDepartInterval(parsed.rest) : null) ||
      parseDepartInterval(departBlob);
    const departLabel = departParsed ? formatDepartChip(departParsed.seconds) : null;
    const departSeconds = departParsed ? departParsed.seconds : null;
    if (departLabel) {
      cuePrimary = stripDepartMarkers(cuePrimary);
      cues = cues.map((c) => stripDepartMarkers(c)).filter(Boolean);
    }

    // Allure @mm:ss-mm:ss → pastille (pas dans le sous-texte)
    const paceBlob = [cuePrimary, mainClean, raw, ...cues].filter(Boolean).join(" ");
    const paceParsed = parseAllurePaceRange(paceBlob);
    const allurePaceLabel = paceParsed
      ? formatAllurePaceChip(paceParsed.low, paceParsed.high)
      : null;
    const allurePaceLow = paceParsed?.low || null;
    const allurePaceHigh = paceParsed?.high || null;
    if (allurePaceLabel) {
      cuePrimary = stripAllurePaceMarkers(cuePrimary);
      cues = cues.map((c) => stripAllurePaceMarkers(c)).filter(Boolean);
    }

    // R Sheet : pastille seulement SANS départ D… (avec D, la récup est dans l’intervalle).
    // Avec {@:} sans D → on garde le R Sheet.
    const restBlob = [parsed?.rest, cuePrimary, mainClean, raw, ...cues].filter(Boolean).join(" ");
    const restFromField =
      parsed?.rest && !/^D/i.test(String(parsed.rest)) ? parseRestInterval(parsed.rest) : null;
    const restParsed = restFromField || (!departLabel ? parseRestInterval(restBlob) : null);
    let restChip = !departLabel && restParsed ? formatRestChip(restParsed.seconds) : null;
    let restSeconds = !departLabel && restParsed ? restParsed.seconds : null;
    if (restChip || departLabel) {
      cuePrimary = stripRestMarkers(cuePrimary);
      cues = cues.map((c) => stripRestMarkers(c)).filter(Boolean);
    }

    const sprintBlob = [cuePrimary, mainClean, raw, ...cues].filter(Boolean).join(" ");
    // Sprint seul → pastille SPRINT ; déjà dans Enchaînement → ne pas doubler / stripper le cue
    const hasSprint = !allureEnchainement && /\bsprints?\b/i.test(sprintBlob);
    if (hasSprint) {
      cuePrimary = stripSprintMarkers(cuePrimary);
      cues = cues.map((c) => stripSprintMarkers(c)).filter(Boolean);
    }

    const blob = [parsed?.main, cuePrimary, ...cues, ...childParsed.map((c) => c.main)].filter(Boolean).join(" - ");
    let educatif = null;
    let educatifs = [];
    if (session.composedBy === "natation-sheet") {
      // Source de vérité = onglet Éducatifs du Sheet (attaché à la séance)
      const fiches = Array.isArray(session.sheetEducatifs) && session.sheetEducatifs.length
        ? session.sheetEducatifs
        : session.sheetEducatif?.name
          ? [session.sheetEducatif]
          : [];
      const fourLine = Boolean(
        fourNagesMode
        || lineHasFourNagesEducatifs(raw)
        || lineHasFourNagesEducatifs(mainClean),
      );
      if (fourLine && fiches.length > 1) {
        educatifs = fiches.filter((f) => f?.name);
      } else {
        for (const sheetFiche of fiches) {
          if (!sheetFiche?.name) continue;
          const re = new RegExp(sheetFiche.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          if (re.test(blob) || re.test(String(mainClean || ""))) {
            educatifs.push(sheetFiche);
          }
        }
      }
      educatif = educatifs[0] || null;
    } else {
      educatif = matchEducatif(blob);
      if (educatif) educatifs = [educatif];
    }
    index += 1;
    // Cue « Crawl ou 4 nages » même si le main disait seulement « 4 nages »
    const choiceBlob = [mainClean, cuePrimary, raw, ...(parsed?.cues || [])].filter(Boolean).join(" ");
    let strokeLabel = headline.stroke;
    if (fourNagesMode) strokeLabel = "4 NAGES";
    if (isCrawlOrFourNagesChoice(choiceBlob)) {
      strokeLabel = "CRAWL OU 4N";
      if (isCrawlOrFourNagesChoice(cuePrimary)) {
        cuePrimary = stripCrawlOrFourNagesPhrase(cuePrimary);
      }
    }
    exercises.push({
      id: `ex_${index}`,
      index,
      section: section || sectionForKind(parsed?.kind, parsed?.cues, parsed?.main),
      raw,
      kind: parsed?.kind || "work",
      label: parsed?.label || null,
      main: mainClean,
      volumeLabel: headline.volume || (pyramid ? `${pyramid.volume} m` : null),
      strokeLabel,
      effortLabel: effortLabel || null,
      allureEnchainement: allureEnchainement || null,
      sprint: hasSprint,
      fourNagesMode: fourNagesMode || null,
      cue: cuePrimary,
      cues,
      rest: parsed?.rest || null,
      restLabel: formatRestLabel(parsed?.rest),
      restChip,
      restSeconds,
      departLabel,
      departSeconds,
      allurePaceLabel,
      allurePaceLow,
      allurePaceHigh,
      steps: parsed?.steps || null,
      pyramid,
      children: childParsed.map((c) => {
        const childDepart =
          (c.rest && /^D/i.test(String(c.rest)) ? parseDepartInterval(c.rest) : null) ||
          parseDepartInterval([c.main, c.rest, ...(c.cues || [])].filter(Boolean).join(" "));
        const childRest = c.rest && !/^D/i.test(String(c.rest)) ? parseRestInterval(c.rest) : null;
        const showChildRest = !childDepart && childRest;
        return {
          main: c.main,
          rest: c.rest,
          restLabel: formatRestLabel(c.rest),
          restChip: showChildRest ? formatRestChip(childRest.seconds) : null,
          restSeconds: showChildRest ? childRest.seconds : null,
          cues: (c.cues || []).filter((x) => !isSoftFillCue(x)),
          headline: splitHeadline(c.main),
        };
      }),
      meters,
      educatifId: educatif?.id || null,
      educatif,
      educatifs: educatifs.length ? educatifs : null,
    });
  };

  for (const g of groups) {
    if (g.type === "block") {
      const parsed = parseSessionDetail(g.header);
      if (!parsed) continue;
      pushExercise({
        raw: g.header,
        parsed,
        children: g.children,
        section: sectionForKind(parsed.kind, parsed.cues, parsed.main),
      });
      continue;
    }
    for (const raw of g.lines || []) {
      const parsed = parseSessionDetail(raw);
      if (!parsed) continue;
      pushExercise({
        raw,
        parsed,
        section: sectionForKind(parsed.kind, parsed.cues, parsed.main),
      });
    }
  }

  const withSections = applySetBlockSections(exercises, session.sets);

  // Numérotation par phase (1…n dans chaque bloc)
  const phaseCounters = { warm: 0, main: 0, cool: 0 };
  const numbered = withSections.map((ex) => {
    const sec = ex.section || "main";
    phaseCounters[sec] = (phaseCounters[sec] || 0) + 1;
    return { ...ex, index: phaseCounters[sec], phaseIndex: phaseCounters[sec] };
  });

  const fromDistance = parseInt(String(session.distance || "").replace(/\D/g, ""), 10) || 0;
  const summed = numbered.reduce((a, e) => a + (e.meters || 0), 0);
  const totalMeters = fromDistance || summed;

  const equipment = Array.isArray(session.equipmentUsed)
    ? session.equipmentUsed
    : [];

  const sections = ["warm", "main", "cool"]
    .map((id) => {
      const list = numbered.filter((e) => e.section === id);
      const meters = list.reduce((a, e) => a + (e.meters || 0), 0);
      return {
        ...SECTION_META[id],
        exercises: list,
        meters,
        metersLabel: meters > 0 ? `${meters.toLocaleString("fr-FR")} m` : null,
      };
    })
    .filter((s) => s.exercises.length > 0);

  // Si rien n’a été classé warm/cool, tout en une section
  if (sections.length === 0 && numbered.length > 0) {
    const meters = numbered.reduce((a, e) => a + (e.meters || 0), 0);
    sections.push({
      id: "main",
      label: "Séance",
      exercises: numbered,
      meters,
      metersLabel: meters > 0 ? `${meters.toLocaleString("fr-FR")} m` : null,
    });
  }

  return {
    header: {
      title: session.title || "Séance",
      type: session.type || null,
      distanceLabel: totalMeters ? `${totalMeters.toLocaleString("fr-FR")} m` : (session.distance || null),
      durationLabel: formatDurationShort(session.duration),
      intensityZone: intensity.zone,
      intensityCue: intensity.cue,
      equipment,
    },
    sections,
    exercises: numbered,
    totalMeters,
  };
}

/** Mètres cumulés jusqu’à l’exercice index (0-based, exclusive end = inclusive current start). */
export function metersBeforeIndex(exercises, index) {
  return exercises.slice(0, Math.max(0, index)).reduce((a, e) => a + (e.meters || 0), 0);
}

export function metersThroughIndex(exercises, index) {
  return exercises.slice(0, Math.max(0, index + 1)).reduce((a, e) => a + (e.meters || 0), 0);
}
