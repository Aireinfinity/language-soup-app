import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPL_API_KEY = Deno.env.get('DEEPL_API_KEY')!
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_TRANSLATE_API_KEY')!

serve(async (req) => {
    try {
        console.log('🤖 Auto-send triggered')

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get approved challenges that are due
        const { data: challenges, error: challengesError } = await supabase
            .from('app_scheduled_challenges')
            .select('*')
            .eq('status', 'approved')
            .lte('scheduled_time', new Date().toISOString())

        if (challengesError) throw challengesError
        if (!challenges || challenges.length === 0) {
            console.log('No challenges due')
            return new Response(JSON.stringify({ message: 'No challenges due' }), { status: 200 })
        }

        console.log(`Found ${challenges.length} challenges to send`)

        // Get all groups
        const { data: groups, error: groupsError } = await supabase
            .from('app_groups')
            .select('id, name, language')

        if (groupsError) throw groupsError

        // Process each challenge
        for (const challenge of challenges) {
            console.log(`Processing challenge: ${challenge.id}`)

            // 🛡️ TRUST THE DASHBOARD (The "Big Brain" fix)
            // Use the pre-calculated translations saved in the database
            const translations = challenge.translations || {}

            // Send to all groups with proper format (already calculated by dashboard). Never send to DMs.
            for (const group of groups) {
                if (group.name === 'DM') continue;
                const finalText = translations[group.language] || challenge.challenge_text

                await supabase.from('app_challenges').insert({
                    group_id: group.id,
                    prompt_text: finalText,
                    created_by: '00000000-0000-0000-0000-000000000000'
                })
            }

            // Get unique users for deduplicated notifications
            const { data: allMembers } = await supabase
                .from('app_group_members')
                .select('user_id')
                .neq('user_id', '00000000-0000-0000-0000-000000000000')

            const uniqueUserIds = [...new Set(allMembers?.map(m => m.user_id) || [])]

            if (uniqueUserIds.length > 0) {
                const { data: tokens } = await supabase
                    .from('app_push_tokens')
                    .select('expo_push_token, user_id')
                    .in('user_id', uniqueUserIds)

                // Deduplicate tokens (one per user)
                const seenUsers = new Set()
                const uniqueTokens = tokens?.filter(token => {
                    if (seenUsers.has(token.user_id)) return false
                    seenUsers.add(token.user_id)
                    return true
                }) || []

                if (uniqueTokens.length > 0) {
                    const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯']
                    const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)]

                    const pushMessages = uniqueTokens.map(t => ({
                        to: t.expo_push_token,
                        sound: 'default',
                        title: 'mmm goood soup!',
                        body: `${randomEmoji} new challenges just dropped!`,
                        data: { type: 'challenge' }
                    }))

                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(pushMessages),
                    })

                    console.log(`✅ Sent ${uniqueTokens.length} deduplicated notifications`)
                }
            }

            // Mark as sent
            await supabase
                .from('app_scheduled_challenges')
                .update({ status: 'sent' })
                .eq('id', challenge.id)

            console.log(`✅ Challenge ${challenge.id} sent to ${groups.length} groups`)
        }

        return new Response(
            JSON.stringify({ success: true, sent: challenges.length }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})

// Language code mappings (from dashboard)
function getDeepLLangCode(language: string): string | null {
    const map: Record<string, string> = {
        'French': 'FR', 'Spanish': 'ES', 'German': 'DE', 'Italian': 'IT',
        'Dutch': 'NL', 'Polish': 'PL', 'Portuguese': 'PT-PT', 'Russian': 'RU',
        'Japanese': 'JA', 'Chinese': 'ZH', 'Korean': 'KO', 'Swedish': 'SV',
        'Danish': 'DA', 'Finnish': 'FI', 'Greek': 'EL', 'Hungarian': 'HU',
        'Czech': 'CS', 'Romanian': 'RO', 'Slovak': 'SK', 'Bulgarian': 'BG',
        'Lithuanian': 'LT', 'Latvian': 'LV', 'Estonian': 'ET', 'Slovenian': 'SL'
    }
    return map[language] || null
}

function getGoogleLangCode(language: string): string | null {
    const map: Record<string, string> = {
        'French': 'fr', 'Spanish': 'es', 'German': 'de', 'Italian': 'it',
        'Dutch': 'nl', 'Polish': 'pl', 'Portuguese': 'pt', 'Russian': 'ru',
        'Japanese': 'ja', 'Chinese': 'zh-CN', 'Korean': 'ko', 'Swedish': 'sv',
        'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hungarian': 'hu',
        'Czech': 'cs', 'Romanian': 'ro', 'Slovak': 'sk', 'Bulgarian': 'bg',
        'Lithuanian': 'lt', 'Latvian': 'lv', 'Estonian': 'et', 'Slovenian': 'sl',
        'Arabic': 'ar', 'Hindi': 'hi', 'Turkish': 'tr', 'Vietnamese': 'vi',
        'Thai': 'th', 'Indonesian': 'id', 'Malay': 'ms', 'Filipino': 'fil',
        'Hebrew': 'he', 'Persian': 'fa', 'Ukrainian': 'uk', 'Croatian': 'hr',
        'Serbian': 'sr', 'Catalan': 'ca', 'Norwegian': 'no', 'Icelandic': 'is'
    }
    return map[language] || null
}
