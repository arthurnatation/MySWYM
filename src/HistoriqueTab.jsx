import { useMemo, useState } from "react";
import { Check, X, ChevronRight, History, Waves } from "lucide-react";
import { G } from "./theme/palette.js";
import { AppTabShell, AppTopBar } from "./app-shell/index.js";
import HistorySessionSheet from "./sheets/HistorySessionSheet.jsx";
import { formatLoopSessionTitle } from "./lib/swim-plan-bridge.js";
import { buildSessionProvenance } from "./lib/session-provenance.js";
import { isSessionResolved } from "./lib/plan-progress-merge.js";
import { playUiSound } from "./lib/ui-sounds.js";
import { getTabUi } from "./tab-ui-registry.js";
import { PRICING } from "./lib/pricing.js";

/** Liste unifiée : historique boucle + séances Soft résolues. */
export function buildHistoryItems(plan) {
  if (!plan) return [];

  if (Array.isArray(plan.history) && plan.history.length > 0) {
    return plan.history
      .map((session, ordinal) => ({
        session,
        ordinal,
        key: `hist-${ordinal}`,
        label: formatLoopSessionTitle(ordinal),
        source: "loop",
      }))
      .reverse();
  }

  const items = [];
  (plan.weeks || []).forEach((week, wi) => {
    (week.sessions || []).forEach((session, si) => {
      if (!isSessionResolved(session)) return;
      items.push({
        session,
        ordinal: items.length,
        key: `w${wi}-s${si}`,
        label: session.title || `Sem. ${week.number ?? wi + 1} · Séance ${si + 1}`,
        source: "soft",
        weekNumber: week.number ?? wi + 1,
      });
    });
  });
  return items.reverse();
}

