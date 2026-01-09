-- Migration: Fix Names from Auth Provider (Enhanced)
-- Description: Updates app_users.display_name from auth.users metadata.
--              Fallbacks: full_name -> name -> display_name -> Email Username -> 'Souper'

UPDATE public.app_users au
SET display_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'display_name',
    SPLIT_PART(u.email, '@', 1), -- Fallback to email username (e.g. noah from noah@gmail.com)
    'Souper'
)
FROM auth.users u
WHERE au.id = u.id
  AND (au.display_name IS NULL 
       OR au.display_name ILIKE '%Anonymous%' 
       OR au.display_name = 'Unknown Souper');
