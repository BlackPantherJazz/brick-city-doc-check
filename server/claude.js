// The two Claude calls. Everything AI-related lives in this one file.
import Anthropic from '@anthropic-ai/sdk';
import { READ_PROMPT, explainPrompt } from './prompts.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
let client = null;

export function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
}

/** Claude sometimes wraps JSON in ```json fences or adds a sentence. Grab the {...} part. */
function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

function textOf(message) {
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

/** CALL 1 — read the photo. The image only ever lives in memory. */
export async function readNotice(imageBuffer, mediaType) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBuffer.toString('base64') } },
          { type: 'text', text: READ_PROMPT },
        ],
      },
    ],
  });
  return parseJson(textOf(message));
}

/** CALL 2 — explain the code's verdict and draft the letter. */
export async function explain({ fields, check, language }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: explainPrompt({ fields, check, language }) }],
  });
  const out = parseJson(textOf(message));
  if (check.status === 'escalate') out.letter = null; // belt and braces: never a letter for court papers
  return out;
}

export { MODEL };
