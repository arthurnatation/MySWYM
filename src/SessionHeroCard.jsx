export default function SessionHeroCard({ preview, kicker, children, className = "", tip = null, wrapCta = true, hideKicker = false, titleAs: TitleTag = "h2" }) {
  if (!preview) return null;

  const distance = preview.distanceLabel || null;
  const duration = preview.durationLabel || null;
  const hasSplitMeta = !!(distance || duration);
  const fallbackMeta = !hasSplitMeta ? (preview.meta || null) : null;

  return (
    <article className={["ms-session-card", className].filter(Boolean).join(" ")}>
      <div className="ms-session-card-head">
        {!hideKicker && (
          <span className="ms-session-card-kicker">{kicker || preview.type}</span>
        )}
        <TitleTag>{preview.title}</TitleTag>
        {hasSplitMeta ? (
          <div className="ms-session-card-meta" role="group" aria-label="Distance et durée">
            {distance ? (
              <div className="ms-session-card-meta-item">
                <span className="ms-session-card-meta-kicker">Distance</span>
                <span className="ms-session-card-meta-value">{distance}</span>
              </div>
            ) : null}
            {duration ? (
              <div className="ms-session-card-meta-item">
                <span className="ms-session-card-meta-kicker">Tps estimé</span>
                <span className="ms-session-card-meta-value">{duration}</span>
              </div>
            ) : null}
          </div>
        ) : fallbackMeta ? (
          <p className="ms-session-card-meta-fallback">{fallbackMeta}</p>
        ) : null}
      </div>
      {(preview.blocks || []).map((b) => (
        <div key={b.label} className="ms-session-card-block">
          <strong>{b.label}</strong>
          <p>{b.detail || b.content}</p>
        </div>
      ))}
      {tip ? <p className="ms-session-card-tip">{tip}</p> : null}
      {children ? (wrapCta ? <div className="ms-session-card-cta">{children}</div> : children) : null}
    </article>
  );
}
