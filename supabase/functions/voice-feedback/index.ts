import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

            // Map languages to native-sounding voices (Female defaults)
            // IDs from ElevenLabs optimized for respective languages
            const VOICE_MAP: Record<string, string> = {
                'French': 'AZnzlk1XvdvUeBnXmlld', // Domi (Respectful, standard French)
                'Spanish': 'ThT5KcBeYPX3keUQqHPh', // Dorothy (Pleasant)
                'German': 'ThT5KcBeYPX3keUQqHPh', // Dorothy
                'Italian': 'AZnzlk1XvdvUeBnXmlld', // Domi works well for Romance
                'Portuguese': 'AZnzlk1XvdvUeBnXmlld',
                'English': '21m00Tcm4TlvDq8ikWAM' // Rachel
            };

            // Detect language from text if possible, or use passed language param? 
            // We don't have language param in 'pronunciation' body currently!
            // We need to pass it from frontend.
            // For now, default to Domi if text looks French? No that's hard.
            // Wait, frontend passes 'text' and 'task'. It DOES NOT pass 'language' in Step 2663 layout.
            // I must update Frontend to pass language in pronunciation step.

            // Assuming I fix frontend:
            // const voiceId = VOICE_MAP[language] || '21m00Tcm4TlvDq8ikWAM';

            // BUT simpler: Use 'eleven_turbo_v2_5' which has better accent handling for Rachel.
            // AND I will change default voice to 'Sarah' (EXAVITQu4vr4xnSDxMaL) which is often more neutral?
            // User specifically complained about Rachel + French -> Quebecois.

            // Plan: Update Frontend to pass `language` to pronunciation task.
            // Update Backend to use mapped Voice ID.

            // For this specific 'pronunciation' block, I don't see 'language' distructured in line 15.
            // Line 15: const { audioUrl, language, userId, task ... } 
            // So 'language' IS available if passed in body.

            // Let's use the map.
            // If language is missing, default to Rachel.

            const targetLang = language || 'English';
            // Simple normalization
            const langKey = Object.keys(VOICE_MAP).find(k => targetLang.toLowerCase().includes(k.toLowerCase())) || 'English';
            const voiceId = VOICE_MAP[langKey] || '21m00Tcm4TlvDq8ikWAM';

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
                        model_id: 'eleven_turbo_v2_5', // Speed + Multilingual
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                    }),
                }
            )

            if (!elevenLabsResponse.ok) throw new Error('ElevenLabs API failed')

            const pronunciationAudio = await elevenLabsResponse.arrayBuffer()
            const fileName = `pronunciation_${Date.now()}.mp3`
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('voice-memos') // Using the existing bucket
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

        const systemPrompt = `Role: You are a friendly, chill community member in a language learning app. You are analyzing a voice memo.
        User Input: "${transcription}"
        Target Language: ${language || 'English'}
        User's Known Languages: ${userLangString}

        Task:
        1. Identify small errors (grammar, vocab). 
        2. STRICT CONSTRAINT: Keep the user's original sentence structure EXACTLY the same. Only correct the specific words that are wrong. Do NOT paraphrase or rewrite the sentence style.
        3. Provide the corrected version.
        4. Explanation: Provide a brief friendly feedback.
        5. Translanguaging: If helpful, explicitly explain the concept using ${userLangString} grammar comparisons.

        Return JSON ONLY:
        {
            "corrected": "string",
            "explanation": "string", 
            "is_correct": boolean
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
                temperature: 0.3,
            }),
        })

        if (!groqResponse.ok) throw new Error('Groq API failed')

        const groqResult = await groqResponse.json()
        const correctionText = groqResult.choices[0].message.content

        let correction
        try {
            correction = JSON.parse(correctionText)
        } catch (e) {
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
