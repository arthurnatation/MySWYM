/**
 * Usage : node src/lib/boot-warm.test.js
 */
import assert from "node:assert/strict";
import { hasPersistedAuth, isBootWarm, markBootWarm, remainingColdBootMs, remainingLandingBootMs, isAppShellPath, isAppGifPath, BOOT_WARM_KEY, BOOT_POSE_MS, LANDING_BOOT_MS } from "./boot-warm.js";

function memoryStore(init = {}) {
  const data = { ...init };
  return {
    get length() { return Object.keys(data).length; },
    key(i) { return Object.keys(data)[i] ?? null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
  };
}

assert.equal(hasPersistedAuth(null), false, "no storage");
assert.equal(hasPersistedAuth(memoryStore({ theme: "light" })), false, "unrelated keys");
assert.equal(
  hasPersistedAuth(memoryStore({ "sb-xxxx-auth-token": "{}" })),
  true,
  "supabase auth token",
);

assert.equal(isBootWarm({ sessionStore: memoryStore(), localStore: memoryStore(), rootWarm: false }), false, "cold");
assert.equal(isBootWarm({ sessionStore: memoryStore(), localStore: memoryStore(), rootWarm: true }), true, "html class");
assert.equal(
  isBootWarm({ sessionStore: memoryStore({ [BOOT_WARM_KEY]: "1" }), localStore: memoryStore(), rootWarm: false }),
  true,
  "same-tab flag",
);
assert.equal(
  isBootWarm({
    sessionStore: memoryStore(),
    localStore: memoryStore({ "sb-proj-auth-token": "{}" }),
    rootWarm: false,
  }),
  true,
  "logged-in reopen",
);

const sess = memoryStore();
markBootWarm(sess);
assert.equal(sess.getItem(BOOT_WARM_KEY), "1", "mark writes session");

assert.equal(remainingColdBootMs({ elapsed: 0 }), BOOT_POSE_MS, "full pose if instant");
assert.equal(remainingColdBootMs({ elapsed: BOOT_POSE_MS + 100 }), 0, "no hold if pose already played");
assert.equal(remainingColdBootMs({ elapsed: 0, warm: true }), 0, "warm skips pose hold");
assert.equal(remainingColdBootMs({ elapsed: 0, reduceMotion: true }), 0, "reduced motion skips pose hold");

assert.equal(remainingLandingBootMs({ elapsed: 0 }), LANDING_BOOT_MS, "landing full wait");
assert.equal(remainingLandingBootMs({ elapsed: 0, seen: true }), 0, "landing skip if already seen");
assert.equal(isAppShellPath("/app"), true, "app shell");
assert.equal(isAppShellPath("/fr"), false, "landing is public");
assert.equal(isAppShellPath("/connexion"), true, "auth is app");
assert.equal(isAppGifPath("/app"), true, "gif on app");
assert.equal(isAppGifPath("/app/foo"), true, "gif on app nested");
assert.equal(isAppGifPath("/connexion"), false, "no gif on auth");
assert.equal(isAppGifPath("/admin"), false, "no gif on admin");
assert.equal(isAppGifPath("/fr"), false, "no gif on landing");

console.log("boot-warm.test.js ok");
