-- AUTO-ADMIN TRIGGER
-- Replace 'YOUR_EMAIL@EXAMPLE.COM' with your actual email address below.
-- Run this script in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.auto_promote_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Replace with your email
    IF NEW.email = 'YOUR_EMAIL@EXAMPLE.COM' THEN
        NEW.role := 'admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop strict if exists
DROP TRIGGER IF EXISTS on_auth_user_created_promote ON auth.users;

-- Trigger on auth.users creation (before it copies to public.app_users potentially, or we do it on public.app_users)
-- Actually, let's do it on public.app_users BEFORE INSERT
DROP TRIGGER IF EXISTS on_app_user_insert_promote ON public.app_users;

CREATE TRIGGER on_app_user_insert_promote
BEFORE INSERT ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.auto_promote_admin();

-- If you already exist, update it now:
-- UPDATE public.app_users SET role = 'admin' WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';
