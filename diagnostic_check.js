const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    const { data: users, error } = await supabase
        .from('app_users')
        .select('id, display_name, avatar_url, created_at, status_text')
        .in('display_name', ['Paul', 'Arianna', 'Josiah', 'Boróka', 'Pablo'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found with those names.');
        return;
    }

    console.log(`Found ${users.length} users.\n`);

    for (const user of users) {
        const { count, error: groupError } = await supabase
            .from('app_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        console.log(`User: ${user.display_name}`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Avatar: ${user.avatar_url || 'NULL'}`);
        console.log(`- Tagline: ${user.status_text || 'NULL'}`);
        console.log(`- Joined: ${user.created_at}`);
        console.log(`- Groups count: ${count || 0}`);
        console.log('---');
    }
}

check();
