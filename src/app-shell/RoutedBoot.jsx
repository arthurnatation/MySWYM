import { useLocation } from "react-router-dom";
import AppErrorBoundary from "../AppErrorBoundary.jsx";
import { isAppGifPath } from "../lib/boot-warm.js";
import Loading from "./Loading.jsx";
import PublicLoading from "./PublicLoading.jsx";

export function RoutedErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <AppErrorBoundary resetKey={pathname}>{children}</AppErrorBoundary>;
}

export function RouteFallback() {
  return isAppGifPath(window.location.pathname) ? <Loading /> : <PublicLoading />;
}
