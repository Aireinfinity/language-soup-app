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
        const { audioUrl, language, userId, task = 'analyze', text, correctionObj } = await req.json()

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

            // SCALABLE VOICE MAP:
            // "Tell ElevenLabs exactly who to be based on the group language."
            const VOICE_MAP: Record<string, string> = {
                // EUROPEAN
                'French': 'AZnzlk1XvdvUeBnXmlld', // Domi (Native Parisian)
                'Spanish': 'ThT5KcBeYPX3keUQqHPh', // Dorothy (Native Spanish)
                'German': 'ThT5KcBeYPX3keUQqHPh', // Dorothy (Good German)
                'Italian': 'AZnzlk1XvdvUeBnXmlld', // Domi (Good Italian)
                'Portuguese': 'AZnzlk1XvdvUeBnXmlld', // Domi (Eu-PT)

                // ASIAN / MIDDLE EASTERN
                'Farsi': 'EXAVITQu4vr4xnSDxMaL', // Sarah (Best Multilingual for non-EU)
                'Persian': 'EXAVITQu4vr4xnSDxMaL', // Sarah
                'Hindi': 'EXAVITQu4vr4xnSDxMaL',   // Sarah
                'Japanese': 'EXAVITQu4vr4xnSDxMaL', // Sarah
                'Chinese': 'EXAVITQu4vr4xnSDxMaL', // Sarah

                // DEFAULT
                'English': '21m00Tcm4TlvDq8ikWAM' // Rachel (American)
            };

            const targetLang = language || 'English';
            // Find voice by fuzzy matching language name (e.g. "French" matches "French")
            // Default to Sarah (Multilingual) if no specific match found
            const langKey = Object.keys(VOICE_MAP).find(k => targetLang.toLowerCase().includes(k.toLowerCase())) || 'Default';
            const voiceId = VOICE_MAP[langKey] || 'EXAVITQu4vr4xnSDxMaL'; // Sarah is the global fallback

            console.log(`[Pronunciation] Using Native Voice: ${voiceId} (${langKey}) on Multilingual V2`);

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

            if (!elevenLabsResponse.ok) throw new Error('ElevenLabs API failed')

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

        const systemPrompt = `You are a strict language teacher. Find ALL errors.

Student said: "${transcription}"
Target Language: ${language || 'English'}
Student's Native Languages: ${userLangString}

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
