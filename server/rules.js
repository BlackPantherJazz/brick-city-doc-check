// ─────────────────────────────────────────────────────────────
// THE RULES CHECK — plain code, no AI.
//
// This is the most important design choice in the project: the AI reads
// the photo and explains the result, but THIS file decides the verdict.
// That way the AI can never "make up" what the law says.
//
// It follows the decision order from the build plan, step by step.
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

export const RULES = JSON.parse(
  readFileSync(new URL('./rules.json', import.meta.url), 'utf8')
);

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a, b) {
  const d1 = Date.parse(a);
  const d2 = Date.parse(b);
  if (Number.isNaN(d1) || Number.isNaN(d2)) return null;
  return Math.round((d2 - d1) / DAY_MS);
}

function isMissing(n) {
  return n === null || n === undefined || Number.isNaN(Number(n)) || Number(n) <= 0;
}

/**
 * @param {object} fields  JSON pulled from the photo (Prompt 1), after the tenant confirms it
 * @param {object} opts
 * @param {'1-2'|'3+'|'unknown'} opts.units  answer to "How many apartments are in your building?"
 * @returns {{status, verdictKey, color, percent, reasons, checklist, missing}}
 */
export function checkNotice(fields, { units = 'unknown' } = {}) {
  const reasons = [];
  const checklist = [];
  const r = RULES;

  // STEP 1 — Court or eviction papers: red, escalate, stop.
  if (fields.notice_type === 'eviction_or_court' || fields.mentions_court_or_filing === true) {
    return result('escalate', 'escalate', { reasons: ['Notice mentions court, a filing, or eviction.'] });
  }

  // STEP 2 — Not a rent increase: explanation only, no verdict color.
  if (fields.notice_type !== 'rent_increase') {
    return result('info', 'not_rent_increase');
  }

  // STEP 7 (checked early) — never guess missing rents. Ask instead.
  const missing = [];
  if (isMissing(fields.current_rent)) missing.push('current_rent');
  if (isMissing(fields.new_rent)) missing.push('new_rent');
  if (missing.length) return result('needs_info', null, { missing });

  // STEP 3 — Compute the increase.
  const current = Number(fields.current_rent);
  const next = Number(fields.new_rent);
  const percent = Math.round(((next - current) / current) * 1000) / 10; // one decimal
  reasons.push(`Rent goes from $${current} to $${next} (${percent}%).`);

  // Notice-period check (used for the checklist and to soften a green).
  const noticeDays = daysBetween(fields.notice_date, fields.effective_date);
  const minDays = r.noticePeriod.minDays;
  let shortNotice = false;
  if (noticeDays === null) {
    checklist.push({ item: `Check you got at least ${minDays} days' written notice (dates were unclear).`, ok: null });
  } else if (noticeDays < minDays) {
    shortNotice = true;
    checklist.push({ item: `Only ${noticeDays} days between the notice and the new rent. Newark is reported to require ${minDays}.`, ok: false });
  } else {
    checklist.push({ item: `${noticeDays} days' notice (reported minimum: ${minDays}).`, ok: true });
  }
  checklist.push({ item: 'Ask the landlord for the unit\'s city rental registration number.', ok: null });

  // STEP 4 — Over 5%: red.
  if (percent > r.unconscionable.overPercent) {
    reasons.push(`Over ${r.unconscionable.overPercent}% in one year.`);
    return result('verdict', 'over_unconscionable', { percent, reasons, checklist });
  }

  // STEP 5 — Over the 4% cap, up to 5%: depends on building size.
  if (percent > r.rentControl.capPercent) {
    if (units === 'unknown') {
      // STEP 7 — building size matters here, so ask.
      return result('needs_info', null, { percent, reasons, checklist, missing: ['units'] });
    }
    if (units === '3+') {
      reasons.push(`Buildings with ${r.rentControl.minUnits}+ units are reported to be capped at ${r.rentControl.capPercent}% or CPI, whichever is lower.`);
      return result('verdict', 'over_cap', { percent, reasons, checklist });
    }
    reasons.push(`Building has fewer than ${r.rentControl.minUnits} units, so the rent control cap is reported not to apply. The increase is still under ${r.unconscionable.overPercent}%.`);
  }

  // STEP 6 — 4% or under (or small building under 5%): green, plus checklist.
  if (shortNotice) {
    return result('verdict', 'short_notice', { percent, reasons, checklist });
  }
  return result('verdict', 'within_limits', { percent, reasons, checklist });
}

function result(status, verdictKey, extra = {}) {
  const v = verdictKey ? RULES.verdicts[verdictKey] : null;
  return {
    status, // 'escalate' | 'info' | 'verdict' | 'needs_info'
    verdictKey,
    color: v ? v.color : null,
    headline: v ? { en: v.en, es: v.es, pt: v.pt } : null,
    percent: extra.percent ?? null,
    reasons: extra.reasons ?? [],
    checklist: extra.checklist ?? [],
    missing: extra.missing ?? [],
  };
}
