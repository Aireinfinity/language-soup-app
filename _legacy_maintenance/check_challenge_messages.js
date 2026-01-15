import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkChallengeMessages() {
    console.log('🔍 Checking recent challenges and their messages...');

    // 1. Get recent challenges
    const { data: challenges, error: chalError } = await supabase
        .from('app_challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (chalError) {
        console.error('Error fetching challenges:', chalError);
        return;
    }

    if (challenges.length === 0) {
        console.log('No recent challenges found.');
        return;
    }

    // 2. For each challenge, check if a message exists
    for (const challenge of challenges) {
        console.log(`\n🍲 Challenge ID: ${challenge.id}`);
        console.log(`   Group ID: ${challenge.group_id}`);
        console.log(`   Created: ${challenge.created_at}`);
        console.log(`   Text: ${challenge.prompt_text.substring(0, 30)}...`);

        // Check messages in this group created AFTER challenge
        const { data: messages, error: msgError } = await supabase
            .from('app_messages')
            .select('id, content, created_at, message_type')
            .eq('group_id', challenge.group_id)
            .gte('created_at', challenge.created_at) // Messages created at or after challenge
            .order('created_at', { ascending: true })
            .limit(5);

        if (msgError) {
            console.error('   ❌ Error checking messages:', msgError);
        } else if (messages.length === 0) {
            console.log('   ❌ NO MESSAGES found after challenge creation!');
        } else {
            console.log(`   ✅ Found ${messages.length} messages:`);
            messages.forEach(m => {
                const isSystem = m.message_type === 'system';
                console.log(`      - [${m.message_type}] ${m.content.substring(0, 50)}... ${isSystem ? '(SYSTEM)' : ''}`);
            });
        }
    }
}

checkChallengeMessages();
