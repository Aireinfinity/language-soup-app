-- Fix duplicate #challenge text in messages
-- Sometimes messages have "#challenge #challenge" or "#challenge\n#challenge"

UPDATE app_challenges
SET prompt_text = REGEXP_REPLACE(prompt_text, '^(#challenge[\s\n]*)+', '#challenge ', 'i')
WHERE prompt_text ILIKE '#challenge%#challenge%';

-- Also check app_messages just in case (if challenges are mirrored there)
UPDATE app_messages
SET content = REGEXP_REPLACE(content, '^(#challenge[\s\n]*)+', '#challenge ', 'i')
WHERE content ILIKE '#challenge%#challenge%';
