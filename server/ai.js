// Picks which AI does the two calls. The rest of the app doesn't care.
//
//   AI_PROVIDER=gemini  -> Google Gemini (free tier)   needs GEMINI_API_KEY
//   AI_PROVIDER=claude  -> Anthropic Claude            needs ANTHROPIC_API_KEY
//   no key at all       -> mock mode (sample data)
//
// If AI_PROVIDER is blank, it uses whichever key you've filled in.
import * as claude from './claude.js';
import * as gemini from './gemini.js';

function pick() {
  const wanted = (process.env.AI_PROVIDER || '').toLowerCase();
  if (wanted === 'gemini' || (!wanted && process.env.GEMINI_API_KEY)) {
    return { name: 'gemini', model: gemini.GEMINI_MODEL, ready: Boolean(process.env.GEMINI_API_KEY), impl: gemini };
  }
  return { name: 'claude', model: claude.MODEL, ready: Boolean(process.env.ANTHROPIC_API_KEY), impl: claude };
}

export const PROVIDER = pick();
export const MODEL = `${PROVIDER.name}: ${PROVIDER.model}`;
export const hasKey = () => PROVIDER.ready;
export const readNotice = (...args) => PROVIDER.impl.readNotice(...args);
export const explain = (...args) => PROVIDER.impl.explain(...args);
