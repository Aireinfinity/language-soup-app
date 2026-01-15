
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// DeepL API - 500k characters/month FREE
const DEEPL_API_KEY = Deno.env.get('DEEPL_API_KEY')
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

        const params = new URLSearchParams()
        params.append('auth_key', DEEPL_API_KEY)
        params.append('text', text)
        params.append('target_lang', targetLang.toUpperCase())

        const response = await fetch(DEEPL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        })

        const result = await response.json()

        if (result.message) {
            // DeepL error format
            throw new Error(result.message)
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
