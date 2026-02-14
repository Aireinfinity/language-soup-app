#!/usr/bin/env node
/**
 * Home screen stats — read-only counts to inform design (groups, voice, community).
 * Uses same env as app: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY.
 * Run: cd code/dashboard && node scripts/home_stats.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log('\nHome screen stats (read-only)\n');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const [
        { count: totalGroups },
        { count: totalMemberships },
        { data: voiceRecent },
        { count: usersWithStatus },
        { count: totalUsers }
    ] = await Promise.all([
        supabase.from('app_groups').select('*', { count: 'exact', head: true }),
        supabase.from('app_group_members').select('*', { count: 'exact', head: true }),
        supabase.from('app_messages').select('id, sender_id, group_id', { count: 'exact' }).eq('message_type', 'voice').gte('created_at', threeDaysAgo),
        supabase.from('app_users').select('*', { count: 'exact', head: true }).not('status_text', 'is', null).neq('status_text', ''),
        supabase.from('app_users').select('*', { count: 'exact', head: true })
    ]);

    const uniqueVoiceSenders = voiceRecent ? new Set(voiceRecent.map(m => m.sender_id)).size : 0;
    const voiceCount = voiceRecent?.length ?? 0;

    console.log('Groups:', totalGroups ?? 0);
    console.log('Group memberships (total):', totalMemberships ?? 0);
    console.log('Voice messages (last 3 days):', voiceCount);
    console.log('Unique senders (voice, last 3 days):', uniqueVoiceSenders);
    console.log('Users with status_text set:', usersWithStatus ?? 0);
    console.log('Total users:', totalUsers ?? 0);
    if (totalMemberships && totalMemberships > 0) {
        const avgGroupsPerUser = (totalMemberships / (totalUsers || 1)).toFixed(1);
        console.log('Avg memberships per user (approx):', avgGroupsPerUser);
    }
    console.log('');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
