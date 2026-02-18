# Facelift build — finalization

**Build name:** Facelift (redesign of core features for activation + retention)

**Goals:**
1. **New users:** Send their **first voice memo seamlessly** through onboarding (no friction, clear path).
2. **Existing users:** **Re-activate** lapsed users — retention rates were low; the product should pull them back.

---

## What “done” looks like

| Goal | Success looks like |
|------|--------------------|
| **New users** | Download → how-it-works → login → (optional profile steps) → pick groups → **Today** → **first challenge inline** → record/send (or skip) → done. No dead ends; first voice is the natural next step. |
| **Re-activation** | Lapsed users get a reason to open the app (push, habit); when they open, **Today** is clear (“your turn” / one challenge), and **Community** shows the soup is alive. No overwhelming backlog; one clear ask. |

---

## Current state (what’s in the product now)

### New users → first voice memo

| Piece | Status | Where it lives |
|-------|--------|----------------|
| **First challenge inline on Today** | ✅ Done | `app/(tabs)/index.jsx`: `checkOnboardingStatus()` (0 messages → `showOnboardingMission`); first challenge is **inline** on Today as `isFirstChallengeMode` using same `ChallengeQueueCard` (no separate modal). |
| **First voice upload** | ✅ Done | `uploadFirstVoiceToGroups()` in `lib/uploadChallengeVoice.js`; onboarding-icebreaker flow in Today hero. |
| **Welcome alert (notify group)** | ✅ Done | `sendWelcomeAlert()` in `OnboardingMissionModal.jsx` (called from upload flow); triggers “new person spoke” so group can respond. |
| **Boot → how-it-works → login → onboarding → group selection** | ✅ Exists | `index.jsx`, `how-it-works.jsx`, `login.jsx`, `onboarding/*`, `group-selection.jsx`. |
| **OnboardingMissionModal (listen → record)** | ⚠️ Legacy | Component still exists; **Today no longer renders it.** New users see the **inline** first challenge on Today instead. Modal could be removed or repurposed per WELCOME_ONBOARDING_REDESIGN_PLAN. |

**Doc note:** `ONBOARDING_AUDIT_DOWNLOAD_TO_FIRST_VOICE_MEMO.md` and `NEW_MEMBER_FLOW_TEST.md` still describe the **modal** flow; the app now uses **inline first challenge** on Today. Update those docs when you finalize.

### Re-activation (existing users)

| Piece | Status | Where it lives |
|-------|--------|----------------|
| **Push: daily challenge ready** | ✅ Exists | Edge functions + `app_push_tokens`; “challenge is ready” style notifications. |
| **Today: one hero, one CTA** | ✅ Done | One challenge card, “your turn” / “next in X”; no backlog wall (TWO_TABS_DESIGN_HERO, TODAY_TAB_DESIGN_CONCEPT). |
| **Community: pulse, your conversations** | ✅ Exists | Community tab: groups, “in the soup,” etc. |
| **WelcomeMissionModal (“welcome the world”)** | ✅ Exists | Community tab; **not** a re-activation modal — it’s for recording a global greeting for new joiners. Trigger: manual (e.g. “say hello” CTA) if you wire it; currently `showWelcomeMission` is never set true in code. |
| **Dedicated “welcome back” / win-back flow** | ❌ Not built | No in-app modal or screen that targets lapsed users (e.g. “you haven’t spoken in 7 days — here’s one challenge”). Could be a later iteration (push copy + in-app nudge). |

So: **re-activation today** = push + clear Today/Community when they open the app. A dedicated re-activation flow is optional for a later build.

---

## Finalization checklist

Use this to **finalize and ship** the facelift build.

### 1. New-user path (e2e)

