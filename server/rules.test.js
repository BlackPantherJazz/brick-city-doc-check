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
  });
  assert.deepEqual(out, { new_rent: [500, 300, 520, 380] });
});

test('every sample photo has a box for each fact it shows', async () => {
  for (const key of ['legal', 'illegal', 'yellow', 'short']) {
    for (const f of ['current_rent', 'new_rent', 'notice_date', 'effective_date']) assert.ok(SAMPLES[key].locations[f], `${key}.${f}`);
  }
  assert.ok(SAMPLES.court.locations.court_mention);
});
