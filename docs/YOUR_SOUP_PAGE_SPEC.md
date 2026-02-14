# Your Soup Page – UX Spec

**Design principle:** Not HelloTalk (overcrowded), not Duolingo (game), not Babbel (classroom). We are **daily voice memos** in a low-pressure community. One hero, cards only where they add value, rest lightweight.

**Vibe we show:** We're revolutionizing language learning with a **community-based, voice-first** app. The UI should make that obvious at a glance:
- **Voice first:** Hero says "speak" not just "challenge"; conversation list surfaces voice (mic icon, "Voice message") so it's clear this is about speaking.
- **Community:** "Your conversations" = your people; copy like "real people, real practice" or "your community's waiting" where it fits.
- **One clear moment:** A short tagline or hero line that says "this is different" (e.g. "speak a little. every day." or "voice first. community always.") without sounding like edtech buzz.

**Anchored in user voice (from 48+ interviews):**
- "I'm scared to speak because I'll be judged" → keep it low-pressure, one clear action.
- "10 seconds feels doable" / "It's not intimidating" → today's thing is the hero, not a wall of options.
- "I don't feel alone when learning" → conversations (DMs + groups) feel like "your people," not a generic chat list.
- "A low-pressure community where I can practice speaking without feeling judged" → calm hierarchy, no clutter.

---

## 1. One hero (Spotify / TikTok)

**What:** A single, clear block at the top: **Today's challenge**.

- If there are pending challenges: show the phrase (or "1 waiting" / "Your turn") and a primary CTA that opens the challenge queue. Visually dominant but not full-screen—enough to feel "this is the one thing we want you to do today."
- If none: "No challenge today – check back tomorrow" (same block, muted). No empty hole.

**Why:** One primary verb = "speak today." Not 10 equal cards. Reduces anxiety, matches "10 seconds feels doable."

**Implementation note:** Reuse existing Today card or expand it so the hero is clearly the main focus (e.g. slightly larger, or phrase preview inline). Tap still opens `ChallengeQueue`.

---

## 2. Conversations as cards (Pinterest)

**What:** DMs and group chats in one section, **"Your conversations."** Each item is a **card** (not a thin list row):

- Avatar (left).
- Name (DM = partner name; group = group name).
- Last message preview (one line) + time.
- Optional: small pill (language, or "X new") if it helps scan.

Same card style for DMs and groups so it feels like "your people," not "apps within an app." Order: DMs first, then groups (or by recency—your call).

**Why:** Scannable, human, not "worse WhatsApp." User insight: "I don't feel alone" → conversations should feel like faces and names, not a generic inbox.

**Implementation note:** Replace current `renderGroup` row layout with a card layout (padding, rounded corners, optional shadow). Reuse `GroupAvatar` and last-message data you already have.

---

## 3. Rest = Notion-style list (no extra cards)

**What:** Support, Request a language, Browse groups (add/leave) live in **one compact block**, not as separate big cards.

- Option A: Single **"More"** or **"Soup kitchen"** block: 3–4 list rows (icon + label). Tap = same as current (Support → support-chat, Request → modal, Browse → browse-groups). Add/leave = inside Browse.
- Option B: Keep Support / Request / Browse as small icon buttons in the header (as now) and add one "Manage groups" or "More" row at the bottom of the conversation list that links to browse + request + support. Either way: **list rows, not cards.**

**Why:** Notion-style clarity. These are utilities; they shouldn't compete with "today" or "your people." Avoids HelloTalk overcrowding.

---

## 4. What stays, what moves

| Thing | Where |
|-------|--------|
| Daily challenge | Hero at top (already in place; can enlarge/simplify) |
| DMs + group chats | Conversation cards, one section |
| Support | In "More" list or header icon |
| Request a language | In "More" list or header icon |
| Browse / add–leave groups | In "More" list or header; add/leave inside that flow |
| Announcements | Optional: one compact row under hero, or in "More" (e.g. "Latest announcement") |
| Quest bar | Keep as-is (small, doesn't compete) |
| Admin (Test / Challenge) | Header, as now |

---

## 5. Copy and tone

- Section title: **"Your conversations"** (already chosen).
- Hero: **"Daily challenge"** with subtitle "1 waiting" / "No challenge today – check back tomorrow."
- More block: **"More"** or **"Soup kitchen"** with rows: Support, Request a language, Browse groups. Short, lowercase, friendly (per product voice).

---

## 6. Out of scope for this spec

- Tabs (Today vs Conversations): deferred; single scroll with clear hierarchy first.
- Full-screen challenge view: deferred; tap hero → existing queue.
- Native-speaker / "chat with a native" as a separate section: stays as entry from Community / Native Speakers; DMs from there appear in "Your conversations."

---

## 7. User interview doc

The context doc points to a detailed interview log at:

`file:///Users/Aireinfinity/.gemini/antigravity/brain/.../user_interviews.md`

That path is outside this repo. If you have that file (or more beta quotes), paste any lines you want reflected in the UI and we can add them to this spec or to the context doc.

---

**Next step:** Implement in [app/(tabs)/index.jsx](code/dashboard/app/(tabs)/index.jsx): (1) hero as above, (2) conversation cards replacing current list rows, (3) "More" block with Support / Request / Browse as list rows (or keep header icons and add one "More" row). Small steps, reversible.
