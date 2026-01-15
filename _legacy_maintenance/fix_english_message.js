import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectAndFix() {
    console.log('🕵️‍♀️ Inspecting "English!" Group Message...');

    // 1. Find the English group
    const { data: groups } = await supabase
        .from('app_groups')
        .select('id')
        .eq('name', 'english!')
        .single();

    if (!groups) {
        console.error('❌ Could not find group "english!"');
        return;
    }

    const groupId = groups.id;

    // 2. Find the Dance challenge for this group
    const { data: challenges } = await supabase
        .from('app_challenges')
        .select('id, prompt_text')
        .eq('group_id', groupId)
        .ilike('prompt_text', '%DANCE%')
        .limit(1)
        .single();

    if (!challenges) {
        console.error('❌ Could not find Dance challenge in "english!" group.');
        return;
    }

    console.log(`✅ Found Challenge: ${challenges.id}`);

    // 3. Find the message linked to this challenge
    const { data: messages } = await supabase
        .from('app_messages')
        .select('*')
        .eq('challenge_id', challenges.id);

    if (!messages || messages.length === 0) {
        console.log('❌ NO MESSAGE found for this challenge. Creating one...');

        // Fix: Insert missing message
        const { data: newMsg, error: insertError } = await supabase
            .from('app_messages')
            .insert({
                group_id: groupId,
                sender_id: '00000000-0000-0000-0000-000000000000',
                message_type: 'text',
                content: challenges.prompt_text,
                challenge_id: challenges.id
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Failed to create message:', insertError);
        } else {
            console.log('✅ Created NEW message:', newMsg.id);
        }
    } else {
        const msg = messages[0];
        console.log(`✅ Found Message: ${msg.id}`);
        console.log(`   Type: ${msg.message_type}`);
        console.log(`   Content: ${msg.content.substring(0, 50)}...`);

        if (msg.message_type === 'system') {
            console.log('⚠️  Message type is "system". This hides it from Live Feed.');
            console.log('🛠  Updating to "text"...');

            const { error: updateError } = await supabase
                .from('app_messages')
                .update({ message_type: 'text' })
                .eq('id', msg.id);

            if (updateError) {
                console.error('❌ Failed to update:', updateError);
            } else {
                console.log('✅ Updated message to "text" type.');
            }
        } else {
            console.log('✅ Message type is already correct.');
        }
    }
}

inspectAndFix();
