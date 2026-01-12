import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Share2, Users, MessageCircle, Mic, Trophy, Target, TrendingUp } from 'lucide-react';

// Language flag mapping
const languageFlags = {
    'French (Français)': '🇫🇷',
    'French': '🇫🇷',
    'Spanish (Español)': '🇪🇸',
    'Spanish': '🇪🇸',
    'English': '🇬🇧',
    'German (Deutsch)': '🇩🇪',
    'German': '🇩🇪',
    'Italian (Italiano)': '🇮🇹',
    'Italian': '🇮🇹',
    'Portuguese (Português)': '🇵🇹',
    'Portuguese': '🇵🇹',
    'Dutch': '🇳🇱',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Chinese': '🇨🇳',
    'Russian': '🇷🇺',
};

export default function WeeklyUpdateTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWeeklyStats();
    }, []);

    const loadWeeklyStats = async () => {
        try {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            // Get all users (filter test accounts)
            const { data: allUsers } = await supabase
                .from('app_users')
                .select('display_name, avatar_url, learning_languages');

            // Filter matches GoalsTab.jsx logic exactly
            const realUsers = allUsers?.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
            }) || [];

            // Count avatar types
            const humanSoups = realUsers.filter(u =>
                u.avatar_url?.includes('.jpg') || u.avatar_url?.includes('googleusercontent')
            ).length;
            const soupAvatars = realUsers.filter(u =>
                u.avatar_url?.includes('.png')
            ).length;

            // Count languages
            const langCounts = {};
            realUsers.forEach(u => {
                (u.learning_languages || []).forEach(l => {
                    langCounts[l] = (langCounts[l] || 0) + 1;
                });
            });
            const topLanguages = Object.entries(langCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // Get messages this week
            const { data: weekMessages } = await supabase
                .from('app_messages')
                .select('id, message_type, created_at')
                .gte('created_at', weekAgo);

            const totalMessages = weekMessages?.length || 0;
            const voiceMessages = weekMessages?.filter(m => m.message_type === 'voice').length || 0;
            const textMessages = weekMessages?.filter(m => m.message_type === 'text').length || 0;

            // Most active day
            const dayCounts = {};
            weekMessages?.forEach(m => {
                const day = new Date(m.created_at).toLocaleDateString('en-US', { weekday: 'long' });
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            });
            const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

            // Top chatters (excluding bot)
            const { data: msgBySender } = await supabase
                .from('app_messages')
                .select('sender_id')
                .gte('created_at', weekAgo);

            const senderCounts = {};
            msgBySender?.forEach(m => {
                if (m.sender_id !== '00000000-0000-0000-0000-000000000000') {
                    senderCounts[m.sender_id] = (senderCounts[m.sender_id] || 0) + 1;
                }
            });
            const topSenderIds = Object.entries(senderCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id, count]) => ({ id, count }));

            const { data: topChatterUsers } = await supabase
                .from('app_users')
                .select('id, display_name')
                .in('id', topSenderIds.map(s => s.id));

            const topChatters = topSenderIds.map(s => ({
                ...s,
                name: topChatterUsers?.find(u => u.id === s.id)?.display_name || 'Unknown'
            })).filter(c => {
                const name = (c.name || '').toLowerCase();
                return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
            });

            // Get new groups this week
            const { data: newGroups } = await supabase
                .from('app_groups')
                .select('name, language')
                .gte('created_at', weekAgo);

            setStats({
                totalUsers: realUsers.length,
                humanSoups,
                soupAvatars,
                totalMessages,
                voiceMessages,
                textMessages,
                voicePercent: totalMessages > 0 ? Math.round((voiceMessages / totalMessages) * 100) : 0,
                topLanguages,
                topDay: topDay ? { day: topDay[0], count: topDay[1] } : null,
                topChatters,
                newGroups: newGroups || [],
                progressTo1000: Math.round((realUsers.length / 1000) * 100 * 10) / 10,
            });
        } catch (err) {
            console.error('Error loading weekly stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-lg text-gray-500 animate-pulse">Loading weekly stats... 🍜</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center p-10 text-gray-500">
                Failed to load stats. Try refreshing.
            </div>
        );
    }

    const generateMessage = () => {
        const weekNum = Math.ceil((new Date().getDate()) / 7);
        return `🍜 *Weekly Soup Update (Week ${weekNum})* 🍜\n\n` +
            `👋 *Community Size:* We are now ${stats.totalUsers} Soupers strong!\n` +
            `(${stats.humanSoups} Humans 🧑‍🍳 + ${stats.soupAvatars} Avatars 🍅)\n\n` +
            `💬 *Activity:* ${stats.totalMessages} messages sent this week.\n` +
            `${stats.voicePercent}% of them were Voice Notes! 🎤\n\n` +
            `🌍 *Top Languages:*\n` +
            stats.topLanguages.map(([l, c]) => `• ${languageFlags[l] || '🌐'} ${l.split(' ')[0]}: ${c}`).join('\n') +
            (stats.newGroups.length > 0 ? `\n\n✨ *New Groups:* ${stats.newGroups.map(g => `${g.name}`).join(', ')}` : '') +
            `\n\n🏆 *Top Chatters:*\n` +
            stats.topChatters.map((c, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${c.name}`).join('\n') +
            `\n\n🚀 Invite your friends! We are ${stats.progressTo1000}% of the way to 1,000 Soupers!`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateMessage());
        alert('✅ Message copied for your community!');
    };

    const handleBroadcast = async () => {
        if (!confirm('Are you sure you want to BLAST this update to the entire community? 📣')) return;

        try {
            setLoading(true);
            const msg = generateMessage();
            const { error } = await supabase.rpc('send_system_message', { message_text: msg });
            if (error) throw error;
            alert('✅ Update blasted to the app (Chat only, no notification)!');
        } catch (err) {
            console.error('Broadcast failed:', err);
            alert('❌ Failed to send update: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        🍜 Weekly Update
                        <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full text-center">
                            Week {Math.ceil((new Date().getDate()) / 7)}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1">Ready to update the community?</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleBroadcast}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--soup-turquoise)] text-white rounded-2xl font-black hover:scale-105 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20"
                    >
                        <Mic size={18} />
                        Blast to App 🚀
                    </button>
                </div>
            </div>

            {/* Formatted Text Box */}
            <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Share2 size={14} className="text-[var(--soup-turquoise)]" /> Community Message
                    </h2>
                    <button
                        onClick={copyToClipboard}
                        className="text-xs font-black text-[var(--soup-turquoise)] bg-[var(--soup-turquoise)]/10 px-4 py-2 rounded-xl border border-[var(--soup-turquoise)]/20 hover:bg-[var(--soup-turquoise)]/20 transition-all flex items-center gap-2"
                    >
                        <TrendingUp size={14} /> Copy for WhatsApp/Discord
                    </button>
                </div>

                <div className="bg-[var(--soup-beige)] rounded-2xl p-6 font-mono text-sm text-[var(--soup-dark)] whitespace-pre-wrap border border-black/5 select-all">
                    {generateMessage()}
                </div>

                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                    <div className="text-xl">💡</div>
                    <div className="text-xs text-orange-700 font-bold leading-relaxed">
                        This update includes your 1,000 Souper milestone progress, top languages, and community MVPs. Ready to copy and paste!
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-black/5 text-center">
                    <div className="text-2xl font-black text-[var(--soup-dark)] mb-1">{stats.totalUsers}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Soupers</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-black/5 text-center">
                    <div className="text-2xl font-black text-[var(--soup-turquoise)] mb-1">{stats.totalMessages}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Messages</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-black/5 text-center">
                    <div className="text-2xl font-black text-amber-500 mb-1">{stats.topChatters[0]?.name?.split(' ')[0] || '-'}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MVP</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-black/5 text-center">
                    <div className="text-2xl font-black text-[var(--soup-pink)] mb-1">{stats.progressTo1000}%</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Road to 1k</div>
                </div>
            </div>
        </div>
    );
}
