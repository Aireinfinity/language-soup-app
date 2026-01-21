// Test the voice-feedback function directly
const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzE0NzEsImV4cCI6MjA0OTM0NzQ3MX0.Qs7VYqPJxqYMHqGqKqYqKqYqKqYqKqYqKqYqKqYqKqY';

async function testVoiceFeedback() {
    console.log('Testing voice feedback with intentional errors...');

    // Test with a French sentence that has errors
    const testAudioUrl = 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/voice-memos/test.mp3';

    const response = await fetch(`${SUPABASE_URL}/functions/v1/voice-feedback`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audioUrl: testAudioUrl,
            language: 'French',
            userId: '29864936-719c-483b-ac6a-4d06084a48fe',
            task: 'analyze'
        })
    });

    const data = await response.json();

    console.log('\n=== BACKEND RESPONSE ===');
    console.log('Transcription:', data.transcription);
    console.log('Correction Object:', JSON.stringify(data.correction, null, 2));
    console.log('Is Correct?:', data.correction?.is_correct);
    console.log('Corrected Text:', data.correction?.corrected);
    console.log('Explanation:', data.correction?.explanation);
}

testVoiceFeedback().catch(console.error);
