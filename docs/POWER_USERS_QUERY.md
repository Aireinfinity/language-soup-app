# Power users / most active users

Use this to get a list of your most active users (e.g. for inviting to a special TestFlight group or power-user perks).

Run in **Supabase → SQL Editor**.

## All-time: top users by voice + text messages

```sql
SELECT
    u.id AS user_id,
    u.display_name,
    u.avatar_url,
    COUNT(*) FILTER (WHERE m.message_type = 'voice') AS voice_count,
    COUNT(*) FILTER (WHERE m.message_type = 'text') AS text_count,
    COUNT(*) AS total_messages,
    COUNT(DISTINCT DATE(m.created_at)) AS days_active
FROM app_messages m
JOIN app_users u ON u.id = m.sender_id
WHERE m.message_type IN ('voice', 'text')
GROUP BY u.id, u.display_name, u.avatar_url
ORDER BY total_messages DESC
LIMIT 50;
```

## Last 30 days only

```sql
SELECT
    u.id AS user_id,
    u.display_name,
    u.avatar_url,
    COUNT(*) FILTER (WHERE m.message_type = 'voice') AS voice_count,
    COUNT(*) FILTER (WHERE m.message_type = 'text') AS text_count,
    COUNT(*) AS total_messages,
    COUNT(DISTINCT DATE(m.created_at)) AS days_active
FROM app_messages m
JOIN app_users u ON u.id = m.sender_id
WHERE m.message_type IN ('voice', 'text')
  AND m.created_at >= (NOW() - INTERVAL '30 days')
GROUP BY u.id, u.display_name, u.avatar_url
ORDER BY total_messages DESC
LIMIT 50;
```

Export the result (CSV or copy) to get emails/IDs for TestFlight or WhatsApp invites. You can join with `auth.users` if you need email addresses (admin only).
