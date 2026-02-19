# Build #32 (iOS) – bugs & checklist

Track iOS issues for **EAS build 32** (TestFlight). App version in this build: check `app.json` (e.g. 1.0.4 / buildNumber 23 or higher depending on autoIncrement).

---

## Known / reported bugs (build 32)

| # | What | Where / how to repro | Severity | Status |
|---|------|----------------------|----------|--------|
| 1 | **Emoji password** – Condensed emoji set removed emojis people had already set; they can’t log in. | Login: user’s saved emoji no longer in picker. | high | open |
| 2 | **Group selection** | (TBD: exact issue) | | open |
| 3 | **Notification logic** | Not unread-message logic for groups; general notification logic. | | open |
| 4 | **New user profile screen** – No next, no prompts; confusing what to do. | Onboarding → profile: just “here’s a profile screen,” no guidance. | medium | open |
| 5 | **Users forget emoji password** – Many forget it; Noah looks it up in DB and sends it repeatedly. | Login: user stuck, asks for password. | medium | open |
| 6 | **“Add a language” vs “add a group”** – Exact group names matter (e.g. French has 3 levels). Normalizing to “language” hides that. Should be “add a group”; language is a property of the group. People set languages on profile; groups are groups with real names. | Add language flow, group lists that show language instead of name. | medium | open |
| 7 | **Profile edit** – Edit shows old card / old stats / old groups; confusing. Edit should match profile view: one card, editable name, tagline, bio, languages, add groups, change photo. Remove old card and legacy edit UI. | Profile → tap Edit. | medium | open |
| 8 | **Keyboard blocks input** – When you tap an input (e.g. writing on someone's wall, reactions), the keyboard covers the field. Need input and keyboard to come up together (scroll focused field into view / KeyboardAvoidingView). | Wall input, reactions, input fields across app. | high | open |
| 9 | **Can't post on other people's walls** – "Error, could not post. Try again." when posting on someone's wall. | User profile → their wall → type and tap post. | high | open |
| 10 | **Notifications** – Track and fix across three areas: out-of-app push, in-app, Noah-specific. | See note below. | medium | open |
| 11 | **AI corrections in main chat** – Whole Language Soup group chat is sent to AI as English, so "correct pronunciation" (and other AI help) responds in English instead of the language the user spoke. | Main (merged) chat: user sends voice note in Tagalog (or any language); tap "correct pronunciation" → AI pronounces in English. Eryn #137. | medium | open |
| 12 | **Profile bio edits don't save** – User edits bio, hits save; edits don't persist. Also: symbol in top right on profile is unclear. | Profile → Edit → change bio → Save. Changes don't save. Adora #143. | medium | open |
| 13 | **Need ingredients / word bank in language groups** – Word bank (translations, pronunciations) works from main Language Soup chat but is not visible in individual language groups. | In a per-language group (e.g. Tagalog): need ingredients / word bank not available. Main chat only. Adora #141. | medium | open |

**Bug 11 – AI corrections language (root cause & fix):** For voice notes sent from the main chat, we need to: (1) detect/verify the language of each voice note (or use sender’s group/language when known), (2) tag the message with that language, (3) pass that language to the AI so corrections (e.g. correct pronunciation, hints) are in the target language, not English. Verify behavior for messages sent from the main Language Soup group chat specifically.

**Notifications (bug 10) – three areas to track:**
1. **Out-of-app notifs** – Push notifications when the app is closed or in background (e.g. new message, challenge, reaction). Ensure Expo push is configured, tokens stored, and backend/triggers send to the right devices.
2. **In-app notifs** – Notifications while the user is inside the app (badges, banners, or in-app feed). Logic for when to show, what to show, and unread/read state.
3. **Noah-specific notifs** – So Noah never misses a message: (a) **Dashboard** – badge/count for unread support threads; (b) **24/7 support chat** – push to Noah’s phone when a user sends a message (e.g. Expo push when `app_support_messages` gets a new row with `from_admin = false`). Goal: Noah gets notified on his phone and can reply from dashboard or app.

**Emoji password fix options:** Audit Supabase for all `emoji_password` values in use and ensure the picker includes at least those (so existing users aren’t locked out). Or make picker scrollable; Noah prefers not scrolling, so audit/restore missing emojis is preferred.

**Add a group / naming (bug 6):** Product direction: treat it as “add a group” (exact names: French Beginner, French Advanced, etc.). Language is a property of the group; users set their languages on profile. Don’t normalize group names to just “French” where there are multiple levels.

**Emoji "forgot" / jog memory (bug 5):** When we fix, consider: in-app hint (e.g. first or last emoji); "reset my emoji" flow (verify phone → set new one); show emoji in profile so they can see it; "text me my emoji" (backend sends it); or a small dashboard tool so Noah can look up by name/phone and copy to send without opening Supabase.

*(Severity: high = blocks use, medium = annoying, low = polish.)*

---

## Quick reference

- **OTA:** Configured in **OTA_SETUP.md**. Publish with `eas update --branch production --message "…"`. Build 1.0.4 = runtime 1.0.4; channel production ↔ branch production linked.
- **Already fixed in code but not in this build:** See **DEV_BUILD_BUG_CHECKLIST.md** (podcast skip, react in chat, voice memo notification spam, challenge TTS, listen-back overlap, etc.). Those need a **new build** to reach TestFlight.
- **Changelog / what shipped recently:** **CONTEXT.md** → History / Changelog.
- **After fixing:** Bump build, ship new TestFlight build, then tell testers to update. Don’t forget to explain the fix to users (release notes or message).

---

*Last updated: Feb 19, 2026*
