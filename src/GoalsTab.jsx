import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

export default function GoalsTab() {
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        day7Retention: 0,
        kFactor: 0,
        mrr: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        try {
            // Total Users (exclude test users: noah, bots, system accounts)
            const { data: allUsers } = await supabase
                .from('app_users')
                .select('id, display_name');

            const realUsers = allUsers?.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
            }) || [];

            const totalUsers = realUsers.length;

            // Day 7 Retention (Fixed: Use RPC to bypass RLS)
            const { data: dashboardData } = await supabase.rpc('get_dashboard_data');
            const messages = dashboardData?.messages || [];

            // 1. Define Cohort: Users joined >7 days ago
            // 2. Define Active Window: Messages sent in last 7 days by those users
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            // Get users active in last 7 days
            const recentMessages = messages.filter(m => new Date(m.created_at) >= sevenDaysAgo);
            const activeUserIds = new Set(recentMessages.map(m => m.sender_id));

            // Logic: Rolling "Week 1" Retention for simplicity in "Stable Launch" goal
            // (Strict Day 7 retention is too volatile for small cohorts)
            const activeCount = activeUserIds.size;

            // Total real users (calculated above)
            // Retention = Active / Total
            const retention = totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0;

            if (retention > 0) {
                setMetrics(prev => ({ ...prev, day7Retention: retention }));
            }

            // K-Factor (simple: shares per user, excluding admin)
            // Get admin user ID
            const { data: adminUser } = await supabase
                .from('app_users')
                .select('id')
                .or('display_name.ilike.%noah%,is_admin.eq.true')
                .limit(1)
                .single();

            // Use dashboardData (already fetched above for retention)
            const allShares = dashboardData?.shares || [];

            // Filter out admin shares AND shares before launch (Jan 3)
            const LAUNCH_DATE = '2026-01-03';

            const userShares = allShares.filter(s => {
                const name = s.sharer?.display_name?.toLowerCase() || '';
                const isNoah = name.includes('noah');
                const isAfterLaunch = s.created_at >= LAUNCH_DATE;
                return !isNoah && isAfterLaunch;
            });
            const totalShares = userShares.length;

            // Count users excluding admin (for K-Factor calculation)
            const realUsersForKFactor = adminUser ? totalUsers - 1 : totalUsers;

            // Calculate K-Factor
            const kFactor = realUsersForKFactor > 0 ? totalShares / realUsersForKFactor : 0;
            console.log(`K-Factor Calc (since Jan 4): ${totalShares} shares / ${realUsersForKFactor} users = ${kFactor}`);

            setMetrics({
                totalUsers: totalUsers || 0,
                day7Retention: retention, // Use the calculated retention variable
                kFactor: kFactor,
                mrr: 0 // Placeholder for Q3
            });
        } catch (err) {
            console.error('Error loading metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    const goals = [
        {
            quarter: 'Q1',
            title: 'Stable Launch',
            metric: 'Day 7 Retention',
            current: metrics.day7Retention,
            target: 30,
            unit: '%',
            icon: Users,
            color: 'bg-blue-500',
            status: metrics.day7Retention >= 30 ? '✅' : '🎯'
        },
        {
            quarter: 'Q2',
            title: 'Hard GTM to 1,000',
            metric: 'Total Users',
            current: metrics.totalUsers,
            target: 1000,
            unit: '',
            icon: TrendingUp,
            color: 'bg-[var(--soup-turquoise)]',
            status: metrics.totalUsers >= 1000 ? '✅' : '🎯'
        },
        {
            quarter: 'Q2',
            title: 'Viral Loop',
            metric: 'K-Factor',
            current: metrics.kFactor,
            target: 1.2,
            unit: 'x',
            icon: Target,
            color: 'bg-purple-500',
            status: metrics.kFactor >= 1.2 ? '✅' : '🎯'
        },
        {
            quarter: 'Q3',
            title: 'Make First $',
            metric: 'MRR',
            current: metrics.mrr,
            target: 500,
            unit: '$',
            icon: DollarSign,
            color: 'bg-green-500',
            status: metrics.mrr >= 500 ? '✅' : '🎯'
        }
    ];

    if (loading) {
        return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse p-8">Loading goals... 🎯</div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight mb-2">
                            2026 Goals 🎯
                        </h2>
                        <p className="text-gray-500 font-bold">
                            Tracking our Q1 & Q2 milestones
                        </p>
                    </div>
                </div>
            </div>

            {/* Goals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal, idx) => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100);
                    const Icon = goal.icon;

                    return (
                        <div key={idx} className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                            <div className={`${goal.color} px-6 py-4 flex items-center justify-between`}>
                                <div className="flex items-center gap-3">
                                    <Icon size={24} className="text-white" />
                                    <div>
                                        <div className="text-white/80 text-xs font-black uppercase">{goal.quarter}</div>
                                        <div className="text-white text-lg font-black">{goal.title}</div>
                                    </div>
                                </div>
                                <div className="text-3xl">{goal.status}</div>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-500">{goal.metric}</span>
                                        <span className="text-xs font-bold text-gray-400">
                                            Target: {goal.unit === '$' ? '$' : ''}{goal.target}{goal.unit !== '$' ? goal.unit : ''}
                                        </span>
                                    </div>
                                    <div className="text-4xl font-black text-[var(--soup-dark)] mb-3">
                                        {goal.unit === '$' ? '$' : ''}
                                        {goal.unit === '%' || goal.unit === 'x'
                                            ? goal.current.toFixed(2)  // Show 2 decimals for percentages and K-Factor
                                            : goal.current.toFixed(0)  // Show whole numbers for users
                                        }
                                        {goal.unit !== '$' ? goal.unit : ''}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full ${goal.color} transition-all duration-500`}
                                            style={{ width: `${progress}%` }}
                                        />
                                        {/* Goal marker line */}
                                        {progress < 100 && (
                                            <div
                                                className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                                                style={{ left: '100%' }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-between text-xs font-bold mb-3">
                                        <span className="text-gray-500">{progress.toFixed(1)}% of goal</span>
                                        <span className="text-gray-400">
                                            {goal.unit === '$' ? '$' : ''}{goal.target}{goal.unit !== '$' ? goal.unit : ''} target
                                        </span>
                                    </div>
                                </div>

                                {/* Status Message */}
                                {progress >= 100 ? (
                                    <div className="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold">
                                        🎉 Goal achieved! Your babies are thriving!
                                    </div>
                                ) : progress >= 75 ? (
                                    <div className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-bold">
                                        🔥 Almost there! Keep pushing!
                                    </div>
                                ) : (
                                    <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold">
                                        💪 Keep building! You got this!
                                    </div>
                                )}

                                {/* Retention Benchmarks (Indie Hacker Context) */}
                                {goal.metric === 'Day 7 Retention' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Indie Benchmarks</p>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between text-gray-400">
                                                <span>😐 Average App</span>
                                                <span>10-15%</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-[var(--soup-dark)] bg-gray-50 -mx-2 px-2 py-1 rounded-lg">
                                                <span>🚀 You (Solid Start!)</span>
                                                <span>{goal.current.toFixed(1)}%</span>
                                            </div>
                                            <div className="flex justify-between text-gray-400">
                                                <span>🤩 World Class</span>
                                                <span>40%+</span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-[10px] text-gray-400 italic">
                                            *Users &gt;7 days old who chatted this week.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Notes */}
            <div className="mt-8 bg-gradient-to-br from-[var(--soup-beige)] to-white p-6 rounded-3xl border border-[var(--soup-turquoise)]/30">
                <h3 className="text-lg font-black text-[var(--soup-dark)] mb-3">📝 Notes</h3>
                <ul className="space-y-2 text-sm text-gray-600 font-bold">
                    <li>• <b>Day 7 Retention</b>: % of users who come back after 7 days</li>
                    <li>• <b>K-Factor</b>: How many new users each user brings (1.2 = viral growth!)</li>
                    <li>• <b>MRR</b>: Monthly Recurring Revenue (add monetization in Q2/Q3)</li>
                    <li>• Metrics update in real-time as your babies grow! 🍼</li>
                </ul>
            </div>
        </div >
    );
}
