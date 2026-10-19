// The tenant's photo, with a highlighter stroke over every fact the AI found.
//
// Boxes come from the AI as [ymin, xmin, ymax, xmax] on a 0-1000 scale, so
// dividing by 10 turns them straight into CSS percentages of the photo.
//
//  scanning=true  -> a scanner line sweeps the photo while the AI reads it
//  locations      -> { field: [ymin, xmin, ymax, xmax] }
//  active         -> the field currently being edited (its stroke stays bright)
//  onPick(field)  -> tapping a stroke jumps to that field in the form

// Court and deadline language gets a warning-pink stroke; everything else is yellow.
const URGENT = new Set(['court_mention', 'deadline_to_respond']);

export default function NoticePhoto({ src, t, locations = {}, active = null, onPick, scanning = false }) {
  // Top to bottom, so the highlighter moves down the page like a person reading.
  const entries = Object.entries(locations).sort((a, b) => a[1][0] - b[1][0]);

  return (
    // viewTransitionName "notice": the same name on the result screen's thumbnail,
    // so the browser morphs the photo from one screen into the other.
    <figure
      className={`notice-photo ${scanning ? 'is-scanning' : ''} ${active ? 'has-active' : ''}`}
      style={{ viewTransitionName: 'notice' }}
    >
      {/* Highlights are positioned in % of THIS frame, which is exactly the image (not the caption). */}
      <div className="photo-frame">
      <img src={src} alt={t.photoAlt} />

      {scanning && <div className="scanline" aria-hidden="true" />}

      {!scanning &&
        entries.map(([field, [ymin, xmin, ymax, xmax]], i) => (
          <button
            key={field}
            type="button"
            className={`hl ${URGENT.has(field) ? 'urgent' : ''} ${active === field ? 'on' : ''}`}
            style={{
              top: `${ymin / 10}%`,
              left: `${xmin / 10}%`,
              width: `${(xmax - xmin) / 10}%`,
              height: `${(ymax - ymin) / 10}%`,
              animationDelay: `${250 + i * 140}ms`, // strokes go down one after another (::before inherits it)
            }}
            aria-label={t.hl[field]}
            onClick={() => onPick?.(field)}
          >
            {active === field && <span className="hl-tag">{t.hl[field]}</span>}
          </button>
        ))}
      </div>

      {!scanning && entries.length > 0 && <figcaption>{t.photoHint}</figcaption>}
    </figure>
  );
}
