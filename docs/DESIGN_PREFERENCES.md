# Design preferences (Noah / Language Soup)

Reference for UI and UX so we don't keep defaulting to a different style. Update this when you lock in a pattern.

## Loading states

- **Use the ChallengeQueueCard pattern:** animated fill bar (0% → 100% over ~3s) + rotating funny messages, not a plain spinner or "Loading...".
- **Where:** Initial load (e.g. generating phrases) and **every** tap-to-hear (TTS) for phrases/vocab. The TTS loading bar should appear every time the user taps a phrase or vocab word.
- **Messages:** Short, playful, human (e.g. "how do u pronounce that again…", "one sec, finding the right accent", "cooking up phrases…", "stirring the soup…"). Rotate every ~1.8s.

## Pronunciation / TTS

- **Playback speed:** Slower for learners. Use ~0.65x rate (e.g. `sound.setRateAsync(0.65, true)` after creating the sound). Not full speed.
- **No overlap:** Stop any previous TTS before playing the next (unload previous sound when user taps another phrase/vocab).

## Modals that involve listening

- **Record while you're there:** If the user can hear something (e.g. phrases/vocab), they should be able to record in the same context without closing the modal. So either:
  - Add a **record button** (and send) inside the modal, or
  - Avoid a full takeover so the main chat record is still usable.
- Prefer **record + send in the modal** so the flow is: hear phrase → record yourself → send to the same place (e.g. Language Soup), without closing.

## Dynamic challenge

- When the user taps "need more ingredients" (or similar) on a **specific** challenge message, the phrases/vocab modal must use **that** challenge’s prompt and id, not a global or "current" challenge. That means:
  - Merged feed: each message must have `challenge_id` and `challenge_prompt` attached when we load messages (fetch from `app_challenges` and attach).
  - The button passes context: `{ prompt: message.challenge_prompt, challengeId: message.challenge_id }` into the modal.

## Reference components

- **ChallengeQueueCard** (`components/ChallengeQueueCard.jsx`): loading fill bar, TTS loading message + bar, phrase cards with play circle, vocab pills, question block. Use this as the design reference for phrases/vocab and any "challenge" flows.

## Copy

- Lowercase, casual, no dashes in user-facing copy. See product rule and `CopyPhilosophy.js`.
