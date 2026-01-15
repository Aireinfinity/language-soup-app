-- Trigger to automatically create tickets from incoming user support messages
-- Logic: If a message is from a user (not admin) and doesn't have a title,
-- and there is no "active" ticket (new/fixing/investigating) for this user,
-- then promoted this message to a ticket by setting is_ticket = TRUE and generating a title.

CREATE OR REPLACE FUNCTION public.handle_auto_ticket_creation()
RETURNS TRIGGER AS $$
DECLARE
    existing_ticket_id UUID;
BEGIN
    -- Only process messages from users (not admins)
    IF NEW.from_admin = FALSE AND NEW.title IS NULL THEN
        
        -- Check for an existing open ticket for this user
        SELECT id INTO existing_ticket_id
        FROM public.app_support_messages
        WHERE user_id = NEW.user_id
          AND status IN ('new', 'investigating', 'fixing', 'fixed')
          AND is_ticket = TRUE
        LIMIT 1;

        -- If no open ticket exists, promote this message to a ticket
        IF existing_ticket_id IS NULL THEN
            NEW.is_ticket := TRUE;
            NEW.status := 'new';
            NEW.priority := 'P2';
            -- Auto-generate a title from content (max 50 chars)
            NEW.title := CASE 
                WHEN length(NEW.content) > 50 THEN left(NEW.content, 47) || '...'
                ELSE NEW.content
            END;
            -- Detect category (simple keyword detection)
            NEW.category := CASE
                WHEN NEW.content ILIKE '%bug%' OR NEW.content ILIKE '%crash%' OR NEW.content ILIKE '%error%' THEN 'bug'
                WHEN NEW.content ILIKE '%feature%' OR NEW.content ILIKE '%suggest%' OR NEW.content ILIKE '%would be%' THEN 'feature_request'
                ELSE 'bug'
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS tr_auto_create_ticket ON public.app_support_messages;
CREATE TRIGGER tr_auto_create_ticket
BEFORE INSERT ON public.app_support_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_ticket_creation();
