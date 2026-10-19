// Real voices for the Listen button: Gemini text-to-speech.
//
// Why: phones rarely ship a Haitian Creole voice, so the browser's built-in
// read-aloud fell back to French. Gemini's speech models detect the language
// from the text (including Kreyol, in preview) and return a WAV file.
//
// Uses Google's Interactions API (docs: ai.google.dev/gemini-api/docs/speech-generation).
// If anything fails, the client falls back to the phone's own voice.
import { createHash } from 'node:crypto';

const URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const TTS_FALLBACK = process.env.GEMINI_TTS_FALLBACK_MODEL || 'gemini-3.8-flash-lite-tts';
const VOICE = process.env.GEMINI_TTS_VOICE || 'Kore';
const STYLE = 'calm, warm and clear, a little slower than normal, like a kind neighbor explaining a letter';
const BUSY = new Set([429, 500, 503]);
const MAX_CHARS = 1500;

// Small in-memory cache: the same explanation is often played twice.
const cache = new Map();
const CACHE_MAX = 40;

export const ttsAvailable = () => Boolean(process.env.GEMINI_API_KEY);

/** Returns a WAV file (Buffer) for `text`. Throws on failure. */
export async function synthesize(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  if (!clean) throw Object.assign(new Error('empty text'), { status: 400 });

  const key = createHash('sha1').update(clean).digest('hex');
  if (cache.has(key)) return cache.get(key);

  let lastErr;
  for (const model of [TTS_MODEL, TTS_FALLBACK]) {
    try {
      const wav = await requestSpeech(model, clean);
      cache.set(key, wav);
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
      return wav;
    } catch (err) {
      lastErr = err;
      if (!BUSY.has(err.status)) throw err; // bad key or bad request: the fallback won't help
    }
  }
  throw lastErr;
}

async function requestSpeech(model, text) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      model,
      input: [
        {
          type: 'user_input',
          content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: STYLE }] }],
        },
      ],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: VOICE }] },
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`TTS HTTP ${res.status}`), { status: res.status });
  const data = await res.json();
  const audio = findAudio(data);
  if (!audio) throw new Error('TTS response had no audio');
  const bytes = Buffer.from(audio.data, 'base64');
  return isWav(bytes) ? bytes : pcmToWav(bytes, sampleRate(audio.mimeType));
}

/**
 * Find the audio in the response. The Interactions API puts it in
 * steps[].content[] as { type: 'audio', data }, the SDKs call it output_audio,
 * and the older generateContent API used inlineData. Accept any of them.
 */
export function findAudio(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'audio' && typeof node.data === 'string') return { data: node.data, mimeType: node.mime_type || node.mimeType };
  if (node.output_audio?.data) return { data: node.output_audio.data, mimeType: node.output_audio.mime_type };
  if (node.inlineData?.data && /audio/.test(node.inlineData.mimeType || '')) return { data: node.inlineData.data, mimeType: node.inlineData.mimeType };
  for (const value of Object.values(node)) {
    const found = findAudio(value);
    if (found) return found;
  }
  return null;
}

const isWav = (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE';
const sampleRate = (mime = '') => Number(/rate=(\d+)/.exec(mime)?.[1]) || 24000;

/** Raw 16-bit mono PCM -> WAV: a 44-byte header that tells players how to read the samples. */
export function pcmToWav(pcm, rate = 24000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per sample
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
