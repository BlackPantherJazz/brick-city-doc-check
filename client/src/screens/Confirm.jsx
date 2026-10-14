// The "confirm the numbers" step. Two jobs:
//  1. Let the tenant fix anything the AI misread (blurry photo, glare).
//  2. Ask the one follow-up question the rules need: building size.
//     This is the "visible multi-step reasoning" for the judges.

const TYPES = ['rent_increase', 'eviction_or_court', 'late_rent', 'lease_renewal', 'repairs_or_entry', 'other'];

export default function Confirm({ t, fields, setFields, units, setUnits, missing, onCheck, onRetake }) {
  const set = (key, value) => setFields({ ...fields, [key]: value });
  const num = (v) => (v === '' ? null : Number(v));
  const isRent = fields.notice_type === 'rent_increase';
  const needRent = missing.includes('current_rent') || missing.includes('new_rent');
  const needUnits = missing.includes('units');

  return (
    <section className="confirm">
      <h1>{t.confirmTitle}</h1>
      <p className="hint">{t.confirmHint}</p>

      {fields.confidence === 'low' && <p className="warn">{t.lowConfidence}</p>}
      {fields.unreadable_parts?.length > 0 && (
        <p className="warn">
          {t.unreadable} {fields.unreadable_parts.join(', ')}
        </p>
      )}

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
              {t.currentRent}
              <input
                type="number"
                inputMode="decimal"
                value={fields.current_rent ?? ''}
                onChange={(e) => set('current_rent', num(e.target.value))}
              />
            </label>
            <label className={needRent && !fields.new_rent ? 'missing' : ''}>
              {t.newRent}
              <input
                type="number"
                inputMode="decimal"
                value={fields.new_rent ?? ''}
                onChange={(e) => set('new_rent', num(e.target.value))}
              />
            </label>
          </div>
          <div className="two">
            <label>
              {t.noticeDate}
              <input type="date" value={fields.notice_date ?? ''} onChange={(e) => set('notice_date', e.target.value || null)} />
            </label>
            <label>
              {t.effectiveDate}
              <input
                type="date"
                value={fields.effective_date ?? ''}
                onChange={(e) => set('effective_date', e.target.value || null)}
              />
            </label>
          </div>
        </>
      )}

      <label>
        {t.landlord}
        <input
          type="text"
          value={fields.landlord_or_company ?? ''}
          onChange={(e) => set('landlord_or_company', e.target.value || null)}
        />
      </label>

      {isRent && (
        <fieldset className={`units ${needUnits ? 'missing' : ''}`}>
          <legend>{t.unitsQ}</legend>
          {needUnits && <p className="warn">{t.needUnits}</p>}
          <div className="row">
            {[
              ['1-2', t.units12],
              ['3+', t.units3],
              ['unknown', t.unitsUnknown],
            ].map(([value, label]) => (
              <button
                key={value}
                className={units === value ? 'on' : ''}
                aria-pressed={units === value}
                onClick={() => setUnits(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <button className="big primary" onClick={onCheck}>
        {t.check}
      </button>
      <button className="link" onClick={onRetake}>
        {t.retake}
      </button>
    </section>
  );
}
