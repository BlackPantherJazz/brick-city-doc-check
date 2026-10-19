import { useEffect, useState } from 'react';
import { speakSmart, stopSpeaking, canSpeak } from '../speak.js';
import { DEBUG } from '../debug.js';
import { useCountUp, buzz } from '../motion.js';

const ICON = { green: '✓', yellow: '!', red: '✕' };

export default function Result({ t, lang, result, info, photoUrl, busy, translating, onStartOver }) {
  const { check, explanation, letter, source } = result;
  // The verdict line comes from the rules data, which has every language,
  // so it can switch the moment a language button is tapped.
  const verdict_line = check.headline?.[lang] ?? result.verdict_line;
  // The explanation and letter come from the AI, so they wait for it.
  const pending = Boolean(translating);
  const escalate = check.status === 'escalate';
  const color = check.color || 'none';
  const [voice, setVoice] = useState('idle'); // idle | loading | playing
  const [copied, setCopied] = useState(false);

  // The verdict lands: the percentage counts up, the sign flickers on,
  // and phones that can, buzz once for a red result.
  const shown = useCountUp(check.percent);
  useEffect(() => {
    if (check.color === 'red') buzz();
  }, [check.color]);

  // Stop talking if the language changes or the screen closes.
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    stopSpeaking();
    setVoice('idle');
  }, [lang, result]);

  async function toggleSpeak() {
    if (voice !== 'idle') {
      stopSpeaking();
      setVoice('idle');
      return;
    }
    setVoice('loading');
    await speakSmart(`${verdict_line} ${explanation}`, lang, {
      onStart: () => setVoice('playing'),
      onEnd: () => setVoice('idle'),
    });
  }

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const pctLabel = check.percent === null ? null : `${check.percent > 0 ? '+' : ''}${check.percent}%`;
  const shownLabel = shown === null ? null : `${shown > 0 ? '+' : ''}${shown}%`;

  return (
    <section className={`result ${escalate ? 'escalate' : ''}`} aria-busy={busy || pending}>
      <div className={`verdict ${escalate ? 'red' : color}`} role="status">
        {/* The tenant's own photo, shrunk into the corner: the confirm screen's photo morphs into this. */}
        {photoUrl && <img className="result-thumb" src={photoUrl} alt="" style={{ viewTransitionName: 'notice' }} />}

        {pctLabel ? (
          <>
            <p className="big-num lit" aria-hidden="true">
              {shownLabel}
            </p>
            {/* The big number is hidden from screen readers while it counts; this says it once, plainly. */}
            <p className="sr-only">
              {t.increase}: {pctLabel}
            </p>
          </>
        ) : (
          ICON[escalate ? 'red' : color] && (
            <span className="icon lit" aria-hidden="true">
              {escalate ? '!' : ICON[color]}
            </span>
          )
        )}
        <p className="line" key={lang}>
          {verdict_line}
        </p>
      </div>

      {canSpeak && (
        <button className="big listen" onClick={toggleSpeak} aria-busy={voice === 'loading'} disabled={pending}>
          {voice === 'loading' ? (
            <>
              <span className="btn-spin" aria-hidden="true" style={{ borderTopColor: 'var(--ink)' }} /> {t.listen}
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {voice === 'playing' ? (
                  <rect x="7" y="7" width="10" height="10" rx="1.5" />
                ) : (
                  <>
                    <path d="M4 10v4h4l5 4V6L8 10z" />
                    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M19 6a8.5 8.5 0 0 1 0 12" />
                  </>
                )}
              </svg>
              {voice === 'playing' ? t.stop : t.listen}
            </>
          )}
        </button>
      )}

      <div className={`swap ${pending ? 'pending' : ''}`}>
        {pending && (
          <p className="translating" role="status">
            <span className="btn-spin" aria-hidden="true" /> {t.translating}
          </p>
        )}
        {/* key={explanation}: React swaps in a fresh element, which replays the fade-in. */}
        <p className="explain fade-in" key={explanation}>
          {explanation}
        </p>
      </div>
      {source === 'fallback' && <p className="note">{t.fallback}</p>}

      {(escalate || check.color === 'red') && <Help t={t} info={info} urgent={escalate} />}

      {check.reasons.length > 0 && (
        <details className="why">
          <summary>{t.why}</summary>
          <ul>
            {check.reasons.map((r) => (
              <li key={r.en}>{r[lang] ?? r.en}</li>
            ))}
          </ul>
        </details>
      )}

      {check.checklist.length > 0 && (
        <div className="checklist">
          <h2>{t.checklist}</h2>
          <ul>
            {check.checklist.map((c) => (
              <li key={c.text.en} className={c.ok === true ? 'ok' : c.ok === false ? 'bad' : ''}>
                {c.text[lang] ?? c.text.en}
              </li>
            ))}
          </ul>
        </div>
      )}

      {letter && (
        <div className={`letter ${pending ? 'pending' : ''}`}>
          <h2>{t.letterTitle}</h2>
          <textarea readOnly value={letter} rows={14} />
          <button onClick={copyLetter}>{copied ? t.copied : t.copy}</button>
        </div>
      )}

      <p className="disclaimer">{t.disclaimer}</p>

      <button className="big" onClick={onStartOver}>
        {t.start}
      </button>
    </section>
  );
}

function Help({ t, info, urgent }) {
  // Orgs without a real phone number are only shown in ?debug mode.
  const orgs = (info?.legalHelp ?? []).filter((o) => DEBUG || /\d{3}/.test(o.phone));
  return (
    <div className={`help ${urgent ? 'urgent' : ''}`}>
      <h2>{urgent ? t.helpNow : t.helpTitle}</h2>
      {orgs.map((o) => {
        const dial = /\d{3}/.test(o.phone) ? o.phone.replace(/[^\d+]/g, '') : null;
        return (
          <div key={o.name} className="org">
            <p className="name">{o.name}</p>
            {dial ? (
              <a className="call" href={`tel:${dial}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                </svg>
                {t.call} {o.phone}
              </a>
            ) : (
              <p className="dev">{o.phone}</p>
            )}
            {DEBUG && !o.verified && <p className="dev">DEV: number not verified</p>}
          </div>
        );
      })}
    </div>
  );
}
