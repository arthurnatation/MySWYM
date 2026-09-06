/**
 * Bottom sheet éducatif, contenu MySWYM uniquement.
 * 1 fiche, ou liste (4 nages = 1 / nage) sans encombrer la carte.
 */
import { Play } from "lucide-react";
import SoftMistSheet from "../sheets/SoftMistSheet.jsx";

const STROKE_LABELS = ["Papillon", "Dos", "Brasse", "Crawl"];

function SingleDrillBody({ educatif }) {
  const hasVideo = !!(educatif.videoUrl && String(educatif.videoUrl).trim());
  const hasThumb = !!(educatif.thumbUrl && String(educatif.thumbUrl).trim());

  return (
    <>
      {hasVideo && (
        <a
          href={educatif.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ms-tip-video"
        >
          {hasThumb ? (
            <img src={educatif.thumbUrl} alt="" style={{ width: 64, height: 44, borderRadius: 10, objectFit: "cover" }} />
          ) : (
            <div className="ms-tip-video-play">
              <Play size={18} color="#fff" fill="#fff" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ms-blue)" }}>Voir la vidéo</div>
            <div style={{ fontSize: 12, color: "var(--ms-ink-soft)", marginTop: 2 }}>Arthur Natation · MySWYM</div>
          </div>
        </a>
      )}

      {educatif.equipment ? (
        <div className="ms-tip-block">
          <div className="ms-tip-block-label">Matériel optionnel</div>
          <div className="ms-tip-block-text" style={{ fontSize: 14, fontWeight: 600, color: "var(--ms-ink-soft)" }}>
            {educatif.equipment}
          </div>
        </div>
      ) : null}

      {educatif.objective ? (
        <div className="ms-tip-block">
          <div className="ms-tip-block-label">Objectif</div>
          <div className="ms-tip-block-text">{educatif.objective}</div>
        </div>
      ) : null}

      <div className="ms-tip-block">
        <div className="ms-tip-block-label">Consigne</div>
        <div className="ms-tip-block-text">{educatif.cue}</div>
      </div>

      {Array.isArray(educatif.mistakes) && educatif.mistakes.length > 0 && (
        <div>
          <div className="ms-tip-block-label" style={{ marginBottom: 8 }}>À éviter</div>
          <ul className="ms-tip-list">
            {educatif.mistakes.map((m) => (
              <li key={m} className="ms-tip-list-item">{m}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function MultiDrillBody({ educatifs }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {educatifs.map((edu, i) => {
        const stroke = STROKE_LABELS[i] || null;
        return (
          <div key={edu.id || edu.name || i} className="ms-drill-card">
            {stroke ? <div className="ms-drill-stroke">{stroke}</div> : null}
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ms-ink)", lineHeight: 1.2, marginBottom: 8 }}>
              {edu.name}
            </div>
            {edu.cue ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ms-ink-soft)", lineHeight: 1.4 }}>
                {edu.cue}
              </div>
            ) : edu.objective ? (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ms-ink-soft)", lineHeight: 1.4 }}>
                {edu.objective}
              </div>
            ) : null}
            {edu.equipment ? (
              <div style={{ fontSize: 12, color: "var(--ms-ink-soft)", marginTop: 8, lineHeight: 1.35 }}>
                Matériel optionnel · {edu.equipment}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function DrillInfoSheet({ educatif, educatifs, onClose }) {
  const list =
    Array.isArray(educatifs) && educatifs.length
      ? educatifs
      : Array.isArray(educatif)
        ? educatif
        : educatif
          ? [educatif]
          : [];
  if (!list.length) return null;

  const multi = list.length > 1;
  const title = multi ? "4 éducatifs" : list[0].name;
  const eyebrow = multi ? "1 par nage · pap → crawl" : "Éducatif";

  return (
    <SoftMistSheet
      eyebrow={eyebrow}
      title={title}
      onClose={onClose}
      lockScroll={false}
    >
      {multi ? <MultiDrillBody educatifs={list} /> : <SingleDrillBody educatif={list[0]} />}
    </SoftMistSheet>
  );
}
