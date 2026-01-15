import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

        console.log(`ModernMT Translating to ${targetLang}: "${text}"`)

        // ModernMT API - 150k words/month FREE
        const apiKey = Deno.env.get('MODERNMT_API_KEY')

        if (!apiKey) {
            throw new Error('MODERNMT_API_KEY not configured')
        }

        const url = 'https://api.modernmt.com/translate'

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'MMT-ApiKey': apiKey,
                'MMT-Platform': 'language-soup',
                'MMT-PlatformVersion': '1.0'
            },
            // ModernMT uses query params
            // Format: ?q=text&source=en&target=mos
        })

        // Construct URL with query params
        const params = new URLSearchParams({
            q: text,
            source: 'en',
            target: targetLang.toLowerCase()
        })

        const fullUrl = `${url}?${params}`

        const translationResponse = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'MMT-ApiKey': apiKey,
                'MMT-Platform': 'language-soup',
                'MMT-PlatformVersion': '1.0'
            }
        })

        const result = await translationResponse.json()

        if (result.error) {
            throw new Error(result.error.message || 'Translation failed')
        }

        const translatedText = result.data.translation

        return new Response(
            JSON.stringify({ translatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('ModernMT translation error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
