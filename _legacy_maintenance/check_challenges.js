import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkChallenges() {
    console.log('Checking recent challenges...');

    // Check scheduled challenges
    const { data: scheduled, error: schedError } = await supabase
        .from('app_scheduled_challenges')
        .select('*')
        .order('scheduled_time', { ascending: false })
        .limit(5);

    if (schedError) console.error('Error fetching scheduled:', schedError);
    else {
        console.log('\n📅 Recent Scheduled Challenges:');
        scheduled.forEach(c => {
            console.log(`- ID: ${c.id}`);
            console.log(`  Status: ${c.status}`);
            console.log(`  Time: ${c.scheduled_time}`);
            console.log(`  Sent: ${c.notifications_sent}`);
            console.log(`  Text: ${c.challenge_text.substring(0, 50)}...`);
        });
    }

    // Check inserted challenges
    const { data: challenges, error: chalError } = await supabase
        .from('app_challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (chalError) console.error('Error fetching challenges:', chalError);
    else {
        console.log('\n🍲 Recent Inserted Challenges (app_challenges):');
        challenges.forEach(c => {
            console.log(`- ID: ${c.id}`);
            console.log(`  Group: ${c.group_id}`);
            console.log(`  Created: ${c.created_at}`);
            console.log(`  Prompt: ${c.prompt_text.substring(0, 50)}...`);
        });
    }
}

checkChallenges();
