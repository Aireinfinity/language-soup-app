# Welcome to the Soup → Daily-Challenge-Style Onboarding (Plan)

**Goal:** Replace the current "welcome to the soup" card design with the daily voice challenge card look. Keep copy quality; fix design. Add clear steps: community → notification → CTA → first challenge → continue. Show 3+ people (picture, waveform, play/pause) with "more" and continue, and give a feel for daily challenges **per language group** the user is in.

---

## Current state

- **Component:** `OnboardingMissionModal.jsx`
- **Trigger:** Home screen shows it when user has 0 messages sent and has at least one group.
- **Current flow:**
  1. **loading** – "preparing ur soup..."
  2. **listening** – White card, one big avatar + pulse, play one voice, "more 👋" (up to 2 more), "skip to challenge ➡️"
  3. **recording** – Short transition line then full `ChallengeQueueCard` for first challenge + "skip for now"

- **Problems you called out:** Welcome card design is bad; you want the **daily challenge card** design. You want picture + waveform + play/pause for **3 people** (and more if they want), an arrow/"more" like the daily card, and a **continue** button like the daily challenge. Show this **per language group** so they see what daily challenges look like in each group. Then a clear flow: community → notification → do your first challenge CTA → here’s your first challenge → continue.

---

## Proposed flow (order you described)

| Step | Screen purpose | What user sees |
|------|----------------|----------------|
| **1** | This is the community | One screen (or one per group) using **daily challenge card design**: brand background (cream/green/pink/blue), bowl accents, same typography. List of **3 people** (or more): **picture + waveform + play/pause** for each. "More" / arrow to load more voices. Primary **Continue** button (same style as daily challenge CTA). |
| **2** | This is the notification you will get | Mock push notification: "Daily challenge is ready" (or similar). So they know what to expect. **Continue**. |
| **3** | Come to the app and do your first challenge! | Short CTA screen: copy like "come to the app and do your first challenge!" — same card aesthetic (brand color, bowl, button). **Continue** → goes to step 4. |
| **4** | Here’s your first challenge | Actual first challenge using **ChallengeQueueCard** (already in place). They record and send, or "skip for now". **Continue** when done. |
| **5** | Done | `onComplete()` — modal closes, feed refreshes. |

---

## Design: “Community” step (step 1)

- **Reuse daily challenge look:** Same as `ChallengeQueue` / `ChallengeQueueCard`: brand background (cycle cream → green → pink → blue if we show multiple groups, or one color per group screen), bowl accents in corners, same card/shadows.
- **Row per person (3 default, more on “more”):**
  - **Picture** – Avatar (like current welcome, but smaller, in a row).
  - **Waveform** – Static or simple waveform bar (we have `LiveAudioWaveform` for recording; for playback we could use a small bar strip or the same static bars as in `ChallengeQueueCard` review mode).
  - **Play / Pause** – Tap to play that voice memo, tap again to pause. Only one playing at a time.
- **“More”** – Arrow or "more" control (like daily challenge “skip” / “more” vibe) to fetch/show more voice memos (e.g. next 3).
- **Continue** – Primary button, same style as daily challenge “start” / white CTA so it feels like the same product.

---

## Per–language-group behavior

- **Option A – One screen per group:** For each group the user is in (e.g. Spanish, French), show one “community” screen: "This is the [Spanish] community" with 3+ voices from **that** group. Then arrow/continue to next group’s community screen, then notification step, then CTA, then first challenge.
- **Option B – One screen, segments by group:** Single “community” screen with sections: "Spanish", "French", … each with 3 voices from that group. One "more" per section or global. Then one Continue.
- **Option C – One screen, mixed feed:** One “community” screen with 3+ voices from **all** groups combined, with a small label (e.g. "Spanish", "French") per row. "More" adds more from any group. Continue.

You said: *“it should show for all the language groups that person is in so they get a feel for what the daily challenges look like”* — so we need to **show content from each group** (A or B). Option A is clearest (“this is your Spanish community”, “this is your French community”) but more steps. Option B keeps one step but can get long if they’re in many groups. We can pick in the plan.

---

## Copy (keep / tweak)

- Keep: “welcome to the soup”, “everyone here sends voice memos”, “add one ingredient and ur in”, “hear from the group”, “that’s the community”, “daily challenge, u send a voice reply”, “here’s your first one”.
- Add: step titles for each screen (e.g. “this is the community”, “this is the notification you’ll get”, “come do your first challenge”, “here’s your first challenge”).
- “Continue” on every step so the flow is obvious.

---

## Technical notes

- **Data:** Reuse current logic: fetch recent voice messages from user’s groups (`app_messages`, `message_type = 'voice'`). For per-group: fetch per `group_id` or split by group after fetch.
- **UI:** New “community” step component that looks like the daily challenge screen (reuse `BRAND_BG_COLORS`, bowl accents from `ChallengeQueue.jsx`, same button styles). Rows: avatar (from `getAvatarSource`), waveform (reuse or simplify from `ChallengeQueueCard` static waveform / `AudioMessage`), play/pause (expo-av).
- **Steps:** Replace current `step === 'loading' | 'listening' | 'recording'` with something like `'community' | 'notification' | 'cta' | 'first_challenge' | 'done'`. Optional: `'community_spanish'`, `'community_french'`, … if one screen per group.
- **Notification mock:** Step 2 is a simple screen with a drawn or component “notification” (title + body + icon) so it’s obvious what they’ll get.

---

## Open decisions (to align on)

1. **Per-group:** One screen per group (A), one screen with sections (B), or one mixed feed (C)?
2. **How many voices per group (or total) by default?** 3, then “more” adds 3 more?
3. **Notification step:** Exact copy for the mock notification (e.g. “Your daily challenge is ready” / “New challenge in [Spanish]”) and do we use a real-looking OS notification mock or a simple in-app card?
4. **Skip behavior:** Can they skip “community” or “notification” and jump straight to “first challenge”, or do we want them to go through all steps once?

---

## When we’re aligned

After you confirm the flow order, per-group approach (A/B/C), and any copy tweaks, next step is to implement in `OnboardingMissionModal.jsx` (and maybe a small `WelcomeCommunityStep.jsx` that uses the daily challenge styling and the 3+ row layout).
