# App simplification — "too much stuff" inventory

Quick list of what’s in the app today and where profile fits. Use this to decide what to cut, hide, or merge.

---

## Tabs (bottom)

- **Community** — Hub, leaderboards, greetings, native CTA, announcements, known issues, + "today" strip (challenge/podcast links).
- **Your Soup** — Header (avatar, name, support/request/browse), daily challenge card, podcast card, your chats (DMs + groups list), your stats.
- **Profile** — See below.

---

## Profile (what’s on it)

**Main scroll:**
- **Identity** — Avatar (tappable → camera/picker), display name, Edit pencil, tagline. Left/right columns: Learning languages (flags), Conversational languages (flags), expand/collapse.
- **Stats** — Section title "stats". Compact grid: Groups count, then "Comprehensible 📖" with Input / Output tabs (min spoken, min listened, levels). "Understanding Your Levels" link → Levels explainer modal.

**Header:**
- Log out (icon).
- Notifications bell (icon) → alert to turn on or "you're all set."

**Modals from Profile:**
- **Edit Profile** — Name, Tagline (+ example chips), Timezone (search), Conversational languages (search + chips), Learning languages (search + chips). Save/Cancel. (Avatar change is separate flow via hero tap.)
- **Choose Avatar** — Upload photo or pick soup avatar.
- **Understanding Your Levels** — What is Comprehensible Input, Input levels (Ear Training, Word Catcher, …), Output levels (…).

**Other:** Admin section (if admin). QuestStrip uses TAB_BAR_HEIGHT. Groups are in `renderGroups()` but not currently in the main scroll (could be dead code or used elsewhere).

---

## Other screens (not tabs)

- Chat (per group), support-chat, browse-groups, your-groups, group-info, group-selection, native-speakers, add-native-speaker, profile-creation, onboarding (avatar, conversational, learning, tagline, notifications), how-it-works, login, status-page, admin (dashboard, create-challenge, manage-groups, language-requests, etc.).

---

## Where it feels like "too much"

1. **Profile** — Identity + stats + edit (name, tagline, timezone, two language lists, avatar) + levels explainer + notifications + logout. That’s a lot of concepts on one tab.
2. **Your Soup** — Challenge + podcast + chats + stats + header actions (support, request, browse). Multiple "sections" on one scroll.
3. **Community** — Hub copy + native CTA + leaderboards (voice + challenge) + greetings + announcements + known issues + today strip. Also dense.
4. **Entry points** — Support, request, browse, your-groups, native-speakers, group-selection, etc. Lots of places to go.

---

## Simplification ideas (profile + overall)

**Profile only**
- **One surface, one job:** Profile = "you + how you’re doing." Keep: avatar, name, tagline, one stats summary (e.g. min spoken + min listened, no tabs). Move "Edit" to a single "Edit profile" that opens one modal: name, tagline, avatar. Move timezone + conversational + learning into that same modal but **collapse** by default ("Languages & timezone") or move to onboarding/settings and don’t re-edit often.
- **Cut or hide from Profile:** Input/Output tabs (show one number each, no levels explainer on profile), or move full "Comprehensible" stats to a "See full stats" that goes to a minimal second screen. Levels explainer → help/FAQ or first-time only.
- **Groups on Profile:** Either one line "Your groups (3)" → tap to your-groups, or remove from profile and only access groups from Your Soup / Chats.

**App-wide**
- **Fewer tabs:** e.g. Community + Chats (or Community + Today) so there’s no separate Profile tab — profile becomes "tap avatar in header" or a slide-out. Then Profile = one screen (avatar, name, tagline, one stat line, Edit, Log out) and the rest is behind "Edit" or "More."
- **Fewer entry points:** Support + request + browse could be one "More" or "Soup kitchen" menu (one row: Support · Request · Browse) instead of three separate header buttons. Same for "see all" groups → one place for "your groups."

**Principle:** One main thing per tab; everything else is one tap away (modal, menu, or single list). Profile doesn’t need to explain levels, timezone, and both language lists at once — it can be "you + a number or two + Edit."

---

## Next step

Pick one: (1) trim Profile only, (2) trim Profile + collapse header actions into one menu, or (3) reduce tabs and merge profile into "tap avatar" so the app has fewer top-level surfaces. Then we can do that slice first and leave the rest as-is.
