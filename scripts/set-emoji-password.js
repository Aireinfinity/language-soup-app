/**
 * One-off: set a user's emoji password via Supabase Admin API.
 * Use when someone has no/forgotten emoji password and there's no real email to reset.
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or .env.local.
 * Never commit real keys; run locally and delete or don't commit after use.
 *
 * Usage:
 *   node scripts/set-emoji-password.js <userId> <displayName> [emojiSequence]
 *
 * Examples:
 *   node scripts/set-emoji-password.js af27221a-3ee3-45aa-8e11-474a17eb028e "Aurelia" "😭😭😭"
 *   node scripts/set-emoji-password.js af27221a-3ee3-45aa-8e11-474a17eb028e "Aurelia (archived_a5de)" "😭😭😭"
 *
 * Password formula (must match app): soup_<emoji>_<displayName.length>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (!process.env[key]) process.env[key] = value;
            }
        });
    } catch (_) {
        // .env.local optional if vars set in shell
    }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env.local).');
    process.exit(1);
}

const userId = process.argv[2];
const displayName = process.argv[3];
const emojiSequence = process.argv[4] || '😭😭😭';

if (!userId || !displayName) {
    console.error('Usage: node scripts/set-emoji-password.js <userId> <displayName> [emojiSequence]');
    process.exit(1);
}

const targetName = displayName.trim();
const internalPassword = `soup_${emojiSequence}_${targetName.length}`;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, { password: internalPassword });
    if (error) {
        console.error('Auth update failed:', error.message);
        process.exit(1);
    }
    console.log('Auth password set for', userId);

    const { error: profileError } = await supabase
        .from('app_users')
        .update({ emoji_password: emojiSequence })
        .eq('id', userId);
    if (profileError) {
        console.warn('app_users.emoji_password update failed (user may not exist yet):', profileError.message);
    } else {
        console.log('app_users.emoji_password updated.');
    }

    console.log('\nTell the user: "Your password is", then the emojis:', emojiSequence);
    console.log('(They log in with their name and those emojis.)');
}

main();
