-- PREDICT AUDIENCE 🔮
-- Count exactly how many notifications will be sent tomorrow.

WITH target_groups AS (
    SELECT id, name
    FROM app_groups
    WHERE id NOT IN (
        '439ffe03-96fa-41d3-96f1-c0a8a779ce9d', -- noah's test group solo
        'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'  -- app testers :) (click here!)
    )
),
target_tokens AS (
    SELECT DISTINCT t.expo_push_token
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id IN (SELECT id FROM target_groups)
    AND t.expo_push_token LIKE 'ExponentPushToken%'
)
SELECT count(*) as "Total_Recipients_Tomorrow"
FROM target_tokens;
