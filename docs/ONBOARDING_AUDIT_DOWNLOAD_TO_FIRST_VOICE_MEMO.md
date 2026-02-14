# Onboarding audit: app download → first voice memo

**Scope:** Path from "just downloaded the app" to "sent first voice memo."  
**Combined with:** Ticket Blitz — "Initial onboarding record one word" + "Onboarding pipeline audit: how they find us → first voice memo."

---

## Current flow (as implemented)

| # | Screen | What happens | Next |
|---|--------|--------------|------|
| 0 | **Boot (index)** | Splash: "language soup" definition + tap to continue. If **logged in** → 500ms then auto to (tabs). If **not** → tap goes to how-it-works. | how-it-works (new) / (tabs) (returning) |
| 1 | **How it works** | 5 steps (recipe → select languages → daily challenge → voice memo → notifications). Tap right = next; last step → login. Back = previous or /. Also: **Login** button top-right on every step. | login |
| 2 | **Login** | Name → 3-emoji password. After submit: has groups → (tabs); **no groups** → **onboarding/conversational**. | (tabs) or **onboarding/conversational** |
| 3 | **Conversational** | "What languages can you chat in?" — pick fluent. Continue (saves) or Skip. | onboarding/learning |
| 4 | **Learning** | "What are you learning?" — pick learning languages. Continue or Skip. | onboarding/tagline |
| 5 | **Tagline** | Optional tagline + examples. Continue or Skip. | onboarding/avatar |
| 6 | **Avatar** | Photo or soup avatar. Continue → notifications. | onboarding/notifications |
| 7 | **Notifications** | "Turn on notifications" or "Maybe later." Both → **group-selection**. | **group-selection** |
| 8 | **Group selection** | Pick ≥1 language group → Join → **(tabs)**. | **(tabs)** |
| 9 | **Today (tabs)** | Home loads; `checkOnboardingStatus()`: if **0 messages sent** → show **OnboardingMissionModal**. | (modal) |
| 10 | **OnboardingMissionModal** | Loading → (optional) listen to 1–3 group voices → "Skip to challenge" or "More" → **Recording step**: today-style card, prompt "what's ur favorite word…", record voice **or** send text "hi" / skip. On success → confetti, `onComplete()`, modal closes. | First voice (or text) sent; user on Today |

**First voice memo** is sent either:
- In the modal: record on the onboarding challenge card and send, or
- Send a text "hi" (counts as participation; modal still completes).

So the **intended** path length is: **Boot → How-it-works (5 taps) → Login (name + 3 emoji) → Conversational → Learning → Tagline → Avatar → Notifications → Group selection → Today → Modal (listen optional) → Record or text → Done.**

---

## Issues and streamlining opportunities

### 1. **AuthContext vs Login: two different "no groups" destinations**

- **Login** (after name + emoji): no groups → **onboarding/conversational** (full onboarding).
- **AuthContext** `checkProfileAndRedirect`: no groups → **group-selection** (skips conversational → learning → tagline → avatar → notifications).

So:
- **One session:** User does login → conversational → … → group-selection → home. Fine.
- **Re-open app mid-onboarding:** e.g. they left after "Learning." On next open, segments might be (tabs) or index; Auth runs, sees no groups, sends them to **group-selection**. They never see tagline, avatar, or notifications, and never explicitly set fluent/learning again. That can feel like a broken or duplicated flow.

**Recommendation:** Align on a single rule. Either:
- **A)** AuthContext: no groups → **onboarding/conversational** (so "no groups" always starts full onboarding), or  
- **B)** Keep "no groups → group-selection" but treat group-selection as the canonical "you’re new, pick groups" and make conversational/learning/tagline/avatar optional (e.g. after first group join or from profile). Then simplify login to always send no-groups users to **group-selection** so Login and Auth match.

---

### 2. **Boot screen is long for new users**

- New users see the full "definition" splash and must tap to continue. Copy is fun but adds a step before how-it-works.
- "Tap to continue" appears after 4000ms; if they tap earlier they still go to how-it-works. So the delay only affects when the hint shows, not when they can proceed.

