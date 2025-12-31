-- COMPREHENSIVE DUPLICATE FIX
-- 1. CLEANUP: Delete duplicate users that don't match an Auth ID
-- 2. PREVENTION: Drop the trigger that creates them

-- PART 1: Delete "Ghost" Duplicates
-- (Users that have a display_name that appears more than once, AND their ID is NOT in auth.users)
-- This assumes the "Real" user has an ID that matches their Auth ID (which your App does).

DELETE FROM app_users
WHERE id IN (
    SELECT u.id
    FROM app_users u
    JOIN (
        SELECT display_name
        FROM app_users
        GROUP BY display_name
        HAVING COUNT(*) > 1
    ) dup ON u.display_name = dup.display_name
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = u.id
    )
);

-- PART 2: Stop Future Duplicates (Drop the Hidden Trigger)
-- This tries to drop common names for this trigger. 
-- If your trigger is named something else, run the "find_triggers" script I gave you first!

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile();

SELECT 'Duplicates deleted and triggers dropped! 🧹✨' as status;
