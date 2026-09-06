/**
 * Écran bloquant Version Gate, force update.
 */
import { useCallback, useEffect, useState } from "react";
import { CURRENT_APP_VERSION } from "./lib/app-version.js";
import {
  checkVersionGate,
  cleanupUpdateQueryParam,
  forceAppUpdateReload,
} from "./lib/version-gate.js";
import Loading from "./app-shell/Loading.jsx";
import PublicLoading from "./app-shell/PublicLoading.jsx";
import { isAppGifPath } from "./lib/boot-warm.js";
import AppStatusScreen from "./app-shell/AppStatusScreen.jsx";

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export default function VersionGate({ children }) {
  const [state, setState] = useState({
    ready: false,
    mustUpdate: false,
    message: null,
    minSupportedAppVersion: null,
    checking: false,
  });
  const [reloading, setReloading] = useState(false);

  const runCheck = useCallback(async () => {
    setState((s) => ({ ...s, checking: true }));
    const result = await checkVersionGate();
    if (result.status === "ok") {
      cleanupUpdateQueryParam();
    }
    setState({
      ready: true,
      mustUpdate: !!result.mustUpdate,
      message: result.message,
      minSupportedAppVersion: result.minSupportedAppVersion,
      checking: false,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failOpen = setTimeout(() => {
      if (cancelled) return;
      setState((s) => (s.ready ? s : { ...s, ready: true, checking: false }));
    }, 1500);
    (async () => {
      const result = await checkVersionGate();
      if (cancelled) return;
      if (result.status === "ok") cleanupUpdateQueryParam();
      setState({
        ready: true,
        mustUpdate: !!result.mustUpdate,
        message: result.message,
        minSupportedAppVersion: result.minSupportedAppVersion,
        checking: false,
      });
    })();
    return () => {
      cancelled = true;
      clearTimeout(failOpen);
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      runCheck();
    };
    const onFocus = () => runCheck();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [runCheck]);

  const onUpdate = async () => {
    setReloading(true);
    await forceAppUpdateReload();
  };

  if (!state.ready) {
    return isAppGifPath(window.location.pathname) ? <Loading /> : <PublicLoading />;
  }

  if (state.mustUpdate) {
    const meta = [
      `Version actuelle ${CURRENT_APP_VERSION}`,
      state.minSupportedAppVersion ? `requise ${state.minSupportedAppVersion}` : null,
    ].filter(Boolean).join(" · ");

    return (
      <AppStatusScreen
        title={state.message || "Une nouvelle version de MySWYM est disponible."}
        body="Une mise à jour est nécessaire pour continuer à utiliser l’application."
        primaryLabel="Mettre à jour"
        primaryBusyLabel="Mise à jour…"
        onPrimary={onUpdate}
        primaryDisabled={reloading}
        meta={meta}
      />
    );
  }

  return children;
}
