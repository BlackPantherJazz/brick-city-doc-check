// The "confirm the numbers" step. Three jobs:
//  1. Show WHERE the AI found each fact (highlights on the tenant's photo).
//  2. Let the tenant fix anything the AI misread (blurry photo, glare).
//  3. Ask the one follow-up question the rules need, only when it changes the answer.
import { useState } from 'react';
import NoticePhoto from '../components/NoticePhoto.jsx';

const TYPES = ['rent_increase', 'eviction_or_court', 'late_rent', 'lease_renewal', 'repairs_or_entry', 'other'];

export default function Confirm({ t, fields, setFields, photoUrl, coverage, setCoverage, missing, busy, onCheck, onRetake }) {
  const [active, setActive] = useState(null);
  const set = (key, value) => setFields({ ...fields, [key]: value });
  const num = (v) => (v === '' ? null : Number(v));
  const isRent = fields.notice_type === 'rent_increase';
  const isCourt = fields.notice_type === 'eviction_or_court';
  const needRent = missing.includes('current_rent') || missing.includes('new_rent');
  const needCoverage = missing.includes('coverage');
  const locations = fields.locations || {};

  // Tapping a highlight on the photo jumps to its field.
  function pick(field) {
    setActive(field);
    const input = document.getElementById(`f-${field}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    }
  }

  // A form field that lights up its highlight on the photo while it's being edited.
  const linked = (field) => ({
    id: `f-${field}`,
    onFocus: () => setActive(field),
    onBlur: () => setActive((a) => (a === field ? null : a)),
  });
  const Swatch = ({ field }) =>
    locations[field] ? <span className={`swatch ${field === 'deadline_to_respond' ? 'urgent' : ''}`} aria-hidden="true" /> : null;

  return (
    <section className="confirm">
      {needCoverage ? (
        <>
          <h1>{t.oneMore}</h1>
          <p className="hint">{t.oneMoreHint}</p>
        </>
      ) : (
        <>
          <h1>{t.confirmTitle}</h1>
          <p className="hint">{t.confirmHint}</p>
        </>
      )}

      {needCoverage && (
        <fieldset className="coverage">
          <legend>{t.ownerQ}</legend>
          <div className="row">
            {[
              ['exempt', t.yes],
              ['covered', t.no],
              ['unsure', t.notSure],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={coverage === value ? 'on' : ''}
                aria-pressed={coverage === value}
                onClick={() => setCoverage(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="why-ask">{t.ownerWhy}</p>
        </fieldset>
      )}

      {photoUrl && !needCoverage && <NoticePhoto src={photoUrl} t={t} locations={locations} active={active} onPick={pick} />}

      {fields.confidence === 'low' && <p className="warn">{t.lowConfidence}</p>}
      {fields.unreadable_parts?.length > 0 && (
        <p className="warn">
          {t.unreadable} {fields.unreadable_parts.join(', ')}
        </p>
      )}

      {!needCoverage && (
        <>
          <label>
            {t.noticeType}
            <select value={fields.notice_type || 'other'} onChange={(e) => set('notice_type', e.target.value)}>
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {t.types[k]}
                </option>
              ))}
            </select>
          </label>

          {isRent && (
            <>
              {needRent && <p className="warn">{t.needRent}</p>}
              <div className="two">
                <label className={needRent && !fields.current_rent ? 'missing' : ''}>
                  <span className="lbl"><Swatch field="current_rent" />{t.currentRent}</span>
                  <input type="number" inputMode="decimal" value={fields.current_rent ?? ''}
                    onChange={(e) => set('current_rent', num(e.target.value))} {...linked('current_rent')} />
                </label>
                <label className={needRent && !fields.new_rent ? 'missing' : ''}>
                  <span className="lbl"><Swatch field="new_rent" />{t.newRent}</span>
                  <input type="number" inputMode="decimal" value={fields.new_rent ?? ''}
                    onChange={(e) => set('new_rent', num(e.target.value))} {...linked('new_rent')} />
                </label>
              </div>
              <div className="two">
                <label>
                  <span className="lbl"><Swatch field="notice_date" />{t.noticeDate}</span>
                  <input type="date" value={fields.notice_date ?? ''}
                    onChange={(e) => set('notice_date', e.target.value || null)} {...linked('notice_date')} />
                </label>
                <label>
                  <span className="lbl"><Swatch field="effective_date" />{t.effectiveDate}</span>
                  <input type="date" value={fields.effective_date ?? ''}
                    onChange={(e) => set('effective_date', e.target.value || null)} {...linked('effective_date')} />
                </label>
              </div>
            </>
          )}

          {isCourt && (
            <label>
              <span className="lbl"><Swatch field="deadline_to_respond" />{t.deadline}</span>
              <input type="date" value={fields.deadline_to_respond ?? ''}
                onChange={(e) => set('deadline_to_respond', e.target.value || null)} {...linked('deadline_to_respond')} />
            </label>
          )}

          <label>
            <span className="lbl"><Swatch field="landlord_or_company" />{t.landlord}</span>
            <input type="text" value={fields.landlord_or_company ?? ''}
              onChange={(e) => set('landlord_or_company', e.target.value || null)} {...linked('landlord_or_company')} />
          </label>
        </>
      )}

      <button className="big primary" onClick={onCheck} disabled={busy || (needCoverage && !coverage)} aria-busy={busy}>
        {busy ? (
          <>
            <span className="btn-spin" aria-hidden="true" /> {t.checking}
          </>
        ) : (
          t.check
        )}
      </button>
      <button className="link" onClick={onRetake}>
        {t.retake}
      </button>
    </section>
  );
}
