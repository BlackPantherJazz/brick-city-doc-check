// The whole app is a small "state machine": one `step` value decides
// which screen shows.
//
//   upload ──photo──▶ reading ──▶ confirm ──check──▶ checking ──▶ result
//     ▲                              │ (needs_info: stay here and ask)
//     └──────────── start over ◀─────┴───────────────────────────────┘
import { useEffect, useState } from 'react';
import { T, LANGS } from './i18n.js';
import { getInfo, readNotice, explainNotice } from './api.js';
import { prepareImage } from './image.js';
import { stopSpeaking } from './speak.js';
import { DEBUG } from './debug.js';
import Upload from './screens/Upload.jsx';
import Confirm from './screens/Confirm.jsx';
import Result from './screens/Result.jsx';
import NoticePhoto from './components/NoticePhoto.jsx';

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
    // On the result screen, re-run the explanation in the new language.
    if (step === 'result' && fields) runCheck(fields, coverage, code);
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
    setStep('upload');
  }

  async function handlePhoto(file) {
    setError('');
    setStep('reading');
    try {
      const photo = await prepareImage(file);
      setPhotoUrl(URL.createObjectURL(photo)); // show the photo while the AI reads it
      const { fields } = await minScan(readNotice({ photo, name: file.name }));
      setFields(fields);
      setStep('confirm');
    } catch {
      setError(t.errorRead);
      setStep('upload');
    }
  }

  async function handleSample(sample) {
    setError('');
    setStep('reading');
    setPhotoUrl(`/samples/${sample}.jpg`);
    try {
      const { fields } = await minScan(readNotice({ sample }));
      setFields(fields);
      setStep('confirm');
    } catch {
      setError(t.errorGeneric);
      setStep('upload');
    }
  }

  async function runCheck(f = fields, cov = coverage, language = lang) {
    setError('');
    setStep('checking');
    try {
      const out = await explainNotice({ fields: f, coverage: cov, language });
      if (out.check.status === 'needs_info') {
        // The rules code needs more facts. Go back and ask — never guess.
        setMissing(out.check.missing);
        setStep('confirm');
        return;
      }
      setMissing([]);
      setResult(out);
      setStep('result');
      window.scrollTo(0, 0);
    } catch {
      setError(t.errorGeneric);
      setStep(result ? 'result' : 'confirm');
    }
  }

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={startOver} aria-label="Home">
          Brick City Doc Check
        </button>
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

        {step === 'upload' && <Upload t={t} onPhoto={handlePhoto} onSample={handleSample} />}

        {step === 'reading' && photoUrl && (
          <div className="reading" role="status">
            <NoticePhoto src={photoUrl} t={t} scanning />
            <p className="reading-caption">{t.reading}</p>
          </div>
        )}

        {((step === 'reading' && !photoUrl) || step === 'checking') && (
          <div className="loading" role="status">
            <div className="spinner" />
            <p>{step === 'reading' ? t.reading : t.checking}</p>
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
            onCheck={() => runCheck()}
            onRetake={startOver}
          />
        )}

        {step === 'result' && result && (
          <Result t={t} lang={lang} result={result} info={info} onStartOver={startOver} />
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
