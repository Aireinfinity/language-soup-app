import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFullQueue() {
    console.log('🕵️‍♀️ Auditing Full Challenge Queue (Future Only)...');

    const now = new Date().toISOString();

    const { data: challenges, error } = await supabase
        .from('app_scheduled_challenges')
        .select('*')
        .gt('scheduled_time', now)
        .order('scheduled_time', { ascending: true });

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (challenges && challenges.length > 0) {
        console.log(`✅ Found ${challenges.length} future challenges:`);
        challenges.forEach(c => {
            console.log(`--------------------------------------------------`);
            console.log(`ID:     ${c.id}`);
            console.log(`Time:   ${new Date(c.scheduled_time).toLocaleString()}`);
            console.log(`Status: ${c.status.toUpperCase()} ${c.status === 'approved' ? '✅' : '⚠️'}`);
            console.log(`Text:   "${c.challenge_text.replace(/\n/g, ' ')}"`);
        });
    } else {
        console.log('⚪️ Queue is COMPLETELY empty. No drafts, no approved, nothing.');
    }
}

checkFullQueue();
