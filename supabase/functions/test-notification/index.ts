import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This sends notifications directly to Firebase/APNs, bypassing Expo's push service
serve(async (req) => {
    try {
        const { userIds, title, body } = await req.json();

        // Get tokens from database
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        const tokensResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_push_tokens?user_id=in.(${userIds.join(',')})&select=expo_push_token,platform`, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
        });

        const tokens = await tokensResponse.json();

        // Send to Expo Push API (works for both iOS and Android if FCM is configured)
        const messages = tokens.map(t => ({
            to: t.expo_push_token,
            sound: 'default',
            title,
            body,
            channelId: 'default',
            priority: 'high',
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
