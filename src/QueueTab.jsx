import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Calendar, Trash2, Send, Clock, CheckCircle, Edit2, X, Check } from 'lucide-react';
import { predictResponseRate, logChallengeSent } from './soupPredictor';

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
    const [showSoupInfo, setShowSoupInfo] = useState(false);
    const [prediction, setPrediction] = useState(null);

    // Generate dynamic date options for the next 7 days
    const dateOptions = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);

        let value;
        let labelPrefix;

        if (i === 0) {
            value = 'today';
            labelPrefix = 'Today';
        } else if (i === 1) {
            value = 'tomorrow';
            labelPrefix = 'Tomorrow';
        } else {
            value = `day${i}`;
            labelPrefix = date.toLocaleDateString('en-US', { weekday: 'long' });
        }

        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { value, label: `${labelPrefix} (${dateStr})` };
    });

    useEffect(() => {
        loadQueue();
    }, []);

    // Trigger prediction when draft text changes
    useEffect(() => {
        if (draftText.trim().length > 3) {
            const timer = setTimeout(async () => {
                const result = await predictResponseRate(draftText);
                setPrediction(result);
            }, 500); // Debounce for 500ms

            return () => clearTimeout(timer);
        } else {
            setPrediction(null);
        }
    }, [draftText]);

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

            // Translate all languages in PARALLEL for speed!
            const translationPromises = uniqueLanguages.map(async (language) => {
                const deeplLang = getDeepLLangCode(language);
                const googleLang = getGoogleLangCode(language);

                if (!deeplLang && !googleLang) {
                    return [language, challenge.challenge_text];
                }

                try {
                    // Try DeepL first
                    const { data, error } = await supabase.functions.invoke('translate-text', {
                        body: { text: challenge.challenge_text, targetLang: deeplLang }
                    });

                    if (!error && !data.error) {
                        return [language, data.translatedText];
                    } else {
                        throw new Error('DeepL failed');
                    }
                } catch {
                    // Fallback to Google
                    const { data } = await supabase.functions.invoke('translate-google', {
                        body: { text: challenge.challenge_text, targetLang: googleLang }
                    });
                    return [language, data.translatedText];
                }
            });

            // Wait for all translations to complete
            const translationPairs = await Promise.all(translationPromises);
            const translationResults = Object.fromEntries(translationPairs);

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
    const approveChallenge = async () => {
        try {
            // Just mark as approved - don't send yet
            await supabase
                .from('app_scheduled_challenges')
                .update({
                    status: 'approved',
                })
                .eq('id', selectedChallenge.id);

            alert('Challenge approved! It will auto-send at the scheduled time. ✅');
            setShowPreview(false);
            setSelectedChallenge(null);
            setTranslations({});
            loadQueue();
        } catch (err) {
            console.error('Error approving:', err);
            alert('Failed to approve: ' + err.message);
        }
    };


    const sendNow = async (challenge) => {
        if (!confirm(`Send "${challenge.challenge_text}" to all ${groups.length} groups NOW?`)) return;

        setSending(true);
        try {
            // Remove #challenge prefix if user already typed it
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();

            // Get unique languages and translate in PARALLEL
            const uniqueLanguages = [...new Set(groups.map(g => g.language))];

            const translationPromises = uniqueLanguages.map(async (language) => {
                if (language.toLowerCase() === 'english') {
                    return [language, cleanEnglish];
                }

                const deeplLang = getDeepLLangCode(language);
                const googleLang = getGoogleLangCode(language);

                if (!deeplLang && !googleLang) {
                    return [language, cleanEnglish];
                }

                try {
                    // Try DeepL first
                    const { data, error } = await supabase.functions.invoke('translate-text', {
                        body: { text: cleanEnglish, targetLang: deeplLang }
                    });

                    if (!error && !data.error) {
                        return [language, data.translatedText];
                    } else {
                        throw new Error('DeepL failed');
                    }
                } catch {
                    // Fallback to Google
                    const { data } = await supabase.functions.invoke('translate-google', {
                        body: { text: cleanEnglish, targetLang: googleLang }
                    });
                    return [language, data.translatedText];
                }
            });

            const translationPairs = await Promise.all(translationPromises);
            const translationResults = Object.fromEntries(translationPairs);

            // Send to all groups with proper format
            for (const group of groups) {
                const translation = translationResults[group.language];

                // Format: #challenge\n[english]\n[translation]
                // For English groups: just #challenge\n[english] (2 lines)
                const finalText = group.language.toLowerCase() === 'english'
                    ? `#challenge\n${cleanEnglish}`
                    : `#challenge\n${cleanEnglish}\n${translation}`;

                await supabase.from('app_challenges').insert({
                    group_id: group.id,
                    prompt_text: finalText,
                    created_by: user.id
                });

                // Send notifications
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
                                body: `${randomEmoji} new challenge in ${group?.name || 'your group'}`,
                                data: { type: 'challenge', groupId: group.id }
                            }));

                            await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                },
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
                .eq('id', challenge.id);

            // Log the challenge for AI learning
            await logChallengeSent(challenge.challenge_text);

            alert(`✅ Challenge sent to ${groups.length} groups!`);
            loadQueue();
        } catch (err) {
            console.error('Error sending challenge:', err);
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
    const approvedChallenges = queuedChallenges.filter(c => c.status === 'approved');
    const sentChallenges = queuedChallenges.filter(c => c.status === 'sent');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight mb-2">
                    Challenge Queue 📅
                </h2>
                <p className="text-gray-500 font-bold">
                    {pendingChallenges.length} pending review • {approvedChallenges.length} approved • {sentChallenges.length} sent
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


                {/* SOUP GAUGE - LEARNING VERSION */}
                {draftText.length > 0 && (() => {
                    // Use prediction if available, otherwise show loading
                    if (!prediction) {
                        return (
                            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="text-sm text-gray-400 font-bold italic animate-pulse">
                                    🧠 Analyzing prompt...
                                </div>
                            </div>
                        );
                    }

                    // If no prediction available (not enough data)
                    if (prediction.predicted === null) {
                        return (
                            <div className="mb-6 p-4 bg-[var(--soup-beige)]/50 rounded-2xl border-2 border-dashed border-[var(--soup-turquoise)]/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-black text-[var(--soup-turquoise)] uppercase tracking-wider">
                                        🌱 Learning Mode
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--soup-dark)] font-bold">
                                    {prediction.message}
                                </p>
                                {prediction.totalDataPoints > 0 && (
                                    <p className="text-xs text-gray-600 mt-2">
                                        ({prediction.totalDataPoints} total challenges tracked)
                                    </p>
                                )}
                            </div>
                        );
                    }

                    // We have a prediction!
                    const rate = prediction.predicted;
                    const [minRate, maxRate] = prediction.range;

                    // Color based on predicted rate
                    let color = 'bg-gray-300';
                    let emoji = '😐';
                    let label = 'Low';
                    if (rate > 35) { color = 'bg-[var(--soup-turquoise)]'; emoji = '🚀'; label = 'High'; }
                    else if (rate > 20) { color = 'bg-green-400'; emoji = '🙂'; label = 'Good'; }
                    else if (rate < 15) { color = 'bg-red-300'; emoji = '😴'; label = 'Low'; }

                    // Confidence badge
                    const confidenceColor = {
                        'high': 'bg-green-100 text-green-700',
                        'medium': 'bg-yellow-100 text-yellow-700',
                        'low': 'bg-gray-100 text-gray-600'
                    }[prediction.confidence];

                    return (
                        <div className="mb-6 p-4 bg-gradient-to-br from-[var(--soup-beige)] to-white rounded-2xl border-2 border-[var(--soup-turquoise)]/30 transition-all duration-300 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[var(--soup-dark)] uppercase tracking-wider flex items-center gap-1">
                                        🧠 AI Prediction
                                        <button
                                            onClick={() => setShowSoupInfo(!showSoupInfo)}
                                            className="w-4 h-4 rounded-full bg-[var(--soup-turquoise)]/20 hover:bg-[var(--soup-turquoise)]/30 text-[var(--soup-turquoise)] flex items-center justify-center text-[10px] font-bold transition-colors ml-1"
                                            title="How does this work?"
                                        >
                                            i
                                        </button>
                                    </span>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${confidenceColor}`}>
                                    {prediction.confidence} confidence
                                </span>
                            </div>

                            <div className="mb-3">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-3xl font-black text-[var(--soup-dark)]">{rate}%</span>
                                    <span className="text-sm font-bold text-[var(--soup-turquoise)]">predicted response rate</span>
                                </div>
                                <div className="text-xs text-gray-600 font-bold">
                                    Range: {minRate}% - {maxRate}% {emoji}
                                </div>
                            </div>

                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full ${color} transition-all duration-500 ease-out`}
                                    style={{ width: `${Math.min(100, rate)}%` }}
                                />
                            </div>

                            <div className="text-xs text-[var(--soup-turquoise)] font-bold">
                                📊 Based on {prediction.sampleSize} similar prompts
                            </div>

                            {/* THE EXPLAINER */}
                            {showSoupInfo && (
                                <div className="mt-4 p-3 bg-white rounded-xl text-xs text-[var(--soup-dark)] border border-[var(--soup-turquoise)]/30 animate-in fade-in zoom-in-95 duration-200 leading-relaxed">
                                    <p className="font-bold mb-2">🧠 How the AI learns:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>I compare your prompt to <b>{prediction.totalDataPoints} past challenges</b></li>
                                        <li>I find the <b>{prediction.sampleSize} most similar</b> ones (word count, keywords, format)</li>
                                        <li>I calculate their <b>average response rate</b></li>
                                        <li>The more data I have, the <b>smarter I get</b>! 📈</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })()}

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
                            {dateOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
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
                                                {dateOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
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

            {/* Approved Queue - Ready to Send */}
            {approvedChallenges.length > 0 && (
                <div className="mb-8 bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="px-8 py-4 bg-[var(--soup-turquoise)]/10 border-b border-black/5">
                        <h3 className="text-lg font-black text-[var(--soup-dark)]">✅ Approved & Scheduled ({approvedChallenges.length})</h3>
                        <p className="text-xs text-gray-500 font-bold mt-1">These will auto-send at their scheduled time</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {approvedChallenges.map((challenge) => (
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
                                                {dateOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
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
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-black">
                                                    APPROVED ✓
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEditing(challenge)}
                                                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-black transition-all flex items-center gap-1"
                                            >
                                                <Edit2 size={14} />
                                                Edit Time
                                            </button>
                                            <button
                                                onClick={() => openPreview(challenge)}
                                                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                👁️ Preview Format
                                            </button>
                                            <button
                                                onClick={() => sendNow(challenge)}
                                                disabled={sending}
                                                className="px-6 py-2.5 bg-[var(--soup-turquoise)] text-white rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <Send size={16} />
                                                Send Now 🚀
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
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && selectedChallenge && (
                <div className="fixed inset-0 bg-[var(--soup-dark)]/40 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-10 transform animate-in zoom-in-95 duration-300">
                        <h3 className="text-4xl font-black text-[var(--soup-dark)] tracking-tighter mb-2">
                            Preview: Exact Format 🔍
                        </h3>
                        <p className="text-gray-500 font-bold mb-2">
                            This is EXACTLY what will be sent to each group
                        </p>
                        <p className="text-sm text-gray-400 font-bold mb-8">
                            {groups.length} groups • {Object.keys(translations).length} languages
                        </p>

                        {translating ? (
                            <div className="py-12 text-center">
                                <Clock size={48} className="animate-spin mx-auto mb-4 text-[var(--soup-turquoise)]" />
                                <p className="text-gray-500 font-bold">Translating to all languages...</p>
                            </div>
                        ) : (
                            <div className="mb-8 space-y-3">
                                {/* Show each group individually with exact format */}
                                {groups.map((group) => {
                                    const cleanEnglish = selectedChallenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
                                    const translation = translations[group.language] || cleanEnglish;

                                    // This is EXACTLY what will be sent
                                    const exactFormat = group.language.toLowerCase() === 'english'
                                        ? `#challenge\n${cleanEnglish}`
                                        : `#challenge\n${cleanEnglish}\n${translation}`;

                                    return (
                                        <div key={group.id} className="p-4 bg-white border-2 border-black/5 rounded-2xl hover:border-[var(--soup-turquoise)]/30 transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-black text-[var(--soup-turquoise)] uppercase tracking-wider">
                                                    {group.name}
                                                </p>
                                                <span className="text-xs font-bold text-gray-400">
                                                    {group.language}
                                                </span>
                                            </div>

                                            {/* Show exact format with line breaks visible */}
                                            <div className="bg-[var(--soup-beige)]/20 rounded-xl p-4 font-mono text-sm">
                                                <pre className="whitespace-pre-wrap font-bold text-[var(--soup-dark)] leading-relaxed">
                                                    {exactFormat}
                                                </pre>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                onClick={approveChallenge}
                                disabled={translating}
                                className="px-10 py-4 bg-[var(--soup-turquoise)] text-white rounded-[20px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                {translating ? (
                                    <>
                                        <Clock size={20} className="animate-spin" />
                                        Translating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Approve & Schedule ✅
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
// force deploy
