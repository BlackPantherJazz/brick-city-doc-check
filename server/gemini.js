// Google Gemini version of the two AI calls — same prompts, same output.
// Uses plain fetch (no extra package). Free key: https://aistudio.google.com
import { READ_PROMPT, explainPrompt } from './prompts.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function generate(parts) {
  const res = await fetch(`${URL_BASE}/${GEMINI_MODEL}:generateContent`, {
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
