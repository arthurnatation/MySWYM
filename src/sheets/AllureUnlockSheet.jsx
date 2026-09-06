import { useEffect, useState } from "react";
import { Gauge, Lock } from "lucide-react";
import { FONT } from "../theme/brand.js";
import { G } from "../theme/palette.js";
import { markAllureUnlockTipSeen } from "../lib/allure-unlock-tip.js";
import SoftMistSheet from "./SoftMistSheet.jsx";

function parsePaceDigits(raw, { minSec = 45, maxSec = 5 * 60 } = {}) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 3);
  if (digits.length < 3) return { val: null, display: digits.length <= 2 ? digits : `${digits[0]}:${digits.slice(1)}`, err: "" };
  const mins = parseInt(digits[0], 10);
  const secs = parseInt(digits.slice(1), 10);
  const display = `${digits[0]}:${digits.slice(1)}`;
  if (secs >= 60) return { val: null, display, err: "Secondes entre 00 et 59" };
  const total = mins * 60 + secs;
  if (total < minSec) return { val: null, display, err: "Trop rapide" };
  if (total > maxSec) return { val: null, display, err: "Trop lent" };
  return { val: total, display, err: "" };
}

/**
 * Bottom sheet : après la 1re séance, expliquer / saisir le T100 (Premium).
 */
export default function AllureUnlockSheet({
  userId,
  isPremium = false,
  initialPace100 = null,
  onSave,
  onUpgrade,
  onDismiss,
}) {
  const [raw, setRaw] = useState("");
  const [val, setVal] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialPace100) return;
    const m = Math.floor(initialPace100 / 60);
    const s = Math.round(initialPace100 % 60);
    setRaw(`${m}:${String(s).padStart(2, "0")}`);
    setVal(initialPace100);
  }, [initialPace100]);

  const close = () => {
    markAllureUnlockTipSeen(userId);
    onDismiss?.();
  };

  const handleChange = (input) => {
    const parsed = parsePaceDigits(input);
    setRaw(parsed.display);
    setVal(parsed.val);
    setErr(parsed.err);
  };

  const handleSave = async () => {
    if (!isPremium) {
      markAllureUnlockTipSeen(userId);
      onUpgrade?.("allure_unlock");
      onDismiss?.();
      return;
    }
    if (!val || saving) return;
    setSaving(true);
    try {
      await Promise.resolve(onSave?.(val));
      markAllureUnlockTipSeen(userId);
      onDismiss?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SoftMistSheet
      eyebrow="Premium"
      title="Ton allure, c’est le moteur"
      onClose={close}
      ariaLabel="Mon allure"
      zIndex={400}
    >
      <div
        style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 14,
          background: "var(--ms-blue-soft)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Gauge size={22} color={G.blue} />
      </div>

      <p className="ms-tip-lead">
        Ton meilleur 100&nbsp;m crawl (T100) calibre départs et allures sur <strong style={{ color: "var(--ms-ink)" }}>ta</strong> vitesse.
        Sans ça, les séances restent génériques.
      </p>

      <div style={{ marginBottom: 8 }}>
        <div className="ms-tip-block-label" style={{ marginBottom: 8 }}>
          Meilleur temps 100 m
        </div>
        {isPremium ? (
          <input
            type="text"
            inputMode="numeric"
            placeholder="1:45"
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            aria-label="Meilleur temps sur 100 mètres"
            className="ms-profile-field"
            style={{
              fontSize: 22, fontFamily: FONT, fontWeight: 700,
              textAlign: "center", letterSpacing: "0.06em",
              borderColor: val ? "rgba(0,107,253,0.45)" : undefined,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              markAllureUnlockTipSeen(userId);
              onUpgrade?.("allure_unlock");
              onDismiss?.();
            }}
            className="ms-profile-field"
            style={{
              fontSize: 22, fontFamily: FONT, fontWeight: 700,
              textAlign: "center", letterSpacing: "0.06em",
              color: "var(--ms-ink-soft)", cursor: "pointer",
            }}
          >
            1:45
          </button>
        )}
        {err ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: G.coral, textAlign: "center" }}>{err}</p>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ms-ink-soft)", textAlign: "center" }}>
            100&nbsp;m crawl, départ dans l’eau, ton meilleur temps.
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {isPremium ? (
          <button
            type="button"
            className="ms-pill-cta"
            onClick={handleSave}
            disabled={!val || saving}
            style={{
              opacity: val && !saving ? 1 : 0.5,
              cursor: val && !saving ? "pointer" : "not-allowed",
              background: val ? G.mint : undefined,
              boxShadow: val ? "0 8px 22px rgba(31,174,134,0.28)" : undefined,
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer mon 100 m"}
          </button>
        ) : (
          <button
            type="button"
            className="ms-pill-cta"
            onClick={() => {
              markAllureUnlockTipSeen(userId);
              onUpgrade?.("allure_unlock");
              onDismiss?.();
            }}
          >
            <Lock size={16} color="#fff" />
            Débloquer avec Premium
          </button>
        )}
        <button
          type="button"
          className="ms-workout-secondary"
          onClick={close}
          style={{ border: "none", background: "transparent" }}
        >
          Plus tard
        </button>
      </div>
    </SoftMistSheet>
  );
}
