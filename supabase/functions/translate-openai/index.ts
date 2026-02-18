// OpenAI-based translation. Uses same OPENAI_API_KEY as voice-feedback.
// Pipeline: DeepL → OpenAI (this) → Google. No new secret.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map common codes to language names for a clear prompt (optional; model understands codes too)
const CODE_TO_NAME: Record<string, string> = {
    ES: 'Spanish', FR: 'French', DE: 'German', IT: 'Italian', PT: 'Portuguese',
    NL: 'Dutch', JA: 'Japanese', ZH: 'Chinese', KO: 'Korean', RU: 'Russian',
    AR: 'Arabic', HI: 'Hindi', TR: 'Turkish', VI: 'Vietnamese', TH: 'Thai',
    ID: 'Indonesian', PL: 'Polish', SV: 'Swedish', DA: 'Danish', FI: 'Finnish',
    EL: 'Greek', HE: 'Hebrew', FA: 'Persian', UK: 'Ukrainian', RO: 'Romanian',
    HU: 'Hungarian', CS: 'Czech', BG: 'Bulgarian', SK: 'Slovak', HR: 'Croatian',
    KY: 'Kyrgyz',
}

function languageForPrompt(targetLang: string): string {
    const code = targetLang.toUpperCase().replace(/-.*/, '')
    return CODE_TO_NAME[code] || targetLang
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { text, targetLang } = body

        if (!text || !targetLang) {
            return new Response(
                JSON.stringify({ error: 'Missing text or targetLang' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const apiKey = (Deno.env.get('OPENAI_API_KEY') ?? '').trim()
        if (!apiKey) {
            console.warn('OPENAI_API_KEY not set')
            return new Response(
                JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const langName = languageForPrompt(targetLang)
        const prompt = `Translate the following English text to ${langName}. Return only the translation, no explanation or quotes.\n\n${text}`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.2,
            }),
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            const msg = result?.error?.message || JSON.stringify(result) || `HTTP ${response.status}`
            console.error('OpenAI translate error:', response.status, msg)
            return new Response(
                JSON.stringify({ error: msg }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const translatedText = result?.choices?.[0]?.message?.content?.trim()
        if (!translatedText) {
            console.error('OpenAI translate unexpected response:', JSON.stringify(result))
            return new Response(
                JSON.stringify({ error: 'OpenAI returned no translation' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ translatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Translation error:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
