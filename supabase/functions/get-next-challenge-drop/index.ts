// Returns the next challenge drop time for the app countdown. Uses service role so it works regardless of RLS.
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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase
            .from('app_scheduled_challenges')
            .select('scheduled_time')
            .in('status', ['pending', 'approved'])
            .gt('scheduled_time', new Date().toISOString())
            .order('scheduled_time', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('get-next-challenge-drop error:', error)
            return new Response(JSON.stringify({ nextDropAt: null }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const nextDropAt = data?.scheduled_time ?? null
        return new Response(JSON.stringify({ nextDropAt }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (e) {
        console.error('get-next-challenge-drop:', e)
        return new Response(JSON.stringify({ nextDropAt: null }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
