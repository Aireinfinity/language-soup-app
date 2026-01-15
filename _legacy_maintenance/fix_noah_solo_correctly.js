import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GROUP_ID = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d'; // Noah's Solo Group
const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';
const TARGET_TEXT = 'when you want to DANCE'; // The correct challenge content

async function fixNoahSoloCorrectly() {
    console.log('🔧 Fixing Noah\'s Solo Group with CORRECT challenge...');

    // 1. Check if the "Dance" challenge exists in this group
    const { data: challenges, error: chalError } = await supabase
        .from('app_challenges')
        .select('*')
        .eq('group_id', GROUP_ID)
        .ilike('prompt_text', `%${TARGET_TEXT}%`)
        .limit(1);

    let challenge = challenges && challenges.length > 0 ? challenges[0] : null;

    if (!challenge) {
        console.log('⚠️ Target challenge NOT found in group. Creating it...');

        // Find the full text from another group to be exact
        const { data: source } = await supabase
            .from('app_challenges')
            .select('prompt_text')
            .ilike('prompt_text', `%${TARGET_TEXT}%`)
            .limit(1);

        const fullText = source && source.length > 0
            ? source[0].prompt_text
            : '#challenge\nwhen you want to DANCE 💃🏿 what music do you put on?';

        const { data: newChal, error: createError } = await supabase
            .from('app_challenges')
            .insert({
                group_id: GROUP_ID,
                prompt_text: fullText,
                created_by: SYSTEM_BOT_ID
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create challenge:', createError);
            return;
        }
        challenge = newChal;
        console.log('✅ Created target challenge:', challenge.id);
    } else {
        console.log('✅ Found target challenge:', challenge.id);
    }

    // 2. Check if a message exists for this specific challenge
    const { data: messages } = await supabase
        .from('app_messages')
        .select('*')
        .eq('challenge_id', challenge.id);

    if (messages && messages.length > 0) {
        console.log('✅ Message ALREADY exists for this challenge:', messages[0].id);
        return;
    }

    console.log('❌ Message MISSING. Inserting manual system message...');

    // 3. Insert the missing message manually
    const { data: msgData, error: insertError } = await supabase
        .from('app_messages')
        .insert({
            group_id: GROUP_ID,
            sender_id: SYSTEM_BOT_ID,
            message_type: 'text',
            content: challenge.prompt_text,
            challenge_id: challenge.id
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Failed to insert message:', insertError);
    } else {
        console.log('✅ SUCCESS! Inserted message:', msgData.id);
        console.log('👉 Please check the app in "noah\'s test group solo" AGAIN');
    }
}

fixNoahSoloCorrectly();
