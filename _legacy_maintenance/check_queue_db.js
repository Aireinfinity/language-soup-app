const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const url = envContent.match(/VITE_SUPABASE_URL=["']?(.*?)["']?(\r?\n|$)/)?.[1]?.trim();
const key = envContent.match(/VITE_SUPABASE_ANON_KEY=["']?(.*?)["']?(\r?\n|$)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function check() {
    console.log('--- TABLE AUDIT ---');

    // We can't easily list tables via JS client without RPC or insecure settings,
    // so we will test known possible names.
    const tables = [
        'app_scheduled_challenges',
        'app_challenges',
        'scheduled_challenges',
        'challenges',
        'app_messages',
        'app_users',
        'app_groups',
        'app_notifications'
    ];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ ${table}: Not found or error (${error.message})`);
        } else {
            console.log(`✅ ${table}: ${count} rows`);
        }
    }
}

check();
