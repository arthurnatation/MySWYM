import { useMemo, useState } from "react";
import { Waves } from "lucide-react";
import { FONT_DISPLAY } from "./theme/brand.js";
import { G } from "./theme/palette.js";
import { AppTabShell, AppTopBar } from "./app-shell/index.js";
import { HomeBadgesSection } from "./Dashboard.jsx";
import { computeStats, checkBadges } from "./lib/plan-stats.js";
import {
  PERIODS,
  PERIOD_META,
  buildPeriodAnalytics,
  formatKm,
} from "./lib/swimmer-period-stats.js";
import { buildWeekDayStrip } from "./lib/week-day-strip.js";
import { getTabUi } from "./tab-ui-registry.js";
import { playUiSound } from "./lib/ui-sounds.js";

function paceLabel(secs) {
  if (!secs || !Number.isFinite(Number(secs))) return "-";
  const n = Math.round(Number(secs));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SegTrack({ options, value, onChange, ariaLabel }) {
  return (
    <div className="ms-seg-track" role="tablist" aria-label={ariaLabel} style={{ marginBottom: 18 }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`ms-seg-btn${value === opt.id ? " is-active" : ""}`}
          onClick={() => {
            playUiSound("soft");
            onChange(opt.id);
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function GlassStat({ label, value, hint }) {
  return (
    <div
      className="ms-glass-card"
      style={{
        flex: 1,
        minWidth: 0,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontWeight: 700,
          color: G.ink,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: G.grey, marginTop: 6 }}>{label}</div>
      {hint ? (
        <div style={{ fontSize: 10, color: G.greyMid, marginTop: 2 }}>{hint}</div>
      ) : null}
    </div>
  );
}

function Sparkline({ bars }) {
  if (!bars?.length) return null;
  const max = Math.max(1, ...bars.map((bar) => bar.meters || 0));
  const hasVolume = bars.some((bar) => bar.meters > 0);

  return (
    <div aria-hidden="true">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64 }}>
        {bars.map((bar) => {
          const pct = hasVolume
            ? Math.max(bar.meters > 0 ? 12 : 5, Math.round((bar.meters / max) * 100))
            : 8;
          return (
            <div
              key={bar.key}
              title={`${bar.label} · ${formatKm(bar.meters)}`}
              style={{
                flex: 1,
                minWidth: 0,
                height: `${pct}%`,
                borderRadius: 6,
                background: bar.active
                  ? "linear-gradient(180deg, #3d8fff, #006bfd)"
                  : "rgba(0, 107, 253, 0.18)",
                boxShadow: bar.active ? "0 6px 14px rgba(0, 107, 253, 0.25)" : "none",
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {bars.map((bar) => (
          <div
            key={`${bar.key}-lbl`}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 9,
              fontWeight: bar.active ? 700 : 600,
              color: bar.active ? G.blue : G.greyMid,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard analytique pro (réf. health apps) :
 * héros métrique, glass stats, segments Progression / Allure / Connexions.
 */
export default function AnalyseTab({
  plan,
  profile,
  user,
  isPremium = false,
  onOpenMenu,
  onTabChange,
  onUpgrade,
  onPaceUpdate,
  onValidateSession,
}) {
  const { MonAllureCard, StravaSection } = getTabUi();
  const [mainTab, setMainTab] = useState("progress");
  const [detailTab, setDetailTab] = useState("volume");
  const [period, setPeriod] = useState("week");

  const stats = useMemo(() => computeStats(plan), [plan]);
  const periodStats = useMemo(
    () => (plan ? buildPeriodAnalytics(plan, profile, period) : null),
    [plan, profile, period],
  );
  const earnedCount = useMemo(() => checkBadges(stats).length, [stats]);
  const weekDayStrip = useMemo(
    () => (plan ? buildWeekDayStrip(plan, profile) : null),
    [plan, profile],
  );
  const weekSessionStats = useMemo(() => {
    if (!weekDayStrip?.length) return { done: 0, planned: 0 };
    return {
      done: weekDayStrip.filter((d) => d.done).length,
      planned: weekDayStrip.filter((d) => d.scheduled).length,
    };
  }, [weekDayStrip]);
  const totalKmLabel = ((stats.totalMeters || 0) / 1000).toFixed(1);

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

      <div className="app-shell" style={{ paddingTop: 4 }}>
        {weekDayStrip && (
          <div
            className="ms-week-strip"
            role="list"
            aria-label="Cette semaine"
          >
            {weekDayStrip.map((day) => (
              <div
                key={day.key}
                role="listitem"
                className={[
                  "ms-week-day",
                  day.isToday ? "is-today" : "",
                  day.done ? "is-done" : "",
                  day.scheduled ? "is-scheduled" : "",
                ].filter(Boolean).join(" ")}
              >
                <span className="ms-week-day-label">{day.label}</span>
                <span className="ms-week-day-num">{day.dateNum}</span>
                <span
                  className={`ms-week-day-dot${day.done ? " is-on" : ""}`}
                  aria-hidden
                />
              </div>
            ))}
          </div>
        )}

        <SegTrack
          ariaLabel="Vue analyse"
          value={mainTab}
          onChange={setMainTab}
          options={[
            { id: "progress", label: "Progression" },
            { id: "pace", label: "Allure" },
            { id: "connect", label: "Connexions" },
          ]}
        />

        {!plan && mainTab === "progress" && (
          <div className="ms-glass-card" style={{ padding: "22px 18px", marginBottom: 16, textAlign: "center" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: G.grey, lineHeight: 1.45 }}>
              Crée ton programme pour activer le dashboard.
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
        )}

        {mainTab === "progress" && plan && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 22, marginTop: 4 }}>
              <GlassStat
                label="Séances"
                value={String(weekSessionStats.done)}
                hint={weekSessionStats.planned > 0 ? `/ ${weekSessionStats.planned}` : "cette semaine"}
              />
              <GlassStat
                label="Série"
                value={String(stats.streak || 0)}
                hint={(stats.streak || 0) > 0 ? "en cours" : "à lancer"}
              />
              <GlassStat
                label="Volume"
                value={totalKmLabel}
                hint="km au total"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 700,
                  color: G.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                Détail
              </h2>
            </div>

            <SegTrack
              ariaLabel="Détail progression"
              value={detailTab}
              onChange={setDetailTab}
              options={[
                { id: "volume", label: "Volume" },
                { id: "badges", label: "Badges" },
              ]}
            />

            {detailTab === "volume" && periodStats && (
              <div className="ms-glass-card" style={{ padding: "18px 16px", marginBottom: 16 }}>
                <div
                  role="tablist"
                  aria-label="Période"
                  style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
                >
                  {PERIODS.map((id) => {
                    const selected = period === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => {
                          playUiSound("soft");
                          setPeriod(id);
                        }}
                        className={`ms-chip${selected ? " is-active" : ""}`}
                        style={{ height: 32, fontSize: 12 }}
                      >
                        {PERIOD_META[id].chip}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: G.grey }}>{periodStats.title}</div>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 32,
                        fontWeight: 700,
                        color: G.ink,
                        letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.05,
                        marginTop: 4,
                      }}
                    >
                      {periodStats.isEmptyTarget
                        ? formatKm(periodStats.plannedMeters)
                        : periodStats.kmLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: G.blue, fontVariantNumeric: "tabular-nums" }}>
                      {periodStats.showPrescribed
                        ? `${periodStats.doneSessions}/${periodStats.plannedSessions}`
                        : periodStats.doneSessions}
                    </div>
                    <div style={{ fontSize: 11, color: G.greyMid }}>séances</div>
                  </div>
                </div>

                {periodStats.deltaLabel ? (
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: periodStats.deltaLabel.startsWith("+") ? G.mint : G.coral,
                      margin: "0 0 14px",
                    }}
                  >
                    {periodStats.deltaLabel}
                  </p>
                ) : (
                  <div style={{ height: 10 }} />
                )}

                <Sparkline bars={periodStats.sparkline} />
              </div>
            )}

            {detailTab === "badges" && (
              <div className="ms-glass-card" style={{ padding: "16px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: G.grey, marginBottom: 12 }}>
                  {earnedCount} badge{earnedCount > 1 ? "s" : ""} débloqué{earnedCount > 1 ? "s" : ""}
                </div>
                <HomeBadgesSection plan={plan} />
              </div>
            )}
          </>
        )}

        {mainTab === "pace" && (
          <div style={{ marginBottom: 16 }}>
            {!plan ? (
              <div className="ms-glass-card" style={{ padding: "18px 16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 14, color: G.grey }}>
                  Ton T100 apparaîtra avec un programme.
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 56,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: G.ink,
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {paceLabel(profile?.pace100)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.grey, marginTop: 8 }}>
                    T100 / 100 m
                  </div>
                </div>
                <MonAllureCard
                  profile={profile}
                  pace100={profile?.pace100}
                  pace50={profile?.pace50}
                  pace400={profile?.pace400}
                  isPremium={isPremium}
                  onSave={onPaceUpdate}
                  onUpgrade={onUpgrade}
                />
              </>
            )}
          </div>
        )}

        {mainTab === "connect" && (
          <div style={{ marginBottom: 16 }}>
            <div className="ms-glass-card" style={{ padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Waves size={18} color={G.blue} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: G.ink }}>Strava</div>
                  <div style={{ fontSize: 12, color: G.grey }}>Sync nage & allure</div>
                </div>
              </div>
              <StravaSection
                user={user}
                plan={plan}
                profile={profile}
                currentPace100={profile?.pace100}
                onPaceUpdate={onPaceUpdate}
                onValidateSession={onValidateSession}
                showProgramActions={false}
                showDetails={false}
                isPremium={isPremium}
                onUpgrade={onUpgrade}
              />
            </div>
          </div>
        )}
      </div>
    </AppTabShell>
  );
}

