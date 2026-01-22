-- Update ALL existing challenges with the "Draft 1" content
-- This makes the "Need some ingredients?" button appear for ALL challenges in the Dev Client.
-- Production users won't see this because they don't have the frontend code update yet.

UPDATE app_challenges
SET metadata = '{
    "starter_phrase": "Je voudrais un croissant.",
    "vocab_bank": [
        {"word": "Le pain", "translation": "Bread"}, 
        {"word": "La boulangerie", "translation": "Bakery"}, 
        {"word": "Délicieux", "translation": "Delicious"}
    ]
}'::jsonb
WHERE metadata IS NULL OR metadata = '{}'::jsonb;
