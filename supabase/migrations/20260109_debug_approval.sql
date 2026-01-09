-- Debug: Check Approval Status for Miranda
-- The TestFlight build still uses the "Approval" system.
-- If 'is_approved' is FALSE, the TestFlight build will hide her name.

SELECT id, display_name, is_approved 
FROM app_users 
WHERE display_name ILIKE '%Miranda%' OR display_name ILIKE '%Anonymous%';
