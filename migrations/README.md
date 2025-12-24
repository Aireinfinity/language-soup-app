# Running Quest System Migrations

## Step 1: Run the Main Quest System Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Open and run `migrations/add_quest_system.sql`
3. This creates:
   - `app_user_quests` table
   - RPC functions: `get_user_quest_progress`, `complete_quest`, `mark_celebration_seen`
   - Row Level Security policies

## Step 2: Run the Existing Users Migration

1. In Supabase Dashboard → SQL Editor
2. Open and run `migrations/migrate_existing_users_quests.sql`
3. This will:
   - Auto-complete quests for existing users based on their activity
   - Mark celebrations as "seen" so they don't get spammed
   - Analyze user data to determine which quests they've already accomplished

## What the Migration Does

The migration script checks each user's activity and auto-completes quests if they:

- **join_group**: User is in any group
- **first_text**: User has sent any text message
- **first_audio**: User has sent any voice message
- **reply_challenge**: User has replied to any message
- **community_chat**: User has sent any community message
- **send_bug**: User has sent any support message
- **request_language**: User has requested a language
- **view_profile**: Auto-completed for all existing users
- **peek_active_groups**: User is in 2+ groups

## After Migration

New users will:
- Start at 0/9 quests
- Get celebration animations when completing quests
- See the quest progress tracker on the home screen

Existing users will:
- Have appropriate quests already marked complete
- Not see celebration animations for pre-completed quests
- Continue from where they left off

## Verification

After running both migrations, you can verify by checking:
```sql
-- Check quest progress for a user
SELECT * FROM get_user_quest_progress('user-id-here');

-- See all quest completions
SELECT * FROM app_user_quests ORDER BY completed_at DESC;
```
