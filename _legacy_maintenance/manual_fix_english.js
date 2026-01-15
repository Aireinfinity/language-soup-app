import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixEnglishDirectly() {
    console.log('🇬🇧 Fixing "english!" group manually...');

    // 1. Get Group ID
    const { data: group } = await supabase.from('app_groups').select('id').eq('name', 'english!').single();
    if (!group) return console.log('❌ Group not found');

    // 2. Get Challenge ID
    const { data: challenge } = await supabase
        .from('app_challenges')
        .select('*')
        .eq('group_id', group.id)
        .ilike('prompt_text', '%DANCE%')
        .single();

    if (!challenge) return console.log('❌ Challenge not found');

    console.log(`Found Challenge: ${challenge.id} ("${challenge.prompt_text.substring(0, 20)}...")`);

    // 3. Insert the MISSING System Message
    // Note: We are explicitly inserting a NEW 'text' message with the prompt.
    // We ignore existing 'voice' messages (user replies).

    const { data: existingSystemMsg } = await supabase
        .from('app_messages')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('message_type', 'text') // Only check for the PROMPT text
        .ilike('content', '%DANCE%'); // Double check content

    if (existingSystemMsg && existingSystemMsg.length > 0) {
        console.log('⚠️  It seems a text prompt ALREADY exists:', existingSystemMsg[0].id);
        // FORCE INSERT ANYWAY? User says it's missing. 
        // Let's print it to be sure.
        console.log('   Content:', existingSystemMsg[0].content);
    } else {
        console.log('✅ No text prompt found. Inserting now...');
        const { data: newMsg, error } = await supabase
            .from('app_messages')
            .insert({
                group_id: group.id,
                sender_id: '00000000-0000-0000-0000-000000000000', // Bot
                message_type: 'text',
                content: '#challenge\nwhen you want to DANCE 💃🏿 what music do you listen to?', // English text
                challenge_id: challenge.id
            })
            .select()
            .single();

        if (error) console.error('❌ Insert failed:', error);
        else console.log('✅ SUCCESS! Created message:', newMsg.id);
    }
}

fixEnglishDirectly();
