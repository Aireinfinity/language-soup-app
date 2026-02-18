# App reorg handoff (iPad sketch)

**Goal:** Reorg the app to match Noah's iPad sketch — same features, different placement and emphasis. No new features; move and emphasize what's already there.

**How:** One slice at a time: **onboarding → feed → profiles → challenges → notifications**. Broad instructions per section are fine; voice-to-text is fine.

**Where:** Expo app lives in **`code/dashboard`** (expo-router, React Native). Docs and sketch context below.

---

## Sketch reference

**Image path:** `/Users/Aireinfinity/.cursor/projects/Users-Aireinfinity-Desktop-language-soup/assets/Note_Feb_17__2026_140101-11829670-daa8-49e4-a9bd-316e6d213bd2.png`

Summary of the sketch:

1. **Feed (central)**  
   - Main content area with header: two profiles (e.g. "Noah", "YOU") and "level x until next level".  
   - Scrollable feed: posts with profile pics, text, voice memo waveforms; **LS #challenge** items in feed; language labels (portuguese, Spanish, etc.).  
   - Bottom: input "type" + voice memo recording.  
   - **Challenge & friend share sheet:** keep as is.

2. **Left: profile + filters**  
   - **Profile modal:** "profile modal stay" — persistent/easy access.  
   - Filters/nav: Groups, LS, friends, language filters (portuguese, Spanish, …), DMs (→ chat bubble).

3. **Notifications (top right)**  
   - Dedicated notifications area with examples: new challenge ("happy valentine's day! what's ur vibe today)"), "noah :) sent a voice memo / chat / reacted to ur memo", "replied to ur 24/7 chat."  
   - Link from notifications into feed (e.g. to #challenge).

4. **#challenge (middle right)**  
   - Challenge detail: prompt ("why are u so shy?"), phrase 1/2, vocab 1/2/3, language (e.g. Spanish), voice memo.  
   - "sends in group chat: main & lang specific."

5. **Profile view (bottom left)**  
   - "noah :) level 1 founder daddy", profile pic, bio ("made this app fr xyz founder daddy on his own!"), "my language soup" progress, DM button.  
   - "comment wall & reactions love it! cute! nice voice memo!"

6. **AI corrections (bottom right)**  
   - Beta: "your voice memo", segments (e.g. "1. Granada", "2. english"), "Select which u want corrections on?" with 1 / 2 / all.

7. **Thoughts (onboarding)**  
   - "maybe send voice memo first, then make profile fr onboard? no strs?"  
   - "voice memos auto play - nice to have"

---

## Interview/product context

**Doc:** `code/dashboard/docs/user_interviews.md`

Relevant themes for reorg:

- **Activation / voice fear:** Low-stakes first step; optional listen-before-send; reassurance (Ava, others).  
- **Onboarding:** Sign-up feels long; keep emoji password, trim the rest; consider voice-first then profile (sketch thought).  
- **Profiles:** People click profiles to learn about others; profile crash was a big issue; "profiles = life stories" (Miranda).  
- **Feed / community:** "Take me directly to the community… this feels solo and lonely" (Miranda); show who's on it and that others use it (Saba).  
- **Challenges:** Put challenge/topic in notifications so "new challenge just dropped" opens the app (Paul); challenge → community, not solo.  
- **Notifications:** Include topic/hint + social proof in push (Miranda); 9 notifs for one challenge = possible bug (Paul).  
- **Familiar UI:** "Maybe just a familiar layout? messaging UI similar to iMessage" (Steven).

---

## Suggested slice order

| Slice | Focus | Sketch / notes |
|-------|--------|----------------|
| **1. Onboarding** | Reorder: voice memo first, then profile; reduce stress; keep emoji password, shorten flow. | Thoughts: "voice memo first, then make profile fr onboard? no strs?" |
| **2. Feed** | Central feed with header (you + level), filters (Groups, LS, friends, languages, DMs), feed items (posts, #challenge in feed), input + voice at bottom. Keep challenge & friend share sheet. | Main central box; filters left; share sheet "keep as is". |
| **3. Profiles** | Profile modal stays; profile view with bio, level, "my language soup," DM, comment wall & reactions. | Profile modal stay; yellow profile box. |
| **4. Challenges** | Challenge detail (prompt, phrases, vocab, language, voice); sends in main & lang-specific group chat; visible in feed as LS #challenge. | Red #challenge box; integration with feed. |
| **5. Notifications** | Dedicated notifications; link to feed/challenge; copy style like examples in sketch; fix any "9 notifs for one challenge" logic. | Green notifications box; Paul/Miranda feedback. |

---

## Brand / rules

- **Product rule:** `code/dashboard` (or repo root) `.cursor/rules/product-language-soup.mdc` — fun not classroom, speaking first, lowercase playful copy, no dashes in user-facing copy, never clear `emoji_password`.  
- **Founder rule:** `.cursor/rules/founder-collab.mdc` — small reversible steps, plan then apply, explain to users after shipping.

---

## Paste-ready short version for new chat

```
Reorg the Language Soup app to match Noah's iPad sketch (same features, different placement/emphasis). No new features.

Order: one slice at a time — onboarding → feed → profiles → challenges → notifications.

Context:
- Sketch: /Users/Aireinfinity/.cursor/projects/Users-Aireinfinity-Desktop-language-soup/assets/Note_Feb_17__2026_140101-11829670-daa8-49e4-a9bd-316e6d213bd2.png
- Interviews: code/dashboard/docs/user_interviews.md
- Full handoff: code/dashboard/docs/REORG_HANDOFF.md
- Expo app: code/dashboard (expo-router)
```

Good luck with the reorg.
