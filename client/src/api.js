// All the front end's talking-to-the-server lives here.

async function asJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function getInfo() {
  return asJson(await fetch('/api/info'));
}

/** Send a photo (a Blob) OR a sample name. Returns { fields, source }. */
export async function readNotice({ photo, sample, name = 'notice.jpg' }) {
  const form = new FormData();
  if (sample) form.append('sample', sample);
  if (photo) form.append('photo', photo, name.replace(/\.\w+$/, '.jpg'));
  return asJson(await fetch('/api/read', { method: 'POST', body: form }));
}

/** Confirmed facts in -> { check, verdict_line, explanation, letter, source }. */
export async function explainNotice({ fields, units, language }) {
  return asJson(
    await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, units, language }),
    })
  );
}
