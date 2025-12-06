'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats {
    totalUsers: number;
    activeGroups: number;
    messagesToday: number;
    supportTickets: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        activeGroups: 0,
        messagesToday: 0,
        supportTickets: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Total users
            const { count: usersCount } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true });

            // Active groups
            const { count: groupsCount } = await supabase
                .from('app_groups')
                .select('*', { count: 'exact', head: true });

            // Messages today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: messagesCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            // Support tickets (groups with language='Support')
            const { count: supportCount } = await supabase
                .from('app_groups')
                .select('*', { count: 'exact', head: true })
                .eq('language', 'Support');

            setStats({
                totalUsers: usersCount || 0,
                activeGroups: groupsCount || 0,
                messagesToday: messagesCount || 0,
                supportTickets: supportCount || 0,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading stats...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon="👥"
                    color="blue"
                />
                <StatCard
                    title="Active Groups"
                    value={stats.activeGroups}
                    icon="💬"
                    color="green"
                />
                <StatCard
                    title="Messages Today"
                    value={stats.messagesToday}
                    icon="📨"
                    color="purple"
                />
                <StatCard
                    title="Support Tickets"
                    value={stats.supportTickets}
                    icon="🛟"
                    color="pink"
                />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionButton href="/dashboard/challenges" label="Create Challenge" icon="🎯" />
                    <QuickActionButton href="/dashboard/support" label="View Support" icon="💬" />
                    <QuickActionButton href="/dashboard/analytics" label="View Analytics" icon="📈" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        pink: 'bg-pink-50 text-pink-600',
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colors[color]} mb-4`}>
                <span className="text-2xl">{icon}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
    );
}

function QuickActionButton({ href, label, icon }: { href: string; label: string; icon: string }) {
    return (
        <a
            href={href}
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-gray-900">{label}</span>
        </a>
    );
}
