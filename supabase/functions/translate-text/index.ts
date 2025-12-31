
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// TODO: Move this to Supabase Secret (Deno.env.get('DEEPL_API_KEY')) for production security!
const DEEPL_API_KEY = '29649ac5-c890-4715-877c-3a1ac797cce6:fx'
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

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
        const { text, targetLang } = await req.json()

        if (!text || !targetLang) {
            return new Response(
                JSON.stringify({ error: 'Missing text or targetLang' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Translating to ${targetLang}: "${text}"`)

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
