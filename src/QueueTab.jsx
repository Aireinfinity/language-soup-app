import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Calendar, Trash2, Send, Clock, CheckCircle, Edit2, X, Check } from 'lucide-react';
import { predictResponseRate, logChallengeSent } from './soupPredictor';
import { translateText } from './translationHelper';

export default function QueueTab({ user, groups = [], getDeepLLangCode, getGoogleLangCode, handleSendToGroups }) {
    const [queuedChallenges, setQueuedChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftText, setDraftText] = useState('');
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

    // Past challenges for inspiration
    const [pastChallenges, setPastChallenges] = useState({ top: [], recent: [] });

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

            // Load past challenges for inspiration
            loadPastChallenges();
        } catch (err) {
            console.error('Error loading queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadPastChallenges = async () => {
        try {
            // Get recent sent challenges
            const { data: recent } = await supabase
                .from('app_scheduled_challenges')
                .select('challenge_text')
                .eq('status', 'sent')
                .order('scheduled_time', { ascending: false })
                .limit(5);

            // Get top performers from challenge_performance_log
            // Filter by date >= 2026-01-01 to only get app challenges (not WhatsApp)
            const { data: top } = await supabase
                .from('challenge_performance_log')
                .select('challenge_text, response_rate, sent_at')
                .gte('sent_at', '2026-01-01')
                .not('response_rate', 'is', null)
                .order('response_rate', { ascending: false })
                .limit(5);

            // Format: remove #challenge prefix and get first sentence only
            const formatChallenge = (text) => {
                if (!text) return '';
                return text
                    .replace(/^#challenge\s*/i, '')
                    .split('\n')[0]
                    .trim();
            };

            setPastChallenges({
                recent: (recent || []).map(c => formatChallenge(c.challenge_text)),
                top: (top || []).slice(0, 3).map(c => ({
                    text: formatChallenge(c.challenge_text),
                    rate: c.response_rate ? Math.round(c.response_rate) : null
                }))
            });
            console.log('📊 Loaded past challenges:', { recent: recent?.length, top: top?.length });
        } catch (err) {
            console.log('Could not load past challenges:', err.message);
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

    // Auto-schedule: find next available day and random time
    const getNextAvailableSlot = () => {
        const scheduledDates = new Set(
            queuedChallenges
                .filter(c => c.status !== 'sent')
                .map(c => new Date(c.scheduled_time).toDateString())
        );

        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1); // Start from tomorrow

        // Find next day without a challenge (up to 60 days out)
        for (let i = 0; i < 60; i++) {
            if (!scheduledDates.has(targetDate.toDateString())) {
                break;
            }
            targetDate.setDate(targetDate.getDate() + 1);
        }

        // Random time (0-23 hours, 0-59 minutes)
        const randomHour = Math.floor(Math.random() * 24);
        const randomMinute = Math.floor(Math.random() * 60);
        targetDate.setHours(randomHour, randomMinute, 0, 0);

        console.log('🗓️ Auto-scheduled for:', targetDate.toISOString());
        return targetDate;
    };

    const saveDraft = async () => {
        if (!draftText.trim()) {
            alert('Please enter challenge text');
            return;
        }

        const scheduleDate = getNextAvailableSlot();

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

            console.log('✅ Challenge queued:', draftText.trim().substring(0, 50));
            alert(`Challenge queued for ${scheduleDate.toLocaleDateString()}! 🎉`);
            setDraftText('');
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

        // Parse the scheduled time to date and time strings
        const scheduledDate = new Date(challenge.scheduled_time);

        // Format as YYYY-MM-DD for date input
        const dateStr = scheduledDate.toISOString().split('T')[0];
        setEditDay(dateStr);

        // Format as HH:MM for time input
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
            // Combine date and time directly
            const [hours, minutes] = editTime.split(':').map(Number);
            const newDate = new Date(editDay);
            newDate.setHours(hours, minutes, 0, 0);

            const { error } = await supabase
                .from('app_scheduled_challenges')
                .update({
                    challenge_text: editText.trim(),
                    scheduled_time: newDate.toISOString()
                })
                .eq('id', editingId);

            if (error) throw error;

            console.log('✅ Challenge updated, new time:', newDate.toISOString());
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
            const cachedTranslations = translationCache[challenge.challenge_text];
            setTranslations(cachedTranslations);
            setTranslating(false);

            // SAVE IMMEDIATELY (Even if cached)
            // Ensure DB is always in sync with what user sees
            await supabase
                .from('app_scheduled_challenges')
                .update({ translations: cachedTranslations })
                .eq('id', challenge.id);
            return;
        }

        setTranslating(true);

        try {
            // Get unique languages from groups
            const uniqueLanguages = [...new Set(groups.map(g => g.language))];

            // Translate all languages in PARALLEL for speed!
            const translationPromises = uniqueLanguages.map(async (language) => {
                const translated = await translateText(
                    challenge.challenge_text,
                    language,
                    getDeepLLangCode,
                    getGoogleLangCode,
                    supabase
                );
                return [language, translated];
            });

            // Wait for all translations to complete
            const translationPairs = await Promise.all(translationPromises);
            const translationResults = Object.fromEntries(translationPairs);

            setTranslations(translationResults);

            console.log('🔮 Generated Translations:', translationResults); // DEBUG

            // --- SIMPLIFICATION: CONSTRUCT FINAL FORMATTED MESSAGES (WYSIWYG) ---
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
            const fullMessages = {};

            // Calculate the exact string for every language
            uniqueLanguages.forEach(lang => {
                const isEnglish = lang.toLowerCase() === 'english';
                const trans = translationResults[lang];

                if (isEnglish) {
                    fullMessages[lang] = `#challenge\n${cleanEnglish}`;
                } else {
                    // Foreign groups get: Header + English + Translation
                    fullMessages[lang] = `#challenge\n${cleanEnglish}\n${trans || cleanEnglish}`;
                }
            });

            console.log('💾 Saving Final WYSIWYG Messages:', fullMessages);

            // UPDATE STATE & CACHE WITH FULL MESSAGES
            setTranslations(fullMessages);

            setTranslationCache(prev => ({
                ...prev,
                [challenge.challenge_text]: fullMessages
            }));

            // SAVE FINAL MESSAGES TO DB
            const { error: saveError } = await supabase
                .from('app_scheduled_challenges')
                .update({
                    translations: fullMessages
                })
                .eq('id', challenge.id);

            if (saveError) console.error('❌ DB Save Failed:', saveError);
            else console.log('✅ DB Save Success!');

        } catch (err) {
            console.error('Translation error:', err);
            alert('Some translations failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };
    const approveChallenge = async () => {
        try {
            // SAFEGUARD: Ensure translations exist before saving
            let finalTranslations = { ...translations };

            // If we are regenerating (user skipped preview), we need to do the full construction too
            if (Object.keys(finalTranslations).length === 0) {
                console.log('Translations missing, generating on fly...');
                setTranslating(true);

                // 1. Get languages
                const uniqueLanguages = [...new Set(groups.map(g => g.language))];

                // 2. Translate in parallel
                const translationPromises = uniqueLanguages.map(async (language) => {
                    const translated = await translateText(
                        selectedChallenge.challenge_text,
                        language,
                        getDeepLLangCode,
                        getGoogleLangCode,
                        supabase
                    );
                    return [language, translated];
                });

                const translationPairs = await Promise.all(translationPromises);
                const rawResults = Object.fromEntries(translationPairs);

                // 3. CONSTRUCT FORMATTED MESSAGES (Same logic as Preview)
                const cleanEnglish = selectedChallenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
                uniqueLanguages.forEach(lang => {
                    const isEnglish = lang.toLowerCase() === 'english';
                    const trans = rawResults[lang];

                    if (isEnglish) {
                        finalTranslations[lang] = `#challenge\n${cleanEnglish}`;
                    } else {
                        finalTranslations[lang] = `#challenge\n${cleanEnglish}\n${trans || cleanEnglish}`;
                    }
                });

                setTranslating(false);
            }

            // SAVE FINAL MESSAGES TO DB
            await supabase
                .from('app_scheduled_challenges')
                .update({
                    status: 'approved',
                    translations: finalTranslations // Saves full message structure
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
                const translated = await translateText(
                    cleanEnglish,
                    language,
                    getDeepLLangCode,
                    getGoogleLangCode,
                    supabase
                );
                return [language, translated];
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
            {/* Daily Pulse - Quick Health Check */}
            <div className="mb-8 bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                <h2 className="text-2xl font-black text-[var(--soup-dark)] tracking-tight mb-4">Daily Pulse 🩺</h2>

                <div className="grid grid-cols-3 gap-4">
                    {/* Today's Challenge */}
                    {(() => {
                        const today = new Date().toDateString();
                        const todayChallenge = [...queuedChallenges].find(c =>
                            new Date(c.scheduled_time).toDateString() === today
                        );
                        const wasSent = todayChallenge?.status === 'sent';
                        const isApproved = todayChallenge?.status === 'approved';

                        return (
                            <div className={`p-4 rounded-2xl ${wasSent ? 'bg-green-50 border-2 border-green-200' : isApproved ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-red-50 border-2 border-red-200'}`}>
                                <div className="text-2xl mb-1">{wasSent ? '✅' : isApproved ? '⏳' : '❌'}</div>
                                <div className="text-xs font-black text-gray-500 uppercase">Today</div>
                                <div className="text-sm font-bold text-[var(--soup-dark)]">
                                    {wasSent ? 'Sent!' : isApproved ? 'Scheduled' : 'No challenge'}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Queue Coverage */}
                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const futureChallenges = [...pendingChallenges, ...approvedChallenges].filter(c =>
                            new Date(c.scheduled_time) >= today
                        );
                        const daysWithChallenges = new Set(
                            futureChallenges.map(c => new Date(c.scheduled_time).toDateString())
                        ).size;

                        const isGood = daysWithChallenges >= 7;
                        const isOkay = daysWithChallenges >= 3;

                        return (
                            <div className={`p-4 rounded-2xl ${isGood ? 'bg-green-50 border-2 border-green-200' : isOkay ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-red-50 border-2 border-red-200'}`}>
                                <div className="text-2xl mb-1">{isGood ? '🟢' : isOkay ? '🟡' : '🔴'}</div>
                                <div className="text-xs font-black text-gray-500 uppercase">Queue</div>
                                <div className="text-sm font-bold text-[var(--soup-dark)]">
                                    {daysWithChallenges} days covered
                                </div>
                            </div>
                        );
                    })()}

                    {/* Pending Review */}
                    <div className={`p-4 rounded-2xl ${pendingChallenges.length === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
                        <div className="text-2xl mb-1">{pendingChallenges.length === 0 ? '✅' : '📝'}</div>
                        <div className="text-xs font-black text-gray-500 uppercase">Pending</div>
                        <div className="text-sm font-bold text-[var(--soup-dark)]">
                            {pendingChallenges.length === 0 ? 'All approved' : `${pendingChallenges.length} to review`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Draft Form */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <h3 className="text-xl font-black text-[var(--soup-dark)] mb-4">Create New Challenge</h3>

                {/* Prompt Ideas - always visible for inspiration */}
                <div className="mb-4 p-4 bg-[var(--soup-beige)]/50 rounded-xl border border-[var(--soup-turquoise)]/20">
                    <span className="text-xs font-black text-[var(--soup-turquoise)] uppercase tracking-wider">💡 Need ideas? Click one:</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {[
                            "what song are you listening to right now? 🎧",
                            "share a photo of something that made you smile today 📸",
                            "what's a word in your language that doesn't translate? 🤔",
                            "what did you eat for breakfast? 🍳",
                            "describe your mood using only emojis 😎",
                            "what's your favorite thing about where you live? 🏡",
                            "share a memory from your childhood 🧒",
                            "what's something you learned recently? 🧠"
                        ].map((idea, i) => (
                            <button
                                key={i}
                                onClick={() => setDraftText(idea)}
                                className="px-3 py-2 bg-white hover:bg-[var(--soup-turquoise)]/10 rounded-lg border border-[var(--soup-turquoise)]/20 text-sm font-medium text-[var(--soup-dark)] transition-all hover:scale-105"
                            >
                                {idea}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Performers - if we have data */}
                {pastChallenges.top.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-100">
                        <span className="text-xs font-black text-green-600 uppercase tracking-wider">🔥 Top performers (click to reuse):</span>
                        <div className="mt-3 space-y-2">
                            {pastChallenges.top.slice(0, 3).map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => setDraftText(c.text)}
                                    className="block w-full text-left p-3 bg-white hover:bg-green-100 rounded-lg border border-green-200 transition-all"
                                >
                                    {c.rate && <span className="text-xs font-black text-green-500">{c.rate}% response rate</span>}
                                    <p className={`text-sm text-[var(--soup-dark)] font-medium ${c.rate ? 'mt-1' : ''}`}>{c.text}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Challenges - don't repeat */}
                {pastChallenges.recent.length > 0 && (
                    <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <span className="text-xs font-black text-orange-500 uppercase tracking-wider">⚠️ Recently sent (don't repeat):</span>
                        <div className="mt-3 space-y-2">
                            {pastChallenges.recent.slice(0, 3).map((c, i) => (
                                <div key={i} className="p-2 bg-white rounded-lg border border-orange-200">
                                    <p className="text-sm text-gray-600">{c}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

                {/* Simplified: Just one button, auto-schedules */}
                <button
                    onClick={saveDraft}
                    disabled={saving || !draftText.trim()}
                    className="w-full px-8 py-4 bg-[var(--soup-turquoise)] text-white rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                >
                    <Calendar size={24} />
                    {saving ? 'Adding...' : 'Add to Queue'}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2 font-bold">
                    Auto-schedules for the next available day at a random time
                </p>
            </div>

            {/* Calendar View */}
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="px-8 py-4 bg-[var(--soup-beige)]/30 border-b border-black/5">
                    <h3 className="text-lg font-black text-[var(--soup-dark)]">Challenge Calendar 📅</h3>
                    <p className="text-xs text-gray-500 font-bold mt-1">{pendingChallenges.length} pending • {approvedChallenges.length} approved</p>
                </div>

                {/* Calendar Grid */}
                <div className="p-6">
                    {(() => {
                        const days = [];
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        for (let i = 0; i < 60; i++) {
                            const day = new Date(today);
                            day.setDate(day.getDate() + i);
                            days.push(day);
                        }

                        const challengesByDate = {};
                        [...pendingChallenges, ...approvedChallenges].forEach(c => {
                            const dateKey = new Date(c.scheduled_time).toDateString();
                            challengesByDate[dateKey] = c;
                        });

                        const months = {};
                        days.forEach(day => {
                            const monthKey = day.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            if (!months[monthKey]) months[monthKey] = [];
                            months[monthKey].push(day);
                        });

                        return (
                            <div className="space-y-6">
                                {Object.entries(months).map(([monthName, monthDays]) => (
                                    <div key={monthName}>
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">{monthName}</h4>
                                        <div className="grid grid-cols-7 gap-1">
                                            {monthDays.map((day, i) => {
                                                const dateKey = day.toDateString();
                                                const challenge = challengesByDate[dateKey];
                                                const isToday = day.toDateString() === today.toDateString();

                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => challenge && startEditing(challenge)}
                                                        className={`p-1.5 rounded-lg text-center transition-all min-h-[60px] ${challenge ? 'cursor-pointer' : ''} ${isToday ? 'ring-2 ring-[var(--soup-turquoise)]' : ''} ${challenge?.status === 'approved' ? 'bg-green-100 hover:bg-green-200' : ''} ${challenge?.status === 'pending' ? 'bg-yellow-100 hover:bg-yellow-200' : ''} ${!challenge ? 'bg-gray-50' : ''}`}
                                                    >
                                                        <div className="text-[9px] font-bold text-gray-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                                        <div className="text-sm font-black text-[var(--soup-dark)]">{day.getDate()}</div>
                                                        {challenge && (
                                                            <div className={`text-[8px] font-bold leading-tight ${challenge.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                                {challenge.status === 'approved' ? '✓' : '⏳'}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Edit Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cancelEditing}>
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-[var(--soup-dark)] mb-4">Edit Challenge</h3>
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold text-base mb-4"
                            rows={4}
                        />
                        <div className="flex gap-3 mb-4">
                            <input
                                type="date"
                                value={editDay}
                                onChange={(e) => setEditDay(e.target.value)}
                                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold cursor-pointer"
                            />
                            <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-[var(--soup-turquoise)]/30 rounded-xl focus:ring-0 font-bold"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={cancelEditing} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black hover:bg-gray-200 transition-all">Cancel</button>
                            <button onClick={() => { if (confirm('Delete?')) { deleteChallenge(editingId); cancelEditing(); } }} className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-black hover:bg-red-200 transition-all"><Trash2 size={16} /></button>
                            <button onClick={saveEdit} className="flex-1 px-6 py-3 bg-[var(--soup-turquoise)] text-white rounded-xl font-black hover:scale-105 transition-all">Save</button>
                        </div>
                        {queuedChallenges.find(c => c.id === editingId)?.status === 'pending' && (
                            <button onClick={() => { approveChallenge(editingId); cancelEditing(); }} className="w-full mt-4 px-6 py-3 bg-green-500 text-white rounded-xl font-black hover:scale-105 transition-all flex items-center justify-center gap-2"><Check size={16} /> Approve</button>
                        )}
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
                            all groups • {Object.keys(translations).length} languages
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
                                    // SIMPLIFIED: Just show what is in the "translations" object.
                                    // It now holds the FULL message (Header + English + Translation).
                                    // This is true WYSIWYG.
                                    const exactFormat = translations[group.language] || "Loading...";

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
