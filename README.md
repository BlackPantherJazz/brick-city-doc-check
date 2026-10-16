# Brick City Doc Check

Take a photo of a landlord's letter and get a plain-language verdict (green / yellow / red), a read-aloud button, and a ready-to-send reply letter, in English, Spanish, or Portuguese. Built for Newark, NJ tenants.

> **The AI reads and explains. Plain code makes the legal call.** Nothing is stored.

## What's new in v2

- **The AI shows its work.** After reading a photo, highlighter strokes swipe across every fact the AI found: rent, dates, landlord, and court language (pink). Tap a stroke to jump to its field; tap a field to light up where it came from.
- **A scanner line sweeps the photo while the AI reads it.** No more spinner.
- **Rent-control rules now match the ordinance.** Rent control covers all Newark rentals except owner-occupied buildings with 4 or fewer units (and a few other exemptions), not just 3+ unit buildings. Increases between 4% and 5% trigger one follow-up question: "Does your landlord live in your building, and does it have 4 apartments or fewer?"
- **The sample buttons show real photos with highlights** and work with no AI and no internet, so they're stage-proof.

## Run it (about 2 minutes)

```bash
npm install
cp .env.example .env      # leave the key blank to use mock mode
npm run dev               # opens on http://localhost:5173
npm test                  # 9 rules tests: all 3 sample notices + edge cases
```

**To test on your phone:** connect it to the same wifi as your laptop, then open the `Network:` address that `npm run dev` prints (for example `http://192.168.1.20:5173`).

**Mock mode:** with no AI key in `.env` (neither `GEMINI_API_KEY` nor `ANTHROPIC_API_KEY`), the server returns sample data instead of calling an AI, so the whole flow still works. If you upload a photo whose filename contains `illegal` or `court`, you get that sample back. The **sample buttons** on the home screen never call the AI, so they double as your **wifi-failure fallback on stage**.

**Real AI:** pick one, put the key in `.env`, and restart. Never commit `.env`.

- **Gemini (free):** get a key at aistudio.google.com → **Get API key**, then set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...`. Free-tier limits apply. If you hit one you'll get a 429, and the explanation falls back to template text. Google's free tier may use what you send to improve its products, so only send **fake** notices.
- **Claude (paid):** get a key at console.anthropic.com, which is billed separately from a Claude.ai subscription. Set `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY=sk-ant-...`.

**Why two providers?** The build plan started on Claude; Gemini was added as the free option for the hackathon. Keeping both makes the AI layer swappable: one line in `.env` switches providers, and the legal rules never change.

`server/ai.js` picks the provider. `server/gemini.js` and `server/claude.js` send the same two prompts, so the rules, screens, and mock mode don't change.

## How a request flows

```
 phone photo
     │  client/src/image.js shrinks it to a ~300 KB JPEG (also converts iPhone HEIC)
     ▼
 POST /api/read ──▶ AI CALL 1 (server/ai.js → gemini.js or claude.js, READ_PROMPT) → JSON facts
     ▼
 Confirm screen: tenant fixes any misread numbers + answers "how many apartments?"
     ▼
 POST /api/explain
     ├─ server/rules.js  checkNotice()  ← PLAIN CODE decides the color
     │     └─ needs more facts? → back to Confirm and ask (never guesses)
     └─ AI CALL 2 (explainPrompt) → explanation in the tenant's language + English letter
            └─ if the AI fails, falls back to template text so the demo never dead-ends
     ▼
 Result screen: big color verdict, Listen button, reasons, checklist, letter, help numbers
```

The verdict headline always comes from `rules.json` (translated ahead of time), never from the AI, so the AI can't soften or change the legal call.

## File map: who works on what

| File | What it does | Owner |
|---|---|---|
| `server/rules.json` | All the numbers (4% cap, 5% line, 30 days), verdict wording in 3 languages, legal-help phone numbers | rules/prompts person |
| `server/rules.js` | The decision order from the build plan, step by step | rules/prompts person |
| `server/rules.test.js` | Proves all 3 test notices get the right color | everyone: run `npm test` |
| `server/boxes.js` | Cleans up the AI's highlight boxes (keeps only well-formed ones) | build |
| `client/src/components/NoticePhoto.jsx` | The photo with the scanner line and highlighter strokes | build / design |
| `scripts/make-samples.py` | Rebuilds the fictional sample photos and measures their highlight boxes into `server/sample-boxes.json` | build |
| `client/public/samples/` | The sample photos the sample buttons show | demo |
| `server/prompts.js` | The two prompts, word for word from the plan | rules/prompts person |
| `server/ai.js` | Picks the AI provider from `AI_PROVIDER` in `.env` (default: Gemini) | build |
| `server/gemini.js` | The two AI calls via Google Gemini (free tier). Retries when Google is busy, then falls back to a lighter model | build |
| `server/claude.js` | The same two calls via Anthropic Claude (optional, paid). Unused unless `AI_PROVIDER=claude` | build |
| `server/mock.js` | Sample notices, template explanations, and the letter template | build |
| `server/index.js` | Express routes: `/api/info`, `/api/read`, `/api/explain` | build |
| `client/src/App.jsx` | Which screen shows (a small state machine) | build |
| `client/src/screens/*` | Upload, Confirm, and Result screens | build / design |
| `client/src/i18n.js` | Every on-screen word in EN, ES, and PT | anyone who speaks ES/PT |
| `client/src/styles.css` | Phone-first look and verdict colors | design |
| `test-notices/` | 3 fictional notice images for testing (legal, illegal, court) | demo |

## Before the demo: verify checklist

Everything in `server/rules.json` is marked `VERIFY`. The app shows orange **DEV** labels until you fix it.

- [ ] Rent control: 3+ units, lower of 4% or CPI. Find the current CPI and put it in `cpiPercent`
- [ ] 5% "unconscionable" line (2023 ordinance). Fine amount: $1,200 or $1,250?
- [ ] 30-day notice period
- [ ] Rental registration requirement
- [ ] Phone number for the **Newark Office of Tenant Legal Services** (currently blank)
- [ ] LSNJ hotline number. Confirm it, then set `"verified": true`
- [ ] Set `meta.verified: true` and `meta.rulesLastChecked: "2026-10-14"`
- [ ] Have a native speaker skim the ES/PT text in `i18n.js`, `rules.json`, and `mock.js`
- [ ] Test the **Listen** button in Spanish on the actual demo phone

## Deploy (Render, free)

1. Push this repo to GitHub.
2. On render.com, create a **New Web Service** and pick the repo.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Under **Environment**, add `AI_PROVIDER=gemini` and `GEMINI_API_KEY` (or `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY`).
5. Open the `.onrender.com` link on the demo phone **over venue wifi** before 4:00.

Note: Render's free tier sleeps after about 15 minutes idle, and the first load can take about 30 seconds. Open the link a minute before you go on stage.
