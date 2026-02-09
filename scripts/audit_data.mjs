
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uspegyneclgkscxwmomn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function performAudit() {
    console.log('🥣 Starting Soup Audit...');

    try {
        // 1. Fetch Users
        const { data: users, error: userError } = await supabase
            .from('app_users')
            .select('id, display_name, created_at, is_admin');

        if (userError) throw userError;

        // 2. Fetch Messages (with pagination)
        let messages = [];
        let from = 0;
        const limit = 1000;
        while (true) {
            const { data, error } = await supabase
                .from('app_messages')
                .select('id, sender_id, created_at, message_type')
                .range(from, from + limit - 1);

            if (error) throw error;
            if (data.length === 0) break;
            messages.push(...data);
            if (data.length < limit) break;
            from += limit;
        }

        // 2. Fetch Push Tokens
        const { data: pushTokens, error: tokenError } = await supabase
            .from('app_push_tokens')
            .select('user_id, platform, updated_at');

        if (tokenError) throw tokenError;

        console.log(`📊 Loaded ${users.length} users, ${messages.length} messages, and ${pushTokens.length} tokens.`);

        // Filter out Noah/Admins/Bots
        const realUsers = users.filter(u => {
            const name = (u.display_name || '').toLowerCase();
            return !name.includes('noah') && !name.includes('bot') && !name.includes('system') && !u.is_admin;
        });
        const realUserIds = new Set(realUsers.map(u => u.id));
        const realMessages = messages.filter(m => realUserIds.has(m.sender_id));

        console.log(`🧼 Cleaned data: ${realUsers.length} real users, ${realMessages.length} real messages.`);

        // --- DEEP ANALYSIS ---

        // 1. Message Type Breakdown for Real Users
        const msgTypeCounts = {};
        realMessages.forEach(m => {
            msgTypeCounts[m.message_type] = (msgTypeCounts[m.message_type] || 0) + 1;
        });

        // 2. Users with/without Push Tokens
        const usersWithTokens = realUsers.filter(u => pushTokens.some(t => t.user_id === u.id));
        const usersWithoutTokens = realUsers.filter(u => !pushTokens.some(t => t.user_id === u.id));

        // 3. Activity Funnel
        const sentOneMessage = realUsers.filter(u => realMessages.some(m => m.sender_id === u.id));
        const sentVoiceMemo = realUsers.filter(u => realMessages.some(m => m.sender_id === u.id && m.message_type === 'voice'));

        // 4. Retention Curve (Day 0 to Day 30)
        const retentionData = {};
        realUsers.forEach(u => {
            const signupDate = new Date(u.created_at);
            const userMsgs = realMessages.filter(m => m.sender_id === u.id);
            const activeDays = new Set(userMsgs.map(m => {
                const msgDate = new Date(m.created_at);
                const diffTime = (msgDate - signupDate);
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }));

            // Only count if they signed up at least X days ago
            activeDays.forEach(day => {
                if (day >= 0 && day <= 30) {
                    retentionData[day] = (retentionData[day] || 0) + 1;
                }
            });
        });

        // 5. The Churn "Cliff"
        const now = new Date();
        const silentUsers = realUsers.filter(u => !realMessages.some(m => m.sender_id === u.id));

        const churnAnalysis = {
            totalReal: realUsers.length,
            neverMessaged: silentUsers.length,
            messagedOnce: sentOneMessage.length,
            messagedVoice: sentVoiceMemo.length,
            hasPushToken: usersWithTokens.length,
            notifClickTracking: pushTokens.length > 0 ? 'Disabled (0% Read)' : 'No Data',
            aha_4day: 0,
            aha_3day: 0,
            aha_2day: 0
        };

        // Calculate Aha! for different thresholds
        realUsers.forEach(u => {
            const signupDate = new Date(u.created_at);
            const oneWeekLater = new Date(signupDate);
            oneWeekLater.setDate(oneWeekLater.getDate() + 7);

            const firstWeekMsgs = realMessages.filter(m =>
                m.sender_id === u.id &&
                new Date(m.created_at) >= signupDate &&
                new Date(m.created_at) <= oneWeekLater
            );

            const uniqueDays = new Set(firstWeekMsgs.map(m => new Date(m.created_at).toDateString())).size;
            if (uniqueDays >= 4) churnAnalysis.aha_4day++;
            if (uniqueDays >= 3) churnAnalysis.aha_3day++;
            if (uniqueDays >= 2) churnAnalysis.aha_2day++;
        });

        // 6. Silent Users Sample
        const silentSample = silentUsers.slice(0, 10).map(u => ({
            name: u.display_name,
            joined: u.created_at,
            hasToken: pushTokens.some(t => t.user_id === u.id)
        }));

        // --- OUTPUT ---
        const report = {
            summary: churnAnalysis,
            silentUsersSample: silentSample,
            msgTypes: msgTypeCounts,
            retentionCurve: retentionData,
            rawStats: {
                realUsers: realUsers.length,
                realMessages: realMessages.length
            }
        };

        fs.writeFileSync('audit_report.json', JSON.stringify(report, null, 2));
        console.log('✅ Deep Audit report saved to audit_report.json');

    } catch (err) {
        console.error('❌ Audit Failed:', err.message);
    }
}

performAudit();
