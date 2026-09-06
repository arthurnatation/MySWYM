import { useEffect } from "react";
import BootMark from "./BootMark.jsx";
import { bootStatusLabel, markBootWarm } from "../lib/boot-warm.js";

/** Chargement app : GIF nageur. Styles dans index.html. */
export default function Loading() {
  useEffect(() => () => { markBootWarm(); }, []);

  return (
    <div
      className="myswym-boot myswym-boot--app"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={bootStatusLabel()}
    >
      <div className="myswym-boot-inner">
        <BootMark />
        <img
          className="myswym-boot-wordmark myswym-boot-wordmark--app"
          src="/logo-myswym-banner-blanc.png"
          alt=""
          height={22}
          width={95}
        />
      </div>
    </div>
  );
}
