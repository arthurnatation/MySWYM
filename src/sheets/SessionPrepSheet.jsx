import SoftMistSheet from "./SoftMistSheet.jsx";
import { G } from "../theme/palette.js";
import WorkoutPrepView from "../workout/WorkoutPrepView.jsx";

/**
 * Préparation / détail séance en sheet soft mist (pas de déplié inline).
 */
export default function SessionPrepSheet({
  open,
  session,
  colors = G,
  accent,
  isPremium = true,
  profile = null,
  planId = null,
  whyLine = null,
  showStart = true,
  startLabel = null,
  onClose,
  onUpgrade,
  onStart,
  exportBar = null,
}) {
  if (!open || !session) return null;

  return (
    <SoftMistSheet
      open={open}
      eyebrow={showStart ? "Préparation" : "Séance"}
      title={showStart ? "Vérifie ta séance avant d’aller nager" : "Détail de la séance"}
      onClose={onClose}
      ariaLabel={showStart ? "Préparation de la séance" : "Détail de la séance"}
      fullscreenMobile
      bodyClassName="ms-soft-sheet-body--tall"
      zIndex={400}
    >
      <WorkoutPrepView
        session={session}
        colors={colors}
        accent={accent}
        isPremium={isPremium}
        showStart={showStart}
        startLabel={startLabel}
        profile={profile}
        planId={planId}
        whyLine={whyLine}
        onUpgrade={onUpgrade}
        onStart={onStart}
      />
      {exportBar}
    </SoftMistSheet>
  );
}
