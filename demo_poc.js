// Quick POC Demo - Voice Feedback + Sample Phrases
// Run with: node demo_poc.js

console.log('🍜 Language Soup - Voice Feedback Demo\n');

// ============================================
// PART 1: SAMPLE PHRASES FOR CHALLENGE
// ============================================

console.log('📝 PART 1: Sample Phrases for Challenge\n');
console.log('Challenge: "What are you looking at right now?"');
console.log('Language: French (Beginner Group)\n');

const samplePhrases = {
    beginner: {
        french: "Je regarde mon téléphone",
        english: "I'm looking at my phone",
        notes: "Simple present tense, common vocabulary"
    },
    intermediate: {
        french: "Je suis en train de regarder une vidéo sur YouTube",
        english: "I'm watching a video on YouTube",
        notes: "Present progressive, more natural phrasing"
    },
    advanced: {
        french: "En ce moment, j'observe les nuages par la fenêtre",
        english: "Right now, I'm observing the clouds through the window",
        notes: "More sophisticated vocabulary, descriptive"
    }
};

console.log('💡 Sample Phrases Generated:\n');
console.log('🟢 BEGINNER:');
console.log(`   "${samplePhrases.beginner.french}"`);
console.log(`   (${samplePhrases.beginner.english})\n`);

console.log('🟡 INTERMEDIATE:');
console.log(`   "${samplePhrases.intermediate.french}"`);
console.log(`   (${samplePhrases.intermediate.english})\n`);

console.log('🔴 ADVANCED:');
console.log(`   "${samplePhrases.advanced.french}"`);
console.log(`   (${samplePhrases.advanced.english})\n`);

console.log('─'.repeat(60) + '\n');

// ============================================
// PART 2: VOICE FEEDBACK DEMO
// ============================================

console.log('🎤 PART 2: Voice Feedback ("Correct Me")\n');
console.log('Simulating Noah\'s voice memo transcription...\n');

// Simulated transcription (what Whisper would return)
const voiceFeedback = {
    audioUrl: "https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/voice-memos/noah_french_sample.m4a",
    transcription: "Je regarde mon ordinateur maintenant",
    corrected: "Je regarde mon ordinateur en ce moment",
    hasErrors: true,
    corrections: [
        {
            original: "maintenant",
            corrected: "en ce moment",
            explanation: "More natural/idiomatic in French"
        }
    ],
    confidence: 95,
    pronunciationText: "Je regarde mon ordinateur en ce moment"
};

console.log('📝 What you said:');
console.log(`   "${voiceFeedback.transcription}"`);
console.log(`   Confidence: ${voiceFeedback.confidence}%\n`);

if (voiceFeedback.hasErrors) {
    console.log('✅ Suggested correction:');
    console.log(`   "${voiceFeedback.corrected}"\n`);

    console.log('💡 Improvements:');
    voiceFeedback.corrections.forEach(c => {
        console.log(`   • "${c.original}" → "${c.corrected}"`);
        console.log(`     (${c.explanation})`);
    });
} else {
    console.log('🎉 Perfect! No corrections needed.\n');
}

console.log('\n🔊 Pronunciation audio would be generated for:');
console.log(`   "${voiceFeedback.pronunciationText}"`);
console.log('   (Using Edge TTS - French neural voice)\n');

console.log('─'.repeat(60) + '\n');

// ============================================
// SUMMARY
// ============================================

console.log('📊 DEMO SUMMARY\n');
console.log('✅ Sample Phrases: 3 levels (beginner/intermediate/advanced)');
console.log('✅ Voice Transcription: 95% confidence');
console.log('✅ Corrections: 1 improvement suggested');
console.log('✅ Pronunciation: Ready to generate\n');

console.log('🚀 Next Steps:');
console.log('1. Get your approval on this flow');
console.log('2. Build backend with Groq + HuggingFace + Edge TTS');
console.log('3. Build simple UI components');
console.log('4. Deploy via OTA for testing\n');

console.log('💬 Questions for Noah:');
console.log('1. Do these sample phrases look helpful?');
console.log('2. Is the correction format clear?');
console.log('3. Ready to build the real thing?\n');
