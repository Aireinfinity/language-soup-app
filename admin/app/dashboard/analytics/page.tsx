'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Analytics {
    totalUsers: number;
    totalGroups: number;
    totalMessages: number;
    voiceMessages: number;
    textMessages: number;
    groupsByLanguage: { language: string; count: number }[];
    recentUsers: { display_name: string; created_at: string }[];
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics>({
        totalUsers: 0,
        totalGroups: 0,
        totalMessages: 0,
        voiceMessages: 0,
        textMessages: 0,
        groupsByLanguage: [],
        recentUsers: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            // Total users
            const { count: usersCount } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true });

            // Total groups
            const { count: groupsCount } = await supabase
                .from('app_groups')
                .select('*', { count: 'exact', head: true });

            // Total messages
            const { count: messagesCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true });

            // Voice messages
            const { count: voiceCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('message_type', 'voice');

            // Text messages
            const { count: textCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('message_type', 'text');

            // Groups by language
            const { data: groupsData } = await supabase
                .from('app_groups')
                .select('language')
                .neq('language', 'Support');

            const languageCounts = groupsData?.reduce((acc: any, g) => {
                acc[g.language] = (acc[g.language] || 0) + 1;
                return acc;
            }, {});

            const groupsByLanguage = Object.entries(languageCounts || {}).map(([language, count]) => ({
                language,
                count: count as number,
            }));

            // Recent users
            const { data: recentUsersData } = await supabase
                .from('app_users')
                .select('display_name, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            setAnalytics({
                totalUsers: usersCount || 0,
                totalGroups: groupsCount || 0,
                totalMessages: messagesCount || 0,
                voiceMessages: voiceCount || 0,
                textMessages: textCount || 0,
                groupsByLanguage,
                recentUsers: recentUsersData || [],
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Users" value={analytics.totalUsers} icon="👥" />
                <StatCard title="Total Groups" value={analytics.totalGroups} icon="💬" />
                <StatCard title="Total Messages" value={analytics.totalMessages} icon="📨" />
                <StatCard title="Voice Messages" value={analytics.voiceMessages} icon="🎤" />
            </div>

            {/* Message Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Message Types</h2>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Voice Messages"
                            value={analytics.voiceMessages}
                            total={analytics.totalMessages}
                            color="blue"
                        />
                        <ProgressBar
                            label="Text Messages"
                            value={analytics.textMessages}
                            total={analytics.totalMessages}
                            color="green"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Groups by Language</h2>
                    <div className="space-y-3">
                        {analytics.groupsByLanguage.map((item) => (
                            <div key={item.language} className="flex justify-between items-center">
                                <span className="text-gray-700">{item.language}</span>
                                <span className="font-bold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Users</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {analytics.recentUsers.map((user, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{user.display_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
    );
}

function ProgressBar({ label, value, total, color }: any) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const colors = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
    };

    return (
        <div>
            <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm text-gray-600">{value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${colors[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
