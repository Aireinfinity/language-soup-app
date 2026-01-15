import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTranslations() {
    console.log('🌍 Checking existing challenges for translations...');

    // Get recent challenges joined with group info
    const { data: challenges, error } = await supabase
        .from('app_challenges')
        .select(`
            id,
            prompt_text,
            created_at,
            group_id,
            app_groups (
                name,
                language
            )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`Found ${challenges.length} recent challenges.`);

    challenges.forEach(c => {
        const lang = c.app_groups?.language || 'Unknown';
        const isEnglish = lang.toLowerCase() === 'english';

        console.log(`\n------------------------------------------------`);
        console.log(`Group: ${c.app_groups?.name} (${lang})`);
        console.log(`Created: ${c.created_at}`);
        console.log(`Text Preview:`);
        console.log(c.prompt_text);

        // Check if it looks translated (more than 2 lines usually, or contains non-english)
        const lines = c.prompt_text.split('\n');
        if (!isEnglish && lines.length < 3) {
            console.warn(`⚠️ WARNING: Possible missing translation for ${lang}`);
        } else if (!isEnglish) {
            console.log(`✅ Looks translated (${lines.length} lines)`);
        }
    });

    // Also count how many have messages
    console.log('\n🔍 checking message existence...');
    for (const c of challenges) {
        const { count } = await supabase
            .from('app_messages')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', c.id);

        if (count === 0) {
            console.log(`❌ Missing message for group: ${c.app_groups?.name}`);
        }
    }
}

checkTranslations();
