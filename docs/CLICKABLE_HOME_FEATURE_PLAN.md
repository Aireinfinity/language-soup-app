# Clickable home: feature plan

**Goal:** Everything feels clickable. Profiles, groups, challenges, reactions, AI corrections, and challenge-a-friend are integrated and obvious. Levels are explained; profile photos are card-shaped with no outline.

---

## 1. Profiles (yours + others)

**Your profile (header tap)**  
- Already: profile-modal → (tabs)/profile.  
- Add: ensure **photo** is card-shaped and prominent, **level** tappable (see Levels below), **tagline**, **languages**, **bio**. If bio empty and it’s own profile → **edit bio**. **Comment/reaction wall** (“love your profile”) + **DM** not needed on own profile (DM is for others).

**Other people’s profile (avatar tap in chat)**  
- Already: `onAvatarPress` → `UserPreviewModal` (name, avatar, status, languages, “Send message” for DM).  
- Extend to full **profile view**: big **photo** (card, no outline), **level**, **name**, **tagline**, **languages**, **bio**. If they have no bio, show nothing or “no bio yet”. **Comment/reaction wall** (e.g. “nice profile” reactions). **DM** button to start DM (already in UserPreviewModal).  
- **Where:** Either expand `UserPreviewModal` into a full-screen-style sheet with sections above, or add route `profile/[userId]` and open from avatar tap. Recommendation: **expand UserPreviewModal** (or rename to UserProfileModal) with scroll, photo, level, name, tagline, languages, bio, reaction wall, DM. Keeps one place for “view user.”

**Profile photos**  
- **Bigger, card shape, no outline.** Already: ChatStyles.avatar 60×60, borderRadius 10. Remove any **avatar ring** (border) on message avatars so they’re plain cards. Header avatar already card-shaped.

---

## 2. Challenge: “I want to respond to this challenge”

**Current:** Challenge appears in feed; ChallengeQueueCard and recording flow exist; phrases/vocab and “send to group” are built.  
**Goal:** Obvious that “this is the day’s challenge” and “tap it to respond” (phrases, vocab, record, send to the right language group).  
**Where:**  
- Make the **daily challenge block** in the feed clearly **tappable** (e.g. whole card is Pressable, or a clear “Respond” / “Do this challenge” CTA).  
- On tap → open **modal/sheet** that reuses existing challenge queue: show prompt, phrases, vocab, record button; on send, voice goes to the correct language group chat (already wired).  
**No new backend:** Use existing challenge queue and send path; only wire tap → modal and ensure CTA is obvious.

---

## 3. Reactions

**Current:** Reactions exist (ReactionPicker, InlineReactionBar, app_message_reactions).  
**Goal:** “Clean it up” so reacting feels integrated and obvious.  
**Where:**  
- Ensure **message bubbles** (or a consistent spot, e.g. under bubble or on long-press) show **react** affordance; keep existing reaction UI, just polish placement and styling so it’s visible but not noisy.

---

## 4. AI corrections (voice feedback)

**Current:** VoiceFeedbackButton exists; you didn’t like it on top or how it sat on the bubble.  
**Goal:** Feedback for **that specific message**, on the bubble, but **not annoying**.  
**Where:**  
- **On the message bubble:** small, low-weight affordance (e.g. “get feedback” text or a tiny icon) that expands or opens a sheet with AI correction for that voice message. Not a big button; not above the bubble. Option: under **your** voice message only, a single line like “Get feedback” that opens the existing voice-feedback flow for that message.  
- Keep the same backend/flow; only change **placement and prominence** so it’s per-message and subtle.

---

## 5. Challenge a friend (your voice notes)

**Current:** “Challenge a friend” was commented out under voice messages.  
**Goal:** You can **challenge a friend** on your own voice note (share challenge link).  
**Where:**  
- Restore **under your voice messages only**: e.g. “Challenge a friend” (and optionally “Correct me”) as small actions. Same Share Preview Modal and share flow as before; only show for **isMe** voice messages so others’ bubbles stay clean.

---

## 6. Levels: explain when you tap

**Current:** Profile has “Understanding Your Levels” modal (Input = listening hours, Output = speaking minutes). Header shows “level X” via `useLevel()` (stub, always 1).  
**Goal:** **Tap level** (in header or profile) → **explain how levels work**. Simple rule to ship: e.g. “more voice memos sent → higher level” or “challenges replied to consecutively” (you choose).  
**Where:**  
- **Header level pill:** make it a **Pressable**; on press open a **Levels explanation** sheet/modal (same content as profile’s “Understanding Your Levels” or a shortened “how levels work” version).  
- **Profile:** keep existing levels modal; optionally wire **real level** from stats (e.g. output minutes → level 1–6) so header and profile show the same number.  
**Simple level rule (suggestion):** Output (speaking) only: level = f(total voice minutes sent). Use existing profile thresholds (e.g. 0–30 min → Lv.1, … 1200+ → Lv.6). Stored or computed from `app_messages` where sender_id = user and message_type = 'voice'. Ship that and get feedback.

---

## 7. Avatars: card shape, no outline

**Current:** Message avatars use `avatarRing` / `avatarRingThem` / `avatarRingBot` (border + padding).  
**Goal:** **No outline**; same **card shape** as header (rounded rectangle).  
**Where:**  
- **MessageBubble:** remove ring styles from avatar wrapper (no border, no ring); keep avatar size and borderRadius 10 so it stays a card.  
- Everywhere we show profile/avatar in this flow: **card shape, no colored ring**.

---

## Suggested order of work

1. **Avatar rings off** + **level tappable** → levels explanation (quick wins).  
2. **Challenge CTA** → tap day’s challenge opens modal with phrases/vocab/record/send.  
3. **Profile (others):** expand UserPreviewModal → photo, level, tagline, languages, bio, reaction wall, DM.  
4. **Profile (own):** bio edit when empty; ensure level tappable.  
5. **AI corrections:** move to subtle per-message “get feedback” on your voice bubble.  
6. **Challenge a friend:** restore under your voice messages only.  
7. **Reactions:** polish placement and styling.

---

## Level rule (simple, ship and learn)

- **Output only** for “level” in header and profile: level 1–6 from **total voice minutes sent** (from `app_messages` where you’re sender, type voice).  
- Same thresholds as profile’s Output levels (e.g. 0–30, 30–120, 120–300, 300–600, 600–1200, 1200+).  
- Compute on load (or cache in `app_users` and update when sending voice).  
- “How levels work” copy: “Your level goes up the more you speak. More voice messages = higher level. Tap level anytime to see the full breakdown.”

You can later add streaks or “challenges replied to” without changing this first version.
