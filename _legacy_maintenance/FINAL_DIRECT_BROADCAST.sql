-- FINAL BROADCAST (RETURNS TABLE)
-- PROOF OF ACTION
WITH tokens AS (
    SELECT DISTINCT expo_push_token 
    FROM app_push_tokens 
    WHERE expo_push_token LIKE 'ExponentPushToken%'
    -- SENDING TO EVERYONE NOW (Filter removed)
    -- AND user_id IN ...
)
SELECT 
    count(*) as tokens_found,
    CASE 
        WHEN count(*) > 0 THEN 
            net.http_post(
                url := 'https://exp.host/--/api/v2/push/send',
                headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
                body := jsonb_build_array(
                    jsonb_build_object(
                        'to', (SELECT jsonb_agg(expo_push_token) FROM tokens),
                        'title', 'Update 🥣',
                        'body', 'sorry fixing notification spam 👨‍💻 one ping only now!',
                        'sound', 'default'
                    )
                )
            )::text 
        ELSE 'No Request Sent (0 Tokens)' 
    END as request_result
FROM tokens;
