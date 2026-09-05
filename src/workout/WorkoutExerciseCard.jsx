/**
 * Carte exercice compacte (pas de tiroir / dépliable).
 * Mode dense (Programme / prep) : liste scannable, pastilles ⓘ à droite.
 * Allures Sheet : pastilles ⓘ + Enchaînement (multi-allures) ; Lent ≠ Souple.
 * Départ à la montre : pastille D2' + tip horloge de bassin (4 aiguilles).
 * Allure chiffrée : pastille @1:42-1:48 + tip plage cible.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import {
  formatDepartHuman,
  formatRestHuman,
  stripAllureWordsDuplicatedByChips,
} from "../lib/workout-display.js";
import { fourNagesDisplayCue } from "../lib/natation-sheet/parse.js";
import SoftMistSheet from "../sheets/SoftMistSheet.jsx";

const ALLURE_TIPS = {
  souple: {
    title: "Souple",
    label: "Souple",
    tone: "mint",
    body:
      "Allure de récupération : lente et relâchée. Tu ne forces pas, tu te détends. À ne pas confondre avec « lent » (allure lente contrôlée, pas une récup).",
  },
  lent: {
    title: "Lent",
    label: "Lent",
    tone: "neutral",
    body:
      "Allure lente et contrôlée : tu nages volontairment moins vite pour la technique ou la qualité. Ce n’est pas du souple (récup).",
  },
  moyen: {
    title: "Moyen",
    label: "Moyen",
    tone: "neutral",
    body:
      "Allure régulière, tenable sur toute la série. Ni trop facile, ni à fond, tu gardes le même rythme.",
  },
  progressif: {
    title: "Progressif",
    label: "Progressif",
    tone: "blue",
    body:
      "Tu accélères au fil de la distance : départ facile, fin plus soutenue.",
  },
  vite: {
    title: "Vite",
    label: "Vite",
    tone: "coral",
    body:
      "Allure plus soutenue, qualité d’effort. Tu nages plus vite qu’en rythme moyen, sans forcer jusqu’à l’échec.",
  },
  abloc: {
    title: "À bloc",
    label: "À bloc",
    tone: "coral",
    body:
      "Sprint court : tu donnes le maximum sur la distance indiquée, puis tu récupères bien.",
  },
  sprint: {
    title: "Sprint",
    label: "Sprint",
    tone: "coral",
    body:
      "Effort court et explosif. Tu donnes le maximum sur la distance, puis tu récupères bien avant la suivante.",
  },
  enchainement: {
    title: "Enchaînement",
    label: "Enchaînement",
    tone: "blue",
    body:
      "Plusieurs allures dans la même série, dans l’ordre indiqué sous la ligne.",
  },
};

/** Glossaire court pour la liste du tip Enchaînement. */
const ALLURE_LIST_BLURB = {
  lent: "nage lente et contrôlée (technique / qualité)",
  moyen: "rythme régulier, tenable sur toute la série",
  progressif: "tu accélères au fil de la distance",
  vite: "plus soutenu que le moyen, sans aller à l’échec",
  souple: "récupération : lente et relâchée",
  abloc: "maximum sur la distance, puis bonne récup",
  sprint: "effort court et explosif, puis bonne récup",
  facile: "confortable, sans forcer",
  soutenu: "effort marqué mais tenable",
  descendant: "tu ralentis au fil de la distance",
};

function tipKeyFromAllureToken(token) {
  const t = String(token || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t === "rapide" || t === "vite") return "vite";
  if (t === "a bloc" || t === "à bloc") return "abloc";
  if (ALLURE_TIPS[t] && t !== "enchainement") return t;
  return null;
}

