# Challenge Notification System - Architecture

## Overview
Automated challenge delivery system that sends daily challenges to all Language Soup users with translations in their native languages.

## System Components

### 1. Dashboard (The Brain)
**Location:** `/src/QueueTab.jsx`

**Responsibilities:**
- Translates challenges into all languages using `translationHelper.js`
- Saves fully translated challenges to `app_scheduled_challenges` table
- Stores translations in `translations` JSONB column
- Sets `scheduled_time` for when challenge should be sent

**Key Fields:**
- `challenge_text`: Original English text
- `translations`: JSONB object with all language translations
- `status`: 'approved' (ready to send) or 'sent' (already processed)
- `scheduled_time`: When to send (stored in UTC)

---

### 2. Database Functions (The Printer)

#### TEST Function: `process_scheduled_challenges_TEST()`
**Location:** `migrations/CREATE_TEST_FUNCTION.sql`

**Purpose:** Safe testing without spamming users

**Behavior:**
- Only inserts into "noah's test group solo" (ID: `439ffe03-96fa-41d3-96f1-c0a8a779ce9d`)
- Only sends notifications to noah :) (ID: `29864936-719c-483b-ac6a-4d06084a48fe`)
- Must be manually triggered: `SELECT process_scheduled_challenges_TEST();`

**When to use:**
- Testing new challenge formats
- Verifying translations
- Debugging notification issues

---

#### PROD Function: `process_scheduled_challenges_PROD()`
**Location:** `migrations/CREATE_PROD_FUNCTION.sql`

**Purpose:** Production automation for all users

**Behavior:**
- Inserts challenges into ALL groups except test groups
- Sends notifications to ALL users (deduplicated, 1 per user)
- Automatically triggered by cron every minute

**Excluded Groups:**
- `439ffe03-96fa-41d3-96f1-c0a8a779ce9d` (noah's test group solo)
- `a34c1008-72ea-4dbb-a605-6673f6c5f6b3` (app testers)

**Notification Format (FIXED):**
```json
[
  {"to": "ExponentPushToken[...]", "title": "...", "body": "..."},
  {"to": "ExponentPushToken[...]", "title": "...", "body": "..."}
]
```

---

### 3. Database Trigger
**Name:** `on_challenge_created`  
**Function:** `handle_new_challenge()`

**Purpose:** Automatically creates messages in `app_messages` when challenges are inserted

**Behavior:**
- Triggers on INSERT to `app_challenges`
- Creates corresponding message in `app_messages`
- Links message to challenge via `challenge_id`

---

### 4. Cron Job
**Schedule:** Every minute (`* * * * *`)  
**Command:** `SELECT process_scheduled_challenges_PROD()`  
**Job ID:** 20

**Purpose:** Automatically processes approved challenges at their scheduled time

---

## Data Flow

```
1. Dashboard (Brain)
   ↓
   Translates challenge → Saves to app_scheduled_challenges
   
2. Cron (Every minute)
   ↓
   Checks for approved challenges where scheduled_time <= NOW()
   
3. PROD Function (Printer)
   ↓
   Inserts into app_challenges (27 groups)
   
4. Database Trigger
   ↓
   Creates messages in app_messages (27 messages)
   
5. PROD Function (continued)
   ↓
   Sends notifications to all users (119 users, deduplicated)
```

---

## Testing Workflow

### Safe Testing (No User Spam)
1. Schedule challenge in dashboard
2. Manually run: `SELECT process_scheduled_challenges_TEST();`
3. Verify:
   - 1 notification received
   - 1 message in "noah's test group solo"
   - 0 messages in other groups

### Production Deployment
1. Schedule challenge in dashboard for desired time
2. Wait - cron automatically processes it
3. Monitor with `PRODUCTION_STATUS.sql`

---

## Monitoring & Verification

### Pre-Flight Check
**File:** `PRE_FLIGHT_CHECK.sql`

Verifies before testing:
- ✅ TEST function exists
- ✅ PROD function exists
- ✅ Test group exists
- ✅ Noah's push token exists
- ✅ Challenge is scheduled
- ✅ Cron status

### Production Status
**File:** `PRODUCTION_STATUS.sql`

Shows current system state:
- Cron status (active/inactive)
- Next scheduled challenge
- Total users to notify
- Total groups to receive challenges

---

## Key Files

### Database Functions
- `migrations/CREATE_TEST_FUNCTION.sql` - Test version
- `migrations/CREATE_PROD_FUNCTION.sql` - Production version

### Cron Management
- `migrations/STEP_0_DISABLE_CRON.sql` - Disable automation (safety)
- `migrations/FINAL_ENABLE_CRON.sql` - Enable automation

### Monitoring
- `PRE_FLIGHT_CHECK.sql` - Pre-test verification
- `PRODUCTION_STATUS.sql` - Live system status

### Documentation
- `migrations/DEPLOYMENT_INSTRUCTIONS.md` - Setup guide

---

## Important Notes

### Timezone Handling
- Database stores times in **UTC**
- Dashboard displays in **local time (UTC+1)**
- Example: 5:41 PM local = 16:41 UTC in database

### Notification Deduplication
- Uses `DISTINCT ON (user_id)` to ensure 1 notification per user
- Even if user is in multiple groups, they only get 1 notification

### Translation Storage
- Dashboard pre-translates ALL languages
- Database functions just read from `translations` JSONB column
- No translation logic in database functions (keeps them simple)

### Safety Mechanisms
- Test groups excluded from PROD function
- Cron can be disabled for maintenance
- TEST function for safe testing
- Challenges marked as 'sent' to prevent re-processing

---

## Troubleshooting

### No notifications sent
1. Check cron is active: `SELECT * FROM cron.job WHERE jobid = 20;`
2. Check push tokens exist: `SELECT COUNT(*) FROM app_push_tokens;`
3. Check challenge status: `SELECT * FROM app_scheduled_challenges WHERE status = 'approved';`

### Challenges not inserting
1. Verify scheduled_time is in the past (UTC)
2. Check PROD function exists: `SELECT * FROM pg_proc WHERE proname = 'process_scheduled_challenges_prod';`
3. Review cron logs: `SELECT * FROM cron.job_run_details ORDER BY end_time DESC LIMIT 5;`

### Testing not working
1. Ensure scheduled_time <= NOW()
2. Verify noah's test group exists
3. Check noah's push token is registered

---

## Future Improvements
- Add `test_mode` flag to challenges for cleaner test/prod separation
- Implement notification delivery tracking
- Add retry logic for failed notifications
- Create dashboard UI for monitoring system status
