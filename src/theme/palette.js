const THEME_LAST_KEY = "myswym_theme_last";
const THEME_LEGACY_KEY = "myswym_theme";

/** Soft mist clair (DA app). */
export const G_SOFT = {
  bg: "#F4F8FC",
  surface: "#FFFFFF",
  ink: "#0F1B2D",
  inkLight: "#6B7C8F",
  inverse: "#FFFFFF",
  blue: "#006bfd",
  blueLight: "#E8F2FF",
  blueMid: "#3d8fff",
  blueDeep: "#0052cc",
  water: "#1AA8C2",
  waterLight: "#D8F4F8",
  coral: "#E85A68",
  coralLight: "#FDE8EA",
  mint: "#1FAE86",
  mintLight: "#D8F5EC",
  gold: "#D4A017",
  goldLight: "#FBF0D2",
  purple: "#7C6BCF",
  purpleLight: "#EEEAFB",
  grey: "#6B7C8F",
  greyMid: "#8A9AAB",
  greyLight: "rgba(15, 27, 45, 0.06)",
  greyXLight: "#F0F5FA",
  white: "#FFFFFF",
  glass: "rgba(255, 255, 255, 0.88)",
  navGlass: "rgba(255, 255, 255, 0.78)",
};

/** Legacy dark (admin / fallback). */
export const G_DARK = {
  bg: "#000514",
  surface: "#06101f",
  ink: "#f4f8fa",
  inkLight: "#b4c6db",
  inverse: "#000514",
  blue: "#006bfd",
  blueLight: "#0a162c",
  blueMid: "#3d8fff",
  blueDeep: "#3d8fff",
  water: "#22c3e0",
  waterLight: "#0c2a32",
  coral: "#FF6B78",
  coralLight: "#3a151a",
  mint: "#2dd4a0",
  mintLight: "#0c2a20",
  gold: "#FBBF24",
  goldLight: "#3a2a0a",
  purple: "#a78bfa",
  purpleLight: "#241a3d",
  grey: "#b4c6db",
  greyMid: "#8a9bb0",
  greyLight: "rgba(0, 107, 253, 0.22)",
  greyXLight: "#0a162c",
  white: "#FFFFFF",
  glass: "rgba(0, 5, 20, 0.92)",
  navGlass: "rgba(6, 16, 31, 0.94)",
};

/** Palette active. Mutée par applyTheme. */
export const G = { ...G_SOFT };

/** Applique le thème soft mist clair (app loguée). */
export const applyTheme = () => {
  Object.assign(G, G_SOFT);
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", "light");
  root.style.colorScheme = "light";
  root.style.setProperty("--myswym-bg", G_SOFT.bg);
  root.style.setProperty("--myswym-surface", G_SOFT.surface);
  root.style.setProperty("--myswym-ink", G_SOFT.ink);
  root.style.setProperty("--myswym-ink-light", G_SOFT.inkLight);
  root.style.setProperty("--myswym-blue", G_SOFT.blue);
  root.style.setProperty("--myswym-blue-light", G_SOFT.blueLight);
  root.style.setProperty("--myswym-blue-mid", G_SOFT.blueMid);
  root.style.setProperty("--myswym-blue-deep", G_SOFT.blueDeep);
  root.style.setProperty("--myswym-grey", G_SOFT.grey);
  root.style.setProperty("--myswym-grey-mid", G_SOFT.greyMid);
  root.style.setProperty("--myswym-grey-light", G_SOFT.greyLight);
  root.style.setProperty("--myswym-grey-xlight", G_SOFT.greyXLight);
  root.style.setProperty("--myswym-nav-bg", G_SOFT.navGlass);
  root.style.setProperty("--myswym-nav-border", G_SOFT.greyLight);
  root.style.setProperty("--myswym-glass", G_SOFT.glass);
  try {
    localStorage.setItem(THEME_LAST_KEY, "light");
    localStorage.removeItem(THEME_LEGACY_KEY);
  } catch { /* ignore */ }
};
