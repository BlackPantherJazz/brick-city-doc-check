// Run with: npm test
// These are the "All 3 test notices give the right color" checkpoint, in code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNotice } from './rules.js';
import { SAMPLES } from './mock.js';

test('sample 1: legal increase -> green', () => {
  const r = checkNotice(SAMPLES.legal, { units: '3+' });
  assert.equal(r.color, 'green');
  assert.equal(r.percent, 3);
});

test('sample 2: illegal increase -> red', () => {
  const r = checkNotice(SAMPLES.illegal, { units: '3+' });
  assert.equal(r.color, 'red');
  assert.equal(r.verdictKey, 'over_unconscionable');
});

test('sample 3: court notice -> red escalate, no matter what else it says', () => {
  const r = checkNotice(SAMPLES.court, { units: '3+' });
  assert.equal(r.status, 'escalate');
  assert.equal(r.color, 'red');
});

test('4.5% with unknown building size -> asks the follow-up question', () => {
  const r = checkNotice({ ...SAMPLES.legal, current_rent: 1000, new_rent: 1045 });
  assert.equal(r.status, 'needs_info');
  assert.deepEqual(r.missing, ['units']);
});

test('4.5% in a 3+ unit building -> yellow', () => {
  const r = checkNotice({ ...SAMPLES.legal, current_rent: 1000, new_rent: 1045 }, { units: '3+' });
  assert.equal(r.color, 'yellow');
});

test('4.5% in a 2-unit building -> green', () => {
  const r = checkNotice({ ...SAMPLES.legal, current_rent: 1000, new_rent: 1045 }, { units: '1-2' });
  assert.equal(r.color, 'green');
});

test('missing rent -> never guesses', () => {
  const r = checkNotice({ ...SAMPLES.legal, new_rent: null });
  assert.equal(r.status, 'needs_info');
  assert.deepEqual(r.missing, ['new_rent']);
});

test('only 14 days notice -> yellow', () => {
  const r = checkNotice({ ...SAMPLES.legal, notice_date: '2026-10-01', effective_date: '2026-10-15' }, { units: '3+' });
  assert.equal(r.verdictKey, 'short_notice');
});

test('a repairs notice gets no color', () => {
  const r = checkNotice({ ...SAMPLES.legal, notice_type: 'repairs_or_entry' });
  assert.equal(r.status, 'info');
  assert.equal(r.color, null);
});
