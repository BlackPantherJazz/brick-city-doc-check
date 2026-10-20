// The whole app is a small "state machine": one `step` value decides
// which screen shows.
//
//   upload ──photo──▶ reading ──▶ confirm ──check──▶ result
//     ▲                              │ (needs_info: stay here and ask)
//     └──────────── start over ◀─────┴─────────────────────┘
//
// Screen changes go through transition(), so shared elements (the notice
// photo) morph from one screen to the next instead of jumping.
import { useEffect, useRef, useState } from 'react';
import { T, LANGS } from './i18n.js';
import { getInfo, readNotice, explainNotice } from './api.js';
import { prepareImage } from './image.js';
import { stopSpeaking } from './speak.js';
import { DEBUG } from './debug.js';
import { transition, firstVisitThisSession } from './motion.js';
import Upload from './screens/Upload.jsx';
import Confirm from './screens/Confirm.jsx';
import Result from './screens/Result.jsx';
import NoticePhoto from './components/NoticePhoto.jsx';
import NeonSign from './components/NeonSign.jsx';

// Let the scan animation play for at least this long, even when the answer is instant.
const MIN_SCAN_MS = 1400;
const minScan = (promise) => Promise.all([promise, new Promise((r) => setTimeout(r, MIN_SCAN_MS))]).then(([v]) => v);

function savedLang() {
  try {
    return localStorage.getItem('kyn-lang') || 'en';
  } catch {
    return 'en';
  }
}

