import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectEnglishContent() {
    console.log('🕵️‍♀️ Inspecting English Message Content...');

    const { data: msg, error } = await supabase
        .from('app_messages')
        .select('*')
        .eq('id', 'c7afd93b-d0ea-405e-8f49-87f9adbd435d') // ID found in previous step
        .single();

    if (msg) {
        console.log('--- MESSAGE DATA ---');
        console.log('ID:', msg.id);
        console.log('Type:', msg.message_type);
        console.log('Content:', `"${msg.content}"`);
        console.log('Media URL:', msg.media_url);
    } else {
        console.log('Error:', error);
    }
}

inspectEnglishContent();
