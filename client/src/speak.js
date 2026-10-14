// Read-aloud with the browser's built-in voices. Quality varies by phone —
// test on the demo phone (plan: 2:30 PM check).
const LOCALES = { en: 'en-US', es: 'es-US', pt: 'pt-BR' };

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text, lang, onEnd) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALES[lang] || 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === u.lang) || voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
