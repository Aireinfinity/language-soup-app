-- FINAL DOUBLE-CHECK: Verify trigger is actually fixed

SELECT 
    proname as function_name,
    prosrc as function_code
FROM pg_proc
WHERE proname = 'handle_new_challenge';

-- Look for this in the output:
-- Should see: NEW.prompt_text (without '#challenge' || E'\n' || in front)
-- Should NOT see: '#challenge' || E'\n' || NEW.prompt_text
