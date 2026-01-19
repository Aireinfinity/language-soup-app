// Test script to check Whisper + GPT-4o accuracy on real voice memos
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://uspegyneclgkscxwmomn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
);

async function testVoiceAccuracy() {
    console.log('🎤 Fetching Noah\'s voice memos for accuracy testing...\n');

    // Get some of Noah's voice messages from different language groups
    const { data: messages, error } = await supabase
        .from('app_messages')
        .select(`
            id,
            media_url,
            created_at,
            group_id,
            groups:app_groups(name, language)
        `)
        .eq('message_type', 'voice')
        .eq('sender_id', '29864936-719c-483b-ac6a-4d06084a48fe') // Noah's ID
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    console.log(`Found ${messages.length} voice messages:\n`);

    messages.forEach((msg, i) => {
        const group = Array.isArray(msg.groups) ? msg.groups[0] : msg.groups;
        console.log(`${i + 1}. ${group?.name || 'Unknown'} (${group?.language || 'Unknown'})`);
        console.log(`   URL: ${msg.media_url}`);
        console.log(`   Date: ${new Date(msg.created_at).toLocaleDateString()}`);
        console.log('');
    });

    console.log('\n📊 Next Steps:');
    console.log('1. Pick 3-5 samples from different languages');
    console.log('2. Test with OpenAI Whisper API');
    console.log('3. Compare transcription to what you actually said');
    console.log('4. Test GPT-4o corrections on transcriptions');
    console.log('\nWant me to run the actual API tests? (Need OpenAI API key)');
}

testVoiceAccuracy();
