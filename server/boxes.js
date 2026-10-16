// Where on the photo the AI found each fact.
// Boxes use Gemini's native format: [ymin, xmin, ymax, xmax], scaled 0-1000
// (0,0 = top-left of the image). AI output can be messy, so we only keep
// boxes that are well-formed and inside the image.

export const BOX_FIELDS = [
  'landlord_or_company', 'unit_address', 'notice_date', 'effective_date',
  'current_rent', 'new_rent', 'deadline_to_respond', 'court_mention',
];

export function cleanLocations(locations) {
  const out = {};
  if (!locations || typeof locations !== 'object') return out;
  for (const field of BOX_FIELDS) {
    const b = locations[field];
    if (!Array.isArray(b) || b.length !== 4) continue;
    const n = b.map(Number);
    if (n.some((v) => !Number.isFinite(v) || v < 0 || v > 1000)) continue;
    const [ymin, xmin, ymax, xmax] = n;
    if (ymax <= ymin || xmax <= xmin) continue;
    out[field] = n.map(Math.round);
  }
  return out;
}
