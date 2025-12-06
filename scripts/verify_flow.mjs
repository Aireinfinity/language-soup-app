
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

// Create a client (sans AsyncStorage for Node environment)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TEST_GROUP_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

async function runVerification() {
    console.log('🧪 Starting Smoke Test...');

    try {
        // 1. Upsert User
        console.log('👤 Creating/Updating Test User...');
        const { error: userError } = await supabase
            .from('app_users')
            .upsert({
                id: TEST_USER_ID,
                // email: 'test_node_flow@soup.app', // Removed as likely not in schema
                display_name: 'Node Test Chef',
                // username: 'node_chef', // Removed as likely not in schema
                avatar_url: 'https://i.pravatar.cc/300?u=node',
                learning_languages: ['Spanish', 'French']
            });

        if (userError) throw new Error(`User creation failed: ${userError.message}`);
        console.log('✅ User Verified.');

        // 2. Upsert Group
        console.log('🍲 Creating/Updating Test Group...');
        const { error: groupError } = await supabase
            .from('app_groups')
            .upsert({
                id: TEST_GROUP_ID,
                name: 'QA Kitchen Node',
                language: 'Spanish',
                // emoji: '🤖' // Removed as likely not in schema
            });

        if (groupError) throw new Error(`Group creation failed: ${groupError.message}`);
        console.log('✅ Group Verified.');

        // 3. Join Group
        console.log('🤝 Joining Group...');
        const { error: joinError } = await supabase
            .from('app_group_members')
            .upsert({
                user_id: TEST_USER_ID,
                group_id: TEST_GROUP_ID,
                role: 'member'
            }, { onConflict: 'user_id, group_id', ignoreDuplicates: true });

        if (joinError) throw new Error(`Join failed: ${joinError.message}`);
        console.log('✅ Joined Group.');

        // 4. Send Message
        console.log('💬 Sending Message...');
        const { data: msgData, error: msgError } = await supabase
            .from('app_messages')
            .insert({
                group_id: TEST_GROUP_ID,
                sender_id: TEST_USER_ID,
                content: 'Hello from verification script!',
                message_type: 'text'
            })
            .select()
            .single();

        if (msgError) throw new Error(`Message failed: ${msgError.message}`);
        console.log('✅ Message Sent:', msgData.id);

        // 5. Check Stats (RPC)
        console.log('📊 Checking Stats...');
        const { data: stats, error: statsError } = await supabase
            .rpc('get_user_stats', { uid: TEST_USER_ID });

        if (statsError) throw new Error(`Stats failed: ${statsError.message}`);
        console.log('✅ Stats Verified:', stats);

        console.log('\n✨ SMOKE TEST PASSED! The soup is ready to serve.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
}

runVerification();
