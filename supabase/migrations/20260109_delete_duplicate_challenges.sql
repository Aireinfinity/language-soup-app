-- Delete Duplicate Challenges (Safety Script)
-- Deletes duplicates sent in the last 24 hours.
-- Definition of duplicate: Same Group, Same Text.
-- Keeps the oldest one (lowest ID).

DELETE FROM app_challenges a
USING app_challenges b
WHERE a.id > b.id                -- Delete the newer one (higher ID)
  AND a.group_id = b.group_id
  AND a.prompt_text = b.prompt_text
  AND a.created_at > (NOW() - INTERVAL '24 hours') -- Look at recent messages
  AND a.prompt_text ILIKE '#challenge%';           -- Only target challenges
