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

            // Day 7 Retention (users who came back after 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: cohort } = await supabase
                .from('app_users')
                .select('id, created_at')
                .lte('created_at', sevenDaysAgo.toISOString());

            if (cohort && cohort.length > 0) {
                const cohortIds = cohort.map(u => u.id);
                const { data: activeUsers } = await supabase
                    .from('app_messages')
                    .select('user_id')
                    .in('user_id', cohortIds)
                    .gte('created_at', sevenDaysAgo.toISOString());

                const uniqueActive = new Set(activeUsers?.map(m => m.user_id) || []);
                const retention = (uniqueActive.size / cohort.length) * 100;

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

            // Fetch shares via RPC (bypasses RLS issues)
            const { data: dashboardData } = await supabase.rpc('get_dashboard_data');
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
                day7Retention: metrics.day7Retention,
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
        </div>
    );
}
