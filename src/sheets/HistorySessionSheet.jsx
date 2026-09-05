import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCheck, Copy, Share2, X } from "lucide-react";
import { G } from "../theme/palette.js";
import { formatLoopSessionTitle } from "../lib/swim-plan-bridge.js";
import { copySessionText } from "../lib/session-export.js";
import { buildSessionSharePack } from "../lib/session-share-pack.js";
import { fetchReferralInvite } from "../lib/referral-share.js";
import WorkoutPrepView from "../workout/WorkoutPrepView.jsx";

const PoolMode = lazy(() => import("../workout/PoolMode.jsx"));

/**
 * Relecture d’une séance archivée. Pas de validation, pas de changement de statut.
 */
export default function HistorySessionSheet({
  open,
  session,
  ordinal = 0,
  title: titleOverride = null,
  colors = G,
  accent,
  isPremium = true,
  profile = null,
  planId = null,
  onClose,
  onUpgrade,
  onShare,
}) {
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState(null);
  const [poolOpen, setPoolOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (poolOpen) setPoolOpen(false);
        else onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, poolOpen]);

  useEffect(() => {
    if (!open) {
      setPoolOpen(false);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isPremium) return undefined;
    let cancelled = false;
    fetchReferralInvite().then((inv) => {
      if (!cancelled) setInvite(inv);
    });
    return () => { cancelled = true; };
  }, [open, isPremium]);

  if (!open || !session) return null;

  const title = titleOverride || formatLoopSessionTitle(ordinal);
  const statusLabel = session.completed ? "Terminée" : "Abandonnée";
  const sessionKey = `history:${planId || "loop"}:${ordinal}`;

  const runCopy = async () => {
    if (!isPremium) {
      onUpgrade?.("session_locked");
      return;
    }
    const pack = buildSessionSharePack(session, invite || {});
    const ok = await copySessionText(session, pack.clipboardText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runShare = () => {
    if (!isPremium) {
      onUpgrade?.("session_locked");
      return;
    }
    onShare?.(session);
  };

  const btn = {
    flex: 1,
    minWidth: 110,
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: `1px solid ${colors.greyLight || G.greyLight}`,
    background: colors.surface || G.surface,
    color: colors.inkLight || G.inkLight,
  };

  return createPortal(
    <div
      className="sheet-overlay ms-soft-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Séance passée, ${title}`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ zIndex: 400 }}
    >
      <div
        className="sheet-panel scale-in ms-soft-sheet"
        style={{ maxHeight: "min(94dvh, 920px)" }}
      >
        <div className="ms-soft-sheet-head">
          <div className="ms-sheet-handle" />
          <div className="ms-soft-sheet-head-row">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ms-soft-sheet-eyebrow">Séance passée</div>
              <div className="ms-soft-sheet-title" style={{ fontSize: 17 }}>
                {statusLabel}
                {session.distance ? ` · ${session.distance}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la séance passée"
              className="ms-soft-sheet-close"
            >
              <X size={18} color="currentColor" />
            </button>
          </div>
        </div>

        <div className="ms-soft-sheet-body">
          <WorkoutPrepView
            session={session}
            colors={colors}
            accent={accent}
            isPremium={isPremium}
            showStart={isPremium}
            startLabel="Suivre au bassin"
            loopCursor={ordinal}
            profile={profile}
            planId={planId}
            onUpgrade={() => onUpgrade?.("session_locked")}
            onStart={() => setPoolOpen(true)}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={runCopy}
              style={{
                ...btn,
                background: copied ? (colors.mint || G.mint) : (colors.surface || G.surface),
                borderColor: copied ? (colors.mint || G.mint) : (colors.greyLight || G.greyLight),
                color: copied ? (colors.white || G.white) : (colors.inkLight || G.inkLight),
              }}
            >
              {copied ? <><CheckCheck size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
            </button>
            {onShare ? (
              <button type="button" onClick={runShare} style={btn}>
                <Share2 size={13} /> Partager
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {poolOpen && (
        <Suspense fallback={null}>
          <PoolMode
            session={session}
            sessionKey={sessionKey}
            colors={colors}
            accent={accent}
            onClose={() => setPoolOpen(false)}
            onFinish={() => setPoolOpen(false)}
          />
        </Suspense>
      )}
    </div>,
    document.body,
  );
}
