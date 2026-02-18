# Dev build bug checklist

Bugs to verify in a **dev build** (local/Expo dev). Code changes are not in your current internal/TestFlight build until you create a new build from the updated repo.

---

## Already fixed in code (verify in dev build)

### 1. Podcast mode (Community): skip + React in chat
- **Was:** In Community, tap podcast mode → couldn’t skip to next/previous person; couldn’t reply because group chat didn’t load.
- **Fix:** `playAudio` no longer clears the queue when starting or skipping in podcast mode, so skip next/prev work. React in chat should work (same layout).
- **Verify:** Community → podcast mode → skip next/prev works; tap “React in chat” → group chat opens and loads.

### 2. Voice memo notifications: 7 notifications + sender getting notified
- **Was:** Sending one voice memo caused 7 “someone sent a voice memo” notifications; sender also got a notification.
- **Fix:** `notify-challenge-reply` Edge Function re-enabled with: exclude sender; dedup (max 1 per user per 2 min via `claim_challenge_reply_notification_slots`). Redeploy the function for production.
- **Verify:** Send one voice memo → you get no notification; others get at most one.

---

## Fixed in code (verify in dev build)

### 3. Challenge sentence/vocab tap-to-play: wrong or weird audio
- **Where:** Daily challenges tab (Today); challenge card.
- **What:** Tapping a sentence or vocab word to hear pronunciation sometimes doesn’t say what’s written; audio sounds wrong or weird.
- **Context:** TTS uses `voice-feedback` (pronunciation task) with fallback to Expo `Speech.speak`; language mapping from challenge language (e.g. Farsi, Spanish, French). Possible causes: wrong language code, bad API response, or fallback speaking wrong text.
- **Fix:** Use real `group_language` (passed as `groupLanguage`). Non-English uses Expo Speech; English uses API. Expanded language-to-ISO mapping. Text normalized (strip zero-width chars). **Verify:** Tap phrase/vocab on Spanish/French challenge; hear correct language.

### 4. Listen-back player overlaps shuffle on daily challenge
- **Where:** Daily challenges tab; after recording, when listening back before send.
- **What:** The listen-back player (waveform + play/trash/send) covers or overlaps the “other ideas” shuffle button; spacing is good while recording but not in review.
- **Ask:** Use the same vertical spacing as recording (waveform area + button row) so the listen-back block doesn’t overlap the shuffle.
- **Fix in progress:** Review block spacing tightened (smaller gap) so it’s closer to recording layout height.

### 5. Podcast mode / group chats: long spinner, slow load
- **Where:** Podcast mode (Community or Today); loading group chats in general.
- **What:** Spinner shows for a long time; group chats feel slow to load.
- **Ask:** Make loading faster (queries, caching, or UX like skeleton/placeholder).
- **Context:** Podcast mode fetches recent voice messages across user’s groups; Community loads memberships + messages for chat list. May need query limits, indexes, or loading-state improvements.

### 6. React in chat: group chat didn’t load (if still happening)
- **Where:** Podcast mode → “React in chat” → group chat screen.
- **What:** Sometimes the group chat doesn’t load (blank, spinner, or error).
- **Verify first:** After the podcast skip fix, try “React in chat” again in dev. If it still fails, capture: blank screen vs spinner vs error; whether it happens from Community only or also from Today.

---

---

## Translations still broken (preview / send / backfill)

**Context:** Preview was showing all English; auto-translate and Backfill used to work. Working example: "what's your love language" challenge. Broken example: "what would you go on a solo artist day just to fill the well?" (today’s prompt). Something may have changed between yesterday’s prompt and today’s (e.g. around archiving profiles and a pushed change).

**When you’re back, have handy for debugging:**

- What you see in the preview (e.g. "all English", "some languages missing").
- Whether Backfill ran and how many it said it updated.
- Any errors or `[TranslateText]` / `translate-text` logs in the browser console when you open the globe or run Backfill.

**Likely places to check:** `QueueTab` uses `groups` from App (all `app_groups`); preview/Backfill/send all use `translateText` → `translate-text` (DeepL) or `translate-google`. If DeepL/Google fail or lang codes are wrong, the UI fallback is English. Check Supabase Edge Function logs for `translate-text` and that `groups` in the dashboard actually include multiple languages.

### Exactly what broke (deep dive from chat history + code)

**When things first broke (what you said):** You had **deleted a bunch of profiles and lost the challenges that were queued**. We tried to fix that (recover/restore the queue). Around the same time we **changed the send-scheduled-challenges Edge Function**: it used to call the translate API at send time; we changed it to **use the dashboard's saved translations** from the DB instead. You said you're pretty sure **it was when we changed the edge function that broke things**. Before that change, the cron translated at send time, so even if the dashboard had bad/empty translations, the cron could still send correct text. After the change, the cron only reads from the DB, so we became 100% dependent on the dashboard having saved good translations; if the DB had empty or wrong data (e.g. recovered challenges without translations), the cron sent English. So the **edge function change** is what made the break visible.