**Recommendation:** Consider shortening or removing the delay for "tap to continue," or making the boot screen a single tap-through (no 4s wait) so the path to login is one tap from boot.

---

### 3. **How-it-works: five steps before login**

- Five full steps (recipe, select, notification, voice memo, notifications permission) with "tap right to next."
- Step 4 asks for notification permission **before** login; they might not yet understand why we need it.
- Login is available in the top-right on every step (good), but the main path is still "go through all 5 then login."

**Recommendation:** Consider shortening to 2–3 steps (e.g. what it is → how it works (challenges + voice) → optional notifications or go to login). Move notification permission to **after** login (you already have onboarding/notifications), so how-it-works doesn’t ask for permission before account creation.

---

### 4. **Login: emoji password has no in-app explainer**

- Ticket Blitz (Jon): "In-app emoji password explainer + set expectation 'practice in a way you're not used to'; optional help/landing so onboarding can stay short."
- Currently there’s no explanation in the UI for *why* 3 emojis or how to remember them; only "tap 3 emojis to log in."

**Recommendation:** Add one short line (e.g. "your password is just 3 emojis — no email, easy to remember") and optionally a "why emojis?" or "help" that sets expectation without making the step long.

---

### 5. **Onboarding steps 3–7: many skippable steps before "pick a group"**

- Conversational, Learning, Tagline, Avatar, Notifications are all skippable. That’s flexible but can feel long if the goal is "get to a group and send one voice memo."
- **Learning** is the one that actually matters for matching them to groups; **Conversational** is for display/community; **Tagline** and **Avatar** are profile polish; **Notifications** could be right before or after group selection.

**Recommendation:** Consider merging or reordering:
- **Option A:** Start with **group selection** (or "pick what you’re learning" → then group selection), then one short "add your name/avatar/tagline" step on Today or profile.  
- **Option B:** Keep order but make "Learning" the only required step before group selection (and optionally merge Conversational + Learning into one "what do you speak / what are you learning?" screen).  
- **Option C:** Keep flow but add a progress indicator (e.g. "Step 2 of 6") so they know how much is left.

---

### 6. **Group selection → Today: no explicit "now record" handoff**

- After joining groups, they land on Today. The **OnboardingMissionModal** appears because `message count === 0`. So the handoff is correct, but the first thing they see is the main Today UI and then the modal.

**Recommendation:** Small copy or state on first load: e.g. "You’re in! One more thing — send your first voice note below" so it’s clear the modal is the intended next step. (Already partially there with "add one ingredient and ur in.")

---

### 7. **OnboardingMissionModal: multiple paths to "done"**

- User can: (1) record voice and send, (2) send a text "hi", or (3) "skip for now." All close the modal and set onboarding complete (0 messages is what triggers the modal; after any send, count > 0 so it won’t show again).
- "Skip for now" means they might never send a first message; that’s intentional (low pressure) but they may not realize they can come back and send later.

**Recommendation:** Keep the three options. Optionally add one line when they skip: "You can send your first voice note anytime from Today or the group chat" so the path to first voice memo is clear later.

---

### 8. **Guard onboarding swipe (Ticket Blitz — Mattheos)**

- "Guard onboarding swipe so one accidental swipe doesn't kick them out."
- If onboarding screens use the default stack gesture (swipe back), one swipe could exit the flow. Worth checking each onboarding screen and either disabling back swipe or confirming "are you sure?" on back.

**Recommendation:** On onboarding routes (conversational, learning, tagline, avatar, notifications), disable gesture-back or show a simple "Leave onboarding?" confirm so one swipe doesn’t drop them out.

---

### 9. **Where "finding us on social" fits**

- This audit is "download → first voice memo." The Ticket Blitz also asks: "Audit the full pipeline from **how they find us** → first voice memo."
- Currently the app doesn’t track or change flow based on referrer (e.g. Instagram vs App Store). So "finding us" is only addressable by:
  - Landing page / link-in-bio messaging (set expectation: "daily voice challenges, small groups").
  - App Store / Play Store listing and screenshots (same promise).
  - First app open: Boot + How-it-works should match that promise (voice, groups, challenges) so the path from "found us" → "first voice" feels coherent.

