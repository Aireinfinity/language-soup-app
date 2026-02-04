import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { audioUrl, language, userId, task = 'analyze', text, context, prompt, challengeId } = await req.json()

        console.log('Voice feedback request:', { task, userId })

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // ==========================================
        // TASK: PRONUNCIATION (ElevenLabs)
        // ==========================================
        if (task === 'pronunciation' && text) {
            console.log('Generating pronunciation (OpenAI) for:', text.substring(0, 50))
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

            try {
                const openAIResponse = await fetch(
                    'https://api.openai.com/v1/audio/speech',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'tts-1',
                            input: text,
                            voice: 'shimmer', // 'alloy' is also good, but 'shimmer' is clear/female
                        }),
                    }
                )

                if (!openAIResponse.ok) {
                    const errText = await openAIResponse.text()
                    throw new Error(`OpenAI TTS API failed: ${openAIResponse.status} - ${errText}`)
                }

                const pronunciationAudio = await openAIResponse.arrayBuffer()
                const fileName = `pronunciation_openai_${Date.now()}.mp3`

                // Upload to Storage
                const { error: uploadError } = await supabase
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

            } catch (err: any) {
                console.error('Pronunciation Error:', err)
                return new Response(JSON.stringify({
                    pronunciationUrl: null,
                    error: err.message || 'Unknown error'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        }

        // ==========================================
        // TASK: GENERATE HINTS (Inspiration)
        // ==========================================
        if (task === 'generate_hints') {
            const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

            // Basic Hint Logic
            const targetLang = language || 'Target Language'
            const hintSystemPrompt = `You are a helpful language tutor. 
The student needs help answering: "${prompt}" in ${targetLang}.
Generate a simple starter phrase and 3 useful vocab words.
Return strictly valid JSON: { "starter_phrase": "...", "vocab_bank": [{"word": "...", "translation": "..."}] }`

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

            const groqResult = await groqResponse.json()
            const resultJSON = JSON.parse(groqResult.choices[0].message.content)

            return new Response(JSON.stringify(resultJSON), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ==========================================
        // TASK: ANALYZE (Transcription + Correction)
        // ==========================================
        // Default fallthrough task

        // VALIDATION: Ensure audioUrl exists before trying to fetch
        if (!audioUrl) {
            console.error('Missing audioUrl for analyze task')
            return new Response(
                JSON.stringify({ error: 'audioUrl is required for analyze task' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Transcribe (Whisper)
        // 1. Transcribe (Whisper)
        const audioResponse = await fetch(audioUrl)

        if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`)
        }

        const audioBlob = await audioResponse.blob()
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

        const formData = new FormData()

        // Determine file extension from Blob type or URL
        // Whisper supports: m4a, mp3, webm, mp4, mpga, wav, mpeg
        let extension = 'm4a'; // Default for iOS/Android uploads
        if (audioBlob.type.includes('mpeg') || audioUrl.endsWith('.mp3')) extension = 'mp3';
        if (audioBlob.type.includes('wav') || audioUrl.endsWith('.wav')) extension = 'wav';
        if (audioBlob.type.includes('ogg') || audioUrl.endsWith('.ogg')) extension = 'ogg';

        formData.append('file', audioBlob, `audio.${extension}`)
        formData.append('model', 'whisper-1')

        // Fix: Whisper requires ISO-639-1 codes (e.g. 'fr', 'hu') not full names
        const LANGUAGE_MAP: Record<string, string> = {
            'french': 'fr',
            'hungarian': 'hu',
            'english': 'en',
            'spanish': 'es',
            'german': 'de',
            'italian': 'it',
            'portuguese': 'pt',
            'russian': 'ru',
            'japanese': 'ja',
            'chinese': 'zh',
            'korean': 'ko',
            'dutch': 'nl',
            'polish': 'pl',
            'turkish': 'tr',
            'indonesian': 'id',
            'arabic': 'ar'
        };

        if (language) {
            const lowerLang = language.toLowerCase();
            const isoCode = LANGUAGE_MAP[lowerLang];
            if (isoCode) {
                formData.append('language', isoCode);
            } else {
                // If 2 characters, assume it's already ISO
                if (lowerLang.length === 2) {
                    formData.append('language', lowerLang);
                }
                // Otherwise, omit language param to let Whisper auto-detect
                // (Sending invalid language codes like "french" breaks transcription)
            }
        }

        const whisperResponse = await fetch(
            'https://api.openai.com/v1/audio/transcriptions',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                body: formData,
            }
        )
        const whisperResult = await whisperResponse.json()

        if (whisperResult.error) {
            console.error('Whisper API Error:', whisperResult.error)
            throw new Error(`Whisper API Failed: ${whisperResult.error.message}`);
        }

        const transcription = whisperResult.text || ''

        // 2. Fetch User Profile (Translanguaging)
        let userLangString = 'English'
        if (userId) {
            const { data: userData } = await supabase
                .from('app_users')
                .select('fluent_languages, learning_languages')
                .eq('id', userId)
                .single()
            if (userData) {
                const allLangs = [...(userData.fluent_languages || []), ...(userData.learning_languages || [])];
                userLangString = allLangs.join(', ')
            }
        }

        // 3. Correct (Groq/Llama)
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        const systemPrompt = `You are a helpful language tutor. Analyze and provide feedback.
Student said: "${transcription}"
Target Language: ${language || 'English'}
Student's Known Languages: ${userLangString}

RULES:
1. Fix ONLY wrong words.
2. Even if perfect, provide tips/alternatives.
3. Use translanguaging (explain in English, compare to ${userLangString}).

Return JSON: { "corrected": "...", "explanation": "...", "is_correct": boolean }`

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
                response_format: { type: "json_object" }
            }),
        })

        const groqResult = await groqResponse.json()
        let correction = JSON.parse(groqResult.choices[0].message.content)

        // Fail-safe: If text changed, is_correct must be false
        if (correction.corrected.toLowerCase().trim() !== transcription.toLowerCase().trim()) {
            correction.is_correct = false;
        }

        return new Response(JSON.stringify({
            transcription,
            correction
        }), {
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
