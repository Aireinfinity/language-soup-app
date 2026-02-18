# Translation pipeline (simple, robust)

One place to understand how translations work and how to fix them.

---

## Free path (until users pay)

**Translations:** Use **DeepL only**. Do **not** set `GOOGLE_TRANSLATE_API_KEY`. The code tries DeepL first; if DeepL fails or the language is not supported by DeepL, it then tries Google. If Google has no key, it fails and we fall back to English. So with **only** `DEEPL_API_KEY` set, you pay nothing: DeepL free tier (500k chars/month, no card). For languages DeepL does not support, the app will show English for that group until you add Google later (or you can ship English-only challenges and translate only on the challenge card with a free model later).

**Pronunciation (phrases / vocab on the card):** Right now that uses **OpenAI TTS** in `voice-feedback` (paid). To do it free: use **Expo Speech** on the device for phrase/vocab playback (free, no API key), or another free TTS. So translations can stay free (DeepL); pronunciation is currently paid (OpenAI) and can be switched to a free option when you want everything free.

**Optional product direction:** Store challenge text in **English only**; on the challenge card when the user taps “see in my language” or hears the phrase, call a **free** translate (e.g. Llama/Grok API free tier, or on-device) and **free** TTS (Expo Speech). That way you never pay for translation or pronunciation until you have revenue. The current flow (translate at send time with DeepL, pronounce with OpenAI) is what you had; to keep it free, use DeepL only and consider swapping OpenAI TTS for Expo Speech for the card.

---

## Why this pipeline

- **Accurate, linguist-respected** – We lead with DeepL so translations are high quality and trusted by language people. We’re not pushing “AI AI AI” in the product; we use it where it helps (translation, TTS, etc.) without making it super user-facing.
- **Coverage** – DeepL doesn’t support every language, so Google Translate is the fallback. Whenever we add a language or someone requests one, we can support it (translation, and separately voice/TTS/STT where the app needs it).
- **Differentiation** – For smaller languages (e.g. Mooré) we use Hugging Face or another path so we can support requested languages others don’t.

**Goal:** Whenever we add a language, we get accurate translations (and the rest: voice-to-text, pronunciation, etc.) without a translation bottleneck.

---

## The pipeline (simplest possible)

1. **DeepL first** – We call `translate-text` (DeepL API). Best quality; preferred for all languages it supports.
2. **Google fallback** – If DeepL fails (unsupported language, quota, key issue, outage), we call `translate-google`. So new languages and edge cases still get a translation.
3. **Mooré** – Special path: DeepL (English → French) then Hugging Face (French → Mooré). No change needed unless you add more low-resource languages.

**Result:** You get a translation for every language we have a code for. DeepL when possible; Google when DeepL can’t do it. No “all English” unless both fail or the language isn’t in the mapping.

---

## What you need (Supabase secrets)

