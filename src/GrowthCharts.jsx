import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Users, Share2, Target, Activity } from 'lucide-react';

export default function GrowthCharts() {
    const [metrics, setMetrics] = useState({
        dau: [],
        retention: [],
        shares: [],
        summary: {
            activeUsers: 0,
            week1Retention: 0,
            viralShares: 0
        },
        topSharers: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        try {
            // Fetch all data via secure RPC
            const { data, error } = await supabase.rpc('get_dashboard_data');
            if (error) throw error;

            const messages = data?.messages || [];
            const shareLinks = data?.shares || [];

            // 1. Total Human Users (exclude bots/admins)
            const { data: allUsers } = await supabase.from('app_users').select('id, display_name, created_at');
            const realUsers = allUsers?.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
            }) || [];

            // 2. Week 1 Retention (Cohort Logic - Match GoalsTab)
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            const cohortUsers = realUsers.filter(u => new Date(u.created_at) < sevenDaysAgo);
            const cohortIds = new Set(cohortUsers.map(u => u.id));
            const recentMessages = messages.filter(m => new Date(m.created_at) >= sevenDaysAgo);

            const activeCohortIds = new Set();
            recentMessages.forEach(m => {
                if (cohortIds.has(m.sender_id)) activeCohortIds.add(m.sender_id);
            });

            const week1Retention = cohortIds.size > 0 ? (activeCohortIds.size / cohortIds.size) * 100 : 0;

            // 3. Process time-series data
            const dailyActive = processDailyActive(messages || []);
            const dailyShares = processDailyShares(shareLinks || []);

            const totalShares = shareLinks.filter(s => s.created_at >= LAUNCH_DATE).length;

            setMetrics({
                dau: dailyActive,
                retention: [],
                shares: dailyShares,
                summary: {
                    activeUsers: dailyActive.length > 0 ? dailyActive[dailyActive.length - 1].value : 0,
                    week1Retention: week1Retention,
                    viralShares: totalShares
                },
                topSharers: processTopSharers(shareLinks || [])
            });

        } catch (err) {
            console.error('Error loading dashboard metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    // Official Launch Date
    const LAUNCH_DATE = '2026-01-03';

    const getDateKey = (date) => {
        return new Date(date).toISOString().split('T')[0];
    };

    const getLaunchTimeline = () => {
        const days = [];
        const start = new Date(LAUNCH_DATE);
        const end = new Date();
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(getDateKey(new Date(d)));
        }
        return days;
    };

    const processDailyActive = (msgs) => {
        const daysMap = {};
        const timeline = getLaunchTimeline();
        timeline.forEach(d => daysMap[d] = new Set());
        msgs.forEach(m => {
            const day = getDateKey(m.created_at);
            if (daysMap[day]) daysMap[day].add(m.sender_id);
        });
        return timeline.map(day => ({
            label: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: daysMap[day].size
        }));
    };

    const processDailyShares = (shares) => {
        const daysMap = {};
        const timeline = getLaunchTimeline();
        timeline.forEach(d => daysMap[d] = 0);
        shares.forEach(s => {
            const day = getDateKey(s.created_at);
            if (daysMap[day] !== undefined) daysMap[day]++;
        });
        return timeline.map(day => ({
            label: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: daysMap[day]
        }));
    };

    const processTopSharers = (links) => {
        const counts = {};
        links.forEach(l => {
            if (l.created_at < LAUNCH_DATE) return;
            const uid = l.sharer_user_id;
            if (!uid) return;
            if (!counts[uid]) {
                counts[uid] = {
                    name: l.sharer?.display_name || 'Unknown',
                    avatar: l.sharer?.avatar_url,
                    count: 0
                };
            }
            counts[uid].count++;
        });
        return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading metrics...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Daily Active Users"
                    value={metrics.summary.activeUsers}
                    data={metrics.dau || []}
                    type="bar"
                    color="turquoise"
                    icon={Users}
                />
                <MetricCard
                    title="Q1 Goal: Stable Launch"
                    value={metrics.summary.week1Retention.toFixed(1) + '%'}
                    target={40}
                    unit="%"
                    type="goal"
                    color="dark"
                    icon={Target}
                    subtitle="Week 1 Retention (Cohort)"
                />
                <MetricCard
                    title="Viral Shares"
                    value={metrics.summary.viralShares}
                    data={metrics.shares}
                    type="bar"
                    color="turquoise"
                    icon={Share2}
                />
            </div>

            {/* Top Sharers List */}
            {metrics.topSharers.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Share2 size={14} /> Top Sharers
                    </h4>
                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                        {metrics.topSharers.map((sharer, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl min-w-[200px] border border-gray-100">
                                {sharer.avatar ? (
                                    <img src={sharer.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[var(--soup-turquoise)] flex items-center justify-center text-white text-xs font-bold">
                                        {sharer.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs font-bold text-[var(--soup-dark)] truncate max-w-[100px]">{sharer.name}</div>
                                    <div className="text-[10px] font-bold text-[var(--soup-turquoise)]">{sharer.count} shares</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, data, type, color, icon: Icon, subtitle, target, unit }) {
    const isZero = !data || data.length === 0 || data.every(d => d.value === 0);
    const maxValue = data && data.length > 0 ? Math.max(...data.map(d => d.value), 1) : 1;

    const colors = {
        turquoise: {
            text: 'text-[var(--soup-turquoise)]',
            bg: 'bg-[var(--soup-turquoise)]',
            light: 'bg-[var(--soup-turquoise)]/10',
            stroke: 'var(--soup-turquoise)'
        },
        dark: {
            text: 'text-[var(--soup-dark)]',
            bg: 'bg-[var(--soup-dark)]',
            light: 'bg-[var(--soup-dark)]/5',
            stroke: 'var(--soup-dark)'
        }
    };
    const c = colors[color] || colors.turquoise;
    const progress = target ? Math.min((parseFloat(value) / target) * 100, 100) : 0;

    return (
        <div className="bg-white rounded-[32px] border border-black/5 p-6 shadow-sm hover:shadow-lg transition-all relative group overflow-hidden flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div>
                    <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</div>
                    <div className={`text-4xl font-black ${c.text} tracking-tighter`}>{value}</div>
                    {subtitle && <div className="text-[10px] text-gray-400 font-bold mt-1 italic">{subtitle}</div>}
                </div>
                <div className={`p-2.5 rounded-2xl ${c.light} ${c.text}`}>
                    <Icon size={20} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col justify-end">
                {type === 'goal' ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                            <span className="text-[10px] font-black text-[var(--soup-dark)]">Target: {target}{unit}</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full ${c.bg} transition-all duration-1000 ease-out`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold italic">
                            {progress.toFixed(1)}% of Q1 milestone reached
                        </div>
                    </div>
                ) : (
                    <div className="h-20 flex items-end gap-1.5 relative px-1">
                        {isZero ? (
                            <div className="w-full text-center text-xs text-gray-300 font-bold italic self-center">No data yet 🥣</div>
                        ) : (
                            <>
                                {data.map((d, i) => (
                                    <div key={i} className="relative flex-1 flex flex-col items-center gap-1 group/bar h-full">
                                        <div className="relative w-full flex items-end h-full justify-center">
                                            {(type === 'bar' || type === 'area') && (
                                                <div
                                                    className={`w-full ${c.bg} rounded-t-lg opacity-80 group-hover/bar:opacity-100 transition-all shadow-sm`}
                                                    style={{ height: `${(d.value / maxValue) * 100}%` }}
                                                />
                                            )}
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[var(--soup-dark)] text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-all scale-75 group-hover/bar:scale-100 whitespace-nowrap z-50 shadow-2xl">
                                            {d.label}: {d.value}{unit || ''}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            {!target ? (
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-black pt-4 border-t border-black/5 mt-4">
                    <span className="uppercase tracking-widest">{data?.[0]?.label || '-'}</span>
                    <span className="uppercase tracking-widest">{data?.[data?.length - 1]?.label || '-'}</span>
                </div>
            ) : (
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-black pt-4 border-t border-black/5 mt-4">
                    <span className="uppercase tracking-widest">Q1 2026</span>
                    <span className="text-[var(--soup-turquoise)] font-black">STABLE APP READY</span>
                </div>
            )}
        </div>
    );
}
