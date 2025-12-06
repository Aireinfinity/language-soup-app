'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/');
            return;
        }

        const { data: userData } = await supabase
            .from('app_users')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!userData?.is_admin) {
            await supabase.auth.signOut();
            router.push('/');
            return;
        }

        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Language Soup</h1>

                <nav className="space-y-2">
                    <NavLink href="/dashboard">📊 Dashboard</NavLink>
                    <NavLink href="/dashboard/challenges">🎯 Challenges</NavLink>
                    <NavLink href="/dashboard/support">💬 Support</NavLink>
                    <NavLink href="/dashboard/analytics">📈 Analytics</NavLink>
                </nav>

                <button
                    onClick={handleSignOut}
                    className="absolute bottom-6 left-6 right-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
                >
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                {children}
            </main>
        </div>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition font-medium"
        >
            {children}
        </Link>
    );
}
