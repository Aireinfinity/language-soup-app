#!/usr/bin/env node
/**
 * Run quest-audit SQL and print results.
 * Requires: DATABASE_URL in env (Supabase Dashboard → Project Settings → Database → Connection string, URI).
 * Example: cd code/dashboard && node scripts/quest_audit.mjs
 * Or:     DATABASE_URL='postgresql://...' node scripts/quest_audit.mjs
 */

import pg from 'pg';
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

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL or SUPABASE_DB_URL. Set it in .env or .env.local (Supabase → Project Settings → Database → Connection string, URI).');
    process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

const QUERIES = [
    {
        name: '1. Completions per quest',
        sql: `SELECT quest_id, COUNT(*) AS completions
FROM app_user_quests
GROUP BY quest_id
ORDER BY completions DESC;`,
    },
    {
        name: '2. Users who completed reply_challenge',
        sql: `SELECT u.display_name, u.id, q.completed_at
FROM app_user_quests q
JOIN app_users u ON u.id = q.user_id
WHERE q.quest_id = 'reply_challenge'
ORDER BY q.completed_at DESC;`,
    },
    {
        name: '3. Per-user completed count',
        sql: `SELECT u.display_name, u.id, COUNT(q.quest_id) AS completed_count
FROM app_users u
LEFT JOIN app_user_quests q ON q.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY completed_count DESC
LIMIT 30;`,
    },
    {
        name: '4. Pivot (who did which quest) – first 15',
        sql: `SELECT
  u.display_name,
  u.id,
  MAX(CASE WHEN q.quest_id = 'join_group' THEN 1 ELSE 0 END) AS join_group,
  MAX(CASE WHEN q.quest_id = 'first_text' THEN 1 ELSE 0 END) AS first_text,
  MAX(CASE WHEN q.quest_id = 'first_audio' THEN 1 ELSE 0 END) AS first_audio,
  MAX(CASE WHEN q.quest_id = 'reply_challenge' THEN 1 ELSE 0 END) AS reply_challenge,
  MAX(CASE WHEN q.quest_id = 'community_chat' THEN 1 ELSE 0 END) AS community_chat,
  MAX(CASE WHEN q.quest_id = 'view_profile' THEN 1 ELSE 0 END) AS view_profile,
  MAX(CASE WHEN q.quest_id = 'peek_active_groups' THEN 1 ELSE 0 END) AS peek_active_groups,
  MAX(CASE WHEN q.quest_id = 'send_bug' THEN 1 ELSE 0 END) AS send_bug,
  MAX(CASE WHEN q.quest_id = 'request_language' THEN 1 ELSE 0 END) AS request_language
FROM app_users u
LEFT JOIN app_user_quests q ON q.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY (SELECT COUNT(*) FROM app_user_quests q2 WHERE q2.user_id = u.id) DESC
LIMIT 15;`,
    },
];

async function main() {
    await client.connect();
    console.log('Quest audit (from app_user_quests)\n');
    for (const { name, sql } of QUERIES) {
        console.log('---', name, '---');
        const { rows } = await client.query(sql);
        console.table(rows);
        console.log('');
    }
    await client.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
