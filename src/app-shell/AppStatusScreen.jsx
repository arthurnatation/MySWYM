/**
 * Écrans système soft mist : erreur, mise à jour, crash module.
 */
export default function AppStatusScreen({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel = null,
  onSecondary = null,
  primaryDisabled = false,
  primaryBusyLabel = null,
  meta = null,
  brand = true,
  role = "alertdialog",
  titleId = "ms-status-title",
}) {
  const busy = primaryDisabled && primaryBusyLabel;

  return (
    <div
      className="ms-status-screen"
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="ms-status-card">
        {brand ? (
          <img
            className="ms-status-wordmark"
            src="/logo-myswym-on-light.png"
            alt="mySWYM"
            height={20}
            width={138}
          />
        ) : null}
        <h1 id={titleId} className="ms-status-title">
          {title}
        </h1>
        {body ? <p className="ms-status-body">{body}</p> : null}
        {primaryLabel && onPrimary ? (
          <button
            type="button"
            className="ms-status-cta"
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            {busy ? primaryBusyLabel : primaryLabel}
          </button>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            className="ms-status-secondary"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        ) : null}
        {meta ? <p className="ms-status-meta">{meta}</p> : null}
      </div>
    </div>
  );
}
