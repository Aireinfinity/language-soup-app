import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Calendar, Trash2, Send, Clock, CheckCircle, Edit2, X, Check } from 'lucide-react';

export default function QueueTab({ user, groups, getDeepLLangCode, getGoogleLangCode, handleSendToGroups }) {
    const [queuedChallenges, setQueuedChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftText, setDraftText] = useState('');
    const [scheduledDay, setScheduledDay] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [translations, setTranslations] = useState({});
    const [translating, setTranslating] = useState(false);
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDay, setEditDay] = useState('');
    const [editTime, setEditTime] = useState('');
    const [translationCache, setTranslationCache] = useState({});

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        try {
            const { data, error } = await supabase
                .from('app_scheduled_challenges')
                .select('*')
                .order('scheduled_time', { ascending: true });

            if (error) throw error;
            setQueuedChallenges(data || []);
        } catch (err) {
            console.error('Error loading queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const parseScheduledDateTime = (day, time) => {
        const now = new Date();
        let targetDate = new Date(now);

        // Set the day
        if (day === 'today') {
            // Keep today
        } else if (day === 'tomorrow') {
            targetDate.setDate(now.getDate() + 1);
        } else if (day.startsWith('day')) {
            // Extract day offset (day2, day3, etc.)
            const offset = parseInt(day.replace('day', ''));
            targetDate.setDate(now.getDate() + offset);
        }

        // Parse time string (HH:MM format from time input)
        const [hours, minutes] = time.split(':').map(Number);
        targetDate.setHours(hours, minutes, 0, 0);

        return targetDate;
    };

    const saveDraft = async () => {
        if (!draftText.trim() || !scheduledDay || !scheduledTime) {
            alert('Please enter challenge text and choose day + time');
            return;
        }

        const scheduleDate = parseScheduledDateTime(scheduledDay, scheduledTime);
        if (scheduleDate < new Date()) {
            alert('Scheduled time must be in the future');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('app_scheduled_challenges')
                .insert({
                    created_by: user.id,
                    challenge_text: draftText.trim(),
                    scheduled_time: scheduleDate.toISOString(),
                    status: 'pending'
                });

            if (error) throw error;

            alert('Challenge saved to queue! 🎉');
            setDraftText('');
            setScheduledDay('');
            setScheduledTime('');
            loadQueue();
        } catch (err) {
            console.error('Error saving draft:', err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteChallenge = async (id) => {
        if (!confirm('Delete this challenge?')) return;

        try {
            const { error } = await supabase
                .from('app_scheduled_challenges')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadQueue();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete: ' + err.message);
        }
    };

    const startEditing = (challenge) => {
        setEditingId(challenge.id);
        setEditText(challenge.challenge_text);

        // Parse the scheduled time back to day/time
        const scheduledDate = new Date(challenge.scheduled_time);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        const schedDate = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());

        const daysDiff = Math.round((schedDate - today) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            setEditDay('today');
        } else if (daysDiff === 1) {
            setEditDay('tomorrow');
        } else if (daysDiff >= 2 && daysDiff <= 6) {
            setEditDay(`day${daysDiff}`);
        }

        const hour = scheduledDate.getHours();
        const minute = scheduledDate.getMinutes();
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        setEditTime(timeString);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
        setEditDay('');
        setEditTime('');
    };

    const saveEdit = async () => {
        if (!editText.trim() || !editDay || !editTime) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const newScheduledTime = parseScheduledDateTime(editDay, editTime);

            const { error } = await supabase
                .from('app_scheduled_challenges')
                .update({
                    challenge_text: editText.trim(),
                    scheduled_time: newScheduledTime.toISOString()
                })
                .eq('id', editingId);

            if (error) throw error;

            cancelEditing();
            loadQueue();
        } catch (err) {
            console.error('Error updating:', err);
            alert('Failed to update: ' + err.message);
        }
    };

    const openPreview = async (challenge) => {
        setSelectedChallenge(challenge);
        setShowPreview(true);

        // Check cache first
        if (translationCache[challenge.challenge_text]) {
            setTranslations(translationCache[challenge.challenge_text]);
            setTranslating(false);
            return;
        }

        setTranslating(true);

        try {
            // Get unique languages from groups
            const uniqueLanguages = [...new Set(groups.map(g => g.language))];
            const translationResults = {};

            for (const language of uniqueLanguages) {
                const deeplLang = getDeepLLangCode(language);
                const googleLang = getGoogleLangCode(language);

                if (!deeplLang && !googleLang) {
                    translationResults[language] = challenge.challenge_text;
                    continue;
                }

                try {
                    // Try DeepL first
                    const { data, error } = await supabase.functions.invoke('translate-text', {
                        body: { text: challenge.challenge_text, targetLang: deeplLang }
                    });

                    if (!error && !data.error) {
                        translationResults[language] = data.translatedText;
                    } else {
                        throw new Error('DeepL failed');
                    }
                } catch {
                    // Fallback to Google
                    const { data } = await supabase.functions.invoke('translate-google', {
                        body: { text: challenge.challenge_text, targetLang: googleLang }
                    });
                    translationResults[language] = data.translatedText;
                }
            }

            setTranslations(translationResults);
            // Cache the translations
            setTranslationCache(prev => ({
                ...prev,
                [challenge.challenge_text]: translationResults
            }));
        } catch (err) {
            console.error('Translation error:', err);
            alert('Some translations failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };

    const approveAndSend = async () => {
        if (sending || translating) return;

        setSending(true);
        try {
            // Group by language and send
            for (const group of groups) {
                const translatedText = translations[group.language] || selectedChallenge.challenge_text;

                // Insert challenge
                const { error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        group_id: group.id,
                        prompt_text: translatedText,
                        created_by: user.id,
                    });

                if (challengeError) throw challengeError;

                // Send notifications (same logic as existing)
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('user_id')
                    .eq('group_id', group.id);

                if (members?.length > 0) {
                    const userIds = members.map(m => m.user_id).filter(id => id !== user.id);
                    if (userIds.length > 0) {
                        const { data: tokens } = await supabase
                            .from('app_push_tokens')
                            .select('expo_push_token')
                            .in('user_id', userIds);

                        if (tokens?.length > 0) {
                            const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
                            const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                            const pushMessages = tokens.map(t => ({
                                to: t.expo_push_token,
                                sound: 'default',
                                title: 'mmm goood soup!',
                                body: `${randomEmoji} new challenge in ${group.name}`,
                                data: { type: 'challenge', groupId: group.id }
                            }));

                            await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                                body: JSON.stringify(pushMessages),
                            });
                        }
                    }
                }
            }

            // Mark as sent
            await supabase
                .from('app_scheduled_challenges')
                .update({ status: 'sent' })
                .eq('id', selectedChallenge.id);

            alert(`Challenge sent to all ${groups.length} groups! 🚀`);
            setShowPreview(false);
            setSelectedChallenge(null);
            setTranslations({});
            loadQueue();
        } catch (err) {
            console.error('Error sending:', err);
            alert('Failed to send: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse">Loading queue... 🍜</div>;
    }

    const pendingChallenges = queuedChallenges.filter(c => c.status === 'pending');
    const sentChallenges = queuedChallenges.filter(c => c.status === 'sent');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight mb-2">
                    Challenge Queue 📅
                </h2>
                <p className="text-gray-500 font-bold">
                    {pendingChallenges.length} pending • {sentChallenges.length} sent
                </p>
            </div>

            {/* Draft Form */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <h3 className="text-xl font-black text-[var(--soup-dark)] mb-4">Create New Challenge</h3>

                <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Write your challenge in English...&#10;&#10;e.g., What's your favorite memory from 2025?"
                    className="w-full px-6 py-4 bg-[var(--soup-beige)]/30 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-2xl focus:ring-0 text-lg font-bold min-h-[120px] mb-4 transition-all"
                    rows={4}
                />

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-wider mb-2">
                            Day
                        </label>
                        <select
                            value={scheduledDay}
                            onChange={(e) => setScheduledDay(e.target.value)}
                            className="w-full px-6 py-3 bg-[var(--soup-beige)]/30 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-2xl focus:ring-0 font-bold text-base appearance-none cursor-pointer"
                        >
                            <option value="">Choose day...</option>
                            <option value="today">Today (Sun, Jan 5)</option>
                            <option value="tomorrow">Tomorrow (Mon, Jan 6)</option>
                            <option value="day2">Wednesday (Jan 7)</option>
                            <option value="day3">Thursday (Jan 8)</option>
                            <option value="day4">Friday (Jan 9)</option>
                            <option value="day5">Saturday (Jan 10)</option>
                            <option value="day6">Sunday (Jan 11)</option>
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-black text-gray-400 uppercase tracking-wider mb-2">
                            Time
                        </label>
                        <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full px-6 py-3 bg-[var(--soup-beige)]/30 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-2xl focus:ring-0 font-bold text-base cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={saveDraft}
                        disabled={saving || !draftText.trim() || !scheduledDay || !scheduledTime}
                        className="px-8 py-3 bg-[var(--soup-turquoise)] text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Calendar size={20} />
                        {saving ? 'Saving...' : 'Save to Queue'}
                    </button>
                </div>
            </div>

            {/* Queue List */}
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="px-8 py-4 bg-[var(--soup-beige)]/30 border-b border-black/5">
                    <h3 className="text-lg font-black text-[var(--soup-dark)]">Pending Challenges</h3>
                </div>

                {pendingChallenges.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 font-bold italic">
                        No pending challenges. Create one above! 📝
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {pendingChallenges.map((challenge) => (
                            <div key={challenge.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                {editingId === challenge.id ? (
                                    // Edit mode
                                    <div className="space-y-4">
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold text-base"
                                            rows={3}
                                        />
                                        <div className="flex gap-3">
                                            <select
                                                value={editDay}
                                                onChange={(e) => setEditDay(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold text-sm"
                                            >
                                                <option value="today">Today (Sun, Jan 5)</option>
                                                <option value="tomorrow">Tomorrow (Mon, Jan 6)</option>
                                                <option value="day2">Wednesday (Jan 7)</option>
                                                <option value="day3">Thursday (Jan 8)</option>
                                                <option value="day4">Friday (Jan 9)</option>
                                                <option value="day5">Saturday (Jan 10)</option>
                                                <option value="day6">Sunday (Jan 11)</option>
                                            </select>
                                            <input
                                                type="time"
                                                value={editTime}
                                                onChange={(e) => setEditTime(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-white border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold text-sm"
                                            />
                                            <button
                                                onClick={saveEdit}
                                                className="px-4 py-2 bg-green-500 text-white rounded-xl font-black hover:scale-105 transition-all"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl font-black hover:scale-105 transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // View mode
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-lg font-bold text-[var(--soup-dark)] mb-2">
                                                {challenge.challenge_text}
                                            </p>
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="flex items-center gap-1 text-[var(--soup-turquoise)] font-black">
                                                    <Clock size={14} />
                                                    {formatDate(challenge.scheduled_time)}
                                                </span>
                                                <span className="text-gray-400 font-bold">
                                                    → {groups.length} groups
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditing(challenge)}
                                                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-black transition-all flex items-center gap-1"
                                            >
                                                <Edit2 size={14} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openPreview(challenge)}
                                                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                👁️ Preview Translations
                                            </button>
                                            <button
                                                onClick={() => deleteChallenge(challenge.id)}
                                                className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl font-black transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreview && selectedChallenge && (
                <div className="fixed inset-0 bg-[var(--soup-dark)]/40 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-10 transform animate-in zoom-in-95 duration-300">
                        <h3 className="text-4xl font-black text-[var(--soup-dark)] tracking-tighter mb-2">
                            Preview Translations 🌍
                        </h3>
                        <p className="text-gray-500 font-bold mb-8">
                            Review before sending to all {groups.length} groups
                        </p>

                        {translating ? (
                            <div className="py-12 text-center">
                                <Clock size={48} className="animate-spin mx-auto mb-4 text-[var(--soup-turquoise)]" />
                                <p className="text-gray-500 font-bold">Translating to all languages...</p>
                            </div>
                        ) : (
                            <div className="mb-8 space-y-4">
                                <div className="p-6 bg-[var(--soup-beige)]/30 rounded-2xl">
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-wider mb-2">
                                        English (Original)
                                    </p>
                                    <p className="text-xl font-bold text-[var(--soup-dark)]">
                                        {selectedChallenge.challenge_text}
                                    </p>
                                </div>

                                {Object.entries(translations).map(([language, text]) => (
                                    <div key={language} className="p-6 bg-white border border-black/5 rounded-2xl">
                                        <p className="text-sm font-black text-[var(--soup-turquoise)] uppercase tracking-wider mb-2">
                                            {language}
                                        </p>
                                        <p className="text-lg font-bold text-[var(--soup-dark)]">
                                            {text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setSelectedChallenge(null);
                                    setTranslations({});
                                }}
                                className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                disabled={sending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={approveAndSend}
                                disabled={sending || translating}
                                className="px-10 py-4 bg-[var(--soup-turquoise)] text-white rounded-[20px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                {sending ? (
                                    <>
                                        <Clock size={20} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Approve & Send to All Groups 🚀
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
