
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uspegyneclgkscxwmomn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugRequests() {
    const { data, error } = await supabase
        .from('app_language_requests')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching requests:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No PENDING requests found in DB.');
        return;
    }

    console.log('Found requests:', data.length);
    data.forEach(req => {
        console.log('Full Request Object:', JSON.stringify(req, null, 2));
    });
}

debugRequests();
