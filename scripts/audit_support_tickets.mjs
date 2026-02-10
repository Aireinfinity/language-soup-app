#!/usr/bin/env node
/**
 * SUPPORT TICKET AUDIT
 * Fetches all open support tickets so we can triage and close the loop.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function auditSupportTickets() {
    console.log('\n🎫 SUPPORT TICKET AUDIT\n');
    console.log('='.repeat(60));

    // Fetch all open tickets (status = 'new' or 'fixing')
    const { data: openTickets, error: openError } = await supabase
        .from('app_support_messages')
        .select(`
            id,
            title,
            message,
            priority,
            status,
            category,
            created_at,
            user_id,
            profiles:user_id (display_name)
        `)
        .in('status', ['new', 'fixing', 'investigating'])
        .order('priority', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

    if (openError) {
        console.error('❌ Error fetching tickets:', openError.message);
        return;
    }

    if (!openTickets || openTickets.length === 0) {
        console.log('\n✅ NO OPEN TICKETS! Your inbox is clean. 🍲\n');
        return;
    }

    console.log(`\n📬 OPEN TICKETS: ${openTickets.length}\n`);

    // Group by priority
    const p0 = openTickets.filter(t => t.priority === 'P0');
    const p1 = openTickets.filter(t => t.priority === 'P1');
    const p2 = openTickets.filter(t => t.priority === 'P2');
    const noPriority = openTickets.filter(t => !t.priority);

    const printTicket = (t, emoji) => {
        const userName = t.profiles?.display_name || 'Unknown User';
        const date = new Date(t.created_at).toLocaleDateString();
        const category = t.category ? `[${t.category.toUpperCase()}]` : '';
        const title = t.title || t.message?.substring(0, 50) || 'No title';
        console.log(`  ${emoji} ${category} "${title}" - ${userName} (${date})`);
        if (t.message && t.message.length > 50) {
            console.log(`      └─ ${t.message.substring(0, 100)}...`);
        }
    };

    if (p0.length > 0) {
        console.log(`🔴 P0 - URGENT (${p0.length}):`);
        p0.forEach(t => printTicket(t, '🚨'));
        console.log('');
    }

    if (p1.length > 0) {
        console.log(`🟡 P1 - BUGS (${p1.length}):`);
        p1.forEach(t => printTicket(t, '🐛'));
        console.log('');
    }

    if (p2.length > 0) {
        console.log(`🟢 P2 - FEATURE REQUESTS (${p2.length}):`);
        p2.forEach(t => printTicket(t, '💡'));
        console.log('');
    }

    if (noPriority.length > 0) {
        console.log(`⚪ NO PRIORITY (${noPriority.length}):`);
        noPriority.forEach(t => printTicket(t, '📩'));
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('💡 TIP: Fix these, DM the users "Hey, I fixed [X]!", and watch retention climb.');
    console.log('');
}

auditSupportTickets();
