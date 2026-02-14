#!/usr/bin/env node
/**
 * Export support threads for the user feedback doc.
 * Fetches app_support_messages grouped by user, with display_name and first user message.
 * Run from repo: cd code/dashboard && node scripts/export_support_for_feedback.mjs
 * Uses: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (from .env)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
    const envPath = join(__dirname, '..', '.env');
    const localPath = join(__dirname, '..', '.env.local');
    for (const p of [localPath, envPath]) {
        if (!existsSync(p)) continue;
        const content = readFileSync(p, 'utf8');
        for (const line of content.split('\n')) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
        }
    }
}

loadEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log('\nSupport threads (for user feedback doc)\n');
    console.log('—'.repeat(60));

    const { data: messages, error } = await supabase
        .from('app_support_messages')
        .select(`
            id,
            user_id,
            content,
            created_at,
            from_admin,
            app_users ( display_name )
        `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }

    // Group by user_id; only user messages (from_admin = false)
    const byUser = new Map();
    for (const m of messages || []) {
        if (m.from_admin) continue;
        const uid = m.user_id;
        if (!byUser.has(uid)) {
            byUser.set(uid, {
                display_name: m.app_users?.display_name || 'Anonymous',
                messages: []
            });
        }
        byUser.get(uid).messages.push({ content: m.content, created_at: m.created_at });
    }

    let i = 1;
    for (const [userId, { display_name, messages: msgs }] of byUser) {
        const first = msgs[0]?.content?.trim() || '';
        const snippet = first.length > 120 ? first.slice(0, 117) + '...' : first;
        const date = msgs[0]?.created_at ? new Date(msgs[0].created_at).toLocaleDateString() : '';
        console.log(`${i}. ${display_name} (${date})`);
        if (snippet) console.log(`   "${snippet}"`);
        console.log('');
        i++;
    }

    console.log('—'.repeat(60));
    console.log(`Total threads: ${byUser.size}. Add any missing names/issues to docs/user_interviews.md\n`);
}

main();
