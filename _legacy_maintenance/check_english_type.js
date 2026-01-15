import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEnglishMessageType() {
    console.log('🕵️‍♀️ Checking English Group Message Type (READ ONLY)...');

    const { data: groups } = await supabase
        .from('app_groups')
        .select('id')
        .eq('name', 'english!')
        .single();

    if (!groups) { console.log('Group not found'); return; }

    const { data: challenges } = await supabase
        .from('app_challenges')
        .select('id')
        .eq('group_id', groups.id)
        .ilike('prompt_text', '%DANCE%')
        .limit(1)
        .single();

    if (!challenges) { console.log('Challenge not found'); return; }

    const { data: messages } = await supabase
        .from('app_messages')
        .select('id, message_type, content')
        .eq('challenge_id', challenges.id);

    if (messages && messages.length > 0) {
        const m = messages[0];
        console.log(`\n📄 Message Found: ${m.id}`);
        console.log(`   Type: "${m.message_type}"`); // Critical check

        if (m.message_type === 'system') {
            console.log('   ⚠️  This IS why it is hidden from Live Feed.');
        } else {
            console.log('   ✅ Type looks visible (not system).');
        }
    } else {
        console.log('❌ No message found.');
    }
}

checkEnglishMessageType();
