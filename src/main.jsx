import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n/index.js";
import "./theme/fonts.css";
import "./index.css";
import AppTree from "./app-shell/AppTree.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppTree />
  </StrictMode>,
);
