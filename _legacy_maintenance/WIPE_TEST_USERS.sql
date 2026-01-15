-- SAFE CLEANUP SCRIPT
-- Paste this into your Supabase SQL Editor to wipe the 30 test accounts.
-- This handles the foreign key issues for you.

DO $$
DECLARE
    trash_ids uuid[] := ARRAY[
        '04f834c7-b137-42d7-aa89-a527ffb04811', '9d332e72-0d56-4a99-9343-c62e8ed5b66f', 
        '05307fef-5067-4ab0-9b9b-8038f32a7af8', '220bba4e-eae4-483b-aa2b-edccadc53d08', 
        '245ba6ee-2d91-4614-a073-e54f5d416891', 'c80fd8cb-f2da-4239-a035-786c418caad2',
        'd0db4da4-58db-45ad-b655-9946f1ad4d30', '34bf729a-13ba-4dfb-9747-7da79b4baa9f', 
        '1adc762c-1cd6-48da-a94f-236d03291e6e', '96791cad-943c-431c-8d6f-f612bb8f3c4f', 
        'f9819624-4b84-433a-9a18-149af27e906e', '464153aa-8f86-49a3-94af-d2c04a34fcde',
        '0b91df75-c557-4224-8708-9fc803f54282', '5392b249-0dac-4636-8911-d6b11aae2748', 
        'ae1e442a-fb0d-4034-8c88-75b253b2be0e', '91bf9790-25bc-4293-875f-33166827059c', 
        '175e4785-555e-4731-9037-77567784f18a', '4c5208f2-2cac-4d17-aa19-9009c6da4c52',
        'cdaa5520-696f-44dd-a724-bd81b51ccdaa', 'f1ef8eb3-3e5f-4a5a-a10b-534028d8f1ef', 
        'a6f255ca-b902-4cbd-9b2e-f5f38fbba6f2', '8ad08e1b-a723-4f46-857e-9d3ee9998ad0', 
        '1cd77c6b-5300-4413-bbd0-9953dcf81cd7', 'b7100610-2510-43b9-8224-263c59e3b710',
        'f7fc5850-3ed5-4962-abd4-8eff150df7fc', '69e60102-2510-43b9-8224-263c59e3b710', 
        '9733d69a-3759-44ae-b022-ded905289733', 'feb8bfe9-00c8-4afc-979d-6e8baa3dfeb8', 
        '9f38856f-c110-4002-b44d-caedb13a9f38', '48792804-9208-4707-8d39-6205223f4879'
    ];
BEGIN
    -- Remove from all potential tables where test users might have left a trace
    DELETE FROM app_messages WHERE sender_id = ANY(trash_ids);
    DELETE FROM app_group_members WHERE user_id = ANY(trash_ids);
    DELETE FROM app_notifications WHERE user_id = ANY(trash_ids);
    DELETE FROM app_scheduled_challenges WHERE created_by = ANY(trash_ids);
    
    -- Final blow: Delete the users
    DELETE FROM app_users WHERE id = ANY(trash_ids);
    
    RAISE NOTICE '30 test users deleted successfully.';
END $$;
