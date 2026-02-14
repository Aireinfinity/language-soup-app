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
        const { audioUrl, language, userId, task = 'analyze', text, context, prompt, challengeId, messageId } = await req.json()

        console.log('Voice feedback request:', { task, userId })

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // ==========================================
        // TASK: PRONUNCIATION (ElevenLabs)
        // ==========================================
        if (task === 'pronunciation' && text) {
            // Send exactly the phrase we want spoken — no wrappers, no extra chars. Learners need 100% alignment.
            const raw = typeof text === 'string' ? text : String(text);
            let input = raw.trim();
            if ((input.startsWith('"') && input.endsWith('"')) || (input.startsWith("'") && input.endsWith("'"))) {
                input = input.slice(1, -1).trim();
            }
            if (!input) {
                return new Response(JSON.stringify({ pronunciationUrl: null, error: 'Empty text' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            console.log('Pronunciation input (exact):', JSON.stringify(input), 'length:', input.length);
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
            // tts-1: no instructions, reads input verbatim. Use this for exact phrase alignment.
            const payload: Record<string, unknown> = {
                model: 'tts-1',
                input,
                voice: 'shimmer',
            };

            try {
                const openAIResponse = await fetch(
                    'https://api.openai.com/v1/audio/speech',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
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
            const hintSystemPrompt = `You are a helpful language tutor for absolute beginners.
The challenge is a QUESTION: "${prompt}"
The student needs a beginner phrase that is a direct ANSWER to this question, in ${targetLang}.

RULES (STRICT):
1. starter_phrase: ONE short sentence in ${targetLang} only. Maximum 8 words. Prefer 5-7 words.
   It must be a direct ANSWER to the question above, not a generic statement about the topic.
   Example: if the question is "What song are you listening to right now?", the phrase should be like "I'm listening to [song name] right now" or "Right now I'm listening to...", NOT just "I'm listening to music."
   Example: if the question is "Describe your perfect weekend", the phrase should be like "My perfect weekend is ..." or "On my perfect weekend I ...", NOT "My weekend is perfect."
2. vocab_bank: 6 useful vocabulary words. For EACH item you MUST provide:
   - "target_term": the word or phrase IN ${targetLang} that we will pronounce (e.g. "amigo", "sortir", "buongiorno"). This is the only field we speak aloud.
   - "english": the English meaning only (e.g. "friend", "to go out", "good morning").
3. Use natural spoken language for the target language: contractions, elisions, and informal register as in real conversation. Apply the usual spoken rules for that language (elision before vowels where standard, contractions, informal forms). The phrase should sound like casual speech, not written or formal.

Return strictly valid JSON: { "starter_phrase": "<short sentence in ${targetLang}, max 8 words>", "starter_phrase_translation": "<English>", "vocab_bank": [{"target_term": "<term in ${targetLang}>", "english": "<English meaning>"}] }`

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

            // 1. Hard cap: truncate starter_phrase to 8 words
            if (resultJSON.starter_phrase && typeof resultJSON.starter_phrase === 'string') {
                const phrase = resultJSON.starter_phrase.trim()
                const words = phrase.split(/\s+/)
                if (words.length > 8) {
                    resultJSON.starter_phrase = words.slice(0, 8).join(' ').replace(/[,.\s]+$/, '').trim() || words.slice(0, 8).join(' ')
                } else {
                    resultJSON.starter_phrase = phrase
                }
            }

            // 2. Vocab: normalize to word (term we speak) + translation (English). Use explicit target_term/english from LLM so we always speak the right term.
            if (resultJSON.vocab_bank && Array.isArray(resultJSON.vocab_bank)) {
                resultJSON.vocab_bank = resultJSON.vocab_bank.map((item: { target_term?: string; english?: string; word?: string; translation?: string }) => {
                    const term = (item.target_term ?? item.word ?? '').trim()
                    const eng = (item.english ?? item.translation ?? '').trim()
                    return { word: term, translation: eng }
                }).filter((item: { word: string }) => item.word.length > 0)
            }

            return new Response(JSON.stringify(resultJSON), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ==========================================
        // TASK: TRANSCRIBE_MESSAGE (Voice memo → app_messages.transcript)
        // ==========================================
        if (task === 'transcribe_message' && messageId) {
            const { data: msgRow, error: msgErr } = await supabase
                .from('app_messages')
                .select('media_url, group_id')
                .eq('id', messageId)
                .single()

            if (msgErr || !msgRow?.media_url) {
                console.error('transcribe_message: message not found or no media_url', { messageId, msgErr })
                return new Response(JSON.stringify({ error: 'Message not found or no audio' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const audioUrlForTranscribe = msgRow.media_url
            let groupLanguage: string | null = null
            if (msgRow.group_id) {
                const { data: groupRow } = await supabase
                    .from('app_groups')
                    .select('language')
                    .eq('id', msgRow.group_id)
                    .single()
                groupLanguage = groupRow?.language ?? null
            }

            const audioResponse = await fetch(audioUrlForTranscribe)
            if (!audioResponse.ok) {
                throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`)
            }
            const audioBlob = await audioResponse.blob()
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
            const formData = new FormData()
            let extension = 'm4a'
            if (audioBlob.type.includes('mpeg') || audioUrlForTranscribe.endsWith('.mp3')) extension = 'mp3'
            if (audioBlob.type.includes('wav') || audioUrlForTranscribe.endsWith('.wav')) extension = 'wav'
            if (audioBlob.type.includes('ogg') || audioUrlForTranscribe.endsWith('.ogg')) extension = 'ogg'
            formData.append('file', audioBlob, `audio.${extension}`)
            formData.append('model', 'whisper-1')

            const LANGUAGE_MAP: Record<string, string> = {
                'french': 'fr', 'hungarian': 'hu', 'english': 'en', 'spanish': 'es', 'german': 'de',
                'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja', 'chinese': 'zh',
                'korean': 'ko', 'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr', 'indonesian': 'id', 'arabic': 'ar'
            }
            if (groupLanguage) {
                const lower = groupLanguage.toLowerCase()
                const iso = LANGUAGE_MAP[lower]
                if (iso) formData.append('language', iso)
                else if (lower.length === 2) formData.append('language', lower)
            }

            const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                body: formData,
            })
            const whisperResult = await whisperResponse.json()
            if (whisperResult.error) {
                console.error('Whisper API Error:', whisperResult.error)
                throw new Error(`Whisper API Failed: ${whisperResult.error.message}`)
            }
            const transcription = (whisperResult.text || '').trim()

            const { error: updateErr } = await supabase
                .from('app_messages')
                .update({
                    transcript: transcription,
                    transcript_language: groupLanguage || undefined,
                })
                .eq('id', messageId)

            if (updateErr) {
                console.error('transcribe_message: update failed', updateErr)
                throw new Error(updateErr.message)
            }

            return new Response(JSON.stringify({ transcript: transcription }), {
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
        const systemPrompt = `You are a Translanguaging Expert and an expert in ${language || 'English'}. Correct this CASUAL voice message.
Student said: "${transcription}"
Context (Question they are answering): "${context?.prompt || 'Unknown'}"
Target Language: ${language || 'English'}
Student's Known Languages: ${userLangString}

RULES:
1. Fix ONLY wrong words or unnatural phrasing.
2. Keep it CASUAL (not classroom style).
3. Explanation must be SHORT (max 1-2 sentences).
4. Use translanguaging (explain in English, compare to ${userLangString}).

Return strictly valid JSON: { "corrected": "...", "explanation": "...", "is_correct": boolean }`

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
