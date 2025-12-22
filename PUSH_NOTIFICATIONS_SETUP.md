# Push Notifications Setup Guide

## Overview

Push notifications are now configured for Language Soup using:
- **Expo Push Notifications** for iOS and Android
- **Supabase Edge Functions** to send notifications
- **Database Triggers** to automatically notify users

## What Was Configured

### 1. App Configuration
- ✅ Added `expo-notifications` plugin to `app.json`
- ✅ Updated `NotificationContext.jsx` with correct EAS project ID
- ✅ Notification handlers for foreground/background notifications

### 2. Backend Service
- ✅ Created Supabase Edge Function: `send-push-notification`
- ✅ Respects user notification preferences
- ✅ Sends via Expo Push API

### 3. Database Triggers
- ✅ New group messages → notify group members
- ✅ New challenges → notify language learners
- ✅ Support replies → notify ticket creator
- ✅ Community messages → notify all users

## Deployment Steps

### Step 1: Deploy Supabase Edge Function

```bash
cd /Users/Aireinfinity/Desktop/language-soup/code/app

# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the Edge Function
supabase functions deploy send-push-notification
```

### Step 2: Set Environment Variables in Supabase

Go to your Supabase Dashboard → Edge Functions → Configuration and add:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (from Supabase settings)

### Step 3: Run Database Migrations

Execute the trigger migration in your Supabase SQL Editor:

```bash
# Copy the contents of migrations/add_notification_triggers.sql
# Paste into Supabase Dashboard → SQL Editor → New Query
# Run the query
```

**Important**: Before running triggers, you need to set these Supabase settings:

```sql
-- In Supabase SQL Editor, run:
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = 'your-anon-key';
```

### Step 4: Enable HTTP Extension (Required for Triggers)

The triggers use `net.http_post` to call the Edge Function. Enable it:

```sql
-- In Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
```

### Step 5: Build New App Version

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

## Testing Push Notifications

### Test 1: Manual Test via Expo Tool

1. Install the new build on a physical device
2. Open the app and grant notification permissions
3. Check Supabase `app_push_tokens` table for the token
4. Go to https://expo.dev/notifications
5. Enter the token and send a test notification

### Test 2: Test In-App Notifications

1. Send a message in a group chat from another account
2. Verify the recipient receives a push notification
3. Tap the notification and verify it opens the correct chat

### Test 3: Test Challenge Notifications

1. Create a new challenge via admin panel
2. Verify all users in that language group receive notifications

## Troubleshooting

### No Push Token Saved
- Make sure you're testing on a **physical device** (not simulator)
- Check that notification permissions were granted
- Check console logs in the app for errors

### Notifications Not Received
- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
- Verify database triggers are created: Check in Supabase Table Editor
- Ensure `http` extension is enabled

### Expo Push API Errors
- Check that tokens are valid Expo push tokens (start with `ExponentPushToken[...]`)
- Verify you're using the correct EAS project ID
- Check Expo's push notification status: https://status.expo.dev/

## User Notification Preferences

Users can control their notification preferences via the `app_notification_preferences` table:

```sql
-- Disable all push notifications for a user
UPDATE app_notification_preferences
SET push_enabled = false
WHERE user_id = '<user-id>';

-- Disable only message notifications
UPDATE app_notification_preferences
SET new_messages = false
WHERE user_id = '<user-id>';
```

## Next Steps

1. **Add UI for notification preferences** in the app settings
2. **Implement notification badges** on tab bar icons
3. **Add notification sounds** (custom audio files)
4. **Test on both iOS and Android** thoroughly
5. **Monitor Edge Function costs** in Supabase dashboard
