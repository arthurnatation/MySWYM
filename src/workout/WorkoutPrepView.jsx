/**
 * Vue synthèse / préparation d’une séance (pas le mode bassin).
 * 3 blocs phase : Échauffement · Corps · Retour au calme.
 * Liste dense (lisible en un écran) + pastilles ⓘ.
 */
import { useEffect, useMemo, useState } from "react";
import { Play, Lock, Check, Copy, Printer } from "lucide-react";
import { buildWorkoutView } from "../lib/workout-display.js";
import { openSessionPrint } from "../lib/session-export.js";
import { formatLoopSessionTitle } from "../lib/swim-plan-bridge.js";
import { buildSessionProvenance } from "../lib/session-provenance.js";
import { setSupportSessionRef } from "../lib/support-context.js";
import WorkoutExerciseCard from "./WorkoutExerciseCard.jsx";
import DrillInfoSheet from "./DrillInfoSheet.jsx";

const EQUIPMENT_LABELS = {
  planche: "Planche",
  pull: "Pull-buoy",
  palmes: "Palmes",
  tuba: "Tuba",
  plaquettes: "Plaquettes",
  plaquettes_doigts: "Plaquettes doigts",
  elastique: "Élastique chevilles",
};

function phaseTone(sectionId) {
  if (sectionId === "warm") {
    return {
      id: "warm",
      accent: "#006bfd",
    };
  }
  if (sectionId === "cool") {
    return {
      id: "cool",
      accent: "#1fae86",
    };
  }
  return {
    id: "main",
    accent: "#e85a68",
  };
}

