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
        const { text, targetLang } = await req.json()

        if (!text || !targetLang) {
            return new Response(
                JSON.stringify({ error: 'Missing text or targetLang' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Hugging Face translating to ${targetLang}: "${text}"`)

        // Hugging Face API - FREE tier (300 requests/hour)
        const hfToken = Deno.env.get('HUGGINGFACE_API_KEY')

        if (!hfToken) {
            return new Response(
                JSON.stringify({ error: 'HUGGINGFACE_API_KEY is missing in Secrets (Checked Deno.env.get)' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // PIVOT: Using Meta Llama 3 (Chat API) for translation
        // This is more reliable than the legacy Translation API for free tier
        const modelId = 'meta-llama/Meta-Llama-3-8B-Instruct'
        const apiUrl = 'https://router.huggingface.co/v1/chat/completions'

        // Construct a Chat Prompt
        const messages = [
            { role: "system", content: "You are a professional translator. Translate the following French text into Mooré (Mossi). Return ONLY the translated text, no explanation." },
            { role: "user", content: text }
        ]

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                max_tokens: 500,
                temperature: 0.3, // Increased from 0.1 to add variety
                frequency_penalty: 0.5 // Penalty to prevent word repetition
            })
        })

        const responseText = await response.text()
        let result
        try {
            result = JSON.parse(responseText)
        } catch (e) {
            console.error('Failed to parse HF response:', responseText)
            return new Response(
                JSON.stringify({ error: `Hugging Face (Llama) returned non-JSON: ${responseText.substring(0, 200)}` }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (result.error) {
            return new Response(
                JSON.stringify({ error: `Hugging Face API Error: ${JSON.stringify(result.error)}` }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse Chat Completion Response
        // Structure: choices[0].message.content
        const translatedText = result.choices?.[0]?.message?.content?.trim() || text

        console.log(`✅ Hugging Face translation successful: "${translatedText}"`)

        return new Response(
            JSON.stringify({ translatedText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Hugging Face translation error:', error)
        return new Response(
            JSON.stringify({ error: `Internal Function Error: ${error.message}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
