import { Component, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapPin, MessageCircle, Search, Waves,
  Shield, Loader2, UserPlus, EyeOff, Flag, Ban, PhoneOff, Link2,
  AlertTriangle, CheckCircle2, X, Lock, SlidersHorizontal,
} from "lucide-react";
import { AppTabShell, AppTopBar, AppStatusScreen } from "./app-shell/index.js";
import { trackEvent, trackUiError } from "./lib/analytics.js";
import { humanizeBuddyOtpError } from "./lib/buddy-otp-messages.js";
import { playUiSound } from "./lib/ui-sounds.js";
import { supabase } from "./supabase.js";
import {
  BUDDY_DAYS,
  BUDDY_GOAL_CATEGORIES,
  BUDDY_LEVELS,
  BUDDY_OUTING_TYPES,
  BUDDY_RADIUS_OPTIONS,
  BUDDY_TIME_SLOTS,
  buildWhatsAppLink,
  clearBuddyPhone,
  defaultBuddyForm,
  disableBuddyProfile,
  fetchDiscoverableBuddies,
  fetchOwnBuddyProfile,
  formatAvailabilityLabel,
  formatRadiusLabel,
  formatWhatsAppDisplay,
  labelForGoalCategory,
  labelForLevel,
  labelsForOutingTypes,
  normalizeAvailabilityDays,
  normalizeAvailabilitySlots,
  normalizeOutingTypes,
  normalizeWhatsAppE164,
  toggleAvailabilityDay,
  toggleAvailabilitySlot,
  toggleOutingType,
  sendBuddyPhoneOtp,
  confirmBuddyPhoneOtp,
  upsertBuddyProfile,
} from "./lib/buddy-profiles.js";
import {
  BUDDY_REPORT_REASONS,
  BUDDY_REPORT_THRESHOLD,
  BUDDY_SAFETY_WARNING,
  blockBuddy,
  cancelBuddyConnection,
  fetchConnectionPhones,
  fetchMyBuddyConnections,
  fetchOwnModeration,
  grantPhoneShare,
  hasAckedBuddySafetyLocally,
  isEmailVerified,
  markBuddySafetyAckedLocally,
  myPhoneShareFlag,
  phonesReady,
  reportBuddy,
  requestBuddyConnection,
  respondBuddyConnection,
  revokePhoneShare,
} from "./lib/buddy-connections.js";

const G = {
  bg: "var(--myswym-bg, #000514)",
  surface: "var(--myswym-surface, #06101f)",
  ink: "var(--myswym-ink, #f4f8fa)",
  grey: "var(--myswym-grey, #9bb0c8)",
  greyMid: "var(--myswym-grey-mid, #6b7c90)",
  greyLight: "var(--myswym-grey-light, rgba(0, 107, 253, 0.22))",
  greyXLight: "var(--myswym-grey-xlight, #0a162c)",
  blue: "var(--myswym-blue, #006bfd)",
  blueLight: "var(--myswym-blue-light, #0a162c)",
  blueMid: "var(--myswym-blue-mid, #3d8fff)",
  blueDeep: "var(--myswym-blue-deep, #3d8fff)",
  water: "#22c3e0",
  waterLight: "#0c2a32",
  coral: "#FF6B78",
  coralLight: "#3a151a",
  mint: "#2dd4a0",
  mintLight: "#0c2a20",
  white: "#FFFFFF",
  glass: "var(--myswym-glass, rgba(0, 5, 20, 0.92))",
};

const inp = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1.5px solid ${G.greyLight}`,
  fontSize: 15,
  fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
  background: G.surface,
  color: G.ink,
  outline: "none",
  boxSizing: "border-box",
};

const checkboxStyle = (checked) => ({
  marginTop: 2,
  width: 20,
  height: 20,
  flexShrink: 0,
  appearance: "none",
  WebkitAppearance: "none",
  border: "2px solid rgba(0, 107, 253, 0.45)",
  borderRadius: 6,
  background: checked
    ? `center / 12px 12px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' d='M3 8.5l3 3L13 4.5'/%3E%3C/svg%3E"), ${G.blue}`
    : "transparent",
  cursor: "pointer",
});

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "8px 14px",
        borderRadius: 100,
        border: `1.5px solid ${active ? G.blue : G.greyLight}`,
        background: active ? G.blueLight : G.surface,
        color: active ? G.blueDeep : G.grey,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ms-sheet-card"
        style={{
          width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto",
          borderRadius: 20, padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: G.ink }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: G.greyXLight, borderRadius: 10, width: 36, height: 36, cursor: "pointer" }}>
            <X size={18} color={G.grey} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BuddyCard({ buddy, connection, onRequest, onOpenConnection }) {
  const outingLabels = labelsForOutingTypes(buddy.outing_types);
  const initials = (buddy.display_name || "N").slice(0, 2).toUpperCase();
  const status = connection?.status;

  return (
    <article
      className="ms-glass-card"
      style={{
        borderRadius: 20,
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: buddy.avatar_url ? "transparent" : `linear-gradient(135deg, ${G.blueMid}, ${G.blue})`,
          overflow: "hidden", border: `2px solid ${G.blueLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {buddy.avatar_url
            ? <img src={buddy.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 16, fontWeight: 800, color: G.white }}>{initials}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: G.ink, marginBottom: 2 }}>{buddy.display_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: G.grey, marginBottom: 6 }}>
            <MapPin size={13} />
            <span>{buddy.city}</span>
          </div>
          <div style={{ fontSize: 12, color: G.greyMid, marginBottom: 6 }}>
            {buddy.radius_km >= 999 ? "Déplacement sans limite" : `Jusqu'à ${buddy.radius_km || 15} km de trajet`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: G.waterLight, color: G.water }}>
              {labelForGoalCategory(buddy.goal_category)}
            </span>
            {buddy.level && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: G.blueLight, color: G.blueDeep }}>
                {labelForLevel(buddy.level)}
              </span>
            )}
            {outingLabels.map((label) => (
              <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: G.greyXLight, color: G.grey }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {(() => {
        const avail = formatAvailabilityLabel(buddy.availability_days, buddy.availability_slots)
          || buddy.availability;
        if (!avail) return null;
        return (
          <div style={{ fontSize: 13, color: G.ink, marginBottom: 8, lineHeight: 1.45 }}>
            <strong style={{ color: G.grey, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dispo · </strong>
            {avail}
          </div>
        );
      })()}
      {buddy.bio && (
        <p style={{ fontSize: 13, color: G.grey, margin: "0 0 12px", lineHeight: 1.5 }}>{buddy.bio}</p>
      )}

      {status === "accepted" ? (
        <button
          type="button"
          onClick={() => onOpenConnection(connection)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "13px 16px", borderRadius: 14, border: "none",
            background: G.mint, color: G.white, fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: 48,
          }}
        >
          <CheckCircle2 size={18} />
          Mise en relation active
        </button>
      ) : status === "pending" ? (
        <div style={{
          textAlign: "center", padding: "12px", borderRadius: 14, background: G.blueLight,
          color: G.blueDeep, fontWeight: 700, fontSize: 13,
        }}>
          Demande en attente
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onRequest(buddy)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "13px 16px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${G.blue}, ${G.blueDeep})`,
            color: G.white, fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: 48,
          }}
        >
          <UserPlus size={18} />
          Demander une mise en relation
        </button>
      )}
    </article>
  );
}