**Console finding (Feb 2026):** The globe/preview is **not** breaking translations. Every request to **translate-text** (DeepL) and **translate-google** returns **500 Internal Server Error**. So add-to-queue and preview both call the APIs, get 500, fall back to English, and we save "English twice". **Where to see the real error:** Supabase Dashboard → Edge Functions → open **translate-text** (or **translate-google**) → **Logs** tab. Or from repo: `curl` the deployed function and read the JSON `error` in the 500 response (see below).

**What actually happened (from Antigravity):** On **Jan 11**, a "rotate secrets" commit/run likely **wiped** `DEEPL_API_KEY` and `GOOGLE_TRANSLATE_API_KEY` from Edge Function secrets. The translation logic never broke; both APIs started failing (missing keys), the cascade fell back to English, and the dashboard saved English everywhere. So: restore the keys; the code is fine (except DeepL auth, see below).

**Actual errors (from curling deployed functions):**
- **translate-google:** `GOOGLE_TRANSLATE_API_KEY not configured` → Set the secret in Supabase: Dashboard → Project Settings → Edge Functions → Secrets, or `supabase secrets set GOOGLE_TRANSLATE_API_KEY=your-key`.
- **translate-text:** DeepL deprecated form-body auth (Nov 2025). Error: "Legacy authentication method 'form body' is no longer supported". **Fix applied:** `translate-text` now uses header-based auth (`Authorization: DeepL-Auth-Key <key>`) and JSON body. Redeploy with `supabase functions deploy translate-text`. The function now logs the exact DeepL response on failure (status + body), so after redeploying, trigger a translation (e.g. Regenerate in preview) and check Supabase → Edge Functions → translate-text → Logs to see the real error (e.g. 403, invalid key, quota).

**When rotating secrets:** After rotating, re-set all Edge Function secrets. Full list is in `code/dashboard/supabase/functions/.env.example` (DEEPL, GOOGLE_TRANSLATE, HUGGINGFACE, MODERNMT, OPENAI, GROQ). Keep a local `supabase/functions/.env` with values so you can re-paste into Supabase.

**Logs Explorer (Explore via query):** In Dashboard go to **Logs → Logs Explorer** (or **Explore**). Pick the source, then run one of these to narrow the 100+ logs down.

- **Only translate functions that returned 500** (source: `function_edge_logs`):
```sql
select
  datetime(t.timestamp) as time,
  t.event_message,
  m
from function_edge_logs as t
cross join unnest(t.metadata) as m
where regexp_contains(t.event_message, 'translate-text|translate-google')
  and regexp_contains(t.event_message, '500|error|Error')
order by t.timestamp desc
limit 50
```

- **Only internal function logs (errors/console)** for translate (source: `function_logs`):
```sql
select
  datetime(timestamp) as time,
  event_message,
  metadata
from function_logs
where regexp_contains(event_message, '(?i)translate|error|Error|exception|DEEPL|GOOGLE|api.?key')
order by timestamp desc
limit 50
```

- **Simplest: recent errors from any function** (source: `function_logs`) — often shows the actual exception (e.g. missing API key):
```sql
select datetime(timestamp) as time, event_message, metadata
from function_logs
where regexp_contains(event_message, '(?i)error|exception|failed|undefined')
order by timestamp desc
limit 30
```

If your Explorer uses different column names, try the same filters on `event_message` and `timestamp`; the important part is filtering by "translate" and "500" or "error" so you see only the failing translate requests and their server-side error message.

**WebSocket failed:** If the browser shows WebSocket connection failed and the URL contains `%0A` at the end of the anon key, the env var (e.g. `VITE_SUPABASE_ANON_KEY`) has a trailing newline. Trim it in `.env` / Vercel env.

---

### How to verify translations (without breaking anything)

**Current behavior:** `send-scheduled-challenges` translates **at send time** (DeepL then Google) per group. It does not rely on the dashboard’s saved translations for sending; those are for preview and backfill only.

**API keys:** We try **DeepL first** (DEEPL_API_KEY), then **Google Translate** (GOOGLE_TRANSLATE_API_KEY) as fallback. You need **at least one** set in Supabase → Project Settings → Edge Functions → Secrets. If DeepL fails (wrong key, auth, quota), we use Google; if both are missing or invalid, you get all English. So you do need the Google key as a fallback unless DeepL is 100% working.

**Safe ways to confirm translations are working:**

1. **Dashboard preview (same pipeline as send):** Queue tab → open a challenge → click the globe / “View translations” (or open preview). If you see real translated text for each language (not just English repeated), the same Supabase Edge Functions (`translate-text`, `translate-google`) that the cron uses are working. No send, no data change.
2. **Browser console:** When you open the preview, watch for `[TranslateText]` and `[QueueTab openPreview]` logs. You should see “DeepL OK” or “Google OK” and non-fallback lines. Any 500 or “returning English fallback” means the API or keys need checking.
3. **After a real send:** Supabase Dashboard → Edge Functions → **send-scheduled-challenges** → Logs. Look for “Inserted into: …” and no translation errors. If something failed at send time, it will show there.
4. **Backfill (optional):** “Backfill Translations” on the Queue tab only updates saved translations in the DB for preview/audit; it does not change what gets sent (send path translates on the fly). Running it is safe; it just repopulates the `translations` column.

