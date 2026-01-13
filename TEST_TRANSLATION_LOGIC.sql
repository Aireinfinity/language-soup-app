-- TEST TRANSLATION LOGIC (Simulation)
-- This shows exactly what text would be sent to which group, based on your scheduled challenge.

SELECT 
    g.name as group_name,
    g.language as group_language,
    s.translations ->> g.language as raw_translation,
    -- The logic we use in the cron job:
    -- The logic we use in the cron job (DUMB LOOKUP):
    COALESCE(
        s.translations ->> g.language, 
        CASE 
            WHEN s.challenge_text ILIKE '#challenge%' THEN s.challenge_text 
            ELSE '#challenge' || E'\n' || s.challenge_text 
        END
    ) as final_text_to_send
FROM app_scheduled_challenges s
CROSS JOIN app_groups g
WHERE s.status = 'approved'
  -- ONLY YOUR GROUPS (Simulation matches reality)
  AND EXISTS (
      SELECT 1 FROM app_group_members gm 
      WHERE gm.group_id = g.id 
      AND gm.user_id IN (
          '4d683957-8262-4874-b36c-d53bd99e8886', 
          '29864936-719c-483b-ac6a-4d06084a48fe'
      )
  );
