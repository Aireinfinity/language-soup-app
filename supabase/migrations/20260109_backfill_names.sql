-- Migration: Backfill Names for Anonymous Users
-- Description: Updates app_users.display_name using the name found in app_native_speakers
--              Only targets users who are currently Anonymous/Null.

UPDATE app_users au
SET display_name = ans.display_name
FROM app_native_speakers ans
WHERE au.id = ans.user_id
  AND (au.display_name IS NULL 
       OR au.display_name = 'Anonymous' 
       OR au.display_name = 'Anonymous Souper')
  AND ans.display_name IS NOT NULL
  AND ans.display_name != 'Anonymous';