**Summary:** Preview = same APIs as send. If preview looks good, send will too. Use preview + logs to confirm without touching production.

---

**Revert applied:** The **send-scheduled-challenges** Edge Function was reverted to **translate at send time** again: for each group it now calls the translate API (DeepL then Google fallback) with the clean challenge text and builds `#challenge\n{english}\n{translated}`. It no longer depends on the dashboard's saved translations. Deploy with: `supabase functions deploy send-scheduled-challenges`.

- **Timeline:** Translations were working on Feb 16. After that, new/regenerated challenges showed “all English” in preview and sent “English twice” to groups. 14 approved challenges in the calendar have the bad payload.

- **Send path is not the cause.** Both `send-scheduled-challenges` and `auto-send-challenges` **only read** `challenge.translations` from the DB and send that. They do not call the translate API at send time. So the wrong text is whatever was **saved** by the dashboard.

- **What gets saved when translation “fails”:** For non‑English we store `#challenge\n{English}\n{translation}`. When `translateText()` fails (DeepL and Google fallback both fail), `translationHelper.js` returns the original English. So we save `#challenge\n{English}\n{English}` → “English twice.”

- **Root cause (from prior chat session):** In an earlier session we fixed the send path to use saved translations, and we had also changed the dashboard to pass **clean prompt only** (no `#challenge` prefix) to the translate API. You asked for the “simplest” fix and were worried we were changing too much, so we **reverted** the translation logic and kept only the send-path fix. After that revert:
  - **We again passed full `challenge.challenge_text`** (including `#challenge\n...`) into `translateText()` everywhere: add-to-queue, preview, approve-on-the-fly, regenerate.
  - So the **code that has been running** sends the full string (e.g. `#challenge\nwhere would you go on a solo artist date...`) to DeepL/Google. If the API fails or misbehaves with that input (e.g. format, quota, or key), we fall back to English and store “English twice.”

- **Archiving:** You mentioned “when I archive the profiles and you pushed a change.” The migration **20260219_scheduled_challenges_on_claim.sql** (Feb 19) only updates `created_by` on `app_scheduled_challenges` when claiming/archiving a profile; it does **not** touch the `translations` column or any translation path. So archiving didn’t directly break translations; the “push” was likely the reverted dashboard code (send path fixed, but “pass full challenge_text to API” restored).

- **Summary:** The exact break is **the reverted behavior**: dashboard passes full `challenge_text` (with `#challenge`) to the translate API. When that path fails (for whatever reason), we store and then send the English fallback → “English twice.” The fix (already applied in a later session) is to pass **clean prompt only** (`cleanEnglish`) to `translateText()` in saveDraft, openPreview, and regenerateTranslationsInPreview, and to treat “translation is just English” as missing in Backfill so those 14 challenges get re-translated.

---

## Build note

- **Internal/TestFlight build:** Does **not** include these changes until you run a new build (e.g. EAS build) from the repo with the latest code.
- **Dev build:** Run the app from the repo (e.g. `npx expo start` + dev client) to test the fixes and the items above.

---

## How to do better next time (so we can see commits and what’s live)

Chat history helps, but we often can’t see **which commit or Vercel deployment** had which behavior. To make rollbacks and debugging easier:

1. **Commit and push regularly**  
   Small commits (e.g. “dashboard: add-to-queue auto-translate”, “edge: use saved translations”) mean `git log` shows what changed and when. Avoid squashing everything into one commit so the repo has a real history.

2. **Log what you deploy**  
   When you (or the agent) deploy the dashboard or an edge function, add one line to **`docs/DEPLOYMENTS.md`** (see below): date, what was deployed, and one-line behavior. Example:  
   `2026-02-17 | Dashboard (Vercel promote Feb 11) | add-to-queue auto-translate, backfill, approve. Edge: translate-at-send.`

3. **After a “working” deploy, snapshot it**  
   When things are working, note it in that doc:  
   “Production as of [date] = Vercel deployment X / commit Y. Has: …”  
   Then next time we can promote that deployment or compare to that commit.

4. **Vercel deployment IDs**  
   When we list deployments (`vercel list`) or inspect one (`vercel inspect <url>`), we get a deployment id (e.g. `dpl_4HcyCFr17LtiueyjJcCvTERUA6om`). Pasting that id and the date into `DEPLOYMENTS.md` makes “roll back to the working one” unambiguous.

**New file:** `code/dashboard/docs/DEPLOYMENTS.md` — use it as a short running log of what’s live and what each deploy contained. The next agent (or you) can read it plus chat history and know exactly which deployment had “translations working.”
