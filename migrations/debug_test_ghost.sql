-- Check if the "Test Ghost" profile exists correctly
SELECT * FROM app_users WHERE display_name ILIKE '%Test Ghost%';
