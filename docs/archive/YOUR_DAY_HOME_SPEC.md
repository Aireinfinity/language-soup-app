# Your Day — Home Screen Spec

**Goal:** Root the home in the **daily habit** of language learning. The main page is about **your day**: what you sent, daily challenge status, your week, stats, AI feedback, and a light check-in. Then you can look at your group chats (with notifications on the cards) and other stuff.

**Principle:** About half the screen = **your day** (personalized, habit-focused). The rest = **your people** (chats, DMs) + soup kitchen.

---

## Top half: "Your day"

1. **Section title:** "your day" (uppercase, muted).
2. **Daily challenge** — You sent it / not yet / done. Same hero block: today's challenge, responded X of Y, early bird, "see you tomorrow" when done.
3. **What you just sent** — If they have a recent voice message: "you sent in [Language] · 2m ago" (relative time). Makes the page about *their* day.
4. **Your week** — X days spoken this week (7 dots). Tap → profile.
5. **Want AI corrections or feedback?** — If they have a latest voice: **Correct Me** button (VoiceFeedbackButton) so they can get feedback on their latest without opening the chat. If no recent voice: "send a voice note today, then come back for AI feedback."
6. **How do you feel?** — "how's your practice today?" with emoji taps (😊 👍 😐 😤). UI in place; persistence (e.g. mood table or analytics) can be added later.
7. **Recent responses** — Social proof: others in their groups replying to challenges.
8. **Announcements** — One compact row when present.

---

## Divider

Visual separator so it's clear: your day above, your people below.

---

## Bottom: Your people + other

- **Your people** — Horizontal cards: DMs and groups. **Notifications (unread) on the cards** so they can see what needs attention.
- **Soup kitchen** — Support, request a language, browse groups (unchanged).

---

## Data

- **Latest voice:** `app_messages` where `sender_id = user.id`, `message_type = 'voice'`, order by `created_at` desc, limit 1. Join group language and challenge prompt for AI feedback context.
- **Days this week:** Distinct calendar days in last 7 days with at least one voice message (existing).
- **Display name:** From `app_users` for greeting (existing).

---

## Future options

- **Your stats** — One line on "your day" (e.g. "X mins this month") or "see your stats" → profile.
- **Mood persistence** — Store "how do you feel" in a simple table for reflection or product insight.
- **"What you sent"** — Link to the actual message in chat or open feedback modal directly from that row.

---

**Implementation:** `app/(tabs)/index.jsx` — section "your day", then divider, then "your people". Notifications on group/DM cards already exist via `unreadCount` and badge styling.
