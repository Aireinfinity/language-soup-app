# Simplification quick wins (before the nitty-gritty)

**Goal:** Reduce clutter and cognitive load so you have room to think. Nothing deleted that we might need; archive first, simplify structure where it's low-risk.

---

## Done (this pass)

- **Docs archived:** 13 files moved to `docs/archive/` per WORKSPACE_CLEANUP:
  - HERO_CARD_OLD_DESIGN, HOME_PAGE_PLAN, HOME_ORGANIZATION_OPTIONS, YOUR_DAY_HOME_SPEC, YOUR_SOUP_PAGE_SPEC
  - TWO_TABS_DESIGN_HERO, NEW_MEMBER_FLOW_TEST, WELCOME_ONBOARDING_REDESIGN_PLAN, APP_SIMPLIFICATION_INVENTORY
  - COMMUNITY_TAB_DATA_AUDIT, UX_NOTES, QUEST_AUDIT, antigravity_report
- **KEY_DOCUMENTS.md** updated: "Two tabs" points to archive; added row for `docs/archive/`.

---

## Optional next (pick what feels worth it)

### 1. Tab structure (app)

- **Current:** (tabs) has 5 screens; tab bar is hidden (`display: 'none'`). Only "feed" is the main surface. `(tabs)/index` just redirects to feed.
- **Simplify:** You could remove the `(tabs)/index` screen and make the (tabs) layout's initial route "feed" and have root `index` (boot) send logged-in users to `/(tabs)/feed` instead of `/(tabs)` (if it does). Low impact either way; the redirect is one small file. **Recommendation:** Leave as-is unless you want to delete that redirect file for clarity.

### 2. Naming / orientation

- **Current:** One folder `code/dashboard` = Expo app + Vite admin. Package name is `app-dashboard`. Can be confusing.
- **Simplify:** Add a 3–4 line README at `code/dashboard/README.md`: "This repo contains the Language Soup **Expo app** (React Native, `app/`, components/) and the **admin dashboard** (Vite, `src/`). Run app: `npm run start`. Run admin: `npm run dev`." No renames, no moves, just one place that states the split.

### 3. Dead or duplicate routes

- **community-chat.jsx** vs **support-chat.jsx:** Both exist. Support = "chat with Noah"; community-chat is a separate channel. If community-chat is unused, you could later add it to an "archive" or remove the route after confirming. **Do not remove yet** without checking if anything deep-links to it.
- **profile-modal** vs **user/[id]:** Profile modal is "you"; user/[id] is "any user" (including you when you tap your header). Both used; no change.

### 4. Cursor/IDE clutter

- `.cursor/plans/` and `.vscode/` are untracked (per git status). If they’re just local experiment plans, you could add `docs/archive/` and optionally `.cursor/plans/` to `.gitignore` so they don’t show up in "changed" lists. Only if you want a cleaner git status.

### 5. What not to touch (yet)

- **CONTEXT.md**, **FEATURES_AND_REQUESTS.md**, **KEY_DOCUMENTS.md**, **.cursor/rules/** — referenced everywhere; don’t delete or move.
- **Chat/group logic** — one big `GroupChatView`; simplifying it is a bigger refactor. Better to do after you’re in the redesign flow.

---

## Principle

**Archive, don’t delete.** You’ve already moved 13 docs to `docs/archive/`. If you never open them, you can delete from archive later. Same for any code you’re unsure about: comment "legacy?" and a date, or move to an `archive/` or `_deprecated/` folder and document in README.

When you’re ready to dive into the redesign, the main surface is: **FeedLayout** (header + group banner) and **GroupChatView** (the feed/chat). Everything else is reachable from there or from the group picker.
