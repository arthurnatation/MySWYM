/** Boot : rituel GIF sur l’app. Marketing : barre sobre, sans le picto animé. */

export const BOOT_WARM_KEY = "myswym-boot-warm";
export const LANDING_BOOT_KEY = "myswym-landing-boot-seen";
export const BOOT_POSE_MS = 1600;
export const LANDING_BOOT_MS = 800;

export function remainingColdBootMs({ reduceMotion = false, warm = false, elapsed = 0 } = {}) {
  if (reduceMotion || warm) return 0;
  return Math.max(0, BOOT_POSE_MS - Math.max(0, elapsed));
}

export function isAppShellPath(pathname = "/") {
  const p = String(pathname || "/").replace(/\/+$/, "") || "/";
  return (
    p === "/app" || p.startsWith("/app/")
    || p === "/connexion" || p === "/inscription"
    || p === "/login" || p === "/register"
    || p === "/admin" || p.startsWith("/admin/")
    || p.startsWith("/prototype/")
  );
}

export function remainingLandingBootMs({ reduceMotion = false, seen = false, elapsed = 0 } = {}) {
  if (reduceMotion || seen) return 0;
  return Math.max(0, LANDING_BOOT_MS - Math.max(0, elapsed));
}

export function isLandingBootSeen(sessionStore = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  try {
    return sessionStore?.getItem(LANDING_BOOT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLandingBootSeen(sessionStore = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  try {
    sessionStore?.setItem(LANDING_BOOT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasPersistedAuth(storage) {
  if (!storage) return false;
  try {
    const n = storage.length;
    for (let i = 0; i < n; i += 1) {
      const key = storage.key(i);
      if (key && key.includes("auth-token")) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function isBootWarm({
  sessionStore = typeof sessionStorage !== "undefined" ? sessionStorage : null,
  localStore = typeof localStorage !== "undefined" ? localStorage : null,
  rootWarm = typeof document !== "undefined"
    && document.documentElement.classList.contains("myswym-boot-warm"),
} = {}) {
  if (rootWarm) return true;
  try {
    if (sessionStore?.getItem(BOOT_WARM_KEY) === "1") return true;
  } catch {
    /* Safari privé */
  }
  return hasPersistedAuth(localStore);
}

export function markBootWarm(sessionStore = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  try {
    sessionStore?.setItem(BOOT_WARM_KEY, "1");
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("myswym-boot-warm");
  }
}

export function bootElapsedMs(now = Date.now()) {
  if (typeof window === "undefined") return 0;
  const started = Number(window.__MYSWYM_BOOT_AT) || now;
  return Math.max(0, now - started);
}
