import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface PushNotification {
    to: string;
    title: string;
    body: string;
    data?: any;
    sound?: string;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
}

serve(async (req) => {
    try {
        const { userId, type, title, body, data } = await req.json();

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get user's push tokens
        const { data: tokens, error: tokenError } = await supabaseClient
            .from('app_push_tokens')
            .select('expo_push_token, platform')
            .eq('user_id', userId);

        if (tokenError || !tokens || tokens.length === 0) {
            console.log('No push tokens found for user:', userId);
            return new Response(
                JSON.stringify({ success: false, error: 'No push tokens found' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check user's notification preferences
        const { data: prefs } = await supabaseClient
            .from('app_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Check if user has notifications enabled for this type
        if (prefs && !prefs.push_enabled) {
            console.log('Push notifications disabled for user:', userId);
            return new Response(
                JSON.stringify({ success: false, error: 'Push notifications disabled' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check specific notification type preferences
        if (type === 'message' && prefs && !prefs.new_messages) {
            return new Response(
                JSON.stringify({ success: false, error: 'Message notifications disabled' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Prepare push notifications
        const messages: PushNotification[] = tokens.map(({ expo_push_token }) => ({
            to: expo_push_token,
            title,
            body,
            data: data || {},
            sound: 'default',
            priority: 'high',
        }));

        // Send push notifications via Expo
        const response = await fetch(EXPO_PUSH_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();

        // Save notification to history
        await supabaseClient
            .from('app_notifications')
            .insert({
                user_id: userId,
                type,
                title,
                body,
                data: data || {},
            });

        return new Response(
            JSON.stringify({ success: true, result }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error sending push notification:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
});
