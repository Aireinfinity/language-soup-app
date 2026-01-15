import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditNotifications() {
    console.log('🕵️‍♀️ Auditing for Ghost Notifications...');

    // 1. Get the "Dance" challenges we just worked with
    const { data: challenges } = await supabase
        .from('app_challenges')
        .select('id, group_id, created_at, app_groups(name)')
        .ilike('prompt_text', '%DANCE%')
        .order('created_at', { ascending: false })
        .limit(30);

    if (!challenges || challenges.length === 0) {
        console.log('No recent challenges found to audit.');
        return;
    }

    console.log(`Checking ${challenges.length} challenges for associated notifications...`);
    let ghostNotifications = 0;

    for (const c of challenges) {
        // Check if there are notifications linked to this challenge
        // The edge function logs to app_notifications with valid JSON data
        // But a ghost trigger might log differently or we can just see if ANY exist.

        // Note: The `data` column usually holds { challengeId: ... }
        const { data: notifs, error } = await supabase
            .from('app_notifications')
            .select('*')
            .contains('data', { challengeId: c.id });

        if (notifs && notifs.length > 0) {
            console.log(`⚠️  WARNING: Found ${notifs.length} notifications for challenge in group "${c.app_groups?.name}"`);
            console.log(`    Challenge ID: ${c.id}`);
            console.log(`    First Notif Created: ${notifs[0].created_at}`);
            ghostNotifications++;
        }
    }

    if (ghostNotifications === 0) {
        console.log('✅ CLEAN: No notifications found for these manually inserted/cron challenges.');
        console.log('   This implies NO database trigger is currently sending notifications on INSERT.');
    } else {
        console.log(`❌ FOUND ${ghostNotifications} challenges with notifications!`);
        console.log('   This likely comes from the Cron Job (expected if it auto-sent) or a Trigger (unexpected if manual).');
        console.log('   We need to distinguish source.');
    }
}

auditNotifications();
