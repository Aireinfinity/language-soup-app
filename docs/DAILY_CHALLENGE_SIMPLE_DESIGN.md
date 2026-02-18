# Daily challenge: simple “set and forget” design

**Goal:** Noah batches challenges ~once a month. The only thing he thinks about is *which prompts* to pick. Everything else (translations, scheduling, timezones, sending) runs on its own. He can check “what’s going out tomorrow,” edit for a holiday, and otherwise leave it alone.

---

## What “done” looks like

1. **Once a month (or whenever):** Noah goes to the admin dashboard, adds/approves a batch of challenges to the queue. Each challenge is one English prompt; translations are generated automatically and stored. He doesn’t think about DeepL vs Google or language codes.

2. **Every day:** The system sends “today’s” challenge to each group at a **good local time** for that group’s users (e.g. morning window), not the same UTC for everyone. No manual “send” step.

3. **When he wants to look:** Dashboard shows something like “Going out tomorrow: [prompt]” and “Next 7 days: …”. He can click to edit or swap (e.g. holiday). No daily babysitting.

4. **Adding languages:** He adds a group with a language; translations for that language either work (DeepL/Google/Mooré pipeline) or the system falls back cleanly. He doesn’t maintain mapping tables.

---

## Simplest path to get there

### 1. Translation: one path, no guessing

- **Single translation entry point:** One Edge Function (e.g. `translate-text`) that accepts `{ text, targetCode }`. It decides internally: DeepL → Google fallback, or Mooré pipeline for `mos`. Dashboard always calls this; no per-language branching in the dashboard.
- **Stable language codes:** Groups have a `language_code` (e.g. `es`, `fr`, `fa`, `mos`) set when the group is created/edited. All translation and send logic uses that. No parsing “Farsi (فارسی)” in multiple places.
- **Queue flow:** “Add to queue” = for each group’s `language_code`, call the single translate function, store results. Preview/backfill use the same path. No special cases in the UI.

### 2. Scheduling: timezone-aware, one “next challenge” per day

- **User timezone:** Store `time_zone` (e.g. `America/New_York`) on the user profile. Collect on signup/onboarding and allow edit in settings. For existing users: infer from device or ask once in-app.
- **Send logic:** A cron (e.g. every hour or every 30 min) runs and asks: “For each user, is it currently in their ‘morning’ window (e.g. 8–11am local)?” If yes and we haven’t sent today’s challenge to them yet, send the next challenge from the queue for their group(s). One “today’s challenge” per user per day.
- **Queue model:** Approved challenges are ordered (e.g. by `scheduled_for` or a simple “next” pointer). The send job picks “the next challenge” per group (or per global calendar) and sends it. No need for Noah to assign specific challenges to specific days except when he wants to (e.g. holiday swap).

### 3. Admin dashboard: queue view + “what’s next”

- **Queue tab:** Shows the batch of approved challenges. Noah can add, reorder, or remove. “Add to queue” generates translations once and stores them; no daily steps.
- **“What’s going out”:** A small section: “Tomorrow: [prompt]” and “Next 7 days: [list].” Optionally show per-timezone send windows (e.g. “US-East ~9am, EU ~10am”) so he can sanity-check.
- **Edit when needed:** Click a day or a challenge to edit text or swap for a holiday. Rest of the time he doesn’t touch it.

### 4. What we’re not doing (to keep it simple)

- Noah doesn’t pick “which API” per language; the single translate function does.
- He doesn’t manually schedule “challenge A on Monday, B on Tuesday”; the system uses the queue order and “next challenge per day” (with optional overrides for holidays).
- He doesn’t need to “run” sends; the cron does it at the right local time.

---

## Implementation order (suggested)

1. **Translation simplification** (already partly done: DeepL fix, extended codes). Next: add `language_code` to groups, single translate function contract, dashboard only calls that. So “add to queue” and preview are trivial.
2. **User timezone** – Add `time_zone` to `app_users`, collect in onboarding/settings, backfill existing users (infer or one-time prompt).
3. **Send logic** – Change cron to “for each user, is it morning local? send next challenge if not sent today.” Reuse existing queue/approved challenges table.
4. **Admin “what’s next”** – Queue tab shows “Tomorrow” and “Next 7 days” and, if useful, per-timezone send times. Edit on click.

---

## Success criteria

- Noah batches challenges once a month (or ad hoc) and doesn’t think about translations or send mechanics.
- He can open the dashboard and see “what’s going out tomorrow” and the next few days; he can edit for holidays.
- Challenges go out at a reasonable local time for users (no 3am sends).
- He can enjoy the app and build features instead of running daily challenge ops.

