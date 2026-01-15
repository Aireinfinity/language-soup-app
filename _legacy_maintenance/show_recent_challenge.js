import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showRecentChallenge() {
    console.log('🔍 Looking for the missing challenge...');

    // 1. Check scheduled challenges (which power the Queue tab)
    const { data: scheduled, error: schedError } = await supabase
        .from('app_scheduled_challenges')
        .select('*')
        .order('scheduled_time', { ascending: false })
        .limit(1); // Get the absolute latest one

    if (schedError) {
        console.error('Error fetching scheduled:', schedError);
    } else if (scheduled && scheduled.length > 0) {
        const c = scheduled[0];
        console.log('\n📅 Most Recent Scheduled Challenge (from Queue):');
        console.log(`ID: ${c.id}`);
        console.log(`Status: ${c.status}`); // If 'sent', it moved out of the pending list
        console.log(`Scheduled Time: ${c.scheduled_time}`);
        console.log(`TEXT: \n${c.challenge_text}`);
    } else {
        console.log('No scheduled challenges found.');
    }

    // 2. Check actual challenges table (what was inserted into groups)
    const { data: inserted, error: insError } = await supabase
        .from('app_challenges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (insError) {
        console.error('Error fetching inserted:', insError);
    } else if (inserted && inserted.length > 0) {
        const c = inserted[0];
        console.log('\n🍲 Most Recent Actual Challenge (In Database):');
        console.log(`ID: ${c.id}`);
        console.log(`Group ID: ${c.group_id}`);
        console.log(`Created At: ${c.created_at}`);
        console.log(`TEXT: \n${c.prompt_text}`);
    }
}

showRecentChallenge();
