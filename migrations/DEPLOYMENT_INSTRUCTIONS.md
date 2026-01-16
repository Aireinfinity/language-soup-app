-- 📋 DEPLOYMENT INSTRUCTIONS

## Step 1: Deploy Both Functions
Run these in Supabase SQL Editor (in order):

1. `CREATE_TEST_FUNCTION.sql` - Creates the test version
2. `CREATE_PROD_FUNCTION.sql` - Creates the production version

## Step 2: Test the TEST Version
```sql
-- Schedule a challenge in your dashboard first, then run:
SELECT process_scheduled_challenges_TEST();
```

**Expected result:**
- ✅ 1 notification to noah :) on your device
- ✅ 1 message in "noah's test group solo"
- ✅ 0 messages in other groups
- ✅ Challenge marked as 'sent'

## Step 3: Update the Cron Job
Once testing works, update the cron to use PROD version:

```sql
-- Find the current cron job
SELECT * FROM cron.job WHERE command LIKE '%process_scheduled%';

-- Update it to use the PROD function
SELECT cron.alter_job(
    job_id := 13,  -- Use the actual job_id from above
    schedule := '* * * * *',  -- Every minute
    command := 'SELECT process_scheduled_challenges_PROD()'
);
```

## Step 4: Verify Cron is Using PROD
```sql
SELECT * FROM cron.job WHERE jobid = 13;
```

Should show: `SELECT process_scheduled_challenges_PROD()`

---

## Key Differences:

**TEST:**
- Manual trigger only
- Noah's test group solo only
- Noah :) notifications only
- Use for safe testing

**PROD:**
- Cron triggers automatically
- All groups (except test groups)
- All users (deduplicated)
- Live system

## Notification Fix:
Both versions now send individual notification objects:
```json
[
  {"to": "token1", "title": "...", "body": "..."},
  {"to": "token2", "title": "...", "body": "..."}
]
```

Instead of the broken format:
```json
[{"to": ["token1", "token2"], "title": "...", "body": "..."}]
```
