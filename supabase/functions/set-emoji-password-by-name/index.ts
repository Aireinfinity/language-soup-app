// Set emoji password by display name (for "Forgot?" flow). Finds single app_users row by name and sets Auth + emoji_password.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
        const emojiPassword = typeof body?.emoji_password === 'string' ? body.emoji_password : '';

        if (!displayName || !emojiPassword) {
            return new Response(JSON.stringify({ error: 'display_name and emoji_password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: rows, error: selectError } = await supabase
            .from('app_users')
            .select('id')
            .ilike('display_name', displayName);

        if (selectError) {
            return new Response(JSON.stringify({ error: selectError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
        if (!rows?.length || rows.length !== 1) {
            return new Response(JSON.stringify({ error: rows?.length === 0 ? 'no account with that name' : 'multiple accounts with that name' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const userId = rows[0].id;
        const internalPassword = `soup_${emojiPassword}_${displayName.length}`;

        const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password: internalPassword });
        if (authError) {
            return new Response(JSON.stringify({ error: authError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const { error: updateError } = await supabase
            .from('app_users')
            .update({ emoji_password: emojiPassword })
            .eq('id', userId);
        if (updateError) {
            return new Response(JSON.stringify({ error: updateError.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (e) {
        console.error('set-emoji-password-by-name error:', e);
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