function parseMeters(distance) {
  if (distance == null) return 0;
  if (typeof distance === "number" && Number.isFinite(distance)) return distance;
  const m = String(distance).match(/(\d[\d\s]*)\s*m/i);
  if (m) return Number(String(m[1]).replace(/\s/g, "")) || 0;
  const n = Number(String(distance).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Dashboard historique (dock) : stats + liste des séances terminées.
 */
export default function HistoriqueTab({
  plan,
  profile,
  user,
  isPremium = false,
  activePlanId = null,
  onOpenMenu,
  onTabChange,
  onUpgrade,
  onShare,
}) {
  const { getTypeMeta } = getTabUi();
  const [selected, setSelected] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);

  const items = useMemo(() => buildHistoryItems(plan), [plan]);
  const doneCount = items.filter((i) => i.session?.completed).length;
  const skipCount = items.length - doneCount;
  const totalMeters = items.reduce((sum, i) => sum + parseMeters(i.session?.distance), 0);

  const copyRef = async (key, line) => {
    if (!line) return;
    try {
      await navigator.clipboard.writeText(line);
      setCopiedRef(key);
      playUiSound("soft");
      setTimeout(() => setCopiedRef(null), 2000);
    } catch { /* ignore */ }
  };

  return (
    <AppTabShell
      style={{
        paddingBottom: "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 24px)",
        minHeight: "100dvh",
      }}
    >
      <AppTopBar
        user={user}
        onOpenMenu={onOpenMenu}
        onAvatarClick={onTabChange ? () => onTabChange("profile") : undefined}
        plan={plan}
        onTabChange={onTabChange}
        onUpgrade={onUpgrade}
        immersive
      />

      <div className="app-shell" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 18 }}>
          <p className="ms-type-label" style={{ marginBottom: 4 }}>
            Tes séances
          </p>
          <h1 className="ms-type-page">
            Historique
          </h1>
        </div>

        {!plan ? (
          <div className="ms-glass-card" style={{ padding: "22px 18px", textAlign: "center" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: G.grey, lineHeight: 1.45 }}>
              Crée ton programme pour enregistrer tes séances ici.
            </p>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                playUiSound("tap");
                onTabChange?.("plan");
              }}
            >
              Créer mon programme
            </button>
          </div>
        ) : !isPremium ? (
          <div className="ms-glass-card" style={{ padding: "22px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <History size={20} color={G.blue} />
              <span style={{ fontSize: 16, fontWeight: 700, color: G.ink }}>Historique Premium</span>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: G.grey, lineHeight: 1.45 }}>
              Relis tes séances terminées, copie les références support, et suis ta progression.
            </p>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                playUiSound("tap");
                onUpgrade?.("history");
              }}
            >
              S’abonner : dès {PRICING.monthlyCommit.label}/mois
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <div className="ms-glass-card" style={{ flex: 1, padding: "14px 12px", textAlign: "center" }}>
                <div
                  className="ms-type-display"
                  style={{ fontSize: 28 }}
                >
                  {items.length}
                </div>
                <div className="ms-type-caption" style={{ marginTop: 4 }}>Séances</div>
              </div>
              <div className="ms-glass-card" style={{ flex: 1, padding: "14px 12px", textAlign: "center" }}>
                <div
                  className="ms-type-display"
                  style={{ fontSize: 28 }}
                >
                  {(totalMeters / 1000).toFixed(1)}
                </div>
                <div className="ms-type-caption" style={{ marginTop: 4 }}>km</div>
              </div>
              <div className="ms-glass-card" style={{ flex: 1, padding: "14px 12px", textAlign: "center" }}>
                <div
                  className="ms-type-display"
                  style={{ fontSize: 28, color: "var(--ms-mint, #1fae86)" }}
                >
                  {doneCount}
                </div>
                <div className="ms-type-caption" style={{ marginTop: 4 }}>Terminées</div>
              </div>
            </div>

            {skipCount > 0 ? (
              <p style={{ fontSize: 12, color: G.greyMid, margin: "0 0 12px" }}>
                Dont {skipCount} abandonnée{skipCount > 1 ? "s" : ""}
              </p>
            ) : null}

            {items.length === 0 ? (
              <div className="ms-glass-card" style={{ padding: "28px 18px", textAlign: "center" }}>
                <Waves size={28} color={G.blue} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: G.ink, marginBottom: 6 }}>
                  Pas encore de séance
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: G.grey, lineHeight: 1.45 }}>
                  Valide ta première séance dans Programme : elle apparaîtra ici.
                </p>
                <button
                  type="button"
                  className="ms-pill-cta"
                  onClick={() => {
                    playUiSound("tap");
                    onTabChange?.("plan");
                  }}
                >
                  Voir le programme
                </button>
              </div>
            ) : (
              <div className="ms-history-list">
                <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.4, margin: "0 0 12px" }}>
                  Touche une séance pour relire les blocs.
                </p>
                {items.map((item) => {
                  const s = item.session;
                  const prov = buildSessionProvenance(s, {
                    loopOrdinal: item.source === "loop" ? item.ordinal : undefined,
                    profile,
                    planId: activePlanId,
                  });
                  const done = !!s.completed;
                  return (
                    <div key={item.key} className="ms-history-row">
                      <button
                        type="button"
                        className="ms-history-row-main"
                        onClick={() => {
                          playUiSound("soft");
                          setSelected(item);
                        }}
                        aria-label={`Voir ${item.label}`}
                      >
                        <span
                          className="ms-history-status"
                          style={{ background: done ? "rgba(31,174,134,0.12)" : "rgba(232,90,104,0.12)" }}
                        >
                          {done ? <Check size={16} color={G.mint} /> : <X size={16} color={G.coral} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 15,
                              fontWeight: 700,
                              color: G.ink,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.label}
                          </span>
                          <span style={{ display: "block", fontSize: 12, color: G.greyMid, marginTop: 3 }}>
                            {s.distance || "-"}
                            {" · "}
                            {done ? "Terminée" : "Abandonnée"}
                            {item.weekNumber ? ` · Sem. ${item.weekNumber}` : ""}
                          </span>
                        </span>
                        <ChevronRight size={18} color={G.greyMid} />
                      </button>
                      {prov ? (
                        <button
                          type="button"
                          className="ms-history-ref"
                          onClick={() => copyRef(item.key, prov.supportLine)}
                          title={prov.shortLabel}
                          aria-label={`Copier la référence ${prov.refCode}`}
                        >
                          {copiedRef === item.key ? "réf. copiée" : `réf. ${prov.refCode}`}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <HistorySessionSheet
        open={!!selected}
        session={selected?.session}
        ordinal={selected?.ordinal ?? 0}
        title={selected?.source === "soft" ? selected?.label : null}
        accent={{
          bg: getTypeMeta(selected?.session?.type).bg,
          color: getTypeMeta(selected?.session?.type).color,
        }}
        isPremium={isPremium}
        profile={profile}
        planId={activePlanId}
        onClose={() => setSelected(null)}
        onUpgrade={onUpgrade}
        onShare={onShare}
      />
    </AppTabShell>
  );
}
