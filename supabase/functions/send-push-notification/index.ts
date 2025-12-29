import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
    try {
        const { record } = await req.json()

        console.log('🔔 Push notification triggered for challenge:', record.id)

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get group details to fetch language
        const { data: group, error: groupError } = await supabase
            .from('app_groups')
            .select('language, name')
            .eq('id', record.group_id)
            .single()

        if (groupError) {
            console.error('Error fetching group:', groupError)
            return new Response(JSON.stringify({ error: 'Group not found' }), { status: 404 })
        }

        // Simple notification message for all languages
        const notificationTitle = '🥳 new challenge just dropped!'

        // Get all group members
        const { data: members, error: membersError } = await supabase
            .from('app_group_members')
            .select('user_id')
            .eq('group_id', record.group_id)

        if (membersError || !members || members.length === 0) {
            console.log('No members found for group:', record.group_id)
            return new Response(JSON.stringify({ message: 'No members to notify' }), { status: 200 })
        }

        const userIds = members.map(m => m.user_id)

        // Get push tokens for all members
        const { data: tokens, error: tokensError } = await supabase
            .from('app_push_tokens')
            .select('user_id, expo_push_token, platform')
            .in('user_id', userIds)

        if (tokensError || !tokens || tokens.length === 0) {
            console.log('No push tokens found for group members')
            return new Response(JSON.stringify({ message: 'No push tokens found' }), { status: 200 })
        }

        console.log(`📱 Sending notifications to ${tokens.length} devices`)

        // Prepare notification messages
        const messages = tokens.map(token => ({
            to: token.expo_push_token,
            sound: 'default',
            title: notificationTitle,
            body: record.prompt_text.substring(0, 100) + (record.prompt_text.length > 100 ? '...' : ''),
            data: {
                type: 'challenge',
                groupId: record.group_id,
                challengeId: record.id,
                groupName: group.name,
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
        const notificationRecords = tokens.map(token => ({
            user_id: token.user_id,
            type: 'challenge',
            title: notificationTitle,
            body: record.prompt_text.substring(0, 100),
            data: {
                groupId: record.group_id,
                challengeId: record.id,
            },
        }))

        await supabase
            .from('app_notifications')
            .insert(notificationRecords)

        console.log('✅ Notifications logged to database')

        return new Response(
            JSON.stringify({
                success: true,
                sent: tokens.length,
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