function capitalizeAllureLabel(token) {
  const s = String(token || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Ordre d’affichage des pastilles allure. */
const ALLURE_CHIP_ORDER = [
  "enchainement",
  "souple",
  "lent",
  "moyen",
  "progressif",
  "vite",
  "abloc",
  "sprint",
];

function detectAllureTips(exercise) {
  // Multi-allures dans une série → une seule pastille
  if (exercise?.allureEnchainement?.steps?.length >= 2) {
    return ["enchainement"];
  }

  const blob = `${exercise?.cue || ""} ${exercise?.main || ""} ${exercise?.raw || ""}`.toLowerCase();
  const found = new Set();

  const showSouplePill =
    exercise?.section !== "warm"
    && exercise?.kind !== "warm"
    && (exercise?.effortLabel === "souple" || exercise?.kind === "cool");
  if (showSouplePill || /\bsouple\b/.test(blob)) found.add("souple");

  // Lent ≠ souple
  if (/\blent\b/.test(blob)) found.add("lent");
  if (/\bmoyen\b/.test(blob) || /allure\s+r[eé]guli[eè]re/.test(blob)) found.add("moyen");
  if (/\bprogressif\b/.test(blob)) found.add("progressif");
  if (/\b(vite|rapide)\b/.test(blob)) found.add("vite");
  if (/\b(à\s*bloc|a\s*bloc)\b/.test(blob)) found.add("abloc");
  if (exercise?.sprint || /\bsprints?\b/.test(blob)) found.add("sprint");

  return ALLURE_CHIP_ORDER.filter((k) => found.has(k));
}

function MetaPill({ children, tone = "neutral", G }) {
  const bg = tone === "blue" ? G.blueLight : G.greyXLight;
  const color = tone === "blue" ? G.blue : G.inkLight;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 10,
      background: bg, color, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

/** Horloge de bassin type 4 aiguilles (Colorado Timing). 1 tour = 60 s.
 * Reste ≤ 30 s → « N tours + Xs » ; reste > 30 s → « (N+1) tours moins Ys ».
 */
function paceClockTourParts(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s <= 0) {
    return { mode: "exact", laps: 1, remSec: 0, minusSec: 0, total: 60 };
  }
  const fullLaps = Math.floor(s / 60);
  const remSec = s % 60;
  if (remSec === 0) {
    return { mode: "exact", laps: fullLaps, remSec: 0, minusSec: 0, total: s };
  }
  if (remSec <= 30) {
    if (fullLaps === 0) {
      return { mode: "seconds", laps: 0, remSec, minusSec: 0, total: s };
    }
    return { mode: "plus", laps: fullLaps, remSec, minusSec: 0, total: s };
  }
  // ex. 1'50" → 2 tours moins 10 s ; 50" → 1 tour moins 10 s
  return {
    mode: "minus",
    laps: fullLaps + 1,
    remSec,
    minusSec: 60 - remSec,
    total: s,
  };
}

function lapWord(n) {
  return n === 1 ? "Un tour" : `${n} tours`;
}

function paceClockCaption(seconds) {
  const p = paceClockTourParts(seconds);
  const eq = ` (= ${formatDepartHuman(p.total)})`;
  if (p.mode === "seconds") {
    return `${p.remSec} s sur l’horloge`;
  }
  if (p.mode === "exact") {
    return p.laps === 1
      ? "Un tour d’aiguille (= 1 minute)"
      : `${p.laps} tours d’aiguille${eq}`;
  }
  if (p.mode === "plus") {
    return `${lapWord(p.laps)} + ${p.remSec} s sur l’horloge${eq}`;
  }
  return `${lapWord(p.laps)} moins ${p.minusSec} s${eq}`;
}

function paceClockBodySuffix(seconds) {
  const p = paceClockTourParts(seconds);
  if (p.mode === "exact") {
    if (p.total <= 60) return "";
    return ` (après ${p.laps} tour${p.laps > 1 ? "s" : ""})`;
  }
  if (p.mode === "seconds") return "";
  if (p.mode === "plus") {
    return p.laps === 1
      ? ` (après 1 tour et ${p.remSec} s)`
      : ` (après ${p.laps} tours et ${p.remSec} s)`;
  }
  return p.laps === 1
    ? ` (après 1 tour moins ${p.minusSec} s)`
    : ` (après ${p.laps} tours moins ${p.minusSec} s)`;
}

function PaceClock({ seconds = 120, size = 160 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const handR = r * 0.78;
  const colors = ["#e85a68", "#d4a017", "#1fae86", "#006bfd"];
  // 4 aiguilles aux quarts d’heure (0 / 15 / 30 / 45 s)
  const hands = [0, 15, 30, 45].map((sec, i) => {
    const deg = (sec / 60) * 360;
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      color: colors[i],
      x2: cx + handR * Math.cos(rad),
      y2: cy + handR * Math.sin(rad),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="#f4f8fc" stroke="#c5dffb" strokeWidth={3} />
        {Array.from({ length: 60 }, (_, i) => {
          const deg = (i / 60) * 360;
          const rad = ((deg - 90) * Math.PI) / 180;
          const major = i % 5 === 0;
          const inner = r - (major ? 10 : 5);
          const outer = r - 2;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(rad)}
              y1={cy + inner * Math.sin(rad)}
              x2={cx + outer * Math.cos(rad)}
              y2={cy + outer * Math.sin(rad)}
              stroke={major ? "#6b7c8f" : "#b4c6db"}
              strokeWidth={major ? 2 : 1}
            />
          );
        })}
        {[0, 15, 30, 45].map((sec) => {
          const deg = (sec / 60) * 360;
          const rad = ((deg - 90) * Math.PI) / 180;
          const tx = cx + (r - 22) * Math.cos(rad);
          const ty = cy + (r - 22) * Math.sin(rad);
          const label = sec === 0 ? "60" : String(sec);
          return (
            <text
              key={`n${sec}`}
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#6b7c8f"
              fontSize={11}
              fontWeight={700}
            >
              {label}
            </text>
          );
        })}
        {hands.map((h, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={h.x2}
            y2={h.y2}
            stroke={h.color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        <circle cx={cx} cy={cy} r={5} fill="#0f1b2d" />
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7c8f", textAlign: "center", lineHeight: 1.35 }}>
        {paceClockCaption(seconds)}
      </div>
    </div>
  );
}

function TipSheetShell({ eyebrow, title, onClose, children }) {
  return (
    <SoftMistSheet
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      lockScroll={false}
    >
      {children}
    </SoftMistSheet>
  );
}

function AllureTipSheet({ tipKey, onClose, colors: G, enchainement }) {
  const tip = ALLURE_TIPS[tipKey];
  if (!tip) return null;

  if (tipKey === "enchainement" && enchainement?.steps?.length >= 2) {
    const steps = enchainement.steps;
    const keys = steps.map((st) => tipKeyFromAllureToken(st.allure));
    const showLentSouple = keys.includes("lent") || keys.includes("souple");
    const isRepStyle = /\d+\s+(lent|moyen|rapide|vite|souple|progressif|facile|soutenu|descendant|à\s*bloc|a\s*bloc)/i.test(
      enchainement.cue || "",
    );

    return (
      <TipSheetShell eyebrow="Allure" title={tip.title} onClose={onClose}>
        <p className="ms-tip-lead">
          Sur cette série, enchaîne les allures dans cet ordre.
        </p>
        <ul className="ms-tip-list">
          {steps.map((st, i) => {
            const key = keys[i];
            const tipRow = key ? ALLURE_TIPS[key] : null;
            const label = tipRow?.label || capitalizeAllureLabel(st.allure);
            const blurb = (key && ALLURE_LIST_BLURB[key]) || tipRow?.body || "";
            const countPrefix =
              isRepStyle && Number(st.n) >= 1 ? `${st.n}× ` : "";
            return (
              <li key={`${st.allure}-${i}`} className="ms-tip-list-item">
                <strong>
                  {countPrefix}{label}
                </strong>
                {blurb ? ` · ${blurb}` : null}
              </li>
            );
          })}
        </ul>
        {showLentSouple ? (
          <div className="ms-tip-block">
            <div className="ms-tip-block-label">Lent ≠ souple</div>
            <div className="ms-tip-block-text" style={{ fontSize: 13, fontWeight: 600, color: "var(--ms-ink-soft)" }}>
              Lent = allure lente contrôlée ; souple = récupération relâchée. Ce n’est pas la même chose.
            </div>
          </div>
        ) : null}
      </TipSheetShell>
    );
  }

  return (
    <TipSheetShell eyebrow="Allure" title={tip.title} onClose={onClose}>
      <p className="ms-tip-lead">{tip.body}</p>
    </TipSheetShell>
  );
}

function DepartTipSheet({ label, seconds, onClose }) {
  const human = formatDepartHuman(seconds);
  return (
    <TipSheetShell eyebrow="Départ à la montre" title={label || "D…"} onClose={onClose}>
      <p className="ms-tip-lead">
        Tu repars toutes les {human}. Regarde l’horloge de bassin : tu pars quand une aiguille est sur un repère, et tu repars quand elle revient au même endroit
        {paceClockBodySuffix(seconds)}.
      </p>
      <div className="ms-tip-clock">
        <PaceClock seconds={seconds || 60} />
      </div>
      <p className="ms-tip-lead" style={{ marginBottom: 0, fontSize: 13 }}>
        Plus tu nages vite, plus tu récupères avant le prochain départ. Les 4 aiguilles colorées servent aux différentes lignes du bassin.
      </p>
    </TipSheetShell>
  );
}

function AllurePaceTipSheet({ label, low, high, onClose }) {
  const range = low && high ? `${low}, ${high}` : (label || "").replace(/^@/, "");
  return (
    <TipSheetShell eyebrow="Allure cible" title={label || "@…"} onClose={onClose}>
      <p className="ms-tip-lead">
        Tu vises la fourchette {range} sur la distance indiquée (temps au chrono pour la rep, ou ramené au 100 m).
      </p>
      <div className="ms-tip-block">
        <div className="ms-tip-block-text" style={{ fontSize: 14, fontWeight: 600, color: "var(--ms-ink-soft)" }}>
          Reste entre le bas et le haut de la plage : trop lent, l’effort manque ; trop vite, tu sors de la zone prévue pour la série.
        </div>
      </div>
      <p className="ms-tip-lead" style={{ marginBottom: 0, fontSize: 13 }}>
        Cette allure est calculée à partir de ton temps de référence (T100). Ce n’est pas un départ à la montre (D…) : ici tu contrôles le rythme de nage, pas l’intervalle au mur.
      </p>
    </TipSheetShell>
  );
}

function RestTipSheet({ label, seconds, onClose }) {
  const human = formatRestHuman(seconds);
  return (
    <TipSheetShell eyebrow="Récupération" title={label || "R…"} onClose={onClose}>
      <p className="ms-tip-lead">
        Tu t’arrêtes {human} entre les reps (ou à la fin de la série). Le chrono de pause commence quand tu arrives au mur.
      </p>
      <div className="ms-tip-block">
        <div className="ms-tip-block-text" style={{ fontSize: 14, fontWeight: 600, color: "var(--ms-ink-soft)" }}>
          Ce n’est pas un départ à la montre (D…) : avec R, tu repartis après ta pause, pas à un intervalle fixe sur l’horloge.
        </div>
      </div>
    </TipSheetShell>
  );
}

function chipToneStyles(tone, G) {
  let bg = G.greyXLight;
  let color = G.inkLight;
  if (tone === "mint") {
    bg = G.mintLight || G.greyXLight;
    color = G.mint || G.inkLight;
  } else if (tone === "blue") {
    bg = G.blueLight || G.greyXLight;
    color = G.blue || G.inkLight;
  } else if (tone === "coral") {
    bg = G.coralLight || G.blueLight || G.greyXLight;
    color = G.coral || G.blue || G.inkLight;
  }
  return { bg, color };
}

function AllureInfoChip({ tipKey, label, tone = "neutral", onClick, G, ariaName, dense = false }) {
  const tip = tipKey ? ALLURE_TIPS[tipKey] : null;
  const resolvedLabel = label || tip?.label;
  if (!resolvedLabel) return null;
  const { bg, color } = chipToneStyles(tip?.tone || tone, G);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Qu’est-ce que ${ariaName || resolvedLabel.toLowerCase()} ?`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dense ? 3 : 4,
        border: `1px solid ${G.greyLight}`,
        background: bg,
        color,
        fontSize: dense ? 10 : 11,
        fontWeight: 800,
        padding: dense ? "3px 7px" : "4px 9px",
        borderRadius: 999,
        cursor: "pointer",
        letterSpacing: "0.02em",
        textTransform: tipKey ? "uppercase" : "none",
        minHeight: dense ? 28 : 28,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
      }}
    >
      {resolvedLabel}
      <Info size={dense ? 11 : 12} strokeWidth={2.5} />
    </button>
  );
}

export default function WorkoutExerciseCard({
  exercise,
  colors: G,
  accent,
  onOpenDrill,
  compact = false,
  nested = false,
}) {
  const [tipKey, setTipKey] = useState(null);
  const [departOpen, setDepartOpen] = useState(false);
  const [allurePaceOpen, setAllurePaceOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  if (!exercise) return null;

  const dense = nested || compact;
  const volume = exercise.volumeLabel || (exercise.meters ? `${exercise.meters} m` : null);
  const stroke = exercise.strokeLabel;
  const drills =
    Array.isArray(exercise.educatifs) && exercise.educatifs.length
      ? exercise.educatifs
      : exercise.educatif
        ? [exercise.educatif]
        : [];
  const multiDrills = drills.length > 1;
  const allureChips = detectAllureTips(exercise);
  const primaryCue = stripAllureWordsDuplicatedByChips(
    fourNagesDisplayCue(exercise.fourNagesMode, exercise.volumeLabel)
      || (multiDrills ? "4 éducatifs (1 / nage)" : exercise.cue),
    allureChips,
  );
  const departLabel = exercise.departLabel || null;
  const departSeconds = exercise.departSeconds || 60;
  const allurePaceLabel = exercise.allurePaceLabel || null;
  const allurePaceLow = exercise.allurePaceLow || null;
  const allurePaceHigh = exercise.allurePaceHigh || null;
  const restChip = exercise.restChip || null;
  const restSeconds = exercise.restSeconds || 30;

  const chips = (
    <>
      {allureChips.map((key) => (
        <AllureInfoChip
          key={key}
          tipKey={key}
          onClick={() => setTipKey(key)}
          G={G}
          dense={dense}
        />
      ))}
      {restChip && !departLabel ? (
        <AllureInfoChip
          tipKey={null}
          label={restChip}
          tone="blue"
          ariaName={`récupération ${restChip}`}
          onClick={() => setRestOpen(true)}
          G={G}
          dense={dense}
        />
      ) : null}
      {departLabel ? (
        <AllureInfoChip
          tipKey={null}
          label={departLabel}
          tone="blue"
          ariaName={`départ ${departLabel}`}
          onClick={() => setDepartOpen(true)}
          G={G}
          dense={dense}
        />
      ) : null}
      {allurePaceLabel ? (
        <AllureInfoChip
          tipKey={null}
          label={allurePaceLabel}
          tone="mint"
          ariaName={`allure ${allurePaceLabel}`}
          onClick={() => setAllurePaceOpen(true)}
          G={G}
          dense={dense}
        />
      ) : null}
    </>
  );

  const cueText = primaryCue
    ? primaryCue.charAt(0).toUpperCase() + primaryCue.slice(1)
    : null;

  const tipSheets = (
    <>
      {tipKey ? (
        <AllureTipSheet
          tipKey={tipKey}
          onClose={() => setTipKey(null)}
          colors={G}
          enchainement={exercise.allureEnchainement}
        />
      ) : null}
      {restOpen && restChip ? (
        <RestTipSheet
          label={restChip}
          seconds={restSeconds}
          onClose={() => setRestOpen(false)}
          colors={G}
        />
      ) : null}
      {departOpen ? (
        <DepartTipSheet
          label={departLabel}
          seconds={departSeconds}
          onClose={() => setDepartOpen(false)}
          colors={G}
        />
      ) : null}
      {allurePaceOpen && allurePaceLabel ? (
        <AllurePaceTipSheet
          label={allurePaceLabel}
          low={allurePaceLow}
          high={allurePaceHigh}
          onClose={() => setAllurePaceOpen(false)}
          colors={G}
        />
      ) : null}
    </>
  );

  /* Liste dense (Programme / prep) : titre à gauche, pastilles ⓘ à droite */
  if (dense) {
    return (
      <div
        style={{
          background: "transparent",
          border: "none",
          padding: "10px 4px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          minHeight: 44,
        }}
      >
        <div
          style={{
            width: 22,
            flexShrink: 0,
            marginTop: 2,
            fontSize: 13,
            fontWeight: 800,
            color: accent?.color || G.blue,
            fontVariantNumeric: "tabular-nums",
            textAlign: "right",
            lineHeight: 1.3,
          }}
        >
          {exercise.index}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: G.ink,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                {volume || exercise.main}
                {stroke ? (
                  <span style={{ color: accent?.color || G.blue, fontWeight: 800 }}>
                    {" · "}{stroke}
                  </span>
                ) : null}
              </div>
              {cueText && (volume || exercise.main) ? (
                <div
                  style={{
                    fontSize: 12,
                    color: G.inkLight,
                    marginTop: 3,
                    lineHeight: 1.35,
                    fontWeight: 600,
                  }}
                >
                  {cueText}
                </div>
              ) : null}
              {(exercise.restLabel && !restChip && !departLabel) || drills.length > 0 || exercise.kind === "warm" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {exercise.restLabel && !restChip && !departLabel && (
                    <MetaPill G={G} tone="blue">{exercise.restLabel}</MetaPill>
                  )}
                  {exercise.kind === "warm" && <MetaPill G={G}>Facile</MetaPill>}
                  {drills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenDrill?.(multiDrills ? drills : drills[0])}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "none",
                        background: G.blueLight,
                        color: G.blue,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        minHeight: 28,
                      }}
                    >
                      <Info size={11} />
                      {multiDrills ? "Éducatifs" : "Éducatif"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: 5,
                maxWidth: "46%",
                flexShrink: 0,
              }}
            >
              {chips}
            </div>
          </div>
        </div>

        {tipSheets}
      </div>
    );
  }

  return (
    <div
      style={{
        background: G.surface,
        borderRadius: 16,
        border: `1px solid ${G.greyLight}`,
        overflow: "hidden",
        padding: "16px 16px",
        minHeight: 56,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 9, flexShrink: 0, marginTop: 2,
        background: accent?.bg || G.blueLight, color: accent?.color || G.blue,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800,
      }}>
        {exercise.index}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          color: G.ink,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}>
          <span>
            {volume || exercise.main}
            {stroke ? (
              <span style={{ color: accent?.color || G.blue, fontWeight: 800 }}>
                {" · "}{stroke}
              </span>
            ) : null}
          </span>
          {chips}
        </div>

        {cueText && volume && (
          <div style={{ fontSize: 13, color: G.inkLight, marginTop: 4, lineHeight: 1.35, fontWeight: 600 }}>
            {cueText}
          </div>
        )}
        {!volume && exercise.main && cueText && (
          <div style={{ fontSize: 13, color: G.inkLight, marginTop: 4, lineHeight: 1.35 }}>
            {cueText}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {exercise.restLabel && !restChip && !departLabel && <MetaPill G={G} tone="blue">{exercise.restLabel}</MetaPill>}
          {exercise.kind === "warm" && <MetaPill G={G}>Facile</MetaPill>}
          {drills.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenDrill?.(multiDrills ? drills : drills[0])}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                border: "none", background: G.blueLight, color: G.blue,
                fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 10,
                cursor: "pointer", minHeight: 32,
              }}
            >
              <Info size={12} />{" "}
              {multiDrills ? "Voir les éducatifs" : "Voir l’éducatif"}
            </button>
          )}
        </div>
      </div>

      {tipSheets}
    </div>
  );
}
