import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStats() {
    console.log('Querying app_groups...');

    // Get all groups and their languages
    const { data: groups, error } = await supabase
        .from('app_groups')
        .select('language');

    if (error) {
        console.error('Error fetching groups:', error);
        return;
    }

    // Count languages
    const counts = {};
    groups.forEach(g => {
        const lang = g.language || 'Unknown';
        counts[lang] = (counts[lang] || 0) + 1;
    });

    // Sort by count
    const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a);

    console.log('\n📊 Top Languages by Group Count:\n');
    sorted.forEach(([lang, count]) => {
        console.log(`${lang}: ${count} groups`);
    });
    console.log('\nTotal Groups:', groups.length);
}

checkStats();