export default function App() {
  const [lang, setLang] = useState(savedLang);
  const [step, setStep] = useState('upload');
  const [info, setInfo] = useState(null);
  const [fields, setFields] = useState(null);
  const [coverage, setCoverage] = useState(undefined); // answer to the owner-occupied question
  const [photoUrl, setPhotoUrl] = useState(null); // the tenant's photo, kept in this browser tab only
  const [missing, setMissing] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); // waiting on the verdict (button shows a spinner)
  const [intro] = useState(() => firstVisitThisSession()); // neon sign flickers on once per visit
  const [translating, setTranslating] = useState(null); // language code while a new explanation is on its way
  // Explanations we already have, by notice + language. Switching back to a
  // language you've seen is instant, and costs no AI call.
  const explained = useRef(new Map());
  const relangTicket = useRef(0); // only the latest language tap gets to update the screen
  const t = T[lang];

  useEffect(() => {
    getInfo()
      .then((i) => {
        setInfo(i);
        // Hidden from the screen, but loud in the browser console so the team notices.
        if (i.mock) console.warn('Brick City Doc Check: MOCK MODE - no API key on the server. Photos return sample data.');
      })
      .catch(() => {});
  }, []);

  function changeLang(code) {
    setLang(code);
    try {
      localStorage.setItem('kyn-lang', code);
    } catch {}
    // On the result screen, swap the explanation in place (no page jump).
    if (step === 'result' && fields) relang(code);
  }

  const cacheKey = (f, cov, language) => JSON.stringify([f, cov ?? null, language]);

  /**
   * Language change on the result screen. Unlike runCheck, this stays on the
   * page: no scroll to the top, no screen transition. The verdict line swaps
   * at once (every language is already in the rules data); the explanation
   * shows a "translating" shimmer until the AI's new version arrives.
   */
  async function relang(code) {
    const ticket = ++relangTicket.current;
    const hit = explained.current.get(cacheKey(fields, coverage, code));
    if (hit) {
      setTranslating(null);
      setResult(hit);
      return;
    }
    setTranslating(code);
    try {
      const out = await explainNotice({ fields, coverage, language: code });
      explained.current.set(cacheKey(fields, coverage, code), out);
      if (ticket === relangTicket.current) setResult(out);
    } catch {
      if (ticket === relangTicket.current) setError(T[code].errorGeneric);
    } finally {
      if (ticket === relangTicket.current) setTranslating(null);
    }
  }

  function startOver() {
    stopSpeaking();
    setFields(null);
    setCoverage(undefined);
    if (photoUrl?.startsWith('blob:')) URL.revokeObjectURL(photoUrl); // free the photo from memory
    setPhotoUrl(null);
    setMissing([]);
    setResult(null);
    setError('');
    setBusy(false);
    setTranslating(null);
    relangTicket.current++; // ignore any translation still on its way
    explained.current.clear();
    transition(() => setStep('upload'));
  }

  async function handlePhoto(file) {
    setError('');
    transition(() => setStep('reading'));
    try {
      const photo = await prepareImage(file);
      setPhotoUrl(URL.createObjectURL(photo)); // show the photo while the AI reads it
      const { fields } = await minScan(readNotice({ photo, name: file.name }));
      transition(() => {
        setFields(fields);
        setStep('confirm');
      });
    } catch {
      setError(t.errorRead);
      setStep('upload');
    }
  }

  async function handleSample(sample) {
    setError('');
    transition(() => {
      setPhotoUrl(`/samples/${sample}.jpg`);
      setStep('reading');
    });
    try {
      const { fields } = await minScan(readNotice({ sample }));
      transition(() => {
        setFields(fields);
        setStep('confirm');
      });
    } catch {
      setError(t.errorGeneric);
      setStep('upload');
    }
  }

  async function runCheck(f = fields, cov = coverage, language = lang) {
    setError('');
    setBusy(true);
    try {
      const out = await explainNotice({ fields: f, coverage: cov, language });
      if (out.check.status === 'needs_info') {
        // The rules code needs more facts. Go back and ask — never guess.
        setMissing(out.check.missing);
        return;
      }
      explained.current.set(cacheKey(f, cov, language), out);
      window.scrollTo(0, 0);
      transition(() => {
        setMissing([]);
        setResult(out);
        setStep('result');
      });
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`app ${intro ? 'intro' : ''}`}>
      <header className={`top ${step === 'upload' ? 'home' : ''}`}>
        {/* On the home screen the big sign hangs below; elsewhere a small one sits up here. */}
        {step !== 'upload' && <NeonSign size="small" onClick={startOver} label="Brick City Doc Check, home" />}
        <nav className="langs" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              className={l.code === lang ? 'on' : ''}
              aria-pressed={l.code === lang}
              aria-label={l.name}
              title={l.name}
              lang={l.code}
              onClick={() => changeLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {step === 'upload' && <NeonSign size="big" label="Brick City Doc Check" />}
        {step === 'upload' && <Upload t={t} onPhoto={handlePhoto} onSample={handleSample} />}

        {step === 'reading' && photoUrl && (
          <div className="reading" role="status">
            <NoticePhoto src={photoUrl} t={t} scanning />
            <p className="reading-caption">{t.reading}</p>
          </div>
        )}

        {step === 'reading' && !photoUrl && (
          <div className="loading" role="status">
            <div className="spinner" />
            <p>{t.reading}</p>
          </div>
        )}

        {step === 'confirm' && fields && (
          <Confirm
            t={t}
            fields={fields}
            setFields={setFields}
            photoUrl={photoUrl}
            coverage={coverage}
            setCoverage={setCoverage}
            missing={missing}
            busy={busy}
            onCheck={() => runCheck()}
            onRetake={startOver}
          />
        )}

        {step === 'result' && result && (
          <Result t={t} lang={lang} result={result} info={info} photoUrl={photoUrl} busy={busy} translating={translating} onStartOver={startOver} />
        )}
      </main>

      <footer className="foot">
        <p>{t.privacy}</p>
        <p className="not-advice">{t.notAdvice}</p>
        {/* Shown only once the team marks the rules verified in server/rules.json */}
        {info?.rulesVerified && (
          <p>
            {t.rulesChecked} {info.rulesLastChecked}
          </p>
        )}
        {/* Developer notes: hidden unless you add ?debug to the URL (localhost:5173/?debug) */}
        {DEBUG && info && !info.rulesVerified && <p className="dev">{t.unverified}</p>}
        {DEBUG && info && <p className="dev">DEV: {info.mock ? 'mock mode (no API key)' : `AI on (${info.model})`}</p>}
      </footer>
    </div>
  );
}
