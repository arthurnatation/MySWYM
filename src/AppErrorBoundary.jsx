import { Component } from "react";
import { trackUiError } from "./lib/analytics.js";
import AppStatusScreen from "./app-shell/AppStatusScreen.jsx";

/**
 * Filet React : recharge l’URL courante, ne redirige jamais vers /app.
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

  componentDidUpdate(prevProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <AppStatusScreen
        title="Un souci est survenu"
        body="Recharge la page. Si ça continue, écris à support@myswym.app."
        primaryLabel="Relancer"
        onPrimary={this.handleReload}
      />
    );
  }
}
