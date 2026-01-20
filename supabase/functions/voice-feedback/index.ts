import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { audioUrl, language, userId } = await req.json()

        console.log('Voice feedback request:', { audioUrl, language, userId })

        // Step 1: Download audio from Supabase Storage
        const audioResponse = await fetch(audioUrl)
        const audioBlob = await audioResponse.blob()

        // Step 2: Transcribe with OpenAI Whisper
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

        // Convert blob to FormData for OpenAI API
        const formData = new FormData()
        formData.append('file', audioBlob, 'audio.m4a')
        formData.append('model', 'whisper-1')

        const whisperResponse = await fetch(
            'https://api.openai.com/v1/audio/transcriptions',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: formData,
            }
        )

        // Check if response is OK before parsing
        if (!whisperResponse.ok) {
            const errorText = await whisperResponse.text()
            console.error('OpenAI Whisper error:', errorText)
            throw new Error(`Whisper API failed: ${whisperResponse.status} - ${errorText.substring(0, 200)}`)
        }

        const whisperResult = await whisperResponse.json()
        const transcription = whisperResult.text || ''

        console.log('Transcription:', transcription)

        // Step 3 & 4: Run Groq and ElevenLabs in PARALLEL for speed
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')

        const correctionPrompt = `You are a ${language} language teacher. A student said: "${transcription}"

Analyze this and respond in JSON format:
{
  "is_correct": true/false,
  "corrected": "corrected version or same if perfect",
  "explanation": "brief tip (max 50 chars) or empty if perfect"
}

Keep explanations SHORT and helpful. If grammar is perfect, set is_correct to true and leave explanation empty.`

        // Start both API calls in parallel
        const [groqResponse, elevenLabsResponse] = await Promise.all([
            // Groq: Analyze for corrections
            fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: correctionPrompt }],
                    temperature: 0.3,
                }),
            }),
            // ElevenLabs: Generate pronunciation (we'll use it only if there are errors)
            fetch(
                'https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB',
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: transcription, // Generate for full text, we'll decide later if we use it
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    }),
                }
            ),
        ])

        // Check Groq response
        if (!groqResponse.ok) {
            const errorText = await groqResponse.text()
            console.error('Groq API error:', errorText)
            throw new Error(`Groq API failed: ${groqResponse.status}`)
        }

        const groqResult = await groqResponse.json()
        console.log('Groq response:', JSON.stringify(groqResult))

        if (!groqResult.choices || !groqResult.choices[0]) {
            console.error('Invalid Groq response:', groqResult)
            throw new Error('Groq API returned invalid response')
        }

        const correctionText = groqResult.choices[0].message.content

        // Parse JSON response
        let correction
        try {
            correction = JSON.parse(correctionText)
        } catch (e) {
            correction = { is_correct: true, corrected: transcription, explanation: '' }
        }

        console.log('Correction:', correction)

        // Step 5: Upload pronunciation ONLY if there are errors
        let pronunciationUrl = null

        if (!correction.is_correct) {
            const pronunciationAudio = await elevenLabsResponse.arrayBuffer()

            // Upload pronunciation to Supabase Storage
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            const supabase = createClient(supabaseUrl, supabaseKey)

            const fileName = `pronunciation_${userId}_${Date.now()}.mp3`
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(`pronunciations/${fileName}`, pronunciationAudio, {
                    contentType: 'audio/mpeg',
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(`pronunciations/${fileName}`)

            pronunciationUrl = urlData.publicUrl

            // Step 6: Save to database if user opted in
            const { data: userData } = await supabase
                .from('app_users')
                .select('share_voice_feedback')
                .eq('id', userId)
                .single()

            if (userData?.share_voice_feedback) {
                await supabase.from('app_voice_feedback_data').insert({
                    user_id: userId,
                    language,
                    transcription,
                    corrected: correction.corrected,
                    has_errors: !correction.is_correct,
                })
            }
        }

        return new Response(
            JSON.stringify({
                transcription,
                corrected: correction.corrected,
                hasErrors: !correction.is_correct,
                explanation: correction.explanation,
                pronunciationUrl,
                confidence: 95, // Whisper doesn't return confidence, using high default
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