| Secret | Required | Use |
|--------|----------|-----|
| **DEEPL_API_KEY** | Yes | Primary. Set this first. Free tier: 500k chars/month; key often ends in `:fx`. Use [DeepL API keys](https://www.deepl.com/your-account/keys). |
| **OPENAI_API_KEY** | Optional | Same key as pronunciation (voice-feedback). If set, used for translation when DeepL fails (DeepL → OpenAI → Google). No extra key. |
| **GOOGLE_TRANSLATE_API_KEY** | Strongly recommended | Fallback for new languages and when DeepL/OpenAI fail. Without it, failures fall back to English. Get key: [Google Cloud Console](https://console.cloud.google.com/) → enable **Cloud Translation API** → Credentials → Create **API key**. Free tier: 500k chars/month. |

Set both in **Supabase → Project Settings → Edge Functions → Secrets**. After changing secrets, no need to redeploy; they’re read at runtime.

**Google and "Billing required":** The message "Cloud Translation API requires a project with a billing account" means you must **attach a billing account** (add a payment method) to the project. You are **not** charged for the free tier (500k chars/month). You only get charged if you go over that. Set a **budget alert at $0** in Google Cloud → Billing → Budgets so you get an email before any charge. If you prefer not to add a card at all, run on **DeepL only** until you need a language DeepL does not support.

**Why the free translate.google.com site is different:** The website is for human use in a browser; Google keeps that free. The **Cloud Translation API** is for apps and servers. Google has long required a billing account for the API (to limit abuse and to charge only if you exceed the free tier). So it is not a sudden change: the API has always worked that way. What you did for the past month for free was likely **DeepL only** (no card required for their free tier), or a Google project that already had billing attached. To keep doing translations without adding a card, use **DeepL only**; add Google only when you need a language DeepL does not support.

---

## Make DeepL work (when it’s broken)

1. **Key present** – Supabase → Edge Functions → Secrets. Confirm `DEEPL_API_KEY` is set (no typo, no extra spaces). **Free keys end in `:fx`** (e.g. `279a2e9d-...:fx`). We use `api-free.deepl.com`; Pro keys need `api.deepl.com` (code would need a switch).
2. **Trailing newline** – If you pasted the key from a doc or email, it might have a newline. The code now trims the key; redeploy `translate-text` so that fix is live.
3. **Redeploy the function** – So it uses the latest code and logs:
   ```bash
   cd code/dashboard && supabase functions deploy translate-text
   ```
4. **Trigger a translation** – Dashboard → Queue → open a challenge → Preview → “Regenerate translations”.
5. **Check logs** – Supabase → Edge Functions → **translate-text** → Logs. You’ll see either:
   - `DEEPL_API_KEY not set` → add the key in Secrets.
   - `DeepL 403: ...` or `DeepL 401: ...` → key invalid or auth issue. Ensure the key is correct; we use header auth: `Authorization: DeepL-Auth-Key <key>`.
   - `DeepL 456` or similar → quota or other DeepL error; message in the log.

Once DeepL is working, preview and cron use it first; then OpenAI (if `OPENAI_API_KEY` is set), then Google. You can also use **OpenAI for translations** (same key as pronunciation); see below.

---

## Have I been paying for pronunciation?

**Pronunciation** (phrase/vocab playback) uses **OpenAI TTS** in `voice-feedback`. So:

- **If `OPENAI_API_KEY` is set** in Supabase secrets and users tap pronunciation, each successful request uses OpenAI TTS (paid).
- **If the key isn't set** (or the request fails), the function returns no URL and some UI falls back to **Expo Speech** on the device (free). So if you never set the key or it was failing, you haven't been paying for pronunciation.

Check: Supabase → Edge Functions → Secrets. If `OPENAI_API_KEY` is there and pronunciation has been working, you've been using OpenAI TTS. To go free, use Expo Speech only or skip the pronunciation API when the key is missing.

---

## Using OpenAI for translations (same key as pronunciation)

If you already use OpenAI for TTS and want one less provider, we use **OpenAI for translations** when DeepL isn't working.

- **Pipeline:** DeepL first → **OpenAI** (if `OPENAI_API_KEY` is set) → Google. So if DeepL is broken, we try OpenAI before Google or English.
- **Secret:** Same `OPENAI_API_KEY`. No new key.
- **Edge Function:** `translate-openai` calls the OpenAI chat API with a "translate to [language], return only the translation" prompt.

---

## Adding a language (one place, then sync)

**Single source of truth:** `code/dashboard/src/languageUtils.js`

1. **Edit only `languageUtils.js`:**
   - In `getDeepLLangCode`: add a line like `if (lang.includes('X') || lang.includes('Y')) return 'XX';` (DeepL code). If DeepL doesn’t support the language, don’t add a DeepL line; we’ll use Google.
   - In `getGoogleLangCode`: add the same pattern and return the Google code (e.g. `'xx'`). For languages that only Google supports, add to the `autoDetect` object at the bottom if they’re single-word names.
2. **Sync to the cron:** Copy the updated `getDeepLLangCode` and `getGoogleLangCode` from `languageUtils.js` into `supabase/functions/send-scheduled-challenges/index.ts` (replace the existing functions there). Use the same `includes()` logic; convert to TypeScript (e.g. `(language: string): string | null`).
3. **Redeploy:** `supabase functions deploy send-scheduled-challenges`.

**Voice-to-text / pronunciation / vocab** for a new language are separate (TTS, STT, challenge cards). This pipeline only covers **text translation**. For full “app works in this language” you’ll also add any needed TTS/STT mappings elsewhere.

---

## Why we miss languages (and how not to)

We missed **Kyrgyz** and **Montenegrin** because groups were created with those language names, but the **translation code mappings** (DeepL/Google codes) only exist when we've explicitly added them to `languageUtils.js` (and synced to the cron). There's no automatic "any new language from SupportedLanguages gets a code" step. So whenever a group uses a language name we haven't mapped, preview and cron show English for that group until we add the mapping.

**How not to miss more:**

1. **When you add a language to the app** (onboarding, SupportedLanguages, or a new group type): add it to `languageUtils.js` in the same pass (either an `includes()` line or an `autoDetect` entry). Then sync to `send-scheduled-challenges/index.ts` and redeploy.
2. **Periodic check:** Compare distinct `language` from `app_groups` to what we have codes for. Any group language that would return null from getDeepLLangCode/getGoogleLangCode is a candidate for "showing English" — add it.
3. **Preview is your canary:** If the dashboard preview shows English for a row that should be translated, that language is missing from the mappings. Add it (see "Adding a language" above), sync cron, redeploy.

Optionally: a small script or dashboard note that lists "languages in use" vs "languages with translation codes" so gaps are visible.

---

## Where the code lives

| Piece | Location |
|-------|----------|
| **Language codes (edit here first)** | `src/languageUtils.js` – `getDeepLLangCode`, `getGoogleLangCode` |
| Dashboard + preview + backfill | `src/translationHelper.js` – `translateText()` calls `translate-text` → `translate-openai` → `translate-google` |
| Cron send | `supabase/functions/send-scheduled-challenges/index.ts` – `translateAtSend()`; keep its getters in sync with languageUtils.js |
| DeepL API | `supabase/functions/translate-text/index.ts` |
| OpenAI (optional, same key as TTS) | `supabase/functions/translate-openai/index.ts` |
| Google API | `supabase/functions/translate-google/index.ts` |

---

## Summary

- **Why:** Accurate, linguist-respected (DeepL); not “AI AI AI” user-facing; coverage via Google; small languages (e.g. Mooré) via Hugging Face.
- **Pipeline:** DeepL first → OpenAI (if `OPENAI_API_KEY` set) → Google fallback. Secrets: DEEPL, optional OPENAI (same as TTS), optional GOOGLE. Mooré = DeepL→HF.
- **Adding a language:** Edit **only** `src/languageUtils.js`; then copy the same `getDeepLLangCode` / `getGoogleLangCode` into `send-scheduled-challenges/index.ts` and redeploy. One place to edit, one sync step.
- **Make DeepL work:** Set `DEEPL_API_KEY`, deploy `translate-text`, trigger a translation, read the logs. Add `GOOGLE_TRANSLATE_API_KEY` so new languages and fallback never leave you with “all English.”

For detailed debugging (e.g. Logs Explorer queries), see **DEV_BUILD_BUG_CHECKLIST.md** → “Translations” and “How to verify translations”.
