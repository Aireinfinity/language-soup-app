-- Migration: POPULATE_TEST_DATA_FOR_INSPIRATION.sql
-- Purpose: Safely add metadata to the most recent challenge in "Noah's test group solo" ONLY.
-- Risk: Minimal. Affects 1 row in 1 specific group.

UPDATE app_challenges
SET metadata = '{
    "starter_phrase": "Je voudrais un croissant, s''il vous plaît.",
    "vocab_bank": [
        {"word": "Le pain", "translation": "The bread"},
        {"word": "La boulangerie", "translation": "The bakery"},
        {"word": "Délicieux", "translation": "Delicious"},
        {"word": "Combien ça coûte?", "translation": "How much is it?"}
    ]
}'::jsonb
WHERE id = (
    -- Subquery to find the SINGLE most recent challenge in the specific test group
    SELECT c.id 
    FROM app_challenges c
    JOIN app_groups g ON c.group_id = g.id
    WHERE g.name ILIKE '%noah%test%group%solo%' 
    ORDER BY c.created_at DESC 
    LIMIT 1
);
