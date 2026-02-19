# Premium chat spec: WhatsApp / iMessage bar

**Why this doc exists:** So we (and any AI/tool) know what "premium" means without Noah having to re-explain. Point to this file when you want chat to feel like WhatsApp or iMessage.

---

## What "premium" usually means (in one sentence)

**It feels instant, predictable, and polished:** nothing stutters, nothing surprises you, and every tap does something visible within a frame or two.

---

## Checklist: dimensions you can point to

Use these when you don't have the words. Say e.g. "input bar should hit the **immediate feedback** and **no blank states** items."

| Dimension | Premium (WhatsApp / iMessage) | Not premium |
|-----------|-------------------------------|-------------|
| **Immediate feedback** | Every tap has a visual response in &lt;100ms (highlight, scale, or state change). Buttons feel "under your finger." | Tap and wait, or no visible change. Feels sticky or dead. |
| **No blank states** | List never shows empty white while loading; skeleton or cached content. Input bar is always there. | White screen, spinner, or "loading…" before content. |
| **Scroll** | List scrolls at 60fps, no jank when new messages arrive. Inverted list lands at bottom predictably. | Stutter, jump, or list "pops" when new items render. |
| **Send** | Send tap → message appears in list right away (optimistic), then checkmark when confirmed. No "sending…" blocking the bar. | Delay before message shows, or bar feels blocked. |
| **Input bar** | Same bar for type/mic/attach; layout and height don’t jump when switching. Keyboard open/close is smooth. | Bar resizes or reflows in a way that feels jumpy. |
| **Voice** | Record → see waveform or timer immediately. Playback has progress; no "loading" before first frame. | Delay before recording UI or playback starts. |
| **Bubbles** | Press state (scale/opacity), consistent corners and shadows. Me vs them is obvious at a glance. | Flat, no press feedback, or inconsistent styling. |
| **Predictability** | Same action always does the same thing. No random failures or "try again." | Intermittent bugs, or behavior that changes. |

---

## How to brief an AI (or Antigravity) on premium chat

You don’t need to explain from zero. You can say one of these:

- **"Make group chat match PREMIUM_CHAT_SPEC.md"** — we optimize for the checklist above.
- **"Chat should feel like WhatsApp: [dimension]"** — e.g. "input bar immediate feedback" or "no blank states when loading."
- **"Run through the premium chat checklist and fix anything we’re missing"** — we audit and fix gaps.
- **"It feels sticky/slow"** — we focus on: immediate feedback, scroll performance, optimistic send, and reducing unnecessary re-renders.
- **"It doesn’t feel premium"** — we focus on: feedback on tap, no white loading, smooth scroll, and consistent input bar.

If Antigravity (or another agent) doesn’t have this file, tell it: "Optimize for instant feedback, no blank loading states, smooth scroll, and optimistic send. Reference code/dashboard/docs/PREMIUM_CHAT_SPEC.md if it exists."

---

## Technical levers that usually move the needle

When something doesn’t feel premium, these are the usual suspects:

- **List:** `FlatList` with sensible `initialNumToRender`, `windowSize`, `removeClippedSubviews`; memoized row component so only changed rows re-render.
- **Input bar:** No layout thrash; same component for idle and recording; keyboard avoid behavior consistent.
- **Send:** Optimistic update (add message to list immediately, then replace with server id/status).
- **Loading:** Skeleton or previous content; never an empty white list.
- **Touch:** Press states and haptics on every tappable element so the UI feels responsive.
- **Voice recording:** Show recording UI immediately on mic tap (optimistic); don’t wait for native recorder. Waveform: smooth interpolation, update ~60ms so it feels silky not choppy. Optional later: **slide to lock** (hold to record, drag finger to lock so you can release and keep recording, like WhatsApp).

---

## Possible next steps (not done yet)

- **Slide to lock:** While holding to record, slide finger up to “lock” so recording continues without holding. Release = stop only when you tap stop. Makes recording feel less tense.

---

## Brand vs premium

- **Premium** = how it behaves (fast, predictable, polished). This doc.
- **Brand** = how it looks (colours, copy, voice). See product rules and STRATEGY_AND_NOAH.

We can have premium behaviour with Language Soup’s brand (blue, cream, lowercase, playful). The spec above is behaviour-first; visuals stay on-brand.
