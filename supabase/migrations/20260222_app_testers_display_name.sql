-- Display name: "app testers :) (click here!)" → "app testers :)"
UPDATE app_groups
SET name = 'app testers :)'
WHERE name ILIKE '%app testers%click here%';
