/**
 * Logos MySWYM (kit A–F).
 * A icon-app · B picto bleu · C picto blanc · D wordmark bleu ·
 * E horizontal noir · F stack blanc.
 */
const ASSETS = {
  /** E horizontal noir (clair) / F stack blanc (sombre). */
  full: {
    dark: "/logo-full.png",
    light: "/logo-full-on-light.png",
    ratioDark: 1200 / 1012,
    ratioLight: 1400 / 327,
  },
  /** D wordmark bleu (clair) / wordmark blanc (sombre). */
  wordmark: {
    dark: "/logo-myswym-banner-blanc.png",
    light: "/logo-myswym-on-light.png",
    ratio: 1200 / 279,
  },
  /** B picto bleu (clair) / C picto blanc (sombre). */
  mark: {
    dark: "/logo-mark-on-dark.png",
    light: "/logo-mark.png",
    ratio: 512 / 487,
  },
  /** A icône app bleue (profil / raccourci). */
  icon: {
    dark: "/logo-icon-app.png",
    light: "/logo-icon-app.png",
    ratio: 1,
  },
};

export default function BrandLogo({
  height = 36,
  onDark = false,
  variant = "full",
  style,
  alt = "MySWYM",
}) {
  const asset = ASSETS[variant] || ASSETS.full;
  const src = onDark ? asset.dark : asset.light;
  const ratio =
    asset.ratio ??
    (onDark ? asset.ratioDark : asset.ratioLight) ??
    asset.ratioLight ??
    1;
  return (
    <img
      src={src}
      alt={alt}
      height={height}
      width={Math.round(height * ratio)}
      style={{
        display: "block",
        height,
        width: "auto",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
