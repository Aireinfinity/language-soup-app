import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
    try {
        const body = await req.json()

        // Support both old format (record) and new format (userIds, title, body)
        const userIds = body.userIds || null
        const notificationTitle = body.title || '🥳 new challenges just dropped!'
        const notificationBody = body.body || 'tap to see what it is!'
        const challengeId = body.record?.id || body.data?.challengeId || null

        console.log('🔔 Push notification triggered', { userIds: userIds?.length, challengeId })

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get push tokens - either for specific users or all users
        let query = supabase
            .from('app_push_tokens')
            .select('user_id, expo_push_token, platform')

        if (userIds && userIds.length > 0) {
            query = query.in('user_id', userIds)
        }

        const { data: tokens, error: tokensError } = await query

        if (tokensError || !tokens || tokens.length === 0) {
            console.log('No push tokens found for group members')
            return new Response(JSON.stringify({ message: 'No push tokens found' }), { status: 200 })
        }

        // Deduplicate: send only one notification per user (not per group membership)
        const seenUsers = new Set()
        const uniqueTokens = tokens.filter(token => {
            if (seenUsers.has(token.user_id)) return false
            seenUsers.add(token.user_id)
            return true
        })

        console.log(`📱 Sending notifications to ${uniqueTokens.length} unique users (${tokens.length} total tokens)`)

        // Prepare notification messages
        const messages = uniqueTokens.map(token => ({
            to: token.expo_push_token,
            sound: 'default',
            title: notificationTitle,
            body: notificationBody,
            data: {
                type: 'challenge',
                challengeId: challengeId,
            },
            priority: 'high',
            channelId: 'default',
        }))

        // Send notifications to Expo Push API (batch up to 100 at a time)
        const batchSize = 100
        const results = []

        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize)

            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(batch),
            })

            const result = await response.json()
            results.push(result)

            console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sent:`, result)
        }

        // Log notifications to database
        const notificationRecords = uniqueTokens.map(token => ({
            user_id: token.user_id,
            type: 'challenge',
            title: notificationTitle,
            body: notificationBody,
            data: {
                challengeId: challengeId,
            },
        }))

        await supabase
            .from('app_notifications')
            .insert(notificationRecords)

        console.log('✅ Notifications logged to database')

        return new Response(
            JSON.stringify({
                success: true,
                sent: uniqueTokens.length,
                results
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('❌ Error sending push notifications:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