- [ ] **Fresh install:** Boot → how-it-works → login (new account) → onboarding (language, tagline, avatar, notifications as currently implemented) → group selection (join ≥1 group) → land on **Today**.
- [ ] **First challenge:** Today shows the **inline** first challenge (same card as daily challenge), not a separate full-screen modal. Copy/prompt feel right (e.g. “what’s ur favorite word…” / FIRST_CHALLENGE_PROMPT).
- [ ] **Record and send:** Record voice → send → confetti/success → modal/state clears, they’re “done” and see normal Today (or “mission complete”).
- [ ] **Skip:** “Skip for now” (or back) closes first-challenge mode without sending; they can send later from Today or chat. No crash, no stuck state.
- [ ] **Welcome alert:** After first send, group gets notified (sendWelcomeAlert) so existing users see “new person spoke” and can reply.
- [ ] **Auth vs login:** If user has no groups, they go to onboarding/conversational or group-selection consistently (see ONBOARDING_AUDIT issue #1). No mid-onboarding redirect to group-selection that skips steps unless that’s intentional.

### 2. Existing-user path (re-activation)

- [ ] **Returning user opens app:** Today shows either “your turn” (pending challenge) or “next challenge in X” (countdown). One clear hero; no overwhelming list.
- [ ] **Push:** If you have “daily challenge is ready” (or similar) push, confirm it fires and deep-link/opens app to Today so they land on the challenge.
- [ ] **Community:** Tab shows “your conversations” and pulse; feels alive, not empty. No broken sections.

### 3. Stability (from home_ui_and_stability plan)

- [ ] **Podcast mode:** No crash on rows with null/empty `media_url`; guard in queue build and in `startQueue` (AudioPlayerContext). Optional: “No playable voices right now” when queue is empty after filter.
- [ ] **Group list:** Empty `groupIds` after memberships don’t cause errors; defensive nulls for `app_groups` / DM partners.
- [ ] **Chat:** scrollToIndex / loadReactions / loadMessages have fallbacks and try/catch so chat doesn’t get stuck.

### 4. Docs and cleanup

- [ ] Update **ONBOARDING_AUDIT_DOWNLOAD_TO_FIRST_VOICE_MEMO.md**: change “OnboardingMissionModal” to “inline first challenge on Today” where the flow is described.
- [ ] Update **NEW_MEMBER_FLOW_TEST.md**: same — first challenge is inline on Today, not a separate modal.
- [ ] **FEATURES_AND_REQUESTS.md**: “Onboarding flow + first voice memo” — mark as Done for this build once e2e is confirmed; add “Re-activation: push + clear Today/Community (dedicated win-back flow later).”
- [ ] Optional: Remove or repurpose **OnboardingMissionModal** if you’re fully committed to inline-only (or keep for A/B or future “listen to 3 voices then challenge” flow from WELCOME_ONBOARDING_REDESIGN_PLAN).

### 5. Ship and tell users

- [ ] **EAS build / store:** Bundle facelift + any ticket-blitz fixes into one build; ship to TestFlight / Play Store as appropriate.
- [ ] **Tell users:** In-app (Profile → "where things are / what's new" opens WhatsNewSheet), WhatsApp/email, or release notes: “We redesigned the app so your first voice memo is right on the home screen and returning is simpler — one challenge, one tap.” (Match your voice; see product-language-soup.mdc.)
- [ ] **Remind Noah:** After shipping, explain the changes to users (in-app copy, message, or release notes).

---

## Related docs (for this build)

| Doc | Use |
|-----|-----|
| **ONBOARDING_AUDIT_DOWNLOAD_TO_FIRST_VOICE_MEMO.md** | Full path download → first voice; issues (Auth vs login, how-it-works length, etc.). Update flow description to “inline first challenge.” |
| **WELCOME_ONBOARDING_REDESIGN_PLAN.md** | Optional next step: community step (3 voices, daily-card look) + notification mock + CTA; currently not required for “first voice seamlessly.” |
| **onboarding_boot_howitworks_groups.plan.md** | Full onboarding **visual** pass (one-page how-it-works, merged language screen, restyle boot/login/group selection). Optional for this build. |
| **TWO_TABS_DESIGN_HERO.md** | Today = one hero, one CTA; Community = your people + pulse. Design north star. |
| **TODAY_TAB_DESIGN_CONCEPT.md** | Today tone, hierarchy, “let’s go,” podcast mode. |
| **TICKET_BLITZ.md** | Quick fixes (listen before send, duration, crashes, Android UI) — bundle with facelift if not already shipped. |
| **home_ui_and_stability.plan.md** | Podcast/group/chat stability; optional UI (tagline in header, quest strip, softer cards). |

---

## Summary

- **New users:** First voice memo is **inline on Today** (no separate modal). Run e2e, fix any gaps, update docs.
- **Re-activation:** Push + clear Today/Community; no dedicated “welcome back” flow yet — fine for this build.
- **Finalize:** Run the checklist above, update the listed docs, ship one build, then tell users what changed.

When you’re done with the checklist, you can mark this build “Finalized” at the top of this doc and move “Re-activation (dedicated flow)” and “Onboarding visual pass (how-it-works one page, etc.)” to the next build if you like.
