// Run with: npm test
// Every verdict the app can give, checked against Newark's rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNotice } from './rules.js';
import { SAMPLES } from './mock.js';

const pct = (cur, next, extra = {}) => ({ ...SAMPLES.legal, current_rent: cur, new_rent: next, ...extra });

test('sample 1: 3% increase -> green, no follow-up question', () => {
  const r = checkNotice(SAMPLES.legal);
  assert.equal(r.color, 'green');
  assert.equal(r.percent, 3);
});

test('sample 2: 20% increase -> red', () => {
  const r = checkNotice(SAMPLES.illegal);
  assert.equal(r.color, 'red');
  assert.equal(r.verdictKey, 'over_unconscionable');
});

test('sample 3: court notice -> red escalate, no matter what else it says', () => {
  const r = checkNotice(SAMPLES.court, { coverage: 'exempt' });
  assert.equal(r.status, 'escalate');
});

test('over 5% is red even in an owner-occupied building', () => {
  assert.equal(checkNotice(pct(1000, 1060), { coverage: 'exempt' }).color, 'red');
});

test('4.5% with coverage not asked yet -> asks the follow-up question', () => {
  const r = checkNotice(pct(1000, 1045));
  assert.equal(r.status, 'needs_info');
  assert.deepEqual(r.missing, ['coverage']);
});

test('4.5% under rent control -> red (over the 4% cap)', () => {
  const r = checkNotice(pct(1000, 1045), { coverage: 'covered' });
  assert.equal(r.verdictKey, 'over_cap');
  assert.equal(r.color, 'red');
});

test('4.5% in owner-occupied building of 4 or fewer units -> green', () => {
  assert.equal(checkNotice(pct(1000, 1045), { coverage: 'exempt' }).color, 'green');
});

test('4.5% and tenant is not sure -> yellow', () => {
  assert.equal(checkNotice(pct(1000, 1045), { coverage: 'unsure' }).verdictKey, 'depends_on_building');
});

test('exactly 4% -> green without asking', () => {
  const r = checkNotice(pct(1000, 1040));
  assert.equal(r.color, 'green');
});

test('missing rent -> never guesses', () => {
  const r = checkNotice(pct(1000, null));
  assert.equal(r.status, 'needs_info');
  assert.deepEqual(r.missing, ['new_rent']);
});

test('only 14 days notice -> yellow', () => {
  const r = checkNotice(pct(1000, 1030, { notice_date: '2026-10-01', effective_date: '2026-10-15' }));
  assert.equal(r.verdictKey, 'short_notice');
});

test('a repairs notice gets no color', () => {
  const r = checkNotice({ ...SAMPLES.legal, notice_type: 'repairs_or_entry' });
  assert.equal(r.status, 'info');
  assert.equal(r.color, null);
});

test('every verdict has all 4 languages', async () => {
  const { RULES } = await import('./rules.js');
  for (const [k, v] of Object.entries(RULES.verdicts)) for (const l of ['en', 'es', 'pt', 'ht']) assert.ok(v[l], `${k}.${l}`);
});

test('cleanLocations keeps good boxes and drops broken ones', async () => {
  const { cleanLocations } = await import('./boxes.js');
  const out = cleanLocations({
    new_rent: [500, 300, 520, 380], // good
    current_rent: [520, 300, 500, 380], // ymax < ymin
    notice_date: [10, 20, 30], // wrong length
    effective_date: [0, 0, 1200, 50], // off the image
    landlord_or_company: null,
    made_up_field: [1, 2, 3, 4], // not a field we show
  }, { pad: false });
  assert.deepEqual(out, { new_rent: [500, 300, 520, 380] });
});

test('cleanLocations pads boxes like a highlighter, staying on the image', async () => {
  const { cleanLocations } = await import('./boxes.js');
  assert.deepEqual(cleanLocations({ new_rent: [500, 300, 520, 380] }), { new_rent: [492, 295, 528, 385] });
  assert.deepEqual(cleanLocations({ notice_date: [3, 2, 20, 998] }), { notice_date: [0, 0, 28, 1000] });
});

test('every sample photo has a box for each fact it shows', async () => {
  for (const key of ['legal', 'illegal', 'yellow', 'short']) {
    for (const f of ['current_rent', 'new_rent', 'notice_date', 'effective_date']) assert.ok(SAMPLES[key].locations[f], `${key}.${f}`);
  }
  assert.ok(SAMPLES.court.locations.court_mention);
});

test('voice: finds audio in the Interactions API response and keeps WAV as-is', async () => {
  const { findAudio, pcmToWav } = await import('./tts.js');
  const wav = pcmToWav(Buffer.alloc(100), 24000);
  const response = { id: 'x', steps: [{ type: 'thought' }, { type: 'model_output', content: [{ type: 'audio', data: wav.toString('base64'), mime_type: 'audio/wav' }] }] };
  const found = findAudio(response);
  assert.equal(found.mimeType, 'audio/wav');
  assert.equal(Buffer.from(found.data, 'base64').toString('ascii', 0, 4), 'RIFF');
});

test('voice: also understands the older inlineData shape', async () => {
  const { findAudio } = await import('./tts.js');
  const found = findAudio({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AAAA' } }] } }] });
  assert.equal(found.mimeType, 'audio/L16;codec=pcm;rate=24000');
});

test('voice: raw PCM gets a correct WAV header', async () => {
  const { pcmToWav } = await import('./tts.js');
  const wav = pcmToWav(Buffer.alloc(480), 24000);
  assert.equal(wav.length, 524);
  assert.equal(wav.readUInt32LE(24), 24000); // sample rate
  assert.equal(wav.readUInt32LE(40), 480); // data size
});

test('phrasebook: every message has all four languages, filled in', async () => {
  const { msg, MESSAGE_KEYS } = await import('./messages.js');
  const vars = { current: 1500, next: 1800, percent: 20, min: 30, days: 31, u: 5, cap: 4 };
  for (const key of MESSAGE_KEYS) {
    const m = msg(key, vars);
    for (const lang of ['en', 'es', 'pt', 'ht']) {
      assert.ok(m[lang] && m[lang].trim(), `${key} is missing ${lang}`);
      assert.ok(!m[lang].includes('undefined'), `${key}.${lang} has a blank number`);
    }
  }
});

test('phrasebook: the result screen gets every language for reasons and checklist', () => {
  const check = checkNotice({ notice_type: 'rent_increase', current_rent: 1500, new_rent: 1800, notice_date: '2026-01-01', effective_date: '2026-02-01' });
  assert.match(check.reasons[0].ht, /Lwaye a/);
  assert.match(check.checklist[0].text.es, /días de aviso/);
});
