-- 1. DUMP THE CRON FUNCTION (Check if filters exist)
select proname, prosrc from pg_proc where proname = 'send_due_challenges';

-- 2. CHECK THE TRIGGER (Check if message printer exists)
select trigger_name, action_statement 
from information_schema.triggers 
where event_object_table = 'app_challenges';

-- 3. CHECK THE GROUPS (See what we need to filter)
select name, language from app_groups 
where name ilike '%test%' 
   or name ilike '%noah%'
   or name ilike '%qa%';
