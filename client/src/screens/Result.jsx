import { useEffect, useState } from 'react';
import { speak, stopSpeaking, canSpeak } from '../speak.js';

const ICON = { green: '✓', yellow: '!', red: '✕' };

export default function Result({ t, lang, result, info, onStartOver }) {
  const { check, verdict_line, explanation, letter, source } = result;
  const escalate = check.status === 'escalate';
  const color = check.color || 'none';
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stop talking if the language changes or the screen closes.
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [lang, result]);

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(`${verdict_line}. ${explanation}`, lang, () => setSpeaking(false));
    }
  }

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className={`result ${escalate ? 'escalate' : ''}`}>
      <div className={`verdict ${color}`} role="status">
        {ICON[color] && (
          <span className="icon" aria-hidden="true">
            {ICON[color]}
          </span>
        )}
        <p className="line">{verdict_line}</p>
        {check.percent !== null && (
          <p className="pct">
            {t.increase}: {check.percent}%
          </p>
        )}
      </div>

      {canSpeak && (
        <button className="big listen" onClick={toggleSpeak}>
          <span aria-hidden="true">{speaking ? '■' : '🔊'}</span> {speaking ? t.stop : t.listen}
        </button>
      )}

      <p className="explain">{explanation}</p>
      {source === 'fallback' && <p className="dev">{t.fallback}</p>}

      {(escalate || check.color === 'red') && <Help t={t} info={info} urgent={escalate} />}

      {check.reasons.length > 0 && (
        <details className="why">
          <summary>{t.why}</summary>
          <ul>
            {check.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}

      {check.checklist.length > 0 && (
        <div className="checklist">
          <h2>{t.checklist}</h2>
          <ul>
            {check.checklist.map((c) => (
              <li key={c.item} className={c.ok === true ? 'ok' : c.ok === false ? 'bad' : ''}>
                {c.item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {letter && (
        <div className="letter">
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
  const orgs = info?.legalHelp ?? [];
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
                📞 {t.call} {o.phone}
              </a>
            ) : (
              <p className="dev">{o.phone}</p>
            )}
            {!o.verified && <p className="dev">DEV: number not verified</p>}
          </div>
        );
      })}
    </div>
  );
}