**Recommendation:** Keep this audit focused in-app; document "pre-app" (social, store) as a separate line item so messaging and in-app flow can be aligned later (e.g. "see challenge → record → send" in both).

---

## Summary: what to streamline

| Priority | Item | Change |
|----------|------|--------|
| High | **Auth vs Login** | Unify "no groups" → either full onboarding (conversational) or group-selection everywhere. |
| High | **Onboarding swipe** | Guard back gesture on onboarding so one swipe doesn’t exit. |
| Medium | **How-it-works** | Shorten to 2–3 steps; move notification permission to after login (onboarding/notifications). |
| Medium | **Emoji password** | Add one-line explainer (+ optional "why emojis?") so it’s clear and sets expectation. |
| Medium | **Steps before groups** | Consider "Learning" (or Learning + one group step) as the critical path; make the rest optional or merge. |
| Low | **Boot** | Shorten or remove long delay before "tap to continue." |
| Low | **Post-join** | One line of copy that the modal = "send your first voice note" so handoff is obvious. |
| Low | **Skip for now** | Optional line: "You can send your first voice note anytime from Today or the group chat." |

---

## Flow diagram (current)

```
Boot (tap) → how-it-works (5 steps, tap right) → login (name + 3 emoji)
  → [has groups?] (tabs)
  → [no groups] onboarding/conversational → learning → tagline → avatar → notifications
       → group-selection (join ≥1) → (tabs)
         → Today loads → OnboardingMissionModal (0 messages)
           → loading → [optional listen] → recording step
             → record voice OR send text "hi" OR skip for now
               → onComplete → modal closes → first voice memo done (or skipped)
```

---

## Files to touch (for implementation)

- **Auth:** `contexts/AuthContext.js` (no-groups redirect).
- **Login:** `app/login.jsx` (optional: no-groups → group-selection if you align with Auth).
- **Boot:** `app/index.jsx` (tap delay, copy).
- **How-it-works:** `app/how-it-works.jsx` (steps, notification step).
- **Onboarding screens:** `app/onboarding/*.jsx` (back gesture, optional merge/order).
- **Group selection:** `app/group-selection.jsx` (no flow change; handoff copy could live on Today).
- **Today + modal:** `app/(tabs)/index.jsx`, `components/OnboardingMissionModal.jsx` (copy, skip message).
- **Stack options:** `app/_layout.jsx` or per-screen options (gestureEnabled: false on onboarding).

Once you’ve walked through the flow and noted what you want to clean up, we can turn this into a concrete task list and implement.


---

## How to test this flow

1. **Run the app**  
   From `code/dashboard`: `npx expo start` (or your usual command). Use iOS Simulator or a device.

2. **See Boot → How-it-works → Login (new-user path)**  
   - Log out in the app (or use a device/simulator that has never signed in).  
   - Kill and reopen the app so you hit the boot screen.  
   - You should see: **Boot** (cream, definition, "tap to continue" after ~0.8s) → **How-it-works** (one page, three cards, "get started") → **Login**.

3. **See full onboarding (language, tagline, avatar, notifications, group selection)**  
   - After login, if the account has **no groups**, you will be sent to group-selection (and may pass through onboarding screens first, depending on auth/onboarding state).  
   - To force "no groups": use a **new test account** (e.g. new name + emoji password), or use an account that has not joined any group yet.

4. **See first-voice-memo flow**  
   - Once in a group, open **Today** and trigger the challenge/recording flow.  
   - Confirm the "first voice memo" / mission modal and copy feel right (and that skip/"hi" paths work if you use them).

5. **Quick reset (optional)**  
   - To re-test from a clean slate: log out, then clear app data or uninstall/reinstall so `bootScreenShown` and auth state are reset and you see Boot again.
