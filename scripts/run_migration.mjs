#!/usr/bin/env node
/**
 * Run a single Supabase migration file against the remote DB.
 * Uses DATABASE_URL from .env / .env.local (same as quest_audit).
 *
 * Usage: node scripts/run_migration.mjs [migration_filename]
 * Example: node scripts/run_migration.mjs 20260212_leaderboard_rpcs.sql
 * Default: runs 20260212_leaderboard_rpcs.sql if no arg.
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

const migrationName = process.argv[2] || '20260212_leaderboard_rpcs.sql';
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const filePath = join(migrationsDir, migrationName);

if (!existsSync(filePath)) {
    console.error('Migration file not found:', filePath);
    process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Add it to .env or .env.local (Supabase → Project Settings → Database → Connection string, URI).');
    process.exit(1);
}

const sql = readFileSync(filePath, 'utf8');

async function main() {
    const client = new pg.Client({ connectionString: databaseUrl });
    try {
        await client.connect();
        await client.query(sql);
        console.log('Migration applied:', migrationName);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
