import { useRef } from 'react';

// The three sample notices, shown as real paper taped to the wall.
// The photos are the same fictional notices the samples load (client/public/samples).
const SAMPLES = [
  { id: 'legal', key: 'sampleLegal', tilt: -4 },
  { id: 'illegal', key: 'sampleIllegal', tilt: 2.5 },
  { id: 'court', key: 'sampleCourt', tilt: -1.5 },
];

export default function Upload({ t, onPhoto, onSample }) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);

  function picked(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same photo twice still fires
    if (file) onPhoto(file);
  }

  return (
    <section className="upload">
      <h1 className="headline">{t.headline}</h1>
      <p className="sub">{t.sub}</p>

      {/* capture="environment" opens the back camera on phones */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={picked} />

      <button className="big primary" onClick={() => cameraRef.current.click()}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
        {t.takePhoto}
      </button>
      <button className="link" onClick={() => fileRef.current.click()}>
        {t.choosePhoto}
      </button>

      <section className="samples" aria-labelledby="samples-title">
        <h2 id="samples-title">{t.samples}</h2>
        <div className="taped">
          {SAMPLES.map((s) => (
            <button key={s.id} className="paper" style={{ '--tilt': `${s.tilt}deg` }} onClick={() => onSample(s.id)}>
              <span className="tape" aria-hidden="true" />
              <img src={`/samples/${s.id}.jpg`} alt="" loading="lazy" />
              <span className="paper-label">{t[s.key]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Who this is for, painted on the wall like an old ad.
          Numbers: U.S. Census Bureau QuickFacts, Newark city NJ (2020-2024) */}
      <section className="ghost" aria-labelledby="stats-title">
        <h2 id="stats-title">{t.statsTitle}</h2>
        <ul>
          {t.stats.map((s) => (
            <li key={s.l}>
              <span className="n">{s.n}</span>
              <span className="l">{s.l}</span>
            </li>
          ))}
        </ul>
        <p className="src">
          <a href="https://www.census.gov/quickfacts/newarkcitynewjersey" target="_blank" rel="noreferrer">
            {t.statsSource}
          </a>
        </p>
      </section>
    </section>
  );
}
