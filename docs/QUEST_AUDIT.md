# Quest audit

Quick reference for "who's done what," what's broken, and what to do next.

---

## Current quests (9)

| Quest ID | Title | Where completion is triggered |
|----------|--------|--------------------------------|
| `join_group` | Join a Group | `browse-groups.jsx` — when user joins a group |
| `first_text` | Send a Text | `chat/[id].jsx` — when sending a text message |
| `first_audio` | Send Audio | `chat/[id].jsx`, `support-chat.jsx` — when sending voice |
| `reply_challenge` | Reply to Challenge | `chat/[id].jsx` — when sending (if challenge context) |
| `community_chat` | Say Hi in Community | `community-chat.jsx` — when sending in community chat |
| `view_profile` | Check Your Profile | `profile.jsx` — on focus |
| `peek_active_groups` | Peek at Active Groups | `community.jsx` — when viewing (e.g. on load/focus) |
| `send_bug` | Report a Bug | `support-chat.jsx` — when sending to support |
| `request_language` | Request a Language | **Fixed:** `index.jsx` → `handleLanguageRequest` now calls `completeQuest('request_language')` after successful insert. |

---

## Data model

- **Table:** `app_user_quests`  
  Columns: `id`, `user_id`, `quest_id`, `completed_at`, `seen_celebration`, `created_at`.  
  One row per user per quest when completed.
- **RPCs:**  
  - `get_user_quest_progress(uid)` — returns that user’s completed quests.  
  - `complete_quest(uid, qid)` — inserts a row if not already completed; returns true if newly completed.  
  - `mark_celebration_seen(uid, qid)` — sets `seen_celebration = true`.

---

## Queries: who’s done what

Run these in the Supabase SQL editor (or your DB client).

**1. Completion counts per quest (how many users completed each)**

```sql
SELECT quest_id, COUNT(*) AS completions
FROM app_user_quests
GROUP BY quest_id
ORDER BY completions DESC;
```

**2. List users who completed a specific quest (e.g. `reply_challenge`)**

```sql
SELECT u.display_name, u.id, q.completed_at
FROM app_user_quests q
JOIN app_users u ON u.id = q.user_id
WHERE q.quest_id = 'reply_challenge'
ORDER BY q.completed_at DESC;
```

**3. Per-user summary (how many quests each user completed)**

```sql
SELECT u.display_name, u.id, COUNT(q.quest_id) AS completed_count
FROM app_users u
LEFT JOIN app_user_quests q ON q.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY completed_count DESC;
```

**4. Which quests each user has completed (pivot-style)**

```sql
SELECT
  u.display_name,
  u.id,
  MAX(CASE WHEN q.quest_id = 'join_group' THEN 1 ELSE 0 END) AS join_group,
  MAX(CASE WHEN q.quest_id = 'first_text' THEN 1 ELSE 0 END) AS first_text,
  MAX(CASE WHEN q.quest_id = 'first_audio' THEN 1 ELSE 0 END) AS first_audio,
  MAX(CASE WHEN q.quest_id = 'reply_challenge' THEN 1 ELSE 0 END) AS reply_challenge,
  MAX(CASE WHEN q.quest_id = 'community_chat' THEN 1 ELSE 0 END) AS community_chat,
  MAX(CASE WHEN q.quest_id = 'view_profile' THEN 1 ELSE 0 END) AS view_profile,
  MAX(CASE WHEN q.quest_id = 'peek_active_groups' THEN 1 ELSE 0 END) AS peek_active_groups,
  MAX(CASE WHEN q.quest_id = 'send_bug' THEN 1 ELSE 0 END) AS send_bug,
  MAX(CASE WHEN q.quest_id = 'request_language' THEN 1 ELSE 0 END) AS request_language
FROM app_users u
LEFT JOIN app_user_quests q ON q.user_id = u.id
GROUP BY u.id, u.display_name;
```

**Run from CLI:** From `code/dashboard`, set `DATABASE_URL` (Supabase → Project Settings → Database → Connection string, URI) in `.env` or `.env.local`, then run `node scripts/quest_audit.mjs` to print all four result sets.

Use (1) for “which quests are popular,” (2) for “who did this quest,” (3) for “who’s most engaged,” (4) for export or “show who’s done what” in a table.

---

## Community vibe: “show who’s done what”

Right now, quest data is per-user and only shown to that user (WaveformQuestBar, QuestProgress). To show “who’s done what” in a community way you’d need one or more of:

- **Option A – In-app (same group):** For a given group, show “X people in this group completed [Reply to Challenge].” That requires either:
  - A view or RPC that joins `app_group_members` → `app_user_quests` and counts by `quest_id` (and optionally by group), or
  - The app to fetch group members and then for each member call `get_user_quest_progress` (or a new batch RPC) and aggregate. A batch RPC is better for performance.
- **Option B – Anonymous aggregates:** Show only counts: “12 people completed Reply to Challenge this week” (no names). Same as above but you only return counts, not user ids/names.
- **Option C – Public “quest board”:** A screen that lists quests and, for each, a list of display names (or “X people”) who completed it. Requires an RPC that returns (quest_id, list of user display names or count) with appropriate privacy (e.g. only users who opted in, or only within a group).

Recommendation: start with **query 1** and **query 3** to see real completion rates. Then add one RPC (e.g. `get_quest_completion_counts()` or `get_group_quest_completion(group_id)`) that returns counts (and optionally names) for the scope you want (app-wide vs per-group). Expose that in the app in one place (e.g. community tab or a “quest board” section) so the vibe is “we’re all doing these” without overbuilding.

---

## Add / remove quests for next iteration

- **Remove:** If a quest doesn’t match product goals (e.g. “Report a Bug” is rare and not core), you can stop showing it in `QUESTS` and stop calling `completeQuest` for it. Existing rows in `app_user_quests` stay; they just won’t be displayed.
- **Add:** Add a new entry to `QUESTS` in `QuestContext.jsx`, then call `completeQuest('new_quest_id')` in the right place (the screen or action that represents completion). No DB migration needed — `app_user_quests` is keyed by `quest_id` text.
- **Rename / reorder:** Change titles, emojis, or order in `QUESTS`; no DB change.

After you run the queries and decide “we’re keeping these 7 and adding 2,” update `QUESTS` and the completion triggers accordingly. Then tell users (“we’ve got new quests”) in-app (e.g. a small banner or a line in the quest bar).

---

## Checklist

- [ ] Run query 1 and 3; note which quests have few or zero completions.
- [x] Fix `request_language`: call `completeQuest('request_language')` after successful language request submit in `index.jsx` (done).
- [ ] Decide scope for “who’s done what” (per-group vs app-wide, counts vs names).
- [ ] Add one RPC (and optional UI) for that scope.
- [ ] Decide which quests to keep / add / remove for next iteration; update `QUESTS` and triggers.
- [ ] Add a one-time “new quests” message or banner if you changed the set.
