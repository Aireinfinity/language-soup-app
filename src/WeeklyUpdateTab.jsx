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

            // Get names for top chatters
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

    const handleBroadcast = async () => {
        if (!confirm('Are you sure you want to BLAST this update to the entire community? 📣')) return;

        try {
            setLoading(true);

            // Format the message
            const weekNum = Math.ceil((new Date().getDate()) / 7);
            const msg = `🍜 *Weekly Soup Update (Week ${weekNum})* 🍜\n\n` +
                `👋 *Community Size:* We are now ${stats.totalUsers} Soupers strong!\n` +
                `(${stats.humanSoups} Humans 🧑‍🍳 + ${stats.soupAvatars} Avatars 🍅)\n\n` +
                `💬 *Activity:* ${stats.totalMessages} messages sent this week.\n` +
                `${stats.voicePercent}% of them were Voice Notes! 🎤\n\n` +
                `🌍 *Top Languages:*\n` +
                stats.topLanguages.map(([l, c]) => `• ${languageFlags[l] || '🌐'} ${l.split(' ')[0]}: ${c}`).join('\n') +
                `\n\n🏆 *Top Chatters:*\n` +
                stats.topChatters.map((c, i) => `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${c.name}`).join('\n') +
                `\n\n🚀 Invite your friends! We are ${stats.progressTo1000}% of the way to 1,000 Soupers!`;

            // Send via Secure RPC
            const { data: rpcData, error } = await supabase.rpc('send_system_message', { message_text: msg });

            if (error) throw error;

            // Trigger Push Notification (so people actually check it!)
            // Using the group_id returned from the RPC
            if (rpcData?.group_id) {
                supabase.functions.invoke('send-push-notification', {
                    body: {
                        record: {
                            id: rpcData.message_id,
                            group_id: rpcData.group_id,
                            prompt_text: `📢 Weekly Soup Update is live! Check the stats! 🍜`
                        },
                        isAnnouncement: true
                    }
                }).catch(err => console.error('Notification error (ignoring):', err));
            }

            alert('✅ Update blasted to the app (+ Notification sent)!');
        } catch (err) {
            console.error('Broadcast failed:', err);
            alert('❌ Failed to send update: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        🍜 Weekly Update
                        <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            Week {Math.ceil((new Date().getDate()) / 7)}
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1">Ready to update the community?</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                        <Share2 size={18} />
                        Save PDF
                    </button>
                    <button
                        onClick={handleBroadcast}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--soup-turquoise)] text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg hover:shadow-cyan-200"
                    >
                        <Mic size={18} />
                        Blast to App 🚀
                    </button>
                </div>
            </div>

            {/* Main Shareable Card */}
            <div
                id="weekly-card"
                className="bg-gradient-to-br from-[#FDF5E6] to-[#fff5eb] rounded-3xl p-8 border-2 border-[#ec008b]/20 shadow-xl max-w-lg mx-auto"
                style={{ aspectRatio: '9/16', maxHeight: '800px' }}
            >
                {/* Card Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🍜</div>
                    <h2 className="text-2xl font-black text-gray-900">Language Soup</h2>
                    <p className="text-sm font-bold text-[#ec008b]">Weekly Wrap-Up</p>
                </div>

                {/* Community Size */}
                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-black/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-500 font-bold text-sm flex items-center gap-2">
                            <Users size={16} className="text-[#00adef]" />
                            Community Size
                        </span>
                        <span className="text-2xl font-black text-gray-900">{stats.totalUsers}</span>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                            <div className="text-lg font-black text-orange-600">{stats.humanSoups}</div>
                            <div className="text-xs text-orange-500 font-bold">🧑‍🍳 Human Soups</div>
                        </div>
                        <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                            <div className="text-lg font-black text-red-600">{stats.soupAvatars}</div>
                            <div className="text-xs text-red-500 font-bold">🍅 Soup Avatars</div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-black/5">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle size={16} className="text-[#ec008b]" />
                        <span className="text-gray-500 font-bold text-sm">This Week's Activity</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-pink-50 rounded-xl p-3">
                            <div className="text-xl font-black text-pink-600">{stats.totalMessages}</div>
                            <div className="text-[10px] text-pink-500 font-bold">Messages</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                            <div className="text-xl font-black text-purple-600">{stats.voiceMessages}</div>
                            <div className="text-[10px] text-purple-500 font-bold flex items-center justify-center gap-1">
                                <Mic size={10} /> Voice
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                            <div className="text-xl font-black text-blue-600">{stats.voicePercent}%</div>
                            <div className="text-[10px] text-blue-500 font-bold">Talking!</div>
                        </div>
                    </div>
                </div>

                {/* Languages */}
                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-black/5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🌍</span>
                        <span className="text-gray-500 font-bold text-sm">What We're Learning</span>
                    </div>
                    <div className="space-y-2">
                        {stats.topLanguages.map(([lang, count], i) => (
                            <div key={lang} className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-700">
                                    {languageFlags[lang] || '🌐'} {lang.split(' ')[0]}
                                </span>
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                    {count} learners
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Chatters */}
                {stats.topChatters.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-black/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy size={16} className="text-amber-500" />
                            <span className="text-gray-500 font-bold text-sm">Top Chatters</span>
                        </div>
                        <div className="flex justify-center gap-4">
                            {stats.topChatters.map((chatter, i) => (
                                <div key={chatter.id} className="text-center">
                                    <div className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                                    <div className="text-xs font-bold text-gray-700 truncate max-w-[60px]">
                                        {chatter.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Road to 1000 */}
                <div className="bg-gradient-to-r from-[#00adef] to-[#ec008b] rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm flex items-center gap-2">
                            <Target size={16} />
                            Road to 1,000 Soupers!
                        </span>
                        <span className="font-black">{stats.progressTo1000}%</span>
                    </div>
                    <div className="bg-white/30 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-white h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(stats.progressTo1000, 100)}%` }}
                        />
                    </div>
                    <div className="text-center mt-3 text-sm font-bold opacity-90">
                        {stats.totalUsers}/1,000 — Invite friends! 🚀
                    </div>
                </div>

                {/* Most Active Day */}
                {stats.topDay && (
                    <div className="text-center mt-4 text-sm text-gray-500 font-bold">
                        📅 Most Active: {stats.topDay.day} ({stats.topDay.count} msgs)
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="text-center text-gray-400 text-sm">
                <p>💡 Tip: Right-click the card above → "Take Screenshot" or use your system screenshot tool!</p>
            </div>
        </div>
    );
}
