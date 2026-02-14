# New member flow – test plan

Use this to manually verify the path from sign-up → first challenge.

---

## Flow overview

| Step | Screen | What happens |
|------|--------|--------------|
| 1 | **Login** | Name + 3-emoji password → `claim_user_identity` → if **no groups** → `/onboarding/conversational` |
| 2 | **Conversational** | Pick languages you can chat in → Continue or Skip → `/onboarding/learning` |
| 3 | **Learning** | Pick languages you’re learning → Continue or Skip → `/onboarding/tagline` |
| 4 | **Tagline** | Optional tagline → Continue or Skip → `/onboarding/avatar` |
| 5 | **Avatar** | Set avatar → Continue → `/onboarding/notifications` |
| 6 | **Notifications** | “Turn on notifications” or “Maybe later” → **`/group-selection`** |
| 7 | **Group selection** | Select ≥1 language group → Join → **`/(tabs)`** (home) |
| 8 | **Home** | If **0 messages sent** → **OnboardingMissionModal** (welcome to the soup → listen to voices → first challenge / skip) |

After step 8, completing or skipping the first challenge should leave them on home with the normal Your Soup experience.

---

## How to test

### Option A – Real new account (best)

1. Use a **new** name + new 3-emoji password you’ve never used (or use a staging build with a fresh backend).
2. Complete steps 1–8 above. Confirm:
   - No crashes, no wrong screen.
   - After “Join” on group-selection you land on home (tabs).
   - Welcome modal appears (loading → listening → recording/first challenge or skip).
   - After finishing/skipping, modal closes and home looks normal.

### Option B – Replay flow with existing account (simulate new)

1. In Supabase (or SQL): **remove all rows** in `app_group_members` for your **test user id** (so they have “no groups”).
2. In the app: log out (or clear session), then log in again with that account’s name + emoji password.
3. Login logic sends “no groups” users to `/onboarding/conversational`. Walk steps 2–8.
4. To restore: re-join your groups via group-selection, or re-insert memberships in DB.

Note: If AuthContext runs first and sends you to `/group-selection` before you see conversational, you may need to go back to login and ensure the login screen is the one that does the “no groups → conversational” redirect (login.jsx does this on **initial** login; after that, Auth may send you to group-selection when you have no groups).

---

## What to check at each step

- **Login:** Name + emoji required; no crash on submit; redirect to conversational when user has no groups.
- **Conversational / Learning / Tagline / Avatar:** Buttons work, skip works, no crash; next screen loads.
- **Notifications:** “Turn on” and “Maybe later” both lead to group-selection.
- **Group selection:** At least one group required; join succeeds; redirect to `/(tabs)`.
- **Home + OnboardingMissionModal:**  
  - “Preparing ur soup…” then listening step (voices from group).  
  - “More” / “Skip to challenge” work.  
  - First challenge card appears; record or skip works.  
  - Modal closes; home shows normal content (groups, daily challenges, etc.).

---

## Quick reference – where it’s implemented

- **Login routing:** `app/login.jsx` (no groups → `/onboarding/conversational`).
- **Auth redirect (no groups):** `contexts/AuthContext.js` → `group-selection`.
- **Onboarding steps:** `app/onboarding/conversational.jsx` → `learning.jsx` → `tagline.jsx` → `avatar.jsx` → `notifications.jsx` → `group-selection.jsx`.
- **Group selection → home:** `app/group-selection.jsx` → `router.push('/(tabs)')`.
- **Show welcome modal:** `app/(tabs)/index.jsx` → `checkOnboardingStatus()` (0 messages → `setShowOnboardingMission(true)`); modal is `OnboardingMissionModal.jsx`.
