import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';
const CHALLENGE_KEYWORD = 'DANCE';

async function fixAllMissingMessages() {
    console.log('🚀 Starting backfill for ALL groups...');

    // 1. Find all "Dance" challenges from today
    const { data: challenges, error: chalError } = await supabase
        .from('app_challenges')
        .select(`
            id,
            prompt_text,
            group_id,
            created_at,
            app_groups (name)
        `)
        .ilike('prompt_text', `%${CHALLENGE_KEYWORD}%`)
        .order('created_at', { ascending: false });

    if (chalError) {
        console.error('❌ Error fetching challenges:', chalError);
        return;
    }

    console.log(`Found ${challenges.length} relevant challenges to check.`);

    let fixedCount = 0;
    let skippedCount = 0;

    // 2. Iterate and check for messages
    for (const challenge of challenges) {
        const { data: messages, error: msgError } = await supabase
            .from('app_messages')
            .select('id')
            .eq('challenge_id', challenge.id);

        if (msgError) {
            console.error(`❌ Error checking message for group ${challenge.group_id}:`, msgError);
            continue;
        }

        if (messages && messages.length > 0) {
            // Message exists, skip
            skippedCount++;
            // console.log(`⏭️  Skipping ${challenge.app_groups?.name} (Message exists)`);
        } else {
            // Message MISSING, Insert it!
            console.log(`🔨 Fixing ${challenge.app_groups?.name || 'Unknown Group'}...`);

            const { error: insertError } = await supabase
                .from('app_messages')
                .insert({
                    group_id: challenge.group_id,
                    sender_id: SYSTEM_BOT_ID,
                    message_type: 'text',
                    content: challenge.prompt_text, // Use the existing translated text
                    challenge_id: challenge.id
                });

            if (insertError) {
                console.error(`   ❌ Failed to insert: ${insertError.message}`);
            } else {
                console.log(`   ✅ Fixed!`);
                fixedCount++;
            }
        }
    }

    console.log('\n==========================================');
    console.log(`🏁 DONE!`);
    console.log(`✅ Fixed: ${fixedCount} groups`);
    console.log(`⏭️  Skipped: ${skippedCount} groups (already had messages)`);
    console.log('==========================================');
}

fixAllMissingMessages();
