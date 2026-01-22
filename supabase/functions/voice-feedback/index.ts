import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { audioUrl, language, userId, task = 'analyze', text, correctionObj, context, prompt, challengeId } = await req.json()

        console.log('Voice feedback request:', { task, userId })

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // ==========================================
        // TASK: PRONUNCIATION ONLY (Optimization)
        // ==========================================
        if (task === 'pronunciation' && text) {
            console.log('Generating pronunciation for:', text.substring(0, 50))
            const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')

            // SCALABLE VOICE STRATEGY:
            // 1. English -> Rachel (Standard American)
            // 2. Everything Else -> Sarah (Multilingual)
            // Sarah adapts to the target language accent better than forced personas.

            let voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default to Sarah (Multilingual)

            // If explicitly English, use Rachel
            if (language && language.toLowerCase().includes('english')) {
                voiceId = '21m00Tcm4TlvDq8ikWAM';
            }

            console.log(`[Pronunciation] Generating for ${language || 'Auto'} using Voice: ${voiceId === '21m00Tcm4TlvDq8ikWAM' ? 'Rachel' : 'Sarah'}`);

            const elevenLabsResponse = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: 'eleven_multilingual_v2', // The "Website Quality" Model
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                    }),
                }
            )

            if (!elevenLabsResponse.ok) {
                const errText = await elevenLabsResponse.text()
                console.error('ElevenLabs Error:', errText)
                throw new Error(`ElevenLabs API failed: ${elevenLabsResponse.status} - ${errText}`)
            }

            const pronunciationAudio = await elevenLabsResponse.arrayBuffer()
            const fileName = `pronunciation_${Date.now()}.mp3`
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('voice-memos')
                .upload(`pronunciations/${fileName}`, pronunciationAudio, {
                    contentType: 'audio/mpeg',
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase
                .storage
                .from('voice-memos')
                .getPublicUrl(`pronunciations/${fileName}`)

            return new Response(JSON.stringify({ pronunciationUrl: publicUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }



        // ==========================================
        // TASK: GENERATE HINTS (Inspiration)
        // ==========================================
        if (task === 'generate_hints') {
            const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

            if (!GROQ_API_KEY) {
                console.error('❌ Missing GROQ_API_KEY')
                return new Response(JSON.stringify({ error: "Server Error: Missing GROQ_API_KEY in Secrets" }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return new Response(JSON.stringify({ error: "Missing Prompt", starter_phrase: "..." }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const targetLang = language || 'Target Language'

            // FETCH USER LANGUAGES for definitions
            let definitionsLang = 'English';
            if (userId) {
                const { data: userData } = await supabase
                    .from('app_users')
                    .select('fluent_languages, learning_languages')
                    .eq('id', userId)
                    .single();

                if (userData) {
                    const allLangs = [...(userData.fluent_languages || []), ...(userData.learning_languages || [])];
                    // Remove target language from definitions (e.g. don't define German in German)
                    const filtered = allLangs.filter(l => !l.toLowerCase().includes(targetLang.toLowerCase()));
                    if (filtered.length > 0) {
                        definitionsLang = filtered.join(', '); // e.g. "English, Spanish"
                    }
                }
            }

            console.log(`Generating hints for prompt: "${prompt}" in ${targetLang}. Definitions in: ${definitionsLang}`)

            const hintSystemPrompt = `You are a helpful language tutor. 
The student needs help answering this challenge: "${prompt}"
Target Language: ${targetLang}

Generate:
1. A simple starter phrase (1 sentence) they can use.
2. 3 useful vocabulary words related to the topic.

CRITICAL: Provide translations for the vocabulary in: ${definitionsLang}.
If multiple languages are listed (e.g. English, Spanish), provide BOTH translations formatted as "English / Spanish".

Return STRICT JSON:
{
    "starter_phrase": "The phrase in ${targetLang}",
    "vocab_bank": [
        { "word": "Word1 in ${targetLang}", "translation": "Meaning in ${definitionsLang}" },
        { "word": "Word2", "translation": "Meaning in ${definitionsLang}" },
        { "word": "Word3", "translation": "Meaning in ${definitionsLang}" }
    ]
}`

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: hintSystemPrompt }],
                    temperature: 0.3,
                    response_format: { type: "json_object" }
                }),
            })

            if (!groqResponse.ok) {
                const errText = await groqResponse.text()
                console.error('Groq Error:', errText)
                throw new Error(`Groq API failed: ${groqResponse.status} - ${errText}`)
            }

            const groqResult = await groqResponse.json()
            const resultJSON = JSON.parse(groqResult.choices[0].message.content)

            // CACHE THE RESULT: Future loads will use this metadata
            if (challengeId) {
                console.log(`Caching metadata for challenge: ${challengeId}`)
                await supabase
                    .from('app_challenges')
                    .update({ metadata: resultJSON })
                    .eq('id', challengeId)
            }

            return new Response(JSON.stringify(resultJSON), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // CORRECTION: My previous logic on line 16 destructured `text` but not `prompt`.
        // I need to update the destructuring to include `prompt`.

        if (task === 'generate_hints') {
            const promptText = text || (await req.json()).prompt || "Say something" // Fallback mayhem if I don't fix line 16

            // Let's rely on my ability to fix line 16 in a separate edit or assume I can access it.
            // Actually, I will update line 16 first to be safe, then add this block.
        }
        // ==========================================
        // TASK: ANALYZE (Transcription + Correction)
        // ==========================================

        // Step 1: Download audio
        const audioResponse = await fetch(audioUrl)
        const audioBlob = await audioResponse.blob()

        // Step 2: Transcribe with OpenAI Whisper
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
        const formData = new FormData()
        formData.append('file', audioBlob, 'audio.m4a')
        formData.append('model', 'whisper-1')
        formData.append('response_format', 'verbose_json')

        const whisperResponse = await fetch(
            'https://api.openai.com/v1/audio/transcriptions',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                body: formData,
            }
        )

        if (!whisperResponse.ok) {
            const errorText = await whisperResponse.text()
            throw new Error(`Whisper API failed: ${whisperResponse.status}`)
        }

        const whisperResult = await whisperResponse.json()
        const transcription = whisperResult.text || ''

        // Calculate confidence
        let avgConfidence = 0.95
        if (whisperResult.words && whisperResult.words.length > 0) {
            const totalConfidence = whisperResult.words.reduce((sum: any, word: any) => sum + (word.confidence || 0), 0)
            avgConfidence = totalConfidence / whisperResult.words.length
        }

        // Step 3: Fetch User Profile for Translanguaging
        let userLanguages: string[] = []
        if (userId) {
            const { data: userData } = await supabase
                .from('app_users')
                .select('fluent_languages')
                .eq('id', userId)
                .single()

            if (userData?.fluent_languages) {
                userLanguages = userData.fluent_languages
            }
        }
        const userLangString = userLanguages.length > 0 ? userLanguages.join(', ') : 'their known languages'

        // Step 4: Correct grammar with Groq (Llama 3)
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

        // const { context } = await req.json() // REMOVED: Already parsed at top

        // Context String Construction
        let contextString = ""
        if (context) {
            contextString = `
CONTEXT from Original Challenge:
- The user was asked: "${context.prompt || 'Unknown Challenge'}"
- A suggested starter phrase was: "${context.starter_phrase || 'None'}"
- Suggested vocabulary words were: ${context.vocab_bank ? context.vocab_bank.map((v: any) => `${v.word} (${v.translation})`).join(', ') : 'None'}

Use this context to be smarter:
- If they use words from the starter phrase or vocabulary, that is GOOD.
- If their sentence answers the prompt, mark it as relevant.
- Use the suggested vocabulary to help decipher unclear audio (e.g. if audio sounds like a suggested word, it probably is that word).
`
        }

        const systemPrompt = `You are a strict language teacher. Find ALL errors.

Student said: "${transcription}"
Target Language: ${language || 'English'}
Student's Native Languages: ${userLangString}
${contextString}

CRITICAL RULES:
1. Look for ANY grammar, vocabulary, pronunciation, or word choice errors
2. If you find errors: Fix ONLY the wrong words. Keep sentence structure identical.
3. If truly perfect: Return the exact same text
4. TRANSLANGUAGING: You MUST write the explanation primarily in ${userLangString} (or English if unclear). Explain the ${language} error by comparing it to how they would say it in ${userLangString}.

Return JSON:
{
    "corrected": "fixed text with ONLY wrong words changed",
    "explanation": "Explanation written in ${userLangString} comparing the grammar",
    "is_correct": false
}`

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: systemPrompt }],
                temperature: 0.1,
            }),
        })

        if (!groqResponse.ok) throw new Error('Groq API failed')

        const groqResult = await groqResponse.json()
        const correctionText = groqResult.choices[0].message.content

        console.log('=== LLAMA RAW RESPONSE ===')
        console.log(correctionText)

        let correction
        try {
            correction = JSON.parse(correctionText)

            // FAIL-SAFE: If text changed, it IS NOT correct, regardless of what Llama thinks
            if (correction.corrected.trim().toLowerCase() !== transcription.trim().toLowerCase()) {
                console.log('Text changed -> Forcing is_correct = false');
                correction.is_correct = false;
            }

            console.log('=== PARSED CORRECTION ===')
            console.log('is_correct:', correction.is_correct)
            console.log('corrected:', correction.corrected)
            console.log('explanation:', correction.explanation)
        } catch (e) {
            console.log('=== JSON PARSE ERROR ===')
            console.log(e)
            correction = { is_correct: true, corrected: transcription, explanation: '' }
        }

        // Return Analysis Result (No Audio yet)
        const responseData = {
            transcription,
            correction,
            avgConfidence,
            pronunciationUrl: null // Frontend triggers step 2
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
