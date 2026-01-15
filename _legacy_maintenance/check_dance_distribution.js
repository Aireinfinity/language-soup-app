import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDanceDistribution() {
    console.log('💃🏿 Checking "Dance" Challenge Distribution...');

    // 1. Get all groups
    const { data: allGroups } = await supabase
        .from('app_groups')
        .select('id, name')
        .order('name');

    // 2. See who has the challenge today
    const { data: challenges } = await supabase
        .from('app_challenges')
        .select('id, group_id, prompt_text')
        .ilike('prompt_text', '%DANCE%'); // Rough match

    const groupIdsWithChallenge = new Set(challenges.map(c => c.group_id));

    // 3. See who has the MESSAGE
    const challengeIds = challenges.map(c => c.id);
    const { data: messages } = await supabase
        .from('app_messages')
        .select('group_id, challenge_id')
        .in('challenge_id', challengeIds);

    const groupIdsWithMsg = new Set(messages.map(m => m.group_id));

    console.log('\n✅ GROUPS WITH DANCE CHALLENGE + MESSAGE (LIVE IN APP):');
    const hasIt = [];
    const missingMsg = [];
    const noChallenge = [];

    allGroups.forEach(g => {
        if (groupIdsWithMsg.has(g.id)) {
            hasIt.push(g.name);
        } else if (groupIdsWithChallenge.has(g.id)) {
            missingMsg.push(g.name);
        } else {
            noChallenge.push(g.name);
        }
    });

    hasIt.forEach(name => console.log(`   - ${name}`));

    if (missingMsg.length > 0) {
        console.log('\n❌ GROUPS WITH CHALLENGE BUT NO MESSAGE (BROKEN):');
        missingMsg.forEach(name => console.log(`   - ${name}`));
    } else {
        console.log('\n✨ No groups are missing the message (all fixed).');
    }

    if (noChallenge.length > 0) {
        console.log('\n🚫 GROUPS THAT DID NOT GET THIS CHALLENGE:');
        noChallenge.forEach(name => console.log(`   - ${name}`));
    }
}

checkDanceDistribution();
