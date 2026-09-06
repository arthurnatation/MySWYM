import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, X } from "lucide-react";
import { setAppLanguage } from "./index.js";
import { isAppPath, stripLocalePrefix, withLocalePrefix } from "./locale-path.js";
import { playUiSound } from "../lib/ui-sounds.js";

const OPTIONS = [
  { id: "fr", code: "FR", name: "Français" },
  { id: "en", code: "EN", name: "English" },
];

function FlagCircle({ locale, size = 22 }) {
  if (locale === "en") {
    return (
      <span className="ms-lang-flag" style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="2.5" />
          <path d="M30 0 V30 M0 15 H60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      </span>
    );
  }
  return (
    <span className="ms-lang-flag" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice">
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    </span>
  );
}

/**
 * Sélecteur de langue.
 * `nav` : drapeau + code (FR/EN) + menu (header marketing).
 * `settings` : ligne Profil + sheet Miracle (drapeaux, Confirm).
 */
export default function LanguageSwitcher({ variant = "nav" }) {
  const { t, i18n } = useTranslation("common");
  const { t: ts } = useTranslation("settings");
  const location = useLocation();
  const lng = i18n.language?.startsWith("en") ? "en" : "fr";
  const current = OPTIONS.find((o) => o.id === lng) || OPTIONS[0];
  const marketing = !isAppPath(location.pathname);
  const bare = stripLocalePrefix(location.pathname);
  const menuId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(lng);

  const target = (next) => ({
    pathname: withLocalePrefix(bare, next),
    search: location.search,
    hash: location.hash,
  });

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(lng);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, lng]);

  useEffect(() => {
    if (!open || variant === "settings") return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, variant]);

  if (variant === "settings") {
    const close = () => {
      playUiSound("soft");
      setOpen(false);
    };
    const confirm = () => {
      playUiSound("tap");
      if (draft !== lng) setAppLanguage(draft);
      setOpen(false);
    };

    return (
      <>
        <button
          type="button"
          className="ms-profile-settings-row"
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
            boxSizing: "border-box",
          }}
          onClick={() => {
            playUiSound("soft");
            setOpen(true);
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="ms-profile-settings-icon" style={{ background: "rgba(0,107,253,0.1)" }}>
            <FlagCircle locale={current.id} size={22} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ms-profile-settings-label">{ts("language.title")}</div>
            <div className="ms-profile-settings-hint">{current.name}</div>
          </div>
          <ChevronRight size={18} color="#9aa8b8" strokeWidth={2} />
        </button>

        {open
          ? createPortal(
              <div
                className="sheet-overlay"
                role="presentation"
                onClick={(e) => {
                  if (e.target === e.currentTarget) close();
                }}
                style={{ zIndex: 520 }}
              >
                <div
                  className="sheet-panel ms-sheet-card scale-in ms-lang-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${menuId}-title`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ms-lang-sheet-head">
                    <h2 id={`${menuId}-title`} className="ms-lang-sheet-title">
                      {ts("language.selectTitle")}
                    </h2>
                    <button
                      type="button"
                      className="ms-glass-icon-btn"
                      aria-label={t("nav.closeMenu")}
                      onClick={close}
                      style={{ width: 36, height: 36 }}
                    >
                      <X size={16} strokeWidth={2.25} />
                    </button>
                  </div>

                  <div className="ms-lang-sheet-list" role="listbox" aria-label={ts("language.selectTitle")}>
                    {OPTIONS.map((opt) => {
                      const selected = draft === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`ms-lang-sheet-option${selected ? " is-active" : ""}`}
                          onClick={() => {
                            playUiSound("soft");
                            setDraft(opt.id);
                          }}
                        >
                          <FlagCircle locale={opt.id} size={28} />
                          <span className="ms-lang-sheet-option-label">{opt.name}</span>
                          {selected ? (
                            <Check size={18} color="#006bfd" strokeWidth={2.5} aria-hidden />
                          ) : (
                            <span style={{ width: 18 }} aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button type="button" className="ms-pill-cta ms-lang-sheet-confirm" onClick={confirm}>
                    {ts("language.confirm")}
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  const pick = (next) => {
    setAppLanguage(next);
    setOpen(false);
  };

  return (
    <div className="ms-lang" ref={rootRef}>
      <button
        type="button"
        className="ms-lang-btn"
        aria-label={t("lang.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <FlagCircle locale={current.id} />
        <span>{current.code}</span>
      </button>
      {open && (
        <div className="ms-lang-menu" id={menuId} role="listbox" aria-label={t("lang.label")}>
          {OPTIONS.map((opt) => {
            const selected = lng === opt.id;
            const className = `ms-lang-option${selected ? " is-active" : ""}`;
            const inner = (
              <>
                <FlagCircle locale={opt.id} />
                <span>{opt.name}</span>
              </>
            );
            if (marketing) {
              return (
                <Link
                  key={opt.id}
                  role="option"
                  aria-selected={selected}
                  to={target(opt.id)}
                  className={className}
                  onClick={() => pick(opt.id)}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={className}
                onClick={() => pick(opt.id)}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
