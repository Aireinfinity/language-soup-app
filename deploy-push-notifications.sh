#!/bin/bash

# Deploy Push Notifications to Supabase
# This script deploys the Edge Function and sets up the database

echo "🚀 Deploying Push Notifications to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
fi

# Login to Supabase (if not already logged in)
echo "📝 Checking Supabase login..."
supabase login

# Link to project (you'll need to provide your project ref)
echo "🔗 Linking to Supabase project..."
echo "Please enter your Supabase project ref (found in Supabase Dashboard → Settings → General):"
read -p "Project Ref: " PROJECT_REF

supabase link --project-ref "$PROJECT_REF"

# Deploy Edge Function
echo "📦 Deploying Edge Function..."
supabase functions deploy send-push-notification

echo ""
echo "✅ Edge Function deployed!"
echo ""
echo "⚠️  IMPORTANT: Next steps to complete setup:"
echo ""
echo "1. Set environment variables in Supabase Dashboard:"
echo "   → Go to Edge Functions → send-push-notification → Settings"
echo "   → Add: SUPABASE_URL (your project URL)"
echo "   → Add: SUPABASE_SERVICE_ROLE_KEY (from Settings → API)"
echo ""
echo "2. Run database migrations:"
echo "   → Go to Supabase Dashboard → SQL Editor"
echo "   → Copy contents of migrations/add_notification_triggers.sql"
echo "   → Run the query"
echo ""
echo "3. Enable HTTP extension (required for triggers):"
echo "   → In SQL Editor, run:"
echo "   → CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;"
echo ""
echo "4. Set database configuration:"
echo "   → In SQL Editor, run:"
echo "   → ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';"
echo "   → ALTER DATABASE postgres SET app.supabase_anon_key = 'your-anon-key';"
echo ""
echo "📖 See PUSH_NOTIFICATIONS_SETUP.md for full documentation"
