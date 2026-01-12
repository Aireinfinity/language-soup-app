import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { TrendingUp, Users, Activity, Share2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function GrowthCharts() {
    const [metrics, setMetrics] = useState({
        wau: [],
        retention: [],
        shares: [],
        summary: {
            activeUsers: 0,
            retentionRate: 0,
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
            // Calculate date 60 days ago for filtered history
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const dateFilter = sixtyDaysAgo.toISOString();

            // Fetch all data via secure RPC (bypasses RLS)
            const { data, error } = await supabase.rpc('get_dashboard_data');

            if (error) throw error;

            const messages = data.messages || [];
            const shareLinks = data.shares || [];

            // Process Metrics
            const dailyActive = processDailyActive(messages || []);
            const weeklyRetention = processRetention(messages || []);
            const dailyShares = processDailyShares(shareLinks || []);

            // Calculate Summary Stats from the processed chart data
            // Use the most recent data point (even if it's 0, it matches the chart)
            const currentDAU = dailyActive.length > 0 ? dailyActive[dailyActive.length - 1].value : 0;

            // For retention, ignore the last day if it's 0 (because we can't calculate retention for today yet)
            // Find the last non-zero retention, or just the one before the last if appropriate
            let currentRetention = 0;
            const validRetention = weeklyRetention.filter(d => d.value > 0);
            if (validRetention.length > 0) {
                currentRetention = validRetention[validRetention.length - 1].value;
            } else if (weeklyRetention.length > 1) {
                // If all are 0, but we have data, show the second to last (yesterday's retention of day before)
                currentRetention = weeklyRetention[weeklyRetention.length - 2]?.value || 0;
            }

            const totalShares = shareLinks.filter(s => s.created_at >= LAUNCH_DATE).length;

            setMetrics({
                dau: dailyActive,
                retention: weeklyRetention,
                shares: dailyShares,
                summary: {
                    activeUsers: currentDAU,
                    retentionRate: currentRetention,
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

    // Soft Launch Configuration
    // Soft Launch Configuration
    const LAUNCH_DATE = '2026-01-03'; // Official Launch Date

    // Helper: Get Date Key (YYYY-MM-DD)
    const getDateKey = (date) => {
        return new Date(date).toISOString().split('T')[0];
    };

    // Helper: Generate Launch Week keys (Jan 4 - Today)
    const getLaunchTimeline = () => {
        const days = [];
        const start = new Date(LAUNCH_DATE);
        const end = new Date(); // Today

        // Loop from start date until today
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(getDateKey(new Date(d)));
        }
        return days;
    };

    const processDailyActive = (msgs) => {
        const daysMap = {};
        const timeline = getLaunchTimeline();

        // Initialize with 0
        timeline.forEach(d => daysMap[d] = new Set());

        msgs.forEach(m => {
            const day = getDateKey(m.created_at);
            // Only count if within launch timeline
            if (daysMap[day]) {
                daysMap[day].add(m.sender_id);
            }
        });

        return timeline.map(day => ({
            date: day,
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
            if (daysMap[day] !== undefined) {
                daysMap[day]++;
            }
        });

        return timeline.map(day => ({
            label: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: daysMap[day]
        }));
    };

    const processRetention = (msgs) => {
        // Calculate Daily Stickiness (Users active Day X who returned Day X+1)
        const timeline = getLaunchTimeline();
        const dailyActive = {}; // date -> Set(userIds)

        timeline.forEach(d => dailyActive[d] = new Set());

        msgs.forEach(m => {
            const day = getDateKey(m.created_at);
            if (dailyActive[day]) dailyActive[day].add(m.sender_id);
        });

        return timeline.map((day, index) => {
            const label = new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Users active on Day X
            const dayUsers = dailyActive[day];
            if (!dayUsers || dayUsers.size === 0) return { label, value: 0 };

            // Check Day X+1
            const nextDay = timeline[index + 1];
            if (!nextDay) return { label, value: 0 }; // Can't calculate for today

            const nextDayUsers = dailyActive[nextDay];
            if (!nextDayUsers) return { label, value: 0 };

            // How many of Day X users appeared in Day X+1?
            const returningCount = [...dayUsers].filter(uid => nextDayUsers.has(uid)).length;
            const percentage = Math.round((returningCount / dayUsers.size) * 100);

            return { label, value: percentage };
        });
    };

    const processTopSharers = (links) => {
        const counts = {};
        links.forEach(l => {
            // Filter by Launch Date
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

        return Object.values(counts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    };


    if (loading) return <div className="p-8 text-center text-gray-400">Loading metrics...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Daily Active Users"
                    value={metrics.summary.activeUsers}
                    data={metrics.dau || []}
                    type="bar" // Changed to bar for cleaner DAU look
                    color="turquoise"
                    icon={Users}
                />
                <MetricCard
                    title="Retention Rate"
                    value={metrics.summary.retentionRate + '%'}
                    data={metrics.retention || []}
                    type="line"
                    color="dark"
                    icon={Activity}
                    subtitle="Daily Return Rate"
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

function MetricCard({ title, value, data, type, color, icon: Icon, subtitle }) {
    const isZero = data.length === 0 || data.every(d => d.value === 0);
    const maxValue = Math.max(...data.map(d => d.value), 1);

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
        },
        emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50', stroke: '#10b981' },
    };
    const c = colors[color] || colors.turquoise;

    return (
        <div className="bg-white rounded-[32px] border border-black/5 p-6 shadow-sm hover:shadow-lg transition-all relative group overflow-hidden">
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

            {/* Chart Area */}
            <div className="h-20 flex items-end gap-1.5 mt-auto relative px-1">
                {isZero ? (
                    <div className="w-full text-center text-xs text-gray-300 font-bold italic self-center">No data yet 🥣</div>
                ) : (
                    <>
                        {/* Bars / Dots */}
                        {data.map((d, i) => (
                            <div key={i} className="relative flex-1 flex flex-col items-center gap-1 group/bar h-full">
                                <div className="relative w-full flex items-end h-full justify-center">
                                    {(type === 'bar' || type === 'area') && (
                                        <div
                                            className={`w-full ${c.bg} rounded-t-lg opacity-80 group-hover/bar:opacity-100 transition-all shadow-sm`}
                                            style={{ height: `${(d.value / maxValue) * 100}%` }}
                                        />
                                    )}
                                    {type === 'line' && (
                                        <div
                                            className={`w-3 h-3 rounded-full ${c.bg} border-2 border-white shadow-xl z-20 transition-all group-hover/bar:scale-125`}
                                            style={{ marginBottom: `calc(${(d.value / maxValue) * 100}% - 6px)` }}
                                        />
                                    )}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[var(--soup-dark)] text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-all scale-75 group-hover/bar:scale-100 whitespace-nowrap z-50 shadow-2xl">
                                    {d.label}: {d.value}{type === 'line' ? '%' : ''}
                                </div>
                            </div>
                        ))}

                        {/* Line Chart Connector Line */}
                        {type === 'line' && (
                            <svg
                                className="absolute inset-x-0 bottom-0 h-full w-full pointer-events-none z-10"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                <polyline
                                    points={data.map((d, i) => {
                                        const x = (i / (data.length - 1)) * 100;
                                        const y = 100 - (d.value / maxValue) * 100;
                                        return `${x},${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke={c.stroke}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-20"
                                />
                            </svg>
                        )}
                    </>
                )}
            </div>

            {/* Date range footer */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-black pt-4 border-t border-black/5 mt-4">
                <span className="uppercase tracking-widest">{data[0]?.label}</span>
                <span className="uppercase tracking-widest">{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}

