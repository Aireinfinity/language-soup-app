import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get all pending challenges that are due
        const { data: dueChallenges, error: fetchError } = await supabase
            .from('app_scheduled_challenges')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_time', new Date().toISOString());

        if (fetchError) throw fetchError;

        if (!dueChallenges || dueChallenges.length === 0) {
            return new Response(JSON.stringify({ message: 'No challenges due', count: 0 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`📅 Found ${dueChallenges.length} challenges to send`);

        // Get all groups
        const { data: groups } = await supabase
            .from('app_groups')
            .select('id, name, language');

        if (!groups) throw new Error('Failed to fetch groups');

        // Process each challenge
        for (const challenge of dueChallenges) {
            console.log(`📤 Processing challenge: ${challenge.id}`);

            // Send to all groups
            for (const group of groups) {
                // Insert challenge
                const { error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        group_id: group.id,
                        prompt_text: challenge.challenge_text,
                        created_by: SYSTEM_BOT_ID,
                    });

                if (challengeError) {
                    console.error(`Failed to insert challenge for group ${group.id}:`, challengeError);
                    continue;
                }
            }

            // Collect all unique users across all groups for deduplication
            const allUserIds = new Set();

            for (const group of groups) {
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('user_id')
                    .eq('group_id', group.id);

                if (members && members.length > 0) {
                    members.forEach(m => {
                        if (m.user_id !== SYSTEM_BOT_ID) {
                            allUserIds.add(m.user_id);
                        }
                    });
                }
            }

            // Get push tokens for all unique users (deduplicated)
            if (allUserIds.size > 0) {
                const { data: tokens } = await supabase
                    .from('app_push_tokens')
                    .select('user_id, expo_push_token')
                    .in('user_id', Array.from(allUserIds));

                if (tokens && tokens.length > 0) {
                    // Deduplicate: one notification per user
                    const seenUsers = new Set();
                    const uniqueTokens = tokens.filter(token => {
                        if (seenUsers.has(token.user_id)) return false;
                        seenUsers.add(token.user_id);
                        return true;
                    });

                    const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
                    const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                    const pushMessages = uniqueTokens.map(t => ({
                        to: t.expo_push_token,
                        sound: 'default',
                        title: 'mmm goood soup!',
                        body: `${randomEmoji} new challenges just dropped!`,
                        data: { type: 'challenge' }
                    }));

                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(pushMessages),
                    });

                    console.log(`✅ Sent ${pushMessages.length} deduplicated notifications (${tokens.length} total tokens)`);
                }
            }

            // Mark as sent
            await supabase
                .from('app_scheduled_challenges')
                .update({ status: 'sent' })
                .eq('id', challenge.id);

            console.log(`✅ Challenge ${challenge.id} marked as sent`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Sent ${dueChallenges.length} scheduled challenges`,
                count: dueChallenges.length
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
