import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findNoahData() {
    console.log('🔍 Searching for Noah and his groups...');

    const { data: users, error: userError } = await supabase
        .from('app_users')
        .select('id, display_name')
        .ilike('display_name', '%noah%');

    if (users) {
        console.log('\nUsers found:', users);

        for (const user of users) {
            const { data: memberships } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups(name, member_count)')
                .eq('user_id', user.id);

            if (memberships) {
                console.log(`\nGroups for ${user.display_name}:`);
                memberships.forEach(m => {
                    console.log(`- ${m.app_groups.name} (ID: ${m.group_id}) [Members: ${m.app_groups.member_count}]`);
                });
            }
        }
    }
}

findNoahData();
