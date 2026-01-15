import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBotUser() {
    const BOT_ID = '00000000-0000-0000-0000-000000000000';
    console.log('🤖 Checking for System Bot User:', BOT_ID);

    const { data, error } = await supabase
        .from('app_users')
        .select('id, display_name')
        .eq('id', BOT_ID)
        .single();

    if (error) {
        console.error('❌ Bot User NOT found or error:', error.message);
    } else {
        console.log('✅ Bot User found:', data);
    }
}

checkBotUser();
