import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { TrendingUp, Globe, Wrench, BarChart3, Rocket, Target } from 'lucide-react';

export default function MarketingTab() {
    const [stats, setStats] = useState({
        totalSignups: 0,
        sources: [],
        languages: [],
        tools: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSignupData();
    }, []);

    const loadSignupData = async () => {
        try {
            const { data: signups } = await supabase
                .from('signups')
                .select('*')
                .order('created_at', { ascending: false });

            if (signups && signups.length > 0) {
                // Process sources
                const sourceCounts = {};
                signups.forEach(signup => {
                    const source = signup.source || 'Unknown';
                    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
                });
                const sources = Object.entries(sourceCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                // Process languages
                const languageCounts = {};
                signups.forEach(signup => {
                    if (signup.languages) {
                        const langs = signup.languages.split(',').map(l => l.trim());
                        langs.forEach(lang => {
                            if (lang) {
                                const normalized = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
                                languageCounts[normalized] = (languageCounts[normalized] || 0) + 1;
                            }
                        });
                    }
                });
                const languages = Object.entries(languageCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count);

                // Process tools
                const toolCounts = {};
                signups.forEach(signup => {
                    if (signup.studying_with) {
                        const tools = signup.studying_with.split(/[,\/]/).map(t => t.trim());
                        tools.forEach(tool => {
                            if (tool && tool.length > 2) {
                                let normalized = tool;
                                if (tool.toLowerCase().includes('duolingo')) normalized = 'Duolingo';
                                else if (tool.toLowerCase().includes('youtube')) normalized = 'YouTube';
                                else normalized = tool.charAt(0).toUpperCase() + tool.slice(1);

                                toolCounts[normalized] = (toolCounts[normalized] || 0) + 1;
                            }
                        });
                    }
                });
                const tools = Object.entries(toolCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);

                setStats({
                    totalSignups: signups.length,
                    sources,
                    languages,
                    tools,
                });
            }
        } catch (err) {
            console.error('Error loading signup data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadSharesData = async () => {
        try {
            const { data: shareLinks } = await supabase
                .from('app_share_links')
                .select(`
                    id,
                    user_id,
                    created_at,
                    app_users!app_share_links_user_id_fkey(display_name, avatar_url)
                `)
                .order('created_at', { ascending: false });

            // Exclude Noah/Bots from shares as well
            const { data: allUsers } = await supabase.from('app_users').select('id, display_name');
            const realUserIds = new Set(allUsers?.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
            }).map(u => u.id) || []);

            const filteredShareLinks = (shareLinks || []).filter(s => realUserIds.has(s.user_id));

            if (filteredShareLinks.length > 0) {
                // Count shares per user
                const userShareCounts = {};
                filteredShareLinks.forEach(share => {
                    const userId = share.user_id;
                    const userName = share.app_users?.display_name || 'Unknown';
                    const userAvatar = share.app_users?.avatar_url;

                    if (!userShareCounts[userId]) {
                        userShareCounts[userId] = {
                            name: userName,
                            avatar: userAvatar,
                            count: 0
                        };
                    }
                    userShareCounts[userId].count++;
                });

                const shares = Object.values(userShareCounts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10); // Top 10 sharers

                setStats(prev => ({
                    ...prev,
                    shares,
                    totalShares: filteredShareLinks.length
                }));
            }
        } catch (err) {
            console.error('Error loading shares data:', err);
        }
    };

    if (loading) {
        return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse">Analyzing growth data... 📊</div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight">Growth & Analytics 📈</h2>
                    <p className="text-gray-500 font-bold mt-1">
                        Tracking signups and user interests
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={TrendingUp}
                    label="Total Signups"
                    value={stats.totalSignups}
                    color="sky"
                />
                <StatCard
                    icon={Globe}
                    label="Top Source"
                    value={stats.sources[0]?.name || 'N/A'}
                    subtitle={`${stats.sources[0]?.count || 0} signups`}
                    color="pink"
                />
                <StatCard
                    icon={BarChart3}
                    label="Top Language"
                    value={stats.languages[0]?.name || 'N/A'}
                    subtitle={`${stats.languages[0]?.count || 0} interested`}
                    color="indigo"
                />
                <StatCard
                    icon={Wrench}
                    label="Top Tool"
                    value={stats.tools[0]?.name || 'N/A'}
                    subtitle={`${stats.tools[0]?.count || 0} users`}
                    color="amber"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Signup Sources */}
                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-3">
                        <span className="p-2 bg-sky-50 rounded-xl text-sky-500">📍</span>
                        Signup Sources
                    </h3>
                    <div className="space-y-6">
                        {stats.sources.slice(0, 6).map((source, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-700 group-hover:text-[var(--soup-turquoise)] transition-colors">{source.name}</span>
                                    <span className="text-[var(--soup-turquoise)]">{source.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-[var(--soup-turquoise)] h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(source.count / stats.totalSignups) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Languages */}
                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-3">
                        <span className="p-2 bg-pink-50 rounded-xl text-pink-500">🌍</span>
                        Language Interests
                    </h3>
                    <div className="space-y-6">
                        {stats.languages.slice(0, 6).map((lang, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-700 group-hover:text-[var(--soup-pink)] transition-colors">{lang.name}</span>
                                    <span className="text-[var(--soup-pink)]">{lang.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-[var(--soup-pink)] h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(lang.count / stats.totalSignups) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tools */}
                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <h3 className="text-xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-3">
                        <span className="p-2 bg-indigo-50 rounded-xl text-indigo-500">🛠️</span>
                        Previous Tools
                    </h3>
                    <div className="space-y-6">
                        {stats.tools.map((tool, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-700 group-hover:text-indigo-500 transition-colors">{tool.name}</span>
                                    <span className="text-indigo-500">{tool.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(tool.count / stats.totalSignups) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Future Integrations */}
            <div className="mt-8 bg-white border border-black/5 rounded-[32px] p-10 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-3">
                        <Target className="text-[var(--soup-pink)]" />
                        Growth Roadmap 🚀
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group bg-[var(--soup-beige)]/30 p-6 rounded-2xl border border-black/5 hover:scale-[1.02] transition-all">
                            <div className="font-extrabold text-[var(--soup-dark)] text-lg mb-1">TikTok/IG API Tracking</div>
                            <div className="text-sm font-bold text-gray-400">Track viral clips in real time.</div>
                            <div className="mt-4 inline-flex px-4 py-1 bg-white text-[var(--soup-turquoise)] text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                                In Progress
                            </div>
                        </div>
                        <div className="group bg-[var(--soup-beige)]/30 p-6 rounded-2xl border border-black/5 hover:scale-[1.02] transition-all">
                            <div className="font-extrabold text-[var(--soup-dark)] text-lg mb-1">Influencer Portal</div>
                            <div className="text-sm font-bold text-gray-400">Manage sponsorships & landing pages.</div>
                            <div className="mt-4 inline-flex px-4 py-1 bg-white text-[var(--soup-pink)] text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                                Planned
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtitle, color }) {
    const colorStyles = {
        sky: 'text-[var(--soup-turquoise)] bg-sky-50 border-sky-100',
        pink: 'text-[var(--soup-pink)] bg-pink-50 border-pink-100',
        indigo: 'text-indigo-500 bg-indigo-50 border-indigo-100',
        amber: 'text-amber-500 bg-amber-50 border-amber-100',
    };

    return (
        <div className={`bg-white p-8 rounded-[32px] border border-black/5 shadow-sm hover:translate-y-[-4px] transition-all group`}>
            <div className={`w-12 h-12 rounded-xl ${colorStyles[color]} flex items-center justify-center mb-6 border border-black/5`}>
                <Icon size={24} />
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-3xl font-black text-[var(--soup-dark)] tracking-tight">{value}</div>
            {subtitle && <div className="text-[11px] font-bold text-gray-400 mt-2">{subtitle}</div>}
        </div>
    );
}
