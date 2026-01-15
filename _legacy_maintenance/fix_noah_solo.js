import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GROUP_ID = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d'; // Noah's Solo Group
const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';

async function fixNoahSolo() {
    console.log('🔧 Fixing Noah\'s Solo Group...');

    // 1. Get the most recent challenge for this group (from today)
    const { data: challenges, error: chalError } = await supabase
        .from('app_challenges')
        .select('*')
        .eq('group_id', GROUP_ID)
        .order('created_at', { ascending: false })
        .limit(1);

    if (chalError) {
        console.error('❌ Error fetching challenges:', chalError);
        return;
    }

    let challenge = challenges && challenges.length > 0 ? challenges[0] : null;

    // IF NO CHALLENGE EXISTS, CREATE ONE TEMPORARILY
    if (!challenge) {
        console.log('⚠️ No challenge found for today. Creating a test one...');
        const { data: newChal, error: createError } = await supabase
            .from('app_challenges')
            .insert({
                group_id: GROUP_ID,
                prompt_text: '#challenge\nWhen you want to DANCE 💃🏿 what music do you put on?',
                created_by: SYSTEM_BOT_ID
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create challenge:', createError);
            return;
        }
        challenge = newChal;
        console.log('✅ Created temporary challenge:', challenge.id);
    } else {
        console.log('✅ Found existing challenge:', challenge.id, challenge.prompt_text.substring(0, 30));
    }

    // 2. Check if a message exists for this challenge
    const { data: messages, error: msgError } = await supabase
        .from('app_messages')
        .select('*')
        .eq('challenge_id', challenge.id);

    if (msgError) {
        console.error('❌ Error checking messages:', msgError);
        return;
    }

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
            message_type: 'text', // Using 'text' instead of system so it looks like a bot message
            content: challenge.prompt_text,
            challenge_id: challenge.id
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Failed to insert message:', insertError);
    } else {
        console.log('✅ SUCCESS! Inserted message:', msgData.id);
        console.log('👉 Please check the app in "noah\'s test group solo"');
    }
}

fixNoahSolo();
