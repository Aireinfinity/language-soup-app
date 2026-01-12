const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log("🔍 Reading .env.local...");

const envPath = path.join(__dirname, '../.env.local');
let envContent;
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error("❌ Could not read .env.local");
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    const key = parts[0]?.trim();
    let value = parts.slice(1).join('=')?.trim(); // Handle values with = in them

    if (key && value) {
        // Strip quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL; // Try both standard names
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error("❌ URL Missing: Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local");
    process.exit(1);
}
if (!supabaseKey) {
    console.error("❌ Key Missing: Could not find SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

// console.log(`Target: ${supabaseUrl}`);
// console.log(`Key:    ${supabaseKey.substring(0, 15)}...`);

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function test() {
    try {
        const { count, error } = await supabase.from('app_users').select('*', { count: 'exact', head: true });

        if (error) {
            console.error("❌ Auth Failed. Response:", JSON.stringify(error, null, 2));
            // Check if it's a quote issue
            if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
                console.log("💡 Hint: Check if your key in .env.local has broken quotes or whitespace.");
            }
        } else {
            console.log("✅ SUCCESS! Key is valid.");
            console.log(`Connected to Supabase. Found ${count} users.`);
        }
    } catch (err) {
        console.error("❌ Exception during request:", err);
    }
}

test();
