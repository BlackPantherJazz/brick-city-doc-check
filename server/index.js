import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { checkNotice, RULES } from './rules.js';
import { readNotice, explain, hasKey, MODEL } from './ai.js';
import { SAMPLES, sampleFromFilename, mockExplain } from './mock.js';

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
    res.json({ fields, source: 'ai' });
  } catch (err) {
    // Log the error type only — never the notice contents.
    console.error('read failed:', err.status || '', err.message);
    res.status(502).json({ error: 'read_failed' });
  }
});

// STEP B — confirmed fields in, rules check (code) + explanation (AI) out.
app.post('/api/explain', async (req, res) => {
  const { fields, coverage } = req.body || {};
  const COVERAGE = ['covered', 'exempt', 'unsure'];
  const language = LANGS.includes(req.body?.language) ? req.body.language : 'en';
  if (!fields) return res.status(400).json({ error: 'no_fields' });

  const check = checkNotice(fields, { coverage: COVERAGE.includes(coverage) ? coverage : undefined });

  // The code needs more facts (missing rent or building size) — ask, never guess.
  if (check.status === 'needs_info') return res.json({ check });

  if (!hasKey()) return res.json({ check, ...mockExplain({ fields, check, language }), source: 'mock' });

  try {
    const out = await explain({ fields, check, language });
    // The verdict line always comes from code, even if the AI rewords it.
    if (check.headline) out.verdict_line = check.headline[language];
    res.json({ check, ...out, source: 'ai' });
  } catch (err) {
    console.error('explain failed:', err.status || '', err.message);
    // Fallback so the demo never dead-ends: template text, flagged as such.
    res.json({ check, ...mockExplain({ fields, check, language }), source: 'fallback' });
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
