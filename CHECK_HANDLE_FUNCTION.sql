-- CHECK WHAT handle_new_challenge() FUNCTION DOES

SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_challenge';
