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
    const LAUNCH_DATE = '2026-01-04'; // Week 1 Start

    // Helper: Get Date Key (YYYY-MM-DD)
    const getDateKey = (date) => {
        return new Date(date).toISOString().split('T')[0];
    };

    // Helper: Generate Launch Week keys (Jan 5 - Jan 11) or up to today
    const getLaunchTimeline = () => {
        const days = [];
        const start = new Date(LAUNCH_DATE);

        // Always show at least 7 days from launch for the "Week 1" view
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            days.push(getDateKey(d));
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
        // Calculate Daily Retention (Day 1 Return Rate)
        const timeline = getLaunchTimeline();

        // 1. Identify "Cohort" for each day (Users whose first message was on Day X)
        const userCohorts = {}; // userId -> cohortDate (YYYY-MM-DD)
        const dailyActiveUsers = {}; // date -> Set(userIds)

        timeline.forEach(d => dailyActiveUsers[d] = new Set());

        // Sort messages chronologically to ensure we find FIRST message correctly
        const sortedMsgs = [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        sortedMsgs.forEach(m => {
            const day = getDateKey(m.created_at);
            const user = m.sender_id;

            // Assign user to their first day's cohort
            if (!userCohorts[user]) userCohorts[user] = day;

            // Record activity for that day
            if (dailyActiveUsers[day]) dailyActiveUsers[day].add(user);
        });

        // 2. Calculate Day 1 Retention for each day
        return timeline.map((day, index) => {
            const label = new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Get users who started on this day
            const cohortUsers = Object.entries(userCohorts)
                .filter(([_, startDay]) => startDay === day)
                .map(([uid]) => uid);

            if (cohortUsers.length === 0) return { label, value: 0 };

            // Check if they were active the NEXT day
            const nextDay = timeline[index + 1];
            if (!nextDay) return { label, value: 0 }; // Cannot calculate retention for today yet

            const retainedCount = cohortUsers.filter(uid => dailyActiveUsers[nextDay]?.has(uid)).length;

            return {
                label,
                value: Math.round((retainedCount / cohortUsers.length) * 100)
            };
        }).filter(d => d.value !== null && d.value !== undefined && (d.value !== 0 || d.label !== new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))); // Remove nulls and trailing 0s
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
                    type="area"
                    color="blue"
                    icon={Users}
                />
                <MetricCard
                    title="Retention Rate"
                    value={metrics.summary.retentionRate + '%'}
                    data={metrics.retention || []}
                    type="line"
                    color="indigo"
                    icon={Activity}
                    subtitle="Weekly Return Rate"
                />
                <MetricCard
                    title="Viral Shares"
                    value={metrics.summary.viralShares}
                    data={metrics.shares}
                    type="bar"
                    color="emerald"
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
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                        {sharer.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div className="text-xs font-bold text-[var(--soup-dark)] truncate max-w-[100px]">{sharer.name}</div>
                                    <div className="text-[10px] font-bold text-green-500">{sharer.count} shares</div>
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
        blue: { text: 'text-blue-600', bg: 'bg-blue-500', light: 'bg-blue-50' },
        indigo: { text: 'text-indigo-600', bg: 'bg-indigo-500', light: 'bg-indigo-50' },
        emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50' },
    };
    const c = colors[color];

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div>
                    <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</div>
                    <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
                    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
                </div>
                <div className={`p-2 rounded-lg ${c.light} ${c.text}`}>
                    <Icon size={18} />
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-16 flex items-end gap-1 mt-auto">
                {isZero ? (
                    <div className="w-full text-center text-xs text-gray-300 italic self-center">No data yet</div>
                ) : (
                    data.map((d, i) => (
                        <div key={i} className="relative flex-1 flex flex-col items-center gap-1 group/bar h-full">
                            <div className="relative w-full flex items-end h-full">
                                {/* Bar or Area Chart */}
                                {(type === 'bar' || type === 'area') && (
                                    <div
                                        className={`w-full ${c.bg} rounded-sm opacity-80 group-hover/bar:opacity-100 transition-all ${type === 'area' ? 'rounded-t-md' : ''}`}
                                        style={{ height: `${(d.value / maxValue) * 100}%` }}
                                    ></div>
                                )}
                                {/* Line Chart (Simplified as dots connected visually) */}
                                {type === 'line' && (
                                    <div
                                        className={`w-2 h-2 rounded-full ${c.bg} mx-auto absolute bottom-0 left-0 right-0 transition-all`}
                                        style={{ bottom: `${(d.value / maxValue) * 100}%` }}
                                    >
                                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full ${c.bg} blur-sm opacity-50`}></div>
                                    </div>
                                )}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                                {d.label}: {d.value}{type === 'line' ? '%' : ''}
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* Line Chart Connector Line (Visual decoration) */}
            {/* Line Chart Connector Line (Visual decoration) */}
            {type === 'line' && !isZero && (
                <svg className="absolute bottom-6 left-6 right-6 h-16 w-[calc(100%-3rem)] pointer-events-none opacity-50" preserveAspectRatio="none">
                    <polyline
                        points={data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.value / maxValue) * 100}`).join(' ')}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={c.text}
                    />
                </svg>
            )}

            {/* Date range footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 font-medium pt-3 border-t border-gray-100 mt-4">
                <span>{data[0]?.label}</span>
                <span>{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}

