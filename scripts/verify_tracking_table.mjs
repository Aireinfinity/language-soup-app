
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually load .env
try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Failed to load .env file:', e);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyTable() {
    console.log('🔍 Verifying app_notification_clicks table...');

    // Try to insert a dummy record (Service Role bypasses RLS, but table must exist)
    // We need a valid user_id. Let's fetch one first.
    const { data: users, error: userError } = await supabase
        .from('app_users')
        .select('id')
        .limit(1);

    if (userError || !users || users.length === 0) {
        console.error('❌ Failed to fetch a user for testing:', userError);
        process.exit(1);
    }

    const testUserId = users[0].id;

    const { data, error } = await supabase
        .from('app_notification_clicks')
        .insert({
            user_id: testUserId,
            notification_id: 'test-verification-id',
            action_type: 'verification_test',
            metadata: { test: true }
        })
        .select();

    if (error) {
        console.error('❌ Table check failed:', error.message);
        if (error.code === '42P01') {
            console.error('   -> Hint: The table "app_notification_clicks" does NOT exist yet.');
        }
    } else {
        console.log('✅ Success! The table exists and accepts inserts.');
        // Clean up
        await supabase.from('app_notification_clicks').delete().eq('notification_id', 'test-verification-id');
    }
}

verifyTable();
