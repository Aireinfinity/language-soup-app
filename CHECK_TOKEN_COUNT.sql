-- CHECK TOKEN COUNT
-- Did we send to 33 devices?

-- 1. How many tokens does Noah have?
SELECT user_id, count(*) as token_count 
FROM app_push_tokens 
WHERE user_id IN ('4d683957-8262-4874-b36c-d53bd99e8886', '29864936-719c-483b-ac6a-4d06084a48fe')
GROUP BY user_id;

-- 2. SAFETY CHECK: Did anyone ELSE get it?
-- (This is harder to check without logs, but we can check who inserted the challenge)
-- We rely on the code audit for this, but let's check if the 'app_challenges' table has unexpected rows created just now.
SELECT group_id, created_at 
FROM app_challenges 
WHERE created_at > NOW() - interval '5 minutes';
