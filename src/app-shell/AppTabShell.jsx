/**
 * Shell onglets : mist photo bassin soft-blur (réf. OPEN tennis).
 */
export default function AppTabShell({
  children,
  className = "",
  style = {},
  photo: _photo = false,
}) {
  return (
    <div
      className={["ms-app-immersive", className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="ms-app-immersive-bg ms-app-immersive-bg--mist" aria-hidden>
        <img src="/hero-pool.webp" alt="" width={1024} height={1024} decoding="async" />
        <div className="ms-app-immersive-scrim" />
      </div>
      {children}
    </div>
  );
}
