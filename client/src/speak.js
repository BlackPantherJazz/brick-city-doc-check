// Read-aloud.
//  1. First choice: a real AI voice from our server (/api/speak -> Gemini TTS),
//     which can speak Haitian Creole properly.
//  2. Fallback: the phone's built-in voice (browser speechSynthesis).
const LOCALES = { en: 'en-US', es: 'es-US', pt: 'pt-BR', ht: 'ht-HT' };
// If the phone has no voice for a language, borrow a close one.
const FALLBACK_VOICE = { ht: 'fr' };

const hasSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canSpeak = typeof window !== 'undefined' && (hasSynth || 'Audio' in window);

// A silent, empty WAV. Playing it during the tap "unlocks" audio on iPhones,
// which otherwise block sound that starts after waiting on the network.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let current = null; // { audio, url } while an AI voice is playing
let token = 0; // bumps on every new request or stop, so late answers are ignored

/** Phone's own voice. */
export function speak(text, lang, onEnd) {
  if (!hasSynth) return onEnd?.();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALES[lang] || 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === u.lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
    (FALLBACK_VOICE[lang] && voices.find((v) => v.lang.toLowerCase().startsWith(FALLBACK_VOICE[lang])));
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  }
  u.rate = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

/** AI voice first, phone voice if that fails. Call it straight from a tap. */
export async function speakSmart(text, lang, { onStart, onEnd } = {}) {
  stopSpeaking();
  const mine = ++token;

  // Must happen synchronously inside the tap, before any await (iPhone rule).
  const audio = new Audio(SILENT);
  audio.play().catch(() => {});

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error(`speak ${res.status}`);
    const blob = await res.blob();
    if (mine !== token) return; // the person pressed Stop or asked again meanwhile

    const url = URL.createObjectURL(blob);
    current = { audio, url };
    const done = () => {
      if (current?.audio === audio) {
        URL.revokeObjectURL(url);
        current = null;
      }
      onEnd?.();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.src = url;
    await audio.play();
    onStart?.();
  } catch {
    if (mine !== token) return;
    if (hasSynth) {
      onStart?.();
      speak(text, lang, onEnd);
    } else {
      onEnd?.();
    }
  }
}

export function stopSpeaking() {
  token++;
  if (current) {
    current.audio.pause();
    URL.revokeObjectURL(current.url);
    current = null;
  }
  if (hasSynth) window.speechSynthesis.cancel();
}
