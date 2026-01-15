import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepDiveEnglish() {
    console.log('🕵️‍♀️ Deep Dive: English Group & Exclusion Logic');

    // 1. Find the "English" group and "App Testers" group
    const { data: groups, error: gError } = await supabase
        .from('app_groups')
        .select('*')
        .or('name.ilike.%english%,name.ilike.%app test%,name.ilike.%noah%');

    if (gError) {
        console.error('Error fetching groups:', gError);
        return;
    }

    console.log('--- Groups Found ---');
    groups.forEach(g => {
        console.log(`[${g.id}] Name: "${g.name}", Lang: "${g.language}"`);
    });

    const englishGroup = groups.find(g => g.name.toLowerCase().includes('english'));

    if (!englishGroup) {
        console.error('❌ Could not find "English" group!');
        return;
    }

    // 2. Check Challenges for English Group
    console.log(`\n--- Checking Challenges for "${englishGroup.name}" (${englishGroup.id}) ---`);
    const { data: challenges } = await supabase
        .from('app_challenges')
        .select('*')
        .eq('group_id', englishGroup.id)
        .order('created_at', { ascending: false })
        .limit(3);

    challenges.forEach(c => {
        console.log(`Challenge ID: ${c.id}`);
        console.log(`Created: ${c.created_at}`);
        console.log(`Text: ${c.prompt_text.substring(0, 50)}...`);

        // Check message for this challenge
        checkMessage(c.id);
    });
}

async function checkMessage(challengeId) {
    const { data: msgs } = await supabase
        .from('app_messages')
        .select('id, content, created_at')
        .eq('challenge_id', challengeId);

    if (msgs && msgs.length > 0) {
        console.log(`   ✅ Message exists: ${msgs[0].id}`);
    } else {
        console.log(`   ❌ NO MESSAGE found!`);
    }
}

deepDiveEnglish();
