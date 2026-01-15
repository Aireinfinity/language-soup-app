import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function previewAutoSendTargets() {
    console.log('🔮 PREVIEW: Which groups will receive the NEXT auto-send challenge?');
    console.log('   Condition: Name NOT ILIKE "%test%" AND Name NOT ILIKE "%noah%"');
    console.log('---------------------------------------------------------------');

    const { data: allGroups, error } = await supabase
        .from('app_groups')
        .select('id, name, language')
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const targeted = [];
    const excluded = [];

    allGroups.forEach(g => {
        const nameBad = g.name.toLowerCase().includes('test') || g.name.toLowerCase().includes('noah');

        // This effectively mimics the SQL: WHERE name NOT ILIKE '%test%' AND name NOT ILIKE '%noah%'
        if (nameBad) {
            excluded.push(g);
        } else {
            targeted.push(g);
        }
    });

    console.log(`✅ TARGETED GROUPS (${targeted.length}):`);
    targeted.forEach(g => console.log(`   - [${g.language}] ${g.name}`));

    console.log(`\n🚫 EXCLUDED GROUPS (${excluded.length}):`);
    excluded.forEach(g => console.log(`   - [${g.language}] ${g.name}`));
}

previewAutoSendTargets();
