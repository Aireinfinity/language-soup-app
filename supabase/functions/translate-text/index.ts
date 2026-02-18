
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// DeepL API - 500k characters/month FREE. Trim so pasted keys with newlines work.
const DEEPL_API_KEY = (Deno.env.get('DEEPL_API_KEY') ?? '').trim()
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

if (!DEEPL_API_KEY) {
    console.error('⚠️ DEEPL_API_KEY not configured in Supabase secrets')
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const bodyText = await req.text(); // Read text once
        console.log('Received raw body:', bodyText);

        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            console.error('Failed to parse JSON body:', e);
            throw new Error('Invalid JSON body');
        }

        const { text, targetLang } = body;
        console.log(`Parsed request - Text: "${text}", Target: "${targetLang}"`);

        if (!text || !targetLang) {
            console.error('Missing required fields');
            return new Response(
                JSON.stringify({ error: 'Missing text or targetLang', received: body }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!DEEPL_API_KEY) {
            console.error('DEEPL_API_KEY not set. Add it in Supabase → Project Settings → Edge Functions → Secrets')
            throw new Error('DEEPL_API_KEY not configured in Supabase secrets')
        }
        console.log('DeepL request:', targetLang, '| key present:', !!DEEPL_API_KEY)

        // DeepL now requires header-based auth (Nov 2025+); form-body auth is deprecated
        const response = await fetch(DEEPL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: targetLang.toUpperCase(),
            }),
        })

        const result = await response.json().catch(() => ({}))
        const status = response.status

        if (!response.ok) {
            const msg = result?.message || result?.error?.message || (typeof result?.error === 'string' ? result.error : null) || JSON.stringify(result) || `HTTP ${status}`
            console.error('DeepL API error:', status, msg, '| body:', JSON.stringify(result))
            throw new Error(`DeepL ${status}: ${msg}`)
        }

        if (result.message) {
            console.error('DeepL result.message:', result.message)
            throw new Error(result.message)
        }

        if (!result?.translations?.[0]?.text) {
            console.error('DeepL unexpected response shape:', JSON.stringify(result))
            throw new Error('DeepL returned no translation')
        }

        const translatedText = result.translations[0].text

        return new Response(
            JSON.stringify({ translatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Translation error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
