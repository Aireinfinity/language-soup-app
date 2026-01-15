import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNextScheduled() {
    console.log('🔮 Checking NEXT Scheduled Challenge...');

    // Check pending challenges
    const { data: challenges, error } = await supabase
        .from('app_scheduled_challenges')
        .select('*')
        .eq('status', 'approved')
        .gt('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (challenges && challenges.length > 0) {
        const next = challenges[0];
        console.log(`\n📅 NEXT CHALLENGE:`);
        console.log(`   ID: ${next.id}`);
        console.log(`   Time: ${new Date(next.scheduled_time).toLocaleString()}`);
        console.log(`   Text: "${next.challenge_text.substring(0, 50)}..."`);
        console.log(`   Notifications Sent: ${next.notifications_sent}`);
    } else {
        console.log('✅ No approved challenges found for the future.');
    }
}

checkNextScheduled();
