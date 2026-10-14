import { useRef } from 'react';

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
      <p className="tagline">{t.tagline}</p>

      {/* capture="environment" opens the back camera on phones */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={picked} />

      <button className="big primary" onClick={() => cameraRef.current.click()}>
        {t.takePhoto}
      </button>
      <button className="link" onClick={() => fileRef.current.click()}>
        {t.choosePhoto}
      </button>

      <div className="samples">
        <p>{t.samples}</p>
        <div className="row">
          <button onClick={() => onSample('legal')}>{t.sampleLegal}</button>
          <button onClick={() => onSample('illegal')}>{t.sampleIllegal}</button>
          <button onClick={() => onSample('court')}>{t.sampleCourt}</button>
        </div>
      </div>

      {/* Who this is for. Numbers: U.S. Census Bureau QuickFacts, Newark city NJ (2020-2024) */}
      <section className="stats" aria-labelledby="stats-title">
        <h2 id="stats-title">{t.statsTitle}</h2>
        <ul className="stat-grid">
          {t.stats.map((s) => (
            <li key={s.l} className="stat">
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
