// Returns live count of app_users (soupers) for the website. Matches "the castle" in admin dashboard:
// excludes test users (display_name containing noah, bot, system). Uses service role. No auth required.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isRealUser(displayName: string | null): boolean {
    const name = (displayName ?? '').toLowerCase()
    return !name.includes('noah') && !name.includes('bot') && !name.includes('system')
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: users, error } = await supabase
            .from('app_users')
            .select('id, display_name')

        if (error) {
            console.error('count-soupers error:', error)
            return new Response(JSON.stringify({ count: 0 }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const count = (users ?? []).filter((u) => isRealUser(u.display_name)).length

        return new Response(JSON.stringify({ count }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        })
    } catch (e) {
        console.error('count-soupers:', e)
        return new Response(JSON.stringify({ count: 0 }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
