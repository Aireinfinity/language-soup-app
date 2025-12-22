# Push Notification Deployment Checklist

## Step 2: Deploy Supabase Edge Function ✅ or ❌?

**Check if you did this:**
```bash
cd /Users/Aireinfinity/Desktop/language-soup/code/app
./deploy-push-notifications.sh
```

**Or manually:**
```bash
supabase functions deploy send-push-notification
```

**How to verify:**
- Go to Supabase Dashboard → Edge Functions
- Look for `send-push-notification` in the list
- If it's there, ✅ you did it!

---

## Step 3: Run Database Trigger Migration ✅ or ❌?

**What you need to do:**
1. Open `migrations/add_notification_triggers.sql`
2. **REPLACE** these two lines:
   ```sql
   supabase_url TEXT := 'YOUR_SUPABASE_PROJECT_URL'; -- REPLACE THIS
   supabase_anon_key TEXT := 'YOUR_SUPABASE_ANON_KEY'; -- REPLACE THIS
   ```
   
   With your actual values:
   ```sql
   supabase_url TEXT := 'https://yourproject.supabase.co';
   supabase_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

3. Copy the **entire file contents**
4. Go to Supabase Dashboard → SQL Editor → New Query
5. Paste and run

**How to verify:**
- Go to Supabase Dashboard → Database → Functions
- Look for `notify_new_challenge` function
- If it's there, ✅ you did it!

---

## Step 4: Enable HTTP Extension ✅ or ❌?

**What you need to do:**
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Run this:
   ```sql
   CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
   ```

**How to verify:**
1. In SQL Editor, run:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```
2. If you get a result, ✅ you did it!

---

## Quick Verification Script

Run this in Supabase SQL Editor to check everything:

```sql
-- Check if HTTP extension exists
SELECT 'HTTP Extension: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') 
  THEN '✅ Installed' 
  ELSE '❌ Missing' 
  END as status;

-- Check if trigger function exists
SELECT 'Trigger Function: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_new_challenge') 
  THEN '✅ Created' 
  ELSE '❌ Missing' 
  END as status;

-- Check if trigger exists
SELECT 'Trigger: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_challenge') 
  THEN '✅ Active' 
  ELSE '❌ Missing' 
  END as status;
```

---

## What Your Notifications Will Look Like

**Title:** `🎯 Language Soup`

**Body (randomly chosen):**
1. `new challenge in French #advanced`
2. `bro ur late the challenge is here! French #advanced`
3. `wait wait wait... new challenge? hell yeah! French #advanced`
4. `Salut! nouveau défi pour aujourd'hui! viens! (French #advanced)`

**Supported language greetings:**
- French, Spanish, German, Italian, Portuguese
- Mandarin, Japanese, Korean
- Arabic, Russian
- (Falls back to option 1 for other languages)
