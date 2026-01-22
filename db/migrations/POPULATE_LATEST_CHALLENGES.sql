-- COMPREHENSIVE TEST DATA POPULATION
-- Updates the LATEST challenge in EVERY group with native sample text.
-- Safe because production apps ignore the 'metadata' column.

WITH latest_challenges AS (
    SELECT DISTINCT ON (g.id) 
        c.id, 
        g.language
    FROM app_challenges c
    JOIN app_groups g ON c.group_id = g.id
    ORDER BY g.id, c.created_at DESC
),
language_map AS (
    SELECT id, language,
    CASE 
        -- EUROPEAN
        WHEN language ILIKE '%French%' THEN '{"starter_phrase": "Je voudrais un croissant.", "vocab_bank": [{"word": "Pain", "translation": "Bread"}]}'::jsonb
        WHEN language ILIKE '%Spanish%' OR language ILIKE '%Esp%' THEN '{"starter_phrase": "Quiero dos tacos por favor.", "vocab_bank": [{"word": "Taco", "translation": "Taco"}]}'::jsonb
        WHEN language ILIKE '%German%' OR language ILIKE '%Deutsch%' THEN '{"starter_phrase": "Ich möchte ein Bier bitte.", "vocab_bank": [{"word": "Bier", "translation": "Beer"}]}'::jsonb
        WHEN language ILIKE '%Italian%' THEN '{"starter_phrase": "Vorrei una pizza margherita.", "vocab_bank": [{"word": "Pizza", "translation": "Pizza"}]}'::jsonb
        WHEN language ILIKE '%Portuguese%' THEN '{"starter_phrase": "Eu gosto de café.", "vocab_bank": [{"word": "Café", "translation": "Coffee"}]}'::jsonb
        WHEN language ILIKE '%Dutch%' THEN '{"starter_phrase": "Ik wil graag een fiets huren.", "vocab_bank": [{"word": "Fiets", "translation": "Bike"}]}'::jsonb
        WHEN language ILIKE '%Russian%' THEN '{"starter_phrase": "Где находится метро?", "vocab_bank": [{"word": "Метро", "translation": "Metro"}]}'::jsonb
        WHEN language ILIKE '%Polish%' THEN '{"starter_phrase": "Dzień dobry, jak się masz?", "vocab_bank": [{"word": "Dzień dobry", "translation": "Good morning"}]}'::jsonb
        WHEN language ILIKE '%Greek%' THEN '{"starter_phrase": "Kalimera, ti kanis?", "vocab_bank": [{"word": "Nero", "translation": "Water"}]}'::jsonb

        -- ASIAN
        WHEN language ILIKE '%Japanese%' THEN '{"starter_phrase": "Konnichiwa, sushi o kudasai.", "vocab_bank": [{"word": "Sushi", "translation": "Sushi"}]}'::jsonb
        WHEN language ILIKE '%Chinese%' OR language ILIKE '%Mandarin%' THEN '{"starter_phrase": "Ni hao, wo yao iba cha.", "vocab_bank": [{"word": "Cha", "translation": "Tea"}]}'::jsonb
        WHEN language ILIKE '%Korean%' THEN '{"starter_phrase": "Annyeonghaseyo, gamsahamnida.", "vocab_bank": [{"word": "Kimchi", "translation": "Kimchi"}]}'::jsonb
        WHEN language ILIKE '%Hindi%' THEN '{"starter_phrase": "Namaste, aap kaise hain?", "vocab_bank": [{"word": "Chai", "translation": "Tea"}]}'::jsonb
        WHEN language ILIKE '%Thai%' THEN '{"starter_phrase": "Sawasdee krup, sabai dee mai?", "vocab_bank": [{"word": "Sawasdee", "translation": "Hello"}]}'::jsonb
        
        -- MIDDLE EASTERN
        WHEN language ILIKE '%Arabic%' THEN '{"starter_phrase": "Assalamu alaykum, kayfa haluk?", "vocab_bank": [{"word": "Shukran", "translation": "Thanks"}]}'::jsonb
        WHEN language ILIKE '%Farsi%' OR language ILIKE '%Persian%' THEN '{"starter_phrase": "Salam, chetori? Man khobam.", "vocab_bank": [{"word": "Salam", "translation": "Hello"}]}'::jsonb
        WHEN language ILIKE '%Turkish%' THEN '{"starter_phrase": "Merhaba, nasılsın?", "vocab_bank": [{"word": "Su", "translation": "Water"}]}'::jsonb
        WHEN language ILIKE '%Hebrew%' THEN '{"starter_phrase": "Shalom, ma nishma?", "vocab_bank": [{"word": "Toda", "translation": "Thanks"}]}'::jsonb

        -- DEFAULT
        ELSE '{"starter_phrase": "Hello, how are you today?", "vocab_bank": [{"word": "Hello", "translation": "Hello"}]}'::jsonb
    END as new_metadata
    FROM latest_challenges
)
UPDATE app_challenges
SET metadata = language_map.new_metadata
FROM language_map
WHERE app_challenges.id = language_map.id;
