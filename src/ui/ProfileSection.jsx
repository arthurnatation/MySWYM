import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Section collapsible Profil soft mist.
 * Une intention, un titre, résumé fermé, touch ≥ 44px.
 */
export default function ProfileSection({
  id,
  title,
  summary,
  icon: Icon = null,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ms-profile-section${open ? " is-open" : ""}`}>
      <button
        type="button"
        id={id ? `${id}-trigger` : undefined}
        aria-expanded={open}
        aria-controls={id ? `${id}-panel` : undefined}
        onClick={() => setOpen((v) => !v)}
        className="ms-profile-section-trigger"
      >
        {Icon ? (
          <span className="ms-profile-section-icon" aria-hidden>
            <Icon size={18} strokeWidth={2.25} />
          </span>
        ) : null}
        <div className="ms-profile-section-copy">
          <div className="ms-profile-section-title">{title}</div>
          {!open && summary ? (
            <div className="ms-profile-section-summary">{summary}</div>
          ) : null}
        </div>
        <span className={`ms-profile-section-chevron${open ? " is-open" : ""}`} aria-hidden>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>
      {open ? (
        <div
          id={id ? `${id}-panel` : undefined}
          role="region"
          aria-labelledby={id ? `${id}-trigger` : undefined}
          className="ms-profile-section-body"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
