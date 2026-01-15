import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRecentScheduled() {
    console.log('📅 Checking recently scheduled challenges...');

    const { data: scheduled, error } = await supabase
        .from('app_scheduled_challenges')
        .select('*')
        .order('scheduled_time', { ascending: false })
        .limit(3);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (scheduled && scheduled.length > 0) {
        console.log('✅ Found scheduled challenges:');
        scheduled.forEach(c => {
            console.log(`\nID: ${c.id}`);
            console.log(`Status: ${c.status}`);
            console.log(`Scheduled: ${c.scheduled_time}`);
            console.log(`Text: ${c.challenge_text}`);
        });
    } else {
        console.log('⚠️ No scheduled challenges found.');
    }
}

findRecentScheduled();
