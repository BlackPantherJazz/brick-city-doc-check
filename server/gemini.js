// Google Gemini version of the two AI calls — same prompts, same output.
// Uses plain fetch (no extra package). Free key: https://aistudio.google.com
import { READ_PROMPT, explainPrompt } from './prompts.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// If the main model is overloaded (503) or rate-limited (429), try this lighter free one.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const BUSY = new Set([429, 500, 503]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Try: main model -> same model again after 1.5s -> lighter fallback model.
async function generate(parts) {
  const attempts = [GEMINI_MODEL, GEMINI_MODEL, FALLBACK_MODEL];
  let lastErr;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await generateOnce(attempts[i], parts);
    } catch (err) {
      lastErr = err;
      if (!BUSY.has(err.status)) throw err; // bad key, bad request: retrying won't help
      console.warn(`Gemini busy (${err.status}) on ${attempts[i]}, attempt ${i + 1}/${attempts.length}`);
      if (i === 0) await wait(1500);
    }
  }
  throw lastErr;
}

async function generateOnce(model, parts) {
  const res = await fetch(`${URL_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      // Ask Gemini to answer in pure JSON (no ``` fences).
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}`);
    err.status = res.status; // 400 bad key/model, 429 = free-tier rate limit hit
    throw err;
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought) // skip "thinking" parts, keep the answer
    .map((p) => p.text ?? '')
    .join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

/** CALL 1 — read the photo. */
export async function readNotice(imageBuffer, mediaType) {
  return generate([
    { inline_data: { mime_type: mediaType, data: imageBuffer.toString('base64') } },
    { text: READ_PROMPT },
  ]);
}

/** CALL 2 — explain the code's verdict and draft the letter. */
export async function explain({ fields, check, language }) {
  const out = await generate([{ text: explainPrompt({ fields, check, language }) }]);
  if (check.status === 'escalate') out.letter = null;
  return out;
}
