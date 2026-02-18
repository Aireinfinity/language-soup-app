// When someone sends a voice reply: notify other group members (not the sender), max 1 per user per 2 min.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const groupId = body?.group_id ?? null;
        const senderId = body?.sender_id ?? null;
        if (!groupId || !senderId) {
            return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'missing group_id or sender_id' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Group members except the sender (sender never gets a notification for their own voice)
        const { data: members, error: membersError } = await supabase
            .from('app_group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .neq('user_id', senderId);

        if (membersError || !members?.length) {
            return new Response(JSON.stringify({ ok: true, sent: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const recipientIds = members.map((m: { user_id: string }) => m.user_id);

        // Claim slots: max 1 notification per user per 2 min (handles duplicate invocations)
        const { data: claimedIds, error: claimError } = await supabase
            .rpc('claim_challenge_reply_notification_slots', { user_ids: recipientIds });

        if (claimError || !claimedIds?.length) {
            return new Response(JSON.stringify({ ok: true, sent: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // Send one push per claimed user via existing send-push-notification
        const fnUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
        const res = await fetch(fnUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
                userIds: claimedIds,
                title: 'Language Soup',
                body: 'someone replied to the challenge',
            }),
        });
        const result = await res.json().catch(() => ({}));
        const sent = result?.sent ?? 0;

        return new Response(JSON.stringify({ ok: true, sent }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (e) {
        console.error('notify-challenge-reply error:', e);
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
