#!/bin/bash
# Run the challenge fix migration

echo "🔧 Fixing challenge sender and notifications..."

# Get Supabase connection from lib/supabase.js
SUPABASE_URL=$(grep -o "https://[^'\"]*\.supabase\.co" lib/supabase.js | head -1)

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Could not find Supabase URL"
    exit 1
fi

echo "📡 Found Supabase project: $SUPABASE_URL"
echo ""
echo "To run this migration, you have two options:"
echo ""
echo "1. Via Supabase Dashboard:"
echo "   - Go to: $SUPABASE_URL/project/_/sql"
echo "   - Copy and paste the contents of: migrations/fix_challenge_sender_and_notifications.sql"
echo "   - Click 'Run'"
echo ""
echo "2. Via Supabase CLI (if you have it set up):"
echo "   - Run: supabase db push"
echo ""
