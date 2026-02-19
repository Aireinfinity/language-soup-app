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
        const { audioUrl, language, userId, task = 'analyze', text, context, prompt, challengeId, messageId, variation } = await req.json()

        console.log('Voice feedback request:', { task, userId })

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // ==========================================
        // TASK: PRONUNCIATION (ElevenLabs)
        // ==========================================
        if (task === 'pronunciation' && text) {
            // Use only the request body's `text` so the audio always matches what the user tapped. Trim and strip outer quotes only.
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
            // This exact string is sent to TTS — do not substitute or alter so playback matches the tapped phrase/word.
            console.log('Pronunciation input (exact):', JSON.stringify(input), 'length:', input.length);
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
            // tts-1: no instructions, reads input verbatim. Use this for exact phrase alignment. Slow speed for learners.
            const payload: Record<string, unknown> = {
                model: 'tts-1',
                input,
                voice: 'shimmer',
                speed: 0.65,
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
            const isVariation = variation === true

            const baseRules = `RULES (STRICT):
1. starter_phrases: an array of EXACTLY 2 short sentences in ${targetLang} only. Each phrase max 8 words. Prefer 5-7 words.
   Each must be a direct ANSWER to the question. Vary the phrasing (e.g. one formal, one casual).
2. GRAMMAR: Every phrase must be a complete, grammatically correct sentence. Include all required articles, prepositions, and particles. For English: e.g. "I'd go to the museum" not "I'd go museum". For other languages: use correct grammar (e.g. proper prepositions, articles). Keep it casual and natural but correct.
3. For each phrase provide "translation": English meaning. Return as starter_phrases: [{ "phrase": "<sentence in ${targetLang}>", "translation": "<English>" }, { "phrase": "<second sentence>", "translation": "<English>" }]
4. vocab_bank: exactly 3 useful vocabulary words. For EACH item: "target_term": the word IN ${targetLang} we pronounce, "english": English meaning.
5. Use natural spoken language: contractions, elisions, informal register. Sound like casual speech.`

            const variationInstruction = `IMPORTANT: The user asked for a DIFFERENT set of ideas. Do NOT repeat the same phrases or vocab they may have seen before. Pick a different angle (e.g. different formality, different vocabulary theme, different sentence structures). Be creative and varied.`

            const hintSystemPrompt = isVariation
                ? `You are a helpful language tutor for absolute beginners.
The challenge is a QUESTION: "${prompt}"
The student needs exactly 2 short beginner phrases that are direct ANSWERS to this question, in ${targetLang}.

${variationInstruction}

${baseRules}

Return strictly valid JSON: { "starter_phrases": [{"phrase": "<sentence in ${targetLang}>", "translation": "<English>"}, {"phrase": "<second sentence in ${targetLang}>", "translation": "<English>"}], "vocab_bank": [{"target_term": "<term>", "english": "<meaning>"}, {"target_term": "<term>", "english": "<meaning>"}, {"target_term": "<term>", "english": "<meaning>"}] }`
                : `You are a helpful language tutor for absolute beginners.
The challenge is a QUESTION: "${prompt}"
The student needs exactly 2 short beginner phrases that are direct ANSWERS to this question, in ${targetLang}.

${baseRules}

Return strictly valid JSON: { "starter_phrases": [{"phrase": "<sentence in ${targetLang}>", "translation": "<English>"}, {"phrase": "<second sentence in ${targetLang}>", "translation": "<English>"}], "vocab_bank": [{"target_term": "<term>", "english": "<meaning>"}, {"target_term": "<term>", "english": "<meaning>"}, {"target_term": "<term>", "english": "<meaning>"}] }`

            const temperature = isVariation ? 0.9 : 0.3

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: hintSystemPrompt }],
                    temperature,
                    response_format: { type: "json_object" }
                }),
            })

            const groqResult = await groqResponse.json()
            const resultJSON = JSON.parse(groqResult.choices[0].message.content)

            // 1. Normalize starter_phrases (array of { phrase, translation }); backward compat: if only starter_phrase exists, wrap it
            if (resultJSON.starter_phrases && Array.isArray(resultJSON.starter_phrases)) {
                resultJSON.starter_phrases = resultJSON.starter_phrases.slice(0, 2).map((p: { phrase?: string; translation?: string; text?: string }) => {
                    const phrase = (p.phrase ?? p.text ?? '').trim()
                    const words = phrase.split(/\s+/)
                    const capped = words.length > 8 ? words.slice(0, 8).join(' ').replace(/[,.\s]+$/, '').trim() : phrase
                    return { phrase: capped || phrase, translation: (p.translation ?? '').trim() }
                }).filter((p: { phrase: string }) => p.phrase.length > 0)
            }
            if (resultJSON.starter_phrase && typeof resultJSON.starter_phrase === 'string') {
                const phrase = resultJSON.starter_phrase.trim()
                const words = phrase.split(/\s+/)
                const capped = words.length > 8 ? words.slice(0, 8).join(' ').replace(/[,.\s]+$/, '').trim() : phrase
                resultJSON.starter_phrases = [{ phrase: capped || phrase, translation: (resultJSON.starter_phrase_translation ?? '').trim() }]
            }
            if (!resultJSON.starter_phrases?.length) resultJSON.starter_phrases = []

            // 2. Vocab: normalize; keep only 3 items
            if (resultJSON.vocab_bank && Array.isArray(resultJSON.vocab_bank)) {
                resultJSON.vocab_bank = resultJSON.vocab_bank.slice(0, 3).map((item: { target_term?: string; english?: string; word?: string; translation?: string }) => {
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
                'korean': 'ko', 'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr', 'indonesian': 'id', 'arabic': 'ar',
                'mandarin': 'zh', 'hindi': 'hi', 'bengali': 'bn', 'urdu': 'ur', 'vietnamese': 'vi', 'thai': 'th',
                'greek': 'el', 'czech': 'cs', 'romanian': 'ro', 'swedish': 'sv', 'danish': 'da', 'norwegian': 'no',
                'finnish': 'fi', 'hebrew': 'he', 'persian': 'fa', 'farsi': 'fa', 'swahili': 'sw'
            }
            const baseLangForIso = (l: string | null) => {
                if (!l || typeof l !== 'string') return null
                const s = l.trim().toLowerCase()
                const base = s.split(/[\s*(\/\–\-]/)[0].trim()
                return LANGUAGE_MAP[base] || (base.length === 2 ? base : null)
            }
            const iso = baseLangForIso(groupLanguage)
            if (iso) formData.append('language', iso)

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

        // Fix: Whisper requires ISO-639-1 codes (e.g. 'fr', 'hu'). Normalize "French (Français)" -> "french" -> "fr"
        const LANGUAGE_MAP: Record<string, string> = {
            'french': 'fr', 'hungarian': 'hu', 'english': 'en', 'spanish': 'es', 'german': 'de',
            'italian': 'it', 'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja', 'chinese': 'zh',
            'korean': 'ko', 'dutch': 'nl', 'polish': 'pl', 'turkish': 'tr', 'indonesian': 'id', 'arabic': 'ar',
            'mandarin': 'zh', 'hindi': 'hi', 'bengali': 'bn', 'vietnamese': 'vi', 'thai': 'th',
            'greek': 'el', 'czech': 'cs', 'romanian': 'ro', 'swedish': 'sv', 'danish': 'da', 'norwegian': 'no',
            'finnish': 'fi', 'hebrew': 'he', 'persian': 'fa', 'farsi': 'fa', 'swahili': 'sw'
        };
        const baseLangForIso = (l: string | null) => {
            if (!l || typeof l !== 'string') return null;
            const s = l.trim().toLowerCase();
            const base = s.split(/[\s*(\/\–\-]/)[0].trim();
            return LANGUAGE_MAP[base] || (base.length === 2 ? base : null) || null;
        };

        const isoCode = baseLangForIso(language);
        if (isoCode) formData.append('language', isoCode);

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

        // 3. Correct (Groq/Llama) — use normalized target language name for prompt (e.g. "French" from "French (Français)")
        const targetLangName = (language && typeof language === 'string')
            ? language.trim().split(/[\s*(\/\–\-]/)[0].trim() || 'English'
            : 'English'
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
        const systemPrompt = `You are a Translanguaging Expert and an expert in ${targetLangName}. Correct this CASUAL voice message.
Student said: "${transcription}"
Context (Question they are answering): "${context?.prompt || 'Unknown'}"
Target Language: ${targetLangName}
Student's Known Languages: ${userLangString}

RULES:
1. Fix ONLY wrong words or unnatural phrasing.
2. Keep it CASUAL (not classroom style).
3. Explanation must be SHORT (max 1-2 sentences).
4. Use translanguaging (explain in English, compare to ${userLangString}). The student is speaking in ${targetLangName}.

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
