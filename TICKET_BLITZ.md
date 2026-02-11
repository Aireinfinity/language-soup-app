# Ticket Blitz

Quick log of support-style fixes and user-reported issues. Update when you ship fixes or get new reports.

---

## Ticket Blitz Plan: The Apology Build 🍜

**Goal:** Fix as many quick wins as possible, bundle into one EAS build, DM every affected user.

### 🔴 QUICK FIXES (Today's Build)

| # | Issue | Status | Users |
|---|-------|--------|-------|
| 1 | Listen back to voice memos before sending | ✅ DONE | 2 |
| 2 | Voice memo shows "00 seconds" instead of duration | ✅ DONE | 1 |
| 3 | App crashes when clicking profile photos | ✅ DONE | 1 |
| 4 | Android: White bars on bottom nav | ✅ FIXED (Needs Rebuild) | 1 |
| 5 | Android: Input field hidden when typing | ✅ FIXED (Needs Rebuild) | 1 |
| 7 | iOS: Input bar too high above keyboard | ✅ FIXED | 1 |

### ⚠️ CONFIRM IF FIXED (Test Before Build)

| # | Issue | Status |
|---|-------|--------|
| 6 | Profile photo upload on Android | ✅ FIXED (User Confirmed) |
| 7 | Messages marked unread when YOU send | ✅ FIXED (User Confirmed) |
| 8 | Emoji reactions sometimes don't work | ✅ FIXED (Simpler UX) |

### 🚀 DEPLOYMENT DECISION: SHIP IT NOW!

Bundle these into an EAS Update (or Store Build for native changes) immediately. Do NOT wait for medium fixes. Get the "Apology Build" out to show responsiveness.

### 🟡 MEDIUM FIXES (Design First, Next Sprint)

| # | Issue | Notes |
|---|-------|-------|
| 9 | Initial onboarding ("record one word") | 🟡 IN PROGRESS |
| 10 | "Need more ingredients" for beginners | ✅ DONE |

### 🟢 BIG FEATURES (Later Build)

| # | Feature | Notes |
|---|---------|-------|
| 11 | DMs | 🟡 IN PROGRESS |
| 12 | Voice memo AI feedback | ✅ DONE |
| 13 | Birthday automated messages | Nice-to-have |
| 14 | Challenge friends on the app | ✅ DONE |

---

## Detailed fix notes

**1. [x] Voice Memo: Listen Before Send**  
- *Problem:* Users instantly send voice notes without validation.  
- *Solution:* Preview state between recording and sending.  
- *Files:* `SharedChatUI.jsx`, `[id].jsx`  
- *Status:* Implemented (waiting for user verification on dev server)

**2. [x] Voice Memo: Duration Bug**  
- *Problem:* Voice notes show "00s" or incorrect duration.  
- *Solution:* Ensure duration is passed correctly from recorder to message object.  
- *Files:* `SharedChatUI.jsx` (already passed prop), `AudioMessage.jsx`  
- *Status:* Implemented (waiting for user verification)

---

## More recent (Feb 11, 2026)

**Shipped:**
- All done / completion screen: celebratory copy + rotating button (get soupy, explore language soup, etc.)
- Voice memo playback volume (challenge flow): speaker + full volume
- Beginner phrase: one short sentence in hints (not long paragraphs)
- Advanced vocab TTS: prompt fixed so word = target language
- Unread from self: update `last_read_at` on send (challenge + chat) so own message never shows unread
- Group chat tap "nothing happens": guards, haptics try/catch, chat route in Stack, error screen if groupId missing

**What to tell users (chill / WhatsApp vibe):**
- **All done popping up:** "we fixed the bug where the completion screen kept showing — should be in the next update"
- **Group chat tap:** "hey, we pushed a fix for the group chat tap thing — update the app and try again. if it still does nothing, pull down to refresh on the home screen and tap the group again. lmk if it's still acting up and which group/phone you're on"

---

## Today's Attack Order 🎯

1. Listen back to voice memos ← Most requested, high impact  
2. Voice memo duration display ← Quick fix  
3. Profile photo crash ← Bug, must fix  
4. Android UI issues (white bars + hidden input) ← Platform-specific  
5. Test confirmation items ← Verify before build  

---

## DM template (after each fix)

> Hey [Name]! 🍜 I just fixed [the thing you mentioned]—it'll be in the next update. Thank you for the feedback, you're making Language Soup better! Let me know if anything else feels off.

---

## Open / to triage

- (Add new user reports or follow-ups here)

---

## How to use

- **When a user reports something:** add a short line under "Open / to triage".
- **When you ship a fix:** update the table status, add to "What to tell users" if needed, DM using the template.
- **Ticket blitz:** work down the list, fix, ship, tell the user, then mark shipped.
