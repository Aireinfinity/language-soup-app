'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Challenge {
    id: string;
    group_id: string;
    prompt_text: string;
    created_at: string;
    app_groups?: { name: string };
}

interface Group {
    id: string;
    name: string;
}

export default function ChallengesPage() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [selectedGroup, setSelectedGroup] = useState('');
    const [promptText, setPromptText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load challenges
            const { data: challengesData } = await supabase
                .from('app_challenges')
                .select('*, app_groups(name)')
                .order('created_at', { ascending: false })
                .limit(50);

            // Load groups
            const { data: groupsData } = await supabase
                .from('app_groups')
                .select('id, name')
                .order('name');

            setChallenges(challengesData || []);
            setGroups(groupsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup || !promptText) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('app_challenges')
                .insert({
                    group_id: selectedGroup,
                    prompt_text: promptText,
                    sender_id: user?.id,
                });

            if (error) throw error;

            // Refresh list
            await loadData();

            // Reset form
            setSelectedGroup('');
            setPromptText('');
            setShowForm(false);
        } catch (error: any) {
            alert('Error creating challenge: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                    {showForm ? 'Cancel' : '+ New Challenge'}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Create Challenge</h2>
                    <form onSubmit={handleCreateChallenge} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Group
                            </label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Choose a group...</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prompt Text
                            </label>
                            <textarea
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder="What's your favorite childhood memory?"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Challenge'}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Group
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Prompt
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {challenges.map((challenge) => (
                            <tr key={challenge.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-medium text-gray-900">
                                        {challenge.app_groups?.name || 'Unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-900">{challenge.prompt_text}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(challenge.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
