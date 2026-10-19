import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { checkNotice, RULES } from './rules.js';
import { readNotice, explain, hasKey, MODEL } from './ai.js';
import { SAMPLES, sampleFromFilename, mockExplain } from './mock.js';
import { cleanLocations } from './boxes.js';
import { synthesize, ttsAvailable } from './tts.js';

// Node's fetch says only "fetch failed" for network problems; the real reason is in err.cause.
const why = (err) => [err.status, err.message, err.cause?.code, err.cause?.message].filter(Boolean).join(' | ');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Photos stay in memory only (never written to disk) and are dropped after the request.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)),
});

const LANGS = ['en', 'es', 'pt', 'ht'];

// Basic info the front end needs: mock mode? rules verified? where to get help?
app.get('/api/info', (_req, res) => {
  res.json({
    mock: !hasKey(),
    model: MODEL,
    rulesLastChecked: RULES.meta.rulesLastChecked,
    rulesVerified: RULES.meta.verified,
    voice: ttsAvailable(),
    legalHelp: RULES.legalHelp,
  });
});

// STEP A — photo in, extracted fields out.
app.post('/api/read', upload.single('photo'), async (req, res) => {
  try {
    const sample = req.body?.sample;
    if (sample && SAMPLES[sample]) return res.json({ fields: SAMPLES[sample], source: 'sample' });

    if (!req.file) return res.status(400).json({ error: 'no_photo' });

    if (!hasKey()) return res.json({ fields: sampleFromFilename(req.file.originalname), source: 'mock' });

    const fields = await readNotice(req.file.buffer, req.file.mimetype);
    fields.locations = cleanLocations(fields.locations); // keep only well-formed boxes
    res.json({ fields, source: 'ai' });
  } catch (err) {
    // Log the error type only — never the notice contents.
    console.error('read failed:', why(err));
    res.status(502).json({ error: 'read_failed' });
  }
});

// STEP B — confirmed fields in, rules check (code) + explanation (AI) out.
app.post('/api/explain', async (req, res) => {
  const { fields, coverage } = req.body || {};
  const COVERAGE = ['covered', 'exempt', 'unsure'];
  const language = LANGS.includes(req.body?.language) ? req.body.language : 'en';
  if (!fields) return res.status(400).json({ error: 'no_fields' });

  // Box positions are for the screen only; the rules and the explainer get just the facts.
  const { locations, ...facts } = fields;
  const check = checkNotice(facts, { coverage: COVERAGE.includes(coverage) ? coverage : undefined });

  // The code needs more facts (missing rent or building size) — ask, never guess.
  if (check.status === 'needs_info') return res.json({ check });

  if (!hasKey()) return res.json({ check, ...mockExplain({ fields: facts, check, language }), source: 'mock' });

  try {
    const out = await explain({ fields: facts, check, language });
    // The verdict line always comes from code, even if the AI rewords it.
    if (check.headline) out.verdict_line = check.headline[language];
    res.json({ check, ...out, source: 'ai' });
  } catch (err) {
    console.error('explain failed:', why(err));
    // Fallback so the demo never dead-ends: template text, flagged as such.
    res.json({ check, ...mockExplain({ fields: facts, check, language }), source: 'fallback' });
  }
});

// STEP C (optional) — read the explanation aloud with a real voice.
// Returns a WAV file. 503 = no voice available here: the app uses the phone's voice instead.
app.post('/api/speak', async (req, res) => {
  if (!ttsAvailable()) return res.status(503).json({ error: 'no_tts' });
  try {
    const wav = await synthesize(req.body?.text);
    res.set({ 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }).send(wav);
  } catch (err) {
    console.error('speak failed:', why(err));
    res.status(err.status === 400 ? 400 : 502).json({ error: 'speak_failed' });
  }
});

// In production, serve the built React app.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Brick City Doc Check API on http://localhost:${port}  ${hasKey() ? `(AI: ${MODEL})` : '(MOCK MODE - no API key)'}`);
});
