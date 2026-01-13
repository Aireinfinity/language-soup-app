-- FINAL BROADCAST (REAL)
-- Sends to EVERYONE (99 tokens). One request. Direct.
WITH tokens AS (
    SELECT DISTINCT expo_push_token 
    FROM app_push_tokens 
    WHERE expo_push_token LIKE 'ExponentPushToken%'
    -- NO FILTER = ALL USERS
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
                        'title', 'SORRY',
                        'body', 'I KNOW I MESSED UP OKAY IM FIXING NOTIFICATIONS ASAP AFTER I EAT DINNER #troubleinparadise #stayalert #amberalertvibe',
                        'sound', 'default'
                    )
                )
            )::text 
        ELSE 'No Request Sent (0 Tokens)' 
    END as request_result
FROM tokens;
