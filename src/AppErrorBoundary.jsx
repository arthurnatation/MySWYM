import { Component } from "react";
import { trackUiError } from "./lib/analytics.js";
import AppStatusScreen from "./app-shell/AppStatusScreen.jsx";

/**
 * Filet global, évite l’écran blanc / « Chargement » mort après un crash React.
 * Télémétrie : PostHog `ui_error` uniquement (pas de Sentry).
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    try {
      trackUiError({
        reason: String(error?.message || error || "unknown").slice(0, 160),
        context: "error_boundary",
        source: String(info?.componentStack || "").slice(0, 120),
        error_kind: "react",
      });
    } catch {
      /* ignore */
    }
    if (import.meta.env.DEV) {
      console.error("[AppErrorBoundary]", error, info);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    try {
      window.location.assign("/app");
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <AppStatusScreen
        title="Un souci est survenu"
        body="Recharge l’app, ton plan reste enregistré. Si ça continue, écris à support@myswym.app."
        primaryLabel="Relancer"
        onPrimary={this.handleReload}
      />
    );
  }
}