function BuddyTopBar({ user, onOpenMenu, onTabChange, onUpgrade }) {
  return (
    <AppTopBar
      user={user}
      onOpenMenu={onOpenMenu}
      onAvatarClick={onTabChange ? () => onTabChange("profile") : undefined}
      onTabChange={onTabChange}
      onUpgrade={onUpgrade}
      immersive
    />
  );
}

function BuddyLockedScreen({ user, onOpenMenu, onTabChange, onUpgrade }) {
  return (
    <AppTabShell style={{ paddingBottom: "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 32px)" }}>
      <BuddyTopBar user={user} onOpenMenu={onOpenMenu} onTabChange={onTabChange} onUpgrade={onUpgrade} />
      <div className="app-shell" style={{ paddingTop: 24 }}>
        <div className="ms-glass-card" style={{
          borderRadius: 20,
          padding: "28px 20px", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: G.blueLight, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={22} color={G.blue} />
          </div>
          <h2 style={{ margin: 0, fontFamily: "Space Grotesk, ui-sans-serif, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: G.ink }}>
            Matching entre abonnés
          </h2>
          <p style={{ margin: "10px 0 20px", fontSize: 14, lineHeight: 1.5, color: G.grey }}>
            Uniquement entre nageurs qui ont un abonnement.
            <br></br>L’essai 7 jours n’ouvre pas cette partie.
          </p>
          <button
            type="button"
            onClick={() => {
              playUiSound("tap");
              onUpgrade?.("buddies");
            }}
            className="ms-pill-cta"
            style={{
              width: "100%", minHeight: 48, border: "none", cursor: "pointer",
              color: "#fff", fontWeight: 700, fontSize: 15,
            }}
          >
            Voir l’abonnement
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("home")}
            style={{
              width: "100%", marginTop: 8, minHeight: 44, border: "none", background: "none",
              color: G.grey, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Retour à l’accueil
          </button>
        </div>
      </div>
    </AppTabShell>
  );
}

function BuddyMatchingPaid({ user, profile, onOpenMenu, onTabChange, onUpgrade }) {
  const [view, setView] = useState("list");
  const [form, setForm] = useState(() => defaultBuddyForm(user, profile));
  const [buddies, setBuddies] = useState([]);
  const [connections, setConnections] = useState([]);
  const [moderation, setModeration] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingConn, setLoadingConn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [phoneConsentError, setPhoneConsentError] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [requestTarget, setRequestTarget] = useState(null);
  const [safetyAck, setSafetyAck] = useState(false);
  const [sharePhoneAck, setSharePhoneAck] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [respondTarget, setRespondTarget] = useState(null);
  const [detailConn, setDetailConn] = useState(null);
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpChannel, setOtpChannel] = useState(null);

  const emailOk = isEmailVerified(user);
  const suspended = !!moderation?.buddy_suspended;
  const hasPhoneReady = !!(form.phone_share_ready && normalizeWhatsAppE164(form.whatsapp_e164));
  const profileReady = !!form.is_discoverable;

  const connectionRows = useMemo(() => (Array.isArray(connections) ? connections : []), [connections]);
  const buddyRows = useMemo(() => (Array.isArray(buddies) ? buddies : []), [buddies]);

  const connectionByPeer = useMemo(() => {
    const map = new Map();
    for (const c of connectionRows) {
      if (!c?.peer_user_id) continue;
      if (["pending", "accepted"].includes(c.status)) map.set(c.peer_user_id, c);
    }
    return map;
  }, [connectionRows]);

  const pendingIncoming = useMemo(
    () => connectionRows.filter((c) => c.status === "pending" && c.recipient_id === user?.id),
    [connectionRows, user?.id],
  );

  const activeConnections = useMemo(
    () => connectionRows.filter((c) => c.status === "accepted" || (c.status === "pending" && c.requester_id === user?.id)),
    [connectionRows, user?.id],
  );

  const loadList = useCallback(async () => {
    if (!user?.id) return;
    setLoadingList(true);
    try {
      const { data, error } = await fetchDiscoverableBuddies({
        city: cityFilter,
        level: levelFilter || undefined,
        goalCategory: goalFilter || undefined,
        excludeUserId: user.id,
        viewerProfile: {
          city: form.city,
          level: form.level,
          goal_category: form.goal_category,
          availability_days: form.availability_days,
          availability_slots: form.availability_slots,
        },
      });
      setBuddies(Array.isArray(data) ? data : []);
      if (error) setMsg({ type: "err", text: typeof error.message === "string" ? error.message : "Impossible de charger les profils." });
    } catch (err) {
      setBuddies([]);
      setMsg({ type: "err", text: typeof err?.message === "string" ? err.message : "Impossible de charger les profils." });
    }
    setLoadingList(false);
  }, [
    user?.id,
    cityFilter,
    levelFilter,
    goalFilter,
    form.city,
    form.level,
    form.goal_category,
    form.availability_days,
    form.availability_slots,
  ]);

  const loadOwn = useCallback(async () => {
    if (!user?.id) return;
    setLoadingForm(true);
    try {
      const { data, error } = await fetchOwnBuddyProfile(user.id);
      if (error) {
        setMsg({ type: "err", text: typeof error.message === "string" ? error.message : "Impossible de charger ton profil binôme." });
      } else if (data) {
        setForm({
          display_name: data.display_name,
          city: data.city || "",
          radius_km: data.radius_km || 15,
          level: data.level || profile?.level || "régulier",
          goal_category: data.goal_category || "eau_libre",
          outing_types: normalizeOutingTypes(data.outing_types),
          availability_days: normalizeAvailabilityDays(data.availability_days),
          availability_slots: normalizeAvailabilitySlots(data.availability_slots),
          bio: data.bio || "",
          whatsapp_e164: data.whatsapp_e164 ? formatWhatsAppDisplay(data.whatsapp_e164) : "",
          is_discoverable: data.is_discoverable,
          phone_share_ready: !!(data.phone_share_ready || data.consent_whatsapp),
          phone_verified: !!data.phone_verified,
          phone_ownership_ack: !!(data.phone_share_ready || data.consent_whatsapp),
          avatar_url: data.avatar_url || user?.user_metadata?.avatar_url || "",
        });
      } else {
        setForm(defaultBuddyForm(user, profile));
      }
    } catch (err) {
      setMsg({ type: "err", text: typeof err?.message === "string" ? err.message : "Impossible de charger ton profil binôme." });
    }
    setLoadingForm(false);
  }, [user, profile]);

  const loadConnections = useCallback(async () => {
    if (!user?.id) return;
    setLoadingConn(true);
    try {
      const [{ data, error }, mod] = await Promise.all([
        fetchMyBuddyConnections(user.id),
        fetchOwnModeration(user.id),
      ]);
      setConnections(Array.isArray(data) ? data : []);
      if (error) setMsg({ type: "err", text: typeof error.message === "string" ? error.message : "Impossible de charger tes relations." });
      setModeration(mod?.data ?? null);
    } catch (err) {
      setConnections([]);
      setMsg({ type: "err", text: typeof err?.message === "string" ? err.message : "Impossible de charger tes relations." });
    }
    setLoadingConn(false);
  }, [user?.id]);

  useEffect(() => { loadOwn(); }, [loadOwn]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!detailConn || !phonesReady(detailConn)) {
        setPhoneInfo(null);
        return;
      }
      const { data, error } = await fetchConnectionPhones(detailConn.id);
      if (!cancelled) {
        if (error) setPhoneInfo({ error: error.message });
        else setPhoneInfo(data);
      }
    })();
    return () => { cancelled = true; };
  }, [detailConn]);

  const gateMatching = () => {
    if (suspended) {
      setMsg({ type: "err", text: "Ton accès Buddy est suspendu suite à des signalements. Contacte le support si besoin." });
      return false;
    }
    if (!emailOk) {
      setMsg({ type: "err", text: "Vérifie ton e-mail avant toute mise en relation (lien dans ta boîte de réception)." });
      return false;
    }
    if (!hasPhoneReady) {
      setMsg({ type: "err", text: "Enregistre un numéro privé et active le consentement de partage (profil buddy) avant de demander une mise en relation." });
      setView("form");
      return false;
    }
    return true;
  };

  const openRequestModal = (buddy) => {
    if (!gateMatching()) return;
    if (!profileReady) {
      setMsg({ type: "err", text: "Publie ton profil buddy (ville, numéro et consentements) pour demander une mise en relation." });
      setView("form");
      return;
    }
    setRequestTarget(buddy);
    setSafetyAck(hasAckedBuddySafetyLocally());
    setSharePhoneAck(false);
    setRequestMessage("");
  };

  const handleSave = async (discoverable) => {
    if (!user?.id) return;
    if (discoverable || form.phone_share_ready) {
      if (!form.phone_ownership_ack && !form.phone_verified) {
        setPhoneConsentError(true);
        setMsg({ type: "err", text: "Confirme que le numéro t’appartient (consentement distinct du compte et des données de santé)." });
        return;
      }
    }
    if (discoverable) {
      if (!form.city?.trim()) {
        setMsg({ type: "err", text: "Indique ta ville ou zone de sortie pour publier." });
        return;
      }
      if (!form.phone_share_ready || !normalizeWhatsAppE164(form.whatsapp_e164)) {
        setMsg({ type: "err", text: "Pour publier, enregistre un numéro valide et accepte le consentement de partage." });
        return;
      }
    }
    setSaving(true);
    setMsg(null);
    setPhoneConsentError(false);
    const payload = { ...form, is_discoverable: discoverable };
    const { data, error } = await upsertBuddyProfile(user.id, payload);
    if (error) {
      setMsg({ type: "err", text: error.message });
    } else {
      setForm((f) => ({
        ...f,
        ...data,
        whatsapp_e164: data.whatsapp_e164 ? formatWhatsAppDisplay(data.whatsapp_e164) : "",
        phone_share_ready: !!(data.phone_share_ready || data.consent_whatsapp),
        phone_verified: !!data.phone_verified,
        phone_ownership_ack: !!(data.phone_share_ready || data.consent_whatsapp),
        is_discoverable: data.is_discoverable,
      }));
      setMsg({
        type: "ok",
        text: discoverable
          ? "Profil visible, ton numéro reste privé jusqu’à une mise en relation mutuelle."
          : "Profil enregistré (non visible).",
      });
      trackEvent("buddy_profile_save", { discoverable }, { essential: true });
      await loadList();
      if (discoverable) setView("list");
    }
    setSaving(false);
  };

  const handleDisable = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await disableBuddyProfile(user.id);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setForm((f) => ({ ...f, is_discoverable: false }));
      setMsg({ type: "ok", text: "Profil retiré de la liste publique." });
      await loadList();
    }
    setSaving(false);
  };

  const handleClearPhone = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await clearBuddyPhone(user.id);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setForm((f) => ({
        ...f,
        whatsapp_e164: "",
        phone_share_ready: false,
        phone_verified: false,
        phone_ownership_ack: false,
        is_discoverable: false,
      }));
      setOtpCode("");
      setOtpChannel(null);
      setMsg({ type: "ok", text: "Numéro masqué et profil retiré de l’annuaire. Révoque aussi les partages dans « Mes mises en relation » si besoin." });
      await loadList();
    }
    setSaving(false);
  };

  const handleSendPhoneOtp = async () => {
    setOtpBusy(true);
    setMsg(null);
    try {
      const { data, error } = await sendBuddyPhoneOtp(form.whatsapp_e164);
      if (error) {
        const text = humanizeBuddyOtpError(error.message);
        setMsg({ type: "err", text });
        trackUiError({ reason: text, context: "buddy_otp_send", error_kind: "buddy" });
        return;
      }
      setOtpChannel(data?.channel || null);
      setMsg({
        type: "ok",
        text: data?.channel === "sms"
          ? "Code envoyé par SMS."
          : "Code envoyé par e-mail (SMS si Twilio est configuré).",
      });
    } catch (err) {
      const text = humanizeBuddyOtpError(err?.message);
      setMsg({ type: "err", text });
      trackUiError({ reason: text, context: "buddy_otp_send", error_kind: "buddy" });
    } finally {
      setOtpBusy(false);
    }
  };

  const handleConfirmPhoneOtp = async () => {
    setOtpBusy(true);
    setMsg(null);
    try {
      const { error } = await confirmBuddyPhoneOtp(form.whatsapp_e164, otpCode);
      if (error) {
        const text = humanizeBuddyOtpError(error.message);
        setMsg({ type: "err", text });
        trackUiError({ reason: text, context: "buddy_otp_confirm", error_kind: "buddy" });
        return;
      }
      setForm((f) => ({
        ...f,
        phone_verified: true,
        phone_share_ready: true,
        phone_ownership_ack: true,
      }));
      setOtpCode("");
      setMsg({ type: "ok", text: "Numéro vérifié." });
      if (user?.id) {
        const { data } = await fetchOwnBuddyProfile(user.id);
        if (data) {
          setForm((f) => ({
            ...f,
            ...data,
            whatsapp_e164: data.whatsapp_e164 ? formatWhatsAppDisplay(data.whatsapp_e164) : f.whatsapp_e164,
            phone_verified: true,
            phone_share_ready: true,
            phone_ownership_ack: true,
          }));
        }
      }
    } catch (err) {
      const text = humanizeBuddyOtpError(err?.message);
      setMsg({ type: "err", text });
      trackUiError({ reason: text, context: "buddy_otp_confirm", error_kind: "buddy" });
    } finally {
      setOtpBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!requestTarget || !user?.id) return;
    setBusyAction(true);
    const { error } = await requestBuddyConnection({
      requesterId: user.id,
      recipientId: requestTarget.user_id,
      message: requestMessage,
      safetyAck,
      sharePhoneConsent: sharePhoneAck,
    });
    if (error) setMsg({ type: "err", text: error.message });
    else {
      markBuddySafetyAckedLocally();
      setMsg({ type: "ok", text: "Demande envoyée. Le numéro ne sera visible qu’après acceptation mutuelle." });
      trackEvent("buddy_connection_request", { goal_category: requestTarget.goal_category }, { essential: true });
      setRequestTarget(null);
      await loadConnections();
    }
    setBusyAction(false);
  };

  const submitRespond = async (accept) => {
    if (!respondTarget || !user?.id) return;
    setBusyAction(true);
    const { error } = await respondBuddyConnection({
      connectionId: respondTarget.id,
      userId: user.id,
      accept,
      safetyAck,
      sharePhoneConsent: sharePhoneAck,
    });
    if (error) setMsg({ type: "err", text: error.message });
    else {
      if (accept) markBuddySafetyAckedLocally();
      setMsg({ type: "ok", text: accept ? "Mise en relation acceptée." : "Demande refusée." });
      setRespondTarget(null);
      await loadConnections();
      setView("matches");
    }
    setBusyAction(false);
  };

  const handleRevokePhone = async (conn) => {
    setBusyAction(true);
    const { error } = await revokePhoneShare(conn.id, user.id);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setMsg({ type: "ok", text: "Ton numéro est masqué pour cette mise en relation." });
      await loadConnections();
      setDetailConn(null);
    }
    setBusyAction(false);
  };

  const handleGrantPhone = async (conn) => {
    setBusyAction(true);
    const { error } = await grantPhoneShare(conn.id, user.id);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setMsg({ type: "ok", text: "Partage du numéro réactivé pour cette mise en relation." });
      await loadConnections();
      setDetailConn(null);
    }
    setBusyAction(false);
  };

  const handleLeave = async (conn) => {
    setBusyAction(true);
    const { error } = await cancelBuddyConnection(conn.id, user.id);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setMsg({ type: "ok", text: "Mise en relation terminée." });
      setDetailConn(null);
      await loadConnections();
      await loadList();
    }
    setBusyAction(false);
  };

  const handleBlock = async (peerId) => {
    if (!peerId) return;
    setBusyAction(true);
    const { error } = await blockBuddy(user.id, peerId);
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setMsg({ type: "ok", text: "Utilisateur bloqué." });
      setDetailConn(null);
      setRespondTarget(null);
      await loadConnections();
      await loadList();
    }
    setBusyAction(false);
  };

  const submitReport = async () => {
    if (!reportTarget || !user?.id) return;
    setBusyAction(true);
    const { error } = await reportBuddy({
      reporterId: user.id,
      reportedId: reportTarget.peer_user_id || reportTarget.user_id,
      connectionId: reportTarget.id || null,
      reason: reportReason,
      details: reportDetails,
    });
    if (error) setMsg({ type: "err", text: error.message });
    else {
      setMsg({
        type: "ok",
        text: `Signalement enregistré. Au-delà de ${BUDDY_REPORT_THRESHOLD} signalements, le compte Buddy peut être suspendu.`,
      });
      setReportTarget(null);
      await loadConnections();
      await loadList();
    }
    setBusyAction(false);
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setMsg(error
      ? { type: "err", text: error.message }
      : { type: "ok", text: "E-mail de vérification renvoyé." });
  };

  const activeFilters = useMemo(() => [cityFilter, levelFilter, goalFilter].filter(Boolean).length, [cityFilter, levelFilter, goalFilter]);

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => {
        playUiSound("nav");
        setView(id);
      }}
      className={`ms-seg-btn${view === id ? " is-active" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <AppTabShell style={{ paddingBottom: "calc(var(--bottom-nav-h) + var(--safe-bottom) + var(--nav-lift) + 24px)" }}>
      <BuddyTopBar user={user} onOpenMenu={onOpenMenu} onTabChange={onTabChange} onUpgrade={onUpgrade} />

      <div className="app-shell" style={{ paddingTop: 20 }}>
        <div className="ms-glass-card" style={{ marginBottom: 16, padding: "18px 16px 14px", borderRadius: 26 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: G.ink, letterSpacing: "-0.03em" }}>Binômes</h1>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: G.grey }}>Après accord mutuel</p>

          <div className="ms-seg-track">
            {tabBtn("list", "Explorer")}
            {tabBtn("matches", `Relations${pendingIncoming.length ? ` (${pendingIncoming.length})` : ""}`)}
            {tabBtn("form", "Mon profil")}
          </div>
        </div>

        {msg && (
          <div style={{
            background: msg.type === "ok" ? G.mintLight : G.coralLight,
            borderRadius: 12, padding: "10px 12px", marginBottom: 14,
            color: msg.type === "ok" ? "#00897B" : G.coral, fontSize: 13, lineHeight: 1.45,
          }}>
            {typeof msg.text === "string" ? msg.text : "Une erreur est survenue."}
          </div>
        )}

        {!emailOk && (
          <div style={{
            background: G.coralLight, borderRadius: 16, padding: "14px 16px", marginBottom: 16,
            border: `1px solid #F5B7B7`, display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <AlertTriangle size={18} color={G.coral} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: G.coral, marginBottom: 4 }}>E-mail non vérifié</div>
              <div style={{ fontSize: 12, color: G.ink, lineHeight: 1.45, marginBottom: 10 }}>
                La mise en relation nécessite un compte avec e-mail vérifié (anti faux comptes).
              </div>
              <button type="button" onClick={resendVerification} style={{ background: G.coral, color: G.white, border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Renvoyer l’e-mail
              </button>
            </div>
          </div>
        )}

        {suspended && (
          <div style={{
            background: G.coralLight, borderRadius: 16, padding: "14px 16px", marginBottom: 16,
            color: G.coral, fontSize: 13, lineHeight: 1.5, fontWeight: 600,
          }}>
            Accès Buddy suspendu ({moderation?.report_count || 0} signalement{(moderation?.report_count || 0) > 1 ? "s" : ""}).
            Contacte le support pour un recours.
          </div>
        )}

        {!suspended && moderation?.report_count > 0 && (
          <div style={{
            background: G.goldLight, borderRadius: 16, padding: "12px 14px", marginBottom: 16,
            color: G.gold, fontSize: 12, lineHeight: 1.45, fontWeight: 600,
            border: "1px solid rgba(251, 191, 36, 0.35)",
          }}>
            Modération : {moderation.report_count} signalement{moderation.report_count > 1 ? "s" : ""} reçu{moderation.report_count > 1 ? "s" : ""} sur ton profil.
            Au-delà de {BUDDY_REPORT_THRESHOLD}, l’accès matching peut être suspendu.
            Tu peux signaler ou bloquer un nageur depuis Relations.
          </div>
        )}

        {view === "list" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={16} color={G.greyMid} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="search"
                  placeholder="Ville ou zone…"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  style={{ ...inp, paddingLeft: 40 }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiSound("soft");
                  setFiltersOpen(true);
                }}
                className="ms-glass-icon-btn"
                aria-label="Filtres"
                style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }}
              >
                <SlidersHorizontal size={18} color={G.ink} />
                {activeFilters > 0 && (
                  <span style={{
                    position: "absolute", top: 6, right: 6, width: 8, height: 8,
                    borderRadius: "50%", background: G.blue,
                  }} />
                )}
              </button>
            </div>

            {loadingList ? (
              <div style={{ textAlign: "center", padding: 40, color: G.grey }}>
                <Loader2 size={28} />
                <div style={{ marginTop: 12, fontSize: 14 }}>Chargement…</div>
              </div>
            ) : buddyRows.length === 0 ? (
              <div className="ms-glass-card" style={{ textAlign: "center", padding: "28px 16px", borderRadius: 26 }}>
                <Waves size={36} color={G.blueMid} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: G.ink, marginBottom: 8 }}>
                  {activeFilters > 0 ? "Aucun profil" : "Annuaire vide ici"}
                </div>
                <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.5, margin: "0 0 18px" }}>
                  {activeFilters > 0
                    ? "Élargis ta recherche ou retire un filtre."
                    : "Publie ton profil pour apparaître. Le numéro reste privé jusqu’à un accord mutuel."}
                </p>
                {activeFilters > 0 ? (
                  <button
                    type="button"
                    className="ms-pill-cta ms-pill-cta-secondary"
                    onClick={() => { setCityFilter(""); setLevelFilter(""); setGoalFilter(""); }}
                  >
                    Effacer les filtres
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ms-pill-cta"
                    onClick={() => {
                      playUiSound("tap");
                      setView("form");
                    }}
                  >
                    {profileReady ? "Compléter mon profil" : "Créer mon profil"}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {buddyRows.length} profil{buddyRows.length > 1 ? "s" : ""}
                </div>
                {buddyRows.map((b) => (
                  <BuddyCard
                    key={b.user_id}
                    buddy={b}
                    connection={connectionByPeer.get(b.user_id)}
                    onRequest={openRequestModal}
                    onOpenConnection={(c) => { setDetailConn(c); setView("matches"); }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {view === "matches" && (
          loadingConn ? (
            <div style={{ textAlign: "center", padding: 40, color: G.grey }}>Chargement…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pendingIncoming.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Demandes reçues
                  </div>
                  {pendingIncoming.map((c) => (
                    <div key={c.id} className="ms-glass-card" style={{ borderRadius: 16, padding: 14, marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, color: G.ink, marginBottom: 4 }}>{c.peer_display_name}</div>
                      {c.peer_city && <div style={{ fontSize: 13, color: G.grey, marginBottom: 8 }}>{c.peer_city}</div>}
                      {c.message && <p style={{ fontSize: 13, color: G.grey, margin: "0 0 12px" }}>{c.message}</p>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!gateMatching()) return;
                            setRespondTarget(c);
                            setSafetyAck(hasAckedBuddySafetyLocally());
                            setSharePhoneAck(false);
                          }}
                          style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: G.mint, color: G.white, fontWeight: 700, cursor: "pointer" }}
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setBusyAction(true);
                            const { error } = await respondBuddyConnection({
                              connectionId: c.id,
                              userId: user.id,
                              accept: false,
                              safetyAck: true,
                              sharePhoneConsent: false,
                            });
                            if (error) setMsg({ type: "err", text: error.message });
                            else {
                              setMsg({ type: "ok", text: "Demande refusée." });
                              await loadConnections();
                            }
                            setBusyAction(false);
                          }}
                          style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${G.greyLight}`, background: G.surface, color: G.ink, fontWeight: 700, cursor: "pointer" }}
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  Mes mises en relation
                </div>
                {activeConnections.length === 0 && pendingIncoming.length === 0 ? (
                  <div className="ms-glass-card" style={{ textAlign: "center", padding: 28, borderRadius: 16, color: G.grey, fontSize: 14 }}>
                    Aucune mise en relation pour l’instant.
                  </div>
                ) : (
                  activeConnections.map((c) => {
                    const ready = phonesReady(c);
                    const myShare = myPhoneShareFlag(c, user.id);
                    return (
                      <div key={c.id} className="ms-glass-card" style={{ borderRadius: 16, padding: 14, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: G.ink }}>{c.peer_display_name}</div>
                            <div style={{ fontSize: 12, color: G.grey, marginTop: 4 }}>
                              {c.status === "pending" ? "En attente de réponse" : ready ? "Numéros partagés" : myShare ? "En attente du partage de l’autre" : "Ton numéro est masqué"}
                            </div>
                          </div>
                          <Link2 size={16} color={G.blue} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                          {c.status === "accepted" && (
                            <button type="button" onClick={() => setDetailConn(c)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.blue, color: G.white, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                              Voir / WhatsApp
                            </button>
                          )}
                          {c.status === "accepted" && myShare && (
                            <button type="button" onClick={() => handleRevokePhone(c)} disabled={busyAction} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.greyXLight, color: G.ink, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                              <PhoneOff size={14} /> Masquer mon n°
                            </button>
                          )}
                          {c.status === "accepted" && !myShare && (
                            <button type="button" onClick={() => handleGrantPhone(c)} disabled={busyAction} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.mintLight, color: "#00897B", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                              Repartager mon n°
                            </button>
                          )}
                          <button type="button" onClick={() => handleLeave(c)} disabled={busyAction} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.coralLight, color: G.coral, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                            Quitter
                          </button>
                          <button type="button" onClick={() => setReportTarget(c)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.greyXLight, color: G.grey, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <Flag size={14} /> Signaler
                          </button>
                          <button type="button" onClick={() => handleBlock(c.peer_user_id)} disabled={busyAction} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: G.greyXLight, color: G.ink, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                            <Ban size={14} /> Bloquer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        )}

        {view === "form" && (
          loadingForm ? (
            <div style={{ textAlign: "center", padding: 40, color: G.grey }}>Chargement…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Prénom affiché</label>
                <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} style={inp} maxLength={80} />
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Ville / zone *</label>
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ex. Annecy, Lyon, Arcachon…" style={inp} maxLength={120} />
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em" }}>Périmètre de déplacement</label>
                    <div style={{ padding: "6px 10px", borderRadius: 999, background: G.blueLight, color: G.blueDeep, fontSize: 12, fontWeight: 800 }}>
                      {formatRadiusLabel(form.radius_km)}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {BUDDY_RADIUS_OPTIONS.map((km) => {
                      const active = (form.radius_km || 15) === km;
                      return (
                        <button
                          key={km}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, radius_km: km }))}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${active ? G.blue : G.greyLight}`,
                            background: active ? G.blueLight : G.surface,
                            color: active ? G.blueDeep : G.grey,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
                          }}
                        >
                          {formatRadiusLabel(km)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Objectif</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BUDDY_GOAL_CATEGORIES.map((g) => (
                    <FilterChip key={g.id} active={form.goal_category === g.id} label={g.label} onClick={() => setForm((f) => ({ ...f, goal_category: g.id }))} />
                  ))}
                </div>
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Type de sortie</label>
                <div style={{ fontSize: 12, color: G.greyMid, marginBottom: 10 }}>Plusieurs choix possibles</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {BUDDY_OUTING_TYPES.map((o) => {
                    const active = (form.outing_types || []).includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, outing_types: toggleOutingType(f.outing_types, o.id) }))}
                        aria-pressed={active}
                        style={{
                          padding: "12px 12px",
                          borderRadius: 14,
                          border: `1.5px solid ${active ? G.blue : G.greyLight}`,
                          background: active ? G.blueLight : G.surface,
                          color: active ? G.blueDeep : G.grey,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
                          textAlign: "left",
                          lineHeight: 1.3,
                          minHeight: 48,
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Niveau</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BUDDY_LEVELS.map((l) => (
                    <FilterChip key={l.id} active={form.level === l.id} label={l.label} onClick={() => setForm((f) => ({ ...f, level: l.id }))} />
                  ))}
                </div>
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Disponibilités</label>
                <div style={{ fontSize: 12, color: G.greyMid, marginBottom: 14 }}>Choisis les jours et créneaux où tu peux nager</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.ink, marginBottom: 8 }}>Jours</div>
                <div role="group" aria-label="Jours disponibles" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 16 }}>
                  {BUDDY_DAYS.map((d) => {
                    const active = (form.availability_days || []).includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={d.label}
                        onClick={() => setForm((f) => ({
                          ...f,
                          availability_days: toggleAvailabilityDay(f.availability_days, d.id),
                        }))}
                        style={{
                          aspectRatio: "1", minHeight: 44, borderRadius: 12,
                          border: `1.5px solid ${active ? G.blue : G.greyLight}`,
                          background: active ? G.blue : G.greyXLight,
                          color: active ? G.white : G.grey,
                          fontSize: 11, fontWeight: 800, cursor: "pointer",
                          fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif", padding: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: G.ink, marginBottom: 8 }}>Créneaux</div>
                <div role="group" aria-label="Créneaux horaires" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {BUDDY_TIME_SLOTS.map((s) => {
                    const active = (form.availability_slots || []).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setForm((f) => ({
                          ...f,
                          availability_slots: toggleAvailabilitySlot(f.availability_slots, s.id),
                        }))}
                        style={{
                          padding: "12px 12px", borderRadius: 14,
                          border: `1.5px solid ${active ? G.blue : G.greyLight}`,
                          background: active ? G.blueLight : G.surface,
                          color: active ? G.blueDeep : G.grey,
                          cursor: "pointer", fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
                          textAlign: "left", minHeight: 56,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>{s.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ms-glass-card" style={{ borderRadius: 20, padding: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Bio (optionnel)</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Ex. Je prépare un 2,5 km en août, cherche binôme rassurant…"
                  rows={3}
                  maxLength={400}
                  style={{ ...inp, resize: "vertical", minHeight: 80 }}
                />
              </div>

              <div
                style={{
                  background: phoneConsentError ? "#FFF5F5" : G.surface,
                  borderRadius: 20,
                  padding: 16,
                  border: `1.5px solid ${phoneConsentError ? "#F5B7B7" : G.greyLight}`,
                }}
              >
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G.grey, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Numéro privé (WhatsApp), jamais public
                </label>
                <input
                  type="tel"
                  value={form.whatsapp_e164}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_e164: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  style={inp}
                  autoComplete="tel"
                />
                <div style={{ fontSize: 12, color: G.grey, marginTop: 8, lineHeight: 1.5 }}>
                  Requis pour apparaître dans l’annuaire, mais jamais affiché dessus. Révélé uniquement à un binôme
                  après acceptation mutuelle et un consentement explicite au moment de la mise en relation.
                  {form.phone_verified
                    ? " · Numéro vérifié."
                    : " · Envoie un code pour vérifier le numéro (SMS si configuré, sinon e-mail)."}
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.phone_share_ready}
                    onChange={(e) => setForm((f) => ({ ...f, phone_share_ready: e.target.checked }))}
                    style={checkboxStyle(form.phone_share_ready)}
                  />
                  <span style={{ fontSize: 12, color: G.grey, lineHeight: 1.55 }}>
                    J’accepte en principe de partager mon numéro uniquement après une mise en relation
                    mutuellement acceptée (consentement distinct du compte et des données de santé). Je pourrai retirer
                    ce partage à tout moment.
                  </span>
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.phone_ownership_ack}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((f) => ({ ...f, phone_ownership_ack: checked }));
                      if (checked) setPhoneConsentError(false);
                    }}
                    style={checkboxStyle(form.phone_ownership_ack)}
                  />
                  <span style={{ fontSize: 12, color: phoneConsentError ? G.coral : G.grey, lineHeight: 1.55 }}>
                    Je confirme que ce numéro m’appartient et que je suis joignable dessus.
                  </span>
                </label>

                {!form.phone_verified && form.whatsapp_e164 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${G.greyLight}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: G.ink, marginBottom: 8 }}>
                      Vérifier le numéro
                    </div>
                    <button
                      type="button"
                      disabled={otpBusy || saving}
                      onClick={handleSendPhoneOtp}
                      style={{
                        width: "100%", padding: "12px", borderRadius: 12, border: "none",
                        background: G.blueLight, color: G.blue, fontWeight: 700, fontSize: 13,
                        cursor: otpBusy ? "wait" : "pointer", minHeight: 44, marginBottom: 10,
                      }}
                    >
                      {otpBusy ? "Envoi…" : otpChannel ? "Renvoyer le code" : "Envoyer un code"}
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Code à 6 chiffres"
                      style={inp}
                      aria-label="Code de vérification"
                    />
                    <button
                      type="button"
                      disabled={otpBusy || saving || otpCode.length !== 6}
                      onClick={handleConfirmPhoneOtp}
                      style={{
                        width: "100%", marginTop: 10, padding: "12px", borderRadius: 12, border: "none",
                        background: G.blue, color: G.white, fontWeight: 700, fontSize: 13,
                        cursor: otpCode.length === 6 ? "pointer" : "not-allowed",
                        opacity: otpCode.length === 6 ? 1 : 0.5, minHeight: 44,
                      }}
                    >
                      Confirmer le code
                    </button>
                  </div>
                )}

                {form.whatsapp_e164 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleClearPhone}
                    style={{
                      marginTop: 12, width: "100%", padding: "11px", borderRadius: 12, border: "none",
                      background: G.coralLight, color: G.coral, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <PhoneOff size={15} />
                    Masquer / supprimer mon numéro
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14, border: "none",
                    background: `linear-gradient(135deg, ${G.blue}, ${G.blueDeep})`,
                    color: G.white, fontWeight: 700, fontSize: 15, cursor: saving ? "wait" : "pointer", minHeight: 48,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Enregistrement…" : form.is_discoverable ? "Mettre à jour · visible" : "Publier mon profil"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 14,
                    border: `1.5px solid ${G.greyLight}`, background: G.surface,
                    color: G.ink, fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: 48,
                  }}
                >
                  Enregistrer sans publier
                </button>
                {form.is_discoverable && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDisable}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 14, border: "none",
                      background: G.coralLight, color: G.coral, fontWeight: 700, fontSize: 14,
                      cursor: "pointer", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <EyeOff size={16} />
                    Retirer de la liste publique
                  </button>
                )}
              </div>

              <p style={{ fontSize: 11, color: G.greyMid, lineHeight: 1.55, margin: "0 0 8px", textAlign: "center" }}>
                MySWYM facilite uniquement la mise en relation. Les rencontres hors application se font sous la responsabilité
                des utilisateurs. Voir CGU § mise en relation et politique de confidentialité.
              </p>
            </div>
          )
        )}
      </div>

      {requestTarget && (
        <Modal title="Demander une mise en relation" onClose={() => setRequestTarget(null)}>
          <p style={{ fontSize: 14, color: G.ink, lineHeight: 1.5, marginTop: 0 }}>
            Avec <strong>{requestTarget.display_name}</strong>. Les numéros ne seront visibles qu’après acceptation mutuelle.
          </p>
          <div style={{ background: G.waterLight, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13, color: G.blueDeep, lineHeight: 1.5 }}>
            <strong>Sécurité :</strong> {BUDDY_SAFETY_WARNING}
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={safetyAck} onChange={(e) => setSafetyAck(e.target.checked)} style={checkboxStyle(safetyAck)} />
            <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.45 }}>J’ai lu et j’accepte l’avertissement de sécurité.</span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={sharePhoneAck} onChange={(e) => setSharePhoneAck(e.target.checked)} style={checkboxStyle(sharePhoneAck)} />
            <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.45 }}>
              J’autorise le partage de mon numéro avec cette personne uniquement si elle accepte aussi
              (consentement distinct, révocable à tout moment).
            </span>
          </label>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Message optionnel (max 280 car.)"
            maxLength={280}
            rows={3}
            style={{ ...inp, resize: "vertical", marginBottom: 14 }}
          />
          <button
            type="button"
            disabled={busyAction || !safetyAck || !sharePhoneAck}
            onClick={submitRequest}
            style={{
              width: "100%", padding: 14, borderRadius: 14, border: "none",
              background: (!safetyAck || !sharePhoneAck) ? G.greyMid : G.blue,
              color: G.white, fontWeight: 700, cursor: "pointer", opacity: busyAction ? 0.7 : 1,
            }}
          >
            Envoyer la demande
          </button>
        </Modal>
      )}

      {respondTarget && respondTarget.status === "pending" && (
        <Modal title="Accepter la mise en relation" onClose={() => setRespondTarget(null)}>
          <p style={{ fontSize: 14, color: G.ink, lineHeight: 1.5, marginTop: 0 }}>
            {respondTarget.peer_display_name} souhaite nager avec toi.
          </p>
          <div style={{ background: G.waterLight, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 13, color: G.blueDeep, lineHeight: 1.5 }}>
            <strong>Sécurité :</strong> {BUDDY_SAFETY_WARNING}
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={safetyAck} onChange={(e) => setSafetyAck(e.target.checked)} style={checkboxStyle(safetyAck)} />
            <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.45 }}>J’ai lu et j’accepte l’avertissement de sécurité.</span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={sharePhoneAck} onChange={(e) => setSharePhoneAck(e.target.checked)} style={checkboxStyle(sharePhoneAck)} />
            <span style={{ fontSize: 13, color: G.ink, lineHeight: 1.45 }}>
              J’autorise le partage de mon numéro avec cette personne (consentement distinct, révocable).
            </span>
          </label>
          <button
            type="button"
            disabled={busyAction || !safetyAck || !sharePhoneAck}
            onClick={() => submitRespond(true)}
            style={{
              width: "100%", padding: 14, borderRadius: 14, border: "none", marginBottom: 8,
              background: (!safetyAck || !sharePhoneAck) ? G.greyMid : G.mint,
              color: G.white, fontWeight: 700, cursor: "pointer",
            }}
          >
            Accepter et partager mon numéro
          </button>
          <button
            type="button"
            disabled={busyAction}
            onClick={() => submitRespond(false)}
            style={{
              width: "100%", padding: 13, borderRadius: 14,
              border: `1.5px solid ${G.greyLight}`, background: G.surface, color: G.ink, fontWeight: 700, cursor: "pointer",
            }}
          >
            Refuser
          </button>
        </Modal>
      )}

      {detailConn && (
        <Modal title={detailConn.peer_display_name || "Mise en relation"} onClose={() => setDetailConn(null)}>
          {!phonesReady(detailConn) ? (
            <p style={{ fontSize: 14, color: G.grey, lineHeight: 1.5 }}>
              Les numéros ne sont visibles que lorsque les deux personnes ont accepté le partage.
              Tu peux masquer ton numéro ou quitter la mise en relation à tout moment.
            </p>
          ) : phoneInfo?.error ? (
            <p style={{ color: G.coral, fontSize: 13 }}>{phoneInfo.error}</p>
          ) : phoneInfo?.their_phone ? (
            <div>
              <div style={{ fontSize: 13, color: G.grey, marginBottom: 6 }}>Numéro de {detailConn.peer_display_name}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: G.ink, marginBottom: 14 }}>
                {formatWhatsAppDisplay(phoneInfo.their_phone)}
              </div>
              {(() => {
                const wa = buildWhatsAppLink(phoneInfo.their_phone, {
                  senderName: form.display_name,
                  buddyName: detailConn.peer_display_name,
                  city: detailConn.peer_city,
                });
                if (!wa) return null;
                return (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("buddy_whatsapp_click", {}, { essential: true })}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", padding: "13px 16px", borderRadius: 14, border: "none",
                      background: "#25D366", color: G.white, fontWeight: 700, fontSize: 14,
                      textDecoration: "none", cursor: "pointer", minHeight: 48, marginBottom: 12,
                    }}
                  >
                    <MessageCircle size={18} />
                    Contacter sur WhatsApp
                  </a>
                );
              })()}
            </div>
          ) : phoneInfo && !phoneInfo.their_phone ? (
            <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.5 }}>
              {detailConn.peer_display_name || "Cette personne"} n’a pas encore enregistré de numéro.
              Tu peux attendre qu’elle mette à jour son profil, ou masquer ton numéro en attendant.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: G.grey }}>Chargement du numéro…</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {myPhoneShareFlag(detailConn, user.id) ? (
              <button type="button" onClick={() => handleRevokePhone(detailConn)} style={{ padding: 12, borderRadius: 12, border: "none", background: G.greyXLight, fontWeight: 700, cursor: "pointer" }}>
                Masquer mon numéro
              </button>
            ) : (
              <button type="button" onClick={() => handleGrantPhone(detailConn)} style={{ padding: 12, borderRadius: 12, border: "none", background: G.mintLight, color: "#00897B", fontWeight: 700, cursor: "pointer" }}>
                Repartager mon numéro
              </button>
            )}
            <button type="button" onClick={() => handleLeave(detailConn)} style={{ padding: 12, borderRadius: 12, border: "none", background: G.coralLight, color: G.coral, fontWeight: 700, cursor: "pointer" }}>
              Quitter la mise en relation
            </button>
            <button type="button" onClick={() => { setReportTarget(detailConn); setDetailConn(null); }} style={{ padding: 12, borderRadius: 12, border: "none", background: G.greyXLight, fontWeight: 700, cursor: "pointer" }}>
              Signaler
            </button>
            <button type="button" onClick={() => handleBlock(detailConn.peer_user_id)} style={{ padding: 12, borderRadius: 12, border: "none", background: G.greyXLight, fontWeight: 700, cursor: "pointer" }}>
              Bloquer
            </button>
          </div>
        </Modal>
      )}

      {reportTarget && (
        <Modal title="Signaler un utilisateur" onClose={() => setReportTarget(null)}>
          <p style={{ fontSize: 13, color: G.grey, lineHeight: 1.5 }}>
            Au-delà de {BUDDY_REPORT_THRESHOLD} signalements, l’accès Buddy du compte signalé peut être suspendu automatiquement.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {BUDDY_REPORT_REASONS.map((r) => (
              <label key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
                <input
                  type="radio"
                  name="report-reason"
                  checked={reportReason === r.id}
                  onChange={() => setReportReason(r.id)}
                />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Précisions (optionnel)"
            maxLength={500}
            rows={3}
            style={{ ...inp, resize: "vertical", marginBottom: 12 }}
          />
          <button
            type="button"
            disabled={busyAction}
            onClick={submitReport}
            style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: G.coral, color: G.white, fontWeight: 700, cursor: "pointer" }}
          >
            Envoyer le signalement
          </button>
        </Modal>
      )}

      {filtersOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtres binômes"
          onClick={() => setFiltersOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(15, 27, 45, 0.35)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
            boxSizing: "border-box",
          }}
        >
          <div
            className="ms-sheet-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, borderRadius: 24,
              padding: "18px 16px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: G.ink }}>Filtres</div>
              <button type="button" className="ms-glass-icon-btn" aria-label="Fermer" onClick={() => setFiltersOpen(false)}>
                <X size={18} color={G.ink} />
              </button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Objectif</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <FilterChip active={!goalFilter} label="Tous" onClick={() => setGoalFilter("")} />
              {BUDDY_GOAL_CATEGORIES.map((g) => (
                <FilterChip key={g.id} active={goalFilter === g.id} label={g.label} onClick={() => setGoalFilter(goalFilter === g.id ? "" : g.id)} />
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.grey, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Niveau</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <FilterChip active={!levelFilter} label="Tous" onClick={() => setLevelFilter("")} />
              {BUDDY_LEVELS.map((l) => (
                <FilterChip key={l.id} active={levelFilter === l.id} label={l.label} onClick={() => setLevelFilter(levelFilter === l.id ? "" : l.id)} />
              ))}
            </div>
            <button
              type="button"
              className="ms-pill-cta"
              onClick={() => {
                playUiSound("tap");
                setFiltersOpen(false);
              }}
            >
              Voir les profils
            </button>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => { setCityFilter(""); setLevelFilter(""); setGoalFilter(""); }}
                style={{
                  width: "100%", marginTop: 8, minHeight: 44, border: "none", background: "none",
                  color: G.grey, fontWeight: 600, cursor: "pointer",
                }}
              >
                Tout effacer
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </AppTabShell>
  );
}

function BuddyCrashFallback({ onOpenMenu, onTabChange }) {
  return (
    <AppStatusScreen
      title="Binômes indisponible"
      body="Impossible d’ouvrir cet écran. Reviens à l’accueil et réessaie."
      primaryLabel="Retour à l’accueil"
      onPrimary={() => {
        playUiSound("tap");
        onTabChange?.("home");
      }}
      secondaryLabel={onOpenMenu ? "Ouvrir le menu" : null}
      onSecondary={onOpenMenu ? () => {
        playUiSound("soft");
        onOpenMenu();
      } : undefined}
    />
  );
}

class BuddyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <BuddyCrashFallback
          onOpenMenu={this.props.onOpenMenu}
          onTabChange={this.props.onTabChange}
        />
      );
    }
    return this.props.children;
  }
}

export default function BuddyMatching({ user, profile, onOpenMenu, onTabChange, canUseBuddies = false, onUpgrade }) {
  return (
    <BuddyErrorBoundary onOpenMenu={onOpenMenu} onTabChange={onTabChange}>
      {!canUseBuddies ? (
        <BuddyLockedScreen
          user={user}
          onOpenMenu={onOpenMenu}
          onTabChange={onTabChange}
          onUpgrade={onUpgrade}
        />
      ) : (
        <BuddyMatchingPaid
          user={user}
          profile={profile}
          onOpenMenu={onOpenMenu}
          onTabChange={onTabChange}
          onUpgrade={onUpgrade}
        />
      )}
    </BuddyErrorBoundary>
  );
}
