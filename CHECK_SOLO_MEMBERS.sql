-- CHECK SOLO GROUP MEMBERS
-- Why 6 extra notifications? Are there 7 people in this group?

SELECT 
    gm.user_id, 
    u.email, -- (Assuming joined with auth.users or similar, but let's just count first)
    count(*) 
FROM app_group_members gm
LEFT JOIN auth.users u ON u.id = gm.user_id
WHERE gm.group_id = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d' -- Solo Group ID
GROUP BY gm.user_id, u.email;
