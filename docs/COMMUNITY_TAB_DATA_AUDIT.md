# Community tab — data audit

**Goal:** Make the tab feel like a **pulse** — lots of community, lots going on, "in the soup now," recent speakers. This doc lists what data we have and what we can show without new backend work.

---

## Data we have (today)

| Source | What it is | Used for |
|--------|------------|----------|
| **app_messages** | All messages (voice, text) in groups. Has: sender_id, group_id, created_at, message_type, media_url, duration_seconds. | Chat history, "spoke today" (today’s challenge responses only). |
| **app_group_members** | User’s groups + last_read_at. | Which groups the user is in; unread counts. |
| **app_users** | display_name, avatar_url, (last_seen in schema but **not written by app**). | Names and avatars. |
| **app_groups** | name, language, member_count. | Group list, "active groups" (top by member_count). |
| **get_global_leaderboard(p_limit)** | Top users by **voice message count in last 7 days**. Returns: user_id, display_name, avatar_url, voice_count. | Loaded but not shown on Community. |
| **get_challenge_share_leaderboard(p_limit)** | Top users by challenge shares (7 days). | Loaded but not shown. |
| **recentVoices (current)** | Voice messages that are **today’s challenge responses** in user’s groups, deduped by sender (max 5). | "Spoke today" feed. Often empty. |

**Important:** We do **not** have real-time presence (e.g. "online now"). We can approximate "in the soup now" using **recent message activity**.

---

## What we can show (no new backend)

1. **"X in the soup now"**  
   Define "now" as: **distinct people who sent any message in the last 1 hour** in the user’s groups.  
   - Query: `app_messages` where `group_id in (user's groups)`, `created_at >= now() - 1 hour`, get distinct `sender_id`, exclude current user.  
   - One query; count in JS. No new RPC.

2. **Recent voices (last 24h)**  
   **Any** voice message in the user’s groups in the last 24 hours (not just today’s challenge).  
   - Query: `app_messages` where `message_type = 'voice'`, `group_id in (user's groups)`, `created_at >= now() - 24h`, order by `created_at` desc, limit 15–20.  
   - Enrich with sender display_name, avatar_url.  
   - Feed stays populated whenever there’s any recent voice activity.

3. **Top soupers this week**  
   We already load **voiceLeaderboard** (get_global_leaderboard).  
   - Show a row of avatars + optional count: "Top soupers this week" or just faces.  
   - More faces, more "people are active."

4. **Member count**  
   We load **memberCount** (total app users, filtered).  
   - Can show "X in the soup" (total) or keep for other copy.

---

## What would need new data

- **True "live now"** — Would require the app (or a trigger) to write **app_users.last_seen** on open/foreground or on send. Then we could show "X online now" from last_seen in last 5–15 min. Not implemented today.
- **Reactions on voice messages** — We have **app_message_reactions** (message_id, user_id, emoji). We could show "❤️ 2" on recent voices if we load reactions for those message ids. Optional enhancement.

---

## Recommendation (implemented)

- **Pulse section** (replaces "spoke today"):  
  - **"X in the soup now"** — active in last hour (distinct senders in user’s groups).  
  - **Recent voices** — last 24h of voice messages in user’s groups (not just today’s challenge), so the feed is rarely empty.  
  - Same voice-bubble + faces strip UI.  
- **Optional:** Show **voiceLeaderboard** as "top this week" faces row so the tab feels busier and more social.