---

## “Daily pulse” + BeReal-style timing (detailed)

**Bar:** Users feel “oh my gosh, that’s happening today?” or “I’m going to do my challenge right now because everyone’s out in my timezone” or “they get it – they know what’s going on.” Prompts are specific to the moment (Saturday afternoon “how was your Friday night?”, Sunday brunch, Valentine’s weekend, gloomy day, etc.).

### Global moment vs local windows (explained)

- **Global moment:** We pick **one** time for the whole world (e.g. 2:47pm UTC). Everyone gets the notification at that same instant. So it’s 2:47pm in Paris and 8:47am in LA – same “drop,” different local times. BeReal does this.
- **Local windows:** We send when it’s “good” in **each user’s** timezone. So LA user gets it at 9am LA time, Paris user at 9am Paris time – different UTC moments, but everyone gets it in a “good” local window.

**For Language Soup:** We use **local windows** so nobody gets 3am. The system picks a time each day (random-ish but in a good window, and context-aware: weekday vs weekend, Friday evening, etc.). Each user gets **notified** when it’s that good time in **their** timezone. So Tokyo might get it at 9am their time, LA at 9am their time – staggered sends, same challenge.

### One post in the group chat (no duplicate)

- **One challenge per group per day.** We don’t post the challenge multiple times. We **post it once** to the group (one message / one “today’s challenge” record).
- **Notifications are staggered by timezone.** When it’s “go” time in *your* timezone, you get a push/in-app “your challenge is here” – but when you open the group, you see the **same** challenge thread everyone else sees. So: LA person might get the notification 8 hours after Tokyo person, but the group chat shows one challenge, not two. Easy logic: one post, many notification times.

### Who picks the time

- **System picks** the time each day (random in a good window, not predictable). Noah can **edit** if he wants a specific time for a specific day (e.g. “this one at 7pm local”).
- **Holidays/events:** We **predict** them (New Year’s, Valentine’s, St. Patrick’s, Easter, solstice, eclipse, etc.). We have a **pool** of holiday/event prompts; when the system detects the date or event, it picks from that pool. Noah doesn’t set every holiday manually – he can double-check a mock calendar and edit the odd day (e.g. election) if needed.
- **Special times:** New Year’s → midnight local. Valentine’s, etc. → good default logic (e.g. morning or evening). As we learn when people are more active, we lean into those times (random but biased toward engagement).

### Preload once, set and leave

- Noah checks at the top of the week or every few days: “what’s going out?” Queue is set for the rest of the month/year. He might edit one day for Valentine’s or an election. Daily flow = set and leave. No daily ops.
- **Timezone for users:** Easiest and automatic – “where are you living?” or device default once, then forget. Existing users: one-time ask or default from device/settings.

### Is this hard?

No. The pieces are: (1) one “today’s challenge” per group per day, posted once; (2) cron that runs often and, per user, “is it good time in their timezone? if yes and not sent yet, send **notification** (and ensure challenge is posted if not already)”; (3) holiday/event calendar + prompt pool so the right prompt goes out on the right day; (4) time picker logic (random in window, context-aware). No duplicate in group chat – one post, staggered notifications.

### Why not global moment?

With one global time (e.g. 2:47pm UTC), everyone gets it at the same instant – so 2:47pm in Paris might be 6am in LA. Someone's always at a bad local time. So we use **local windows**: each person gets the notification when it's a good time *for them* (e.g. morning or afternoon their time). Same challenge, one post; many notification times.

### Learning loop: get better over time

- **Track what works:** Which prompts get the most responses (replies, voice notes, engagement)? What times (per timezone or overall) get the most responses?
- **Use it:** Over time, bias toward prompts and times that perform well. Eventually: suggest prompts or times to Noah ("these 5 prompts had highest response rate last month"), or auto-adjust the "good window" per region based on when people actually respond.
- **Goal:** Constantly learn so the product gets better – better prompts, better timing – without Noah having to guess.

### Prompt style (what we're aiming for)

- **Mix:** Dinner party vibe, light prompts you can talk about, deeper ones people want to talk about (especially in another language). "Oh my gosh, so easy" + "I want to share this."
- **Inspiration:** Artist's way, comedians (e.g. Jessica Kirson), prompts that get people talking and sharing. Auto-generate or curate with that flavor.
- **Learning:** As we track response rates, we can double down on what works and refine the mix.
