// Test the voice-feedback function directly
const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODgwNzQsImV4cCI6MjA3OTM2NDA3NH0.FcJ_eSzkWCX-2b5kGHv8AcBvhcZe6aAAP6vG9vubiew';

async function testVoiceFeedback() {
    console.log('Testing voice feedback with intentional errors...');

    // Test with a reliable public audio file
    const testAudioUrl = 'https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.mp3';

    const response = await fetch(`${SUPABASE_URL}/functions/v1/voice-feedback`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: 'Bonjour, comment ça va?',
            language: 'French',
            userId: '29864936-719c-483b-ac6a-4d06084a48fe',
            task: 'pronunciation'
        })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('❌ Error Status:', response.status);
        console.error('❌ Error Body:', text);
        return;
    }

    const data = await response.json();

    console.log('\n=== BACKEND RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
}

testVoiceFeedback().catch(console.error);
