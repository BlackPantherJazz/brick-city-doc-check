// ─────────────────────────────────────────────────────────────
// THE RULES CHECK — plain code, no AI.
//
// This is the most important design choice in the project: the AI reads
// the photo and explains the result, but THIS file decides the verdict.
// That way the AI can never "make up" what the law says.
//
// Rules verified against Newark's Rent Control ordinance (Title XIX, ecode360)
// on 2026-10-14 except where rules.json says otherwise.
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { msg } from './messages.js';

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
 * @param {'covered'|'exempt'|'unsure'|undefined} opts.coverage  answer to
 *   "Does your landlord live in your building, and does it have 4 apartments or fewer?"
 *   yes -> 'exempt' (owner-occupied, not under rent control), no -> 'covered', not sure -> 'unsure'.
 *   undefined = not asked yet.
 * @returns {{status, verdictKey, color, percent, reasons, checklist, missing}}
 *   reasons:   [{ en, es, pt, ht }]          one sentence per language
 *   checklist: [{ text: { en, es, pt, ht }, ok: true|false|null }]
 */
export function checkNotice(fields, { coverage } = {}) {
  const reasons = [];
  const checklist = [];
  const r = RULES;
  const cap = r.rentControl.capPercent; // 4
  const unconscionable = r.unconscionable.overPercent; // 5

  // STEP 1 — Court or eviction papers: red, escalate, stop.
  if (fields.notice_type === 'eviction_or_court' || fields.mentions_court_or_filing === true) {
    return result('escalate', 'escalate', { reasons: [msg('court')] });
  }

  // STEP 2 — Not a rent increase: explanation only, no verdict color.
  if (fields.notice_type !== 'rent_increase') {
    return result('info', 'not_rent_increase');
  }

  // STEP 3 — Never guess missing rents. Ask instead.
  const missing = [];
  if (isMissing(fields.current_rent)) missing.push('current_rent');
  if (isMissing(fields.new_rent)) missing.push('new_rent');
  if (missing.length) return result('needs_info', null, { missing });

  // STEP 4 — Compute the increase.
  const current = Number(fields.current_rent);
  const next = Number(fields.new_rent);
  const percent = Math.round(((next - current) / current) * 1000) / 10; // one decimal
  reasons.push(msg('rent_change', { current, next, percent }));

  // Checklist items that apply to every rent increase.
  const noticeDays = daysBetween(fields.notice_date, fields.effective_date);
  const minDays = r.noticePeriod.minDays;
  let shortNotice = false;
  if (noticeDays === null) {
    checklist.push({ text: msg('notice_unclear', { min: minDays }), ok: null });
  } else if (noticeDays < minDays) {
    shortNotice = true;
    checklist.push({ text: msg('notice_short', { days: noticeDays, min: minDays }), ok: false });
  } else {
    checklist.push({ text: msg('notice_ok', { days: noticeDays, min: minDays }), ok: true });
  }
  checklist.push({ text: msg('registration'), ok: null });

  // STEP 5 — Over 5%: red no matter what kind of building.
  // Rent-controlled units can't go over 4%; non-controlled units over 5% count as "unconscionable".
  if (percent > unconscionable) {
    reasons.push(coverage === 'exempt'
      ? msg('over_unconscionable_exempt', { u: unconscionable })
      : msg('over_unconscionable', { u: unconscionable, cap }));
    return result('verdict', 'over_unconscionable', { percent, reasons, checklist });
  }

  // STEP 6 — Between 4% and 5%: the answer depends on whether rent control applies.
  if (percent > cap) {
    if (coverage === undefined) {
      // Ask the one follow-up question — never guess.
      return result('needs_info', null, { percent, reasons, checklist, missing: ['coverage'] });
    }
    if (coverage === 'covered') {
      reasons.push(msg('cap_rule', { cap }));
      return result('verdict', 'over_cap', { percent, reasons, checklist });
    }
    if (coverage === 'unsure') {
      reasons.push(msg('depends', { cap, u: unconscionable }));
      return result('verdict', 'depends_on_building', { percent, reasons, checklist });
    }
    reasons.push(msg('exempt_ok', { u: unconscionable }));
  } else {
    // STEP 7 — 4% or under.
    reasons.push(msg('under_cap', { cap }));
  }

  if (shortNotice) return result('verdict', 'short_notice', { percent, reasons, checklist });
  return result('verdict', 'within_limits', { percent, reasons, checklist });
}

function result(status, verdictKey, extra = {}) {
  const v = verdictKey ? RULES.verdicts[verdictKey] : null;
  return {
    status, // 'escalate' | 'info' | 'verdict' | 'needs_info'
    verdictKey,
    color: v ? v.color : null,
    headline: v ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'color')) : null, // every language in rules.json
    percent: extra.percent ?? null,
    reasons: extra.reasons ?? [],
    checklist: extra.checklist ?? [],
    missing: extra.missing ?? [],
  };
}
