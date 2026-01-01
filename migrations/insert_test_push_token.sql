-- Manually insert a test push token for noah
-- Replace 'YOUR_EXPO_PUSH_TOKEN_HERE' with an actual token from Expo's push notification tool

-- First, find noah's user ID
SELECT id, display_name FROM app_users WHERE display_name LIKE '%noah%';

-- Then insert a test token (replace the token and user_id)
INSERT INTO app_push_tokens (user_id, expo_push_token, platform, updated_at)
VALUES (
    'YOUR_USER_ID_HERE',  -- Replace with noah's actual user ID from above
    'ExponentPushToken[YOUR_TOKEN_HERE]',  -- Replace with a test token
    'ios',
    NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
    expo_push_token = EXCLUDED.expo_push_token,
    platform = EXCLUDED.platform,
    updated_at = EXCLUDED.updated_at;
