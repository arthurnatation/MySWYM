/**
 * Mode bassin, un exercice à la fois, grosses zones tactiles.
 * Persistance locale de l’index en cours.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { buildWorkoutView, metersBeforeIndex, metersThroughIndex } from "../lib/workout-display.js";
import PyramidBlockViz from "../PyramidBlockViz.jsx";
import DrillInfoSheet from "./DrillInfoSheet.jsx";

function storageKey(sessionKey) {
  return `myswym_pool_mode_${sessionKey || "anon"}`;
}

function readProgress(sessionKey) {
  try {
    const raw = localStorage.getItem(storageKey(sessionKey));
    if (!raw) return 0;
    const n = Number(JSON.parse(raw)?.index);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeProgress(sessionKey, index) {
  try {
    localStorage.setItem(storageKey(sessionKey), JSON.stringify({ index, at: Date.now() }));
  } catch { /* ignore */ }
}

function clearProgress(sessionKey) {
  try {
    localStorage.removeItem(storageKey(sessionKey));
  } catch { /* ignore */ }
}

export default function PoolMode({
  session,
  sessionKey,
  colors: G,
  accent,
  onClose,
  onFinish,
}) {
  const view = useMemo(() => buildWorkoutView(session), [session]);
  const exercises = view.exercises;
  const total = exercises.length;
  const totalMeters = view.totalMeters || 1;

  const [index, setIndex] = useState(() => {
    const saved = readProgress(sessionKey);
    return Math.min(saved, Math.max(0, total - 1));
  });
  const [drill, setDrill] = useState(null);

  useEffect(() => {
    writeProgress(sessionKey, index);
  }, [sessionKey, index]);

  // Empêche le scroll du body derrière
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!total) {
    return createPortal(
      <div style={{
        position: "fixed", inset: 0, zIndex: 500, background: G.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <p style={{ color: G.grey, fontSize: 15 }}>Aucun exercice à afficher.</p>
        <button type="button" onClick={onClose} style={{
          marginTop: 16, minHeight: 48, padding: "12px 20px", borderRadius: 14,
          border: "none", background: G.blue, color: "#fff", fontWeight: 700, cursor: "pointer",
        }}>Fermer</button>
      </div>,
      document.body,
    );
  }

  const ex = exercises[index];
  const doneMeters = metersThroughIndex(exercises, index);
  const beforeMeters = metersBeforeIndex(exercises, index);
  const progress = Math.min(1, doneMeters / totalMeters);
  const isLast = index >= total - 1;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (isLast) {
      clearProgress(sessionKey);
      onFinish?.();
      return;
    }
    setIndex((i) => Math.min(total - 1, i + 1));
  };

  const volume = ex.volumeLabel || (ex.meters ? `${ex.meters} m` : ex.main);
  const stroke = ex.strokeLabel;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode bassin"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: G.bg,
        display: "flex",
        flexDirection: "column",
        color: G.ink,
      }}
    >
      {/* Top bar */}
      <div style={{
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: `1px solid ${G.greyLight}`,
        background: G.surface,
      }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Quitter le mode bassin"
          style={{
            width: 48, height: 48, borderRadius: 14, border: `1px solid ${G.greyLight}`,
            background: G.greyXLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X size={20} color={G.ink} />
        </button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: G.ink }}>
            {index + 1} / {total}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: G.grey, marginTop: 2 }}>
            {(beforeMeters + (ex.meters || 0)).toLocaleString("fr-FR")} / {totalMeters.toLocaleString("fr-FR")} m
          </div>
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Progress */}
      <div style={{ height: 4, background: G.greyLight, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: "100%",
          transformOrigin: "left center",
          transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
          background: accent?.color || G.blue,
          transition: "transform 200ms ease",
        }} />
      </div>

      {/* Current exercise */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "28px 20px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        {ex.section === "warm" && (
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0097A7", marginBottom: 12 }}>
            Échauffement
          </div>
        )}
        {ex.section === "cool" && (
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#00897B", marginBottom: 12 }}>
            Retour au calme
          </div>
        )}

        <div style={{
          fontSize: 40,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: G.ink,
          marginBottom: 8,
        }}>
          {volume}
        </div>
        {stroke && (
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: accent?.color || G.blue,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}>
            {stroke}
          </div>
        )}

        {ex.cue && (
          <div style={{ fontSize: 18, fontWeight: 600, color: G.inkLight, lineHeight: 1.35, marginBottom: 16 }}>
            {ex.cue.charAt(0).toUpperCase() + ex.cue.slice(1)}
          </div>
        )}

        {ex.children?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {ex.children.map((c, i) => (
              <div key={i} style={{
                fontSize: 17, fontWeight: 700, color: G.ink, lineHeight: 1.3,
                padding: "12px 14px", borderRadius: 14, background: G.surface, border: `1px solid ${G.greyLight}`,
              }}>
                {c.headline?.volume || c.main}
                {c.headline?.stroke ? ` · ${c.headline.stroke}` : ""}
                {c.headline?.rest ? `, ${c.headline.rest}` : ""}
              </div>
            ))}
          </div>
        )}

        {ex.pyramid && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: G.ink, marginBottom: 10, lineHeight: 1.3 }}>
              {ex.pyramid.steps.join(" → ")}
            </div>
            <PyramidBlockViz
              steps={ex.pyramid.steps}
              peak={ex.pyramid.peak}
              volume={ex.pyramid.volume}
              rest={ex.pyramid.rest}
              label={ex.pyramid.label}
              accent={accent?.color || G.blue}
            />
          </div>
        )}

        {ex.restLabel && (
          <div style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            fontSize: 16,
            fontWeight: 800,
            color: G.blue,
            background: G.blueLight,
            padding: "12px 16px",
            borderRadius: 14,
            marginBottom: 12,
          }}>
            {ex.restLabel}
          </div>
        )}

        {(() => {
          const drills =
            Array.isArray(ex.educatifs) && ex.educatifs.length
              ? ex.educatifs
              : ex.educatif
                ? [ex.educatif]
                : [];
          if (!drills.length) return null;
          const multi = drills.length > 1;
          return (
            <button
              type="button"
              onClick={() => setDrill(multi ? drills : drills[0])}
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
                border: "none",
                background: "none",
                color: G.blue,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                padding: "10px 0",
                minHeight: 44,
              }}
            >
              {multi ? "Voir les éducatifs" : `Voir l’éducatif · ${drills[0].name}`}
            </button>
          );
        })()}
      </div>

      {/* Controls */}
      <div style={{
        padding: "12px 16px max(16px, env(safe-area-inset-bottom))",
        background: G.surface,
        borderTop: `1px solid ${G.greyLight}`,
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr 1fr",
        gap: 10,
      }}>
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          style={{
            minHeight: 64,
            borderRadius: 16,
            border: `1.5px solid ${G.greyLight}`,
            background: index === 0 ? G.greyXLight : G.surface,
            color: index === 0 ? G.greyMid : G.ink,
            fontSize: 14,
            fontWeight: 800,
            cursor: index === 0 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <ChevronLeft size={20} />
          Préc.
        </button>

        <button
          type="button"
          onClick={goNext}
          style={{
            minHeight: 64,
            borderRadius: 16,
            border: "none",
            background: G.blue,
            color: "#fff",
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 10px 24px rgba(53,93,163,0.28)",
          }}
        >
          <Check size={22} color="#fff" strokeWidth={3} />
          {isLast ? "Terminer" : "Terminé"}
        </button>

        <button
          type="button"
          onClick={() => !isLast && setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={isLast}
          style={{
            minHeight: 64,
            borderRadius: 16,
            border: `1.5px solid ${G.greyLight}`,
            background: isLast ? G.greyXLight : G.surface,
            color: isLast ? G.greyMid : G.ink,
            fontSize: 14,
            fontWeight: 800,
            cursor: isLast ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          Suiv.
          <ChevronRight size={20} />
        </button>
      </div>

      {drill && (
        <DrillInfoSheet
          educatif={Array.isArray(drill) ? undefined : drill}
          educatifs={Array.isArray(drill) ? drill : undefined}
          onClose={() => setDrill(null)}
          colors={G}
        />
      )}
    </div>,
    document.body,
  );
}