export default function WorkoutPrepView({
  session,
  colors: G,
  accent,
  isPremium = true,
  showStart = true,
  startLabel = null,
  onStart,
  onUpgrade,
  onTooHard,
  whyLine = null,
  lockedPreview = false,
  embedded = false,
  /** Si number : force le titre « Séance n°X » (index = validations, 0 → n°1). */
  loopCursor = null,
  /** Contexte support : permet de retrouver l'onglet / la ligne Sheet. */
  profile = null,
  planId = null,
  showProvenance = true,
}) {
  const view = useMemo(() => buildWorkoutView(session), [session]);
  const [drill, setDrill] = useState(null);
  const [refCopied, setRefCopied] = useState(false);
  const locked = !isPremium || lockedPreview;
  const cta = startLabel || (locked ? "Activer l’essai pour nager" : "Commencer la séance");

  const provenance = useMemo(
    () => buildSessionProvenance(session, { loopOrdinal: loopCursor, profile, planId }),
    [session, loopCursor, profile, planId],
  );

  useEffect(() => {
    if (!showProvenance || !provenance?.supportLine) return;
    setSupportSessionRef(provenance.supportLine);
  }, [showProvenance, provenance?.supportLine]);

  const copyRef = async () => {
    if (!provenance?.supportLine) return;
    try {
      await navigator.clipboard.writeText(provenance.supportLine);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch {
      /* clipboard indisponible (http, permissions), la réf reste lisible à l'écran */
    }
  };

  const { header, sections } = view;
  const displayTitle = loopCursor != null
    ? formatLoopSessionTitle(loopCursor)
    : header.title;
  const metaBits = [
    header.distanceLabel,
    header.durationLabel,
    header.intensityZone,
  ].filter(Boolean);

  const equipmentLabel = (header.equipment || [])
    .map((id) => EQUIPMENT_LABELS[id] || id)
    .join(" · ");

  return (
    <div>
      {!embedded && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{
            margin: 0,
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
            fontSize: 26,
            fontWeight: 700,
            color: G.ink,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
          }}>
            {displayTitle}
          </h2>
          {metaBits.length > 0 && (
            <div style={{
              marginTop: 8,
              fontSize: 15,
              fontWeight: 700,
              color: G.inkLight,
              lineHeight: 1.35,
            }}>
              {metaBits.join(" · ")}
            </div>
          )}
          {session?.sheetWeekRole?.banner ? (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: session.sheetWeekRole.isRaceWeek
                  ? "rgba(248, 113, 113, 0.12)"
                  : session.sheetWeekRole.phase === "test"
                    ? "rgba(251, 191, 36, 0.14)"
                    : "rgba(61, 143, 255, 0.10)",
                border: `1px solid ${
                  session.sheetWeekRole.isRaceWeek
                    ? "rgba(248, 113, 113, 0.28)"
                    : session.sheetWeekRole.phase === "test"
                      ? "rgba(251, 191, 36, 0.35)"
                      : "rgba(61, 143, 255, 0.22)"
                }`,
                fontSize: 13,
                fontWeight: 600,
                color: G.inkLight,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: G.ink, marginBottom: 4 }}>
                {session.sheetWeekRole.label}
              </div>
              {session.sheetWeekRole.banner}
            </div>
          ) : null}
          {(equipmentLabel || header.intensityCue) && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {equipmentLabel && (
                <div style={{ fontSize: 13, color: G.grey, fontWeight: 600 }}>
                  Matériel · {equipmentLabel}
                </div>
              )}
              {header.intensityCue && (
                <div style={{ fontSize: 13, color: G.grey, fontWeight: 600 }}>
                  Objectif · {header.intensityCue.charAt(0).toUpperCase() + header.intensityCue.slice(1)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {embedded && (equipmentLabel || header.intensityCue) && (
        <div className="ms-workout-meta">
          {equipmentLabel && (
            <div className="ms-workout-meta-line">
              Matériel · {equipmentLabel}
            </div>
          )}
          {header.intensityCue && (
            <div className="ms-workout-meta-line">
              Objectif · {header.intensityCue.charAt(0).toUpperCase() + header.intensityCue.slice(1)}
            </div>
          )}
        </div>
      )}

      <div className="ms-workout-phases">
        {sections.map((section) => {
          const tone = phaseTone(section.id);
          return (
            <section
              key={section.id}
              aria-label={section.label}
              className={`ms-workout-phase is-${tone.id}`}
            >
              <header className="ms-workout-phase-head">
                <div className="ms-workout-phase-label">
                  {section.label}
                </div>
                {section.metersLabel && (
                  <div className="ms-workout-phase-meters">
                    {section.metersLabel}
                  </div>
                )}
              </header>
              <div className="ms-workout-phase-list">
                {section.exercises.map((ex, i) => (
                  <div
                    key={ex.id}
                    className="ms-workout-ex-row"
                    style={{
                      filter: locked && section.id === "main" && i > 1 ? "blur(3px)" : "none",
                      opacity: locked && section.id === "main" && i > 1 ? 0.75 : 1,
                    }}
                  >
                    <WorkoutExerciseCard
                      exercise={locked && section.id === "main" && i > 1
                        ? { ...ex, main: "••••••", cue: "Premium", volumeLabel: "•••", strokeLabel: null, educatif: null, educatifs: null, children: [], cues: [] }
                        : ex}
                      colors={G}
                      accent={{ bg: "transparent", color: tone.accent }}
                      onOpenDrill={setDrill}
                      compact={embedded}
                      nested
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {showProvenance && provenance && (
        <button
          type="button"
          onClick={copyRef}
          title={provenance.shortLabel}
          aria-label={`Copier la référence séance ${provenance.refCode} pour le support`}
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            minHeight: 32,
            borderRadius: 999,
            border: `1px solid ${G.greyLight}`,
            background: "transparent",
            color: G.greyMid,
            fontSize: 11,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            cursor: "pointer",
          }}
        >
          {refCopied
            ? <Check size={12} color={G.mint} strokeWidth={3} />
            : <Copy size={12} color={G.greyMid} />}
          {refCopied ? "Réf. copiée" : `Réf. ${provenance.refCode}`}
        </button>
      )}

      {whyLine && (
        <p style={{
          margin: "14px 0",
          padding: "10px 12px",
          borderRadius: 12,
          background: G.blueLight,
          border: `1px solid ${G.greyLight}`,
          fontSize: 13,
          lineHeight: 1.45,
          color: G.ink,
          fontWeight: 600,
        }}>
          {whyLine}
        </p>
      )}

      {showStart && (
        <button
          type="button"
          className="ms-pill-cta ms-workout-start"
          onClick={() => {
            if (locked) onUpgrade?.();
            else onStart?.();
          }}
        >
          {locked ? <Lock size={18} color="#fff" /> : <Play size={18} color="#fff" fill="#fff" />}
          {cta}
        </button>
      )}

      <button
        type="button"
        className="ms-workout-secondary"
        onClick={() => {
          if (locked) {
            onUpgrade?.();
            return;
          }
          openSessionPrint(session);
        }}
        aria-label="Imprimer la fiche de séance"
      >
        <Printer size={16} color="currentColor" />
        Imprimer la fiche
      </button>

      {onTooHard && !locked && (
        <button
          type="button"
          className="ms-workout-secondary"
          onClick={onTooHard}
        >
          Trop dure pour moi, alléger la suite
        </button>
      )}

      {drill && (
        <DrillInfoSheet
          educatif={Array.isArray(drill) ? undefined : drill}
          educatifs={Array.isArray(drill) ? drill : undefined}
          onClose={() => setDrill(null)}
          colors={G}
        />
      )}
    </div>
  );
}
