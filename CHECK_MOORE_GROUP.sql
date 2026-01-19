-- CHECK_MOORE_GROUP.sql
-- Check if Mooré group exists and what language support we have

SELECT 
    id,
    name,
    language,
    created_at,
    CASE 
        WHEN language IN ('French', 'Spanish', 'German', 'Italian', 'Dutch', 'Polish', 
                         'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Korean', 
                         'Swedish', 'Danish', 'Finnish', 'Greek', 'Hungarian', 'Czech', 
                         'Romanian', 'Slovak', 'Bulgarian', 'Lithuanian', 'Latvian', 
                         'Estonian', 'Slovenian') 
            THEN '✅ DeepL Supported'
        WHEN language IN ('Arabic', 'Hindi', 'Turkish', 'Vietnamese', 'Thai', 
                         'Indonesian', 'Malay', 'Filipino', 'Hebrew', 'Persian', 
                         'Ukrainian', 'Croatian', 'Serbian', 'Catalan', 'Norwegian', 
                         'Icelandic')
            THEN '✅ Google Translate Supported'
        WHEN language = 'English'
            THEN '✅ Native (No Translation)'
        ELSE '⚠️ NOT SUPPORTED - Will send English'
    END as translation_support
FROM app_groups
WHERE LOWER(name) LIKE '%moor%' 
   OR LOWER(language) LIKE '%moor%'
ORDER BY created_at DESC;

-- Also show all groups to see what we have
SELECT 
    'ALL GROUPS' as section,
    id,
    name,
    language,
    (SELECT COUNT(*) FROM app_group_members WHERE group_id = app_groups.id) as member_count
FROM app_groups
ORDER BY name;

