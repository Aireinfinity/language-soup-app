import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Calendar, Trash2, Send, Clock, CheckCircle, Edit2, X, Check } from 'lucide-react';
import { predictResponseRate, logChallengeSent } from './soupPredictor';
import { translateText } from './translationHelper';

// Fixed holidays and special days (month 1–12, day 1–31). Global audience, not just European.
const SPECIAL_DAYS = [
    { month: 1, day: 1, label: "New Year's" },
    { month: 2, day: 14, label: "Valentine's" },
    { month: 2, day: 21, label: "Mother Language Day" },
    { month: 3, day: 8, label: "Intl Women's Day" },
    { month: 3, day: 17, label: "St. Patrick's" },
    { month: 3, day: 20, label: "Nowruz" },
    { month: 4, day: 22, label: "Earth Day" },
    { month: 4, day: 23, label: "World Book Day" },
    { month: 6, day: 21, label: "Summer solstice" },
    { month: 7, day: 4, label: "July 4th" },
    { month: 7, day: 14, label: "Bastille Day" },
    { month: 9, day: 26, label: "European Day of Languages" },
    { month: 10, day: 31, label: "Halloween" },
    { month: 11, day: 1, label: "Día de Muertos" },
    { month: 12, day: 18, label: "Arabic Language Day" },
    { month: 12, day: 24, label: "Christmas Eve" },
    { month: 12, day: 25, label: "Christmas" },
    { month: 12, day: 31, label: "New Year's Eve" },
];

// Variable dates (lunar / cultural). Year -> [{ month, day, label }]. Update annually if needed.
const VARIABLE_SPECIAL_DAYS = {
    2025: [
        { month: 1, day: 29, label: "Chinese New Year" },
        { month: 3, day: 1, label: "Ramadan starts" },
        { month: 10, day: 20, label: "Diwali" },
    ],
    2026: [
        { month: 2, day: 17, label: "Chinese New Year" },
        { month: 2, day: 18, label: "Ramadan starts" },
        { month: 11, day: 1, label: "Diwali" },
    ],
    2027: [
        { month: 2, day: 6, label: "Chinese New Year" },
        { month: 2, day: 8, label: "Ramadan starts" },
        { month: 10, day: 21, label: "Diwali" },
    ],
};

function getSpecialDay(date) {
    const d = new Date(date);
    const m = d.getMonth() + 1, day = d.getDate();
    const fixed = SPECIAL_DAYS.find(s => s.month === m && s.day === day);
    if (fixed) return fixed;
    const year = d.getFullYear();
    const variable = (VARIABLE_SPECIAL_DAYS[year] || []).find(s => s.month === m && s.day === day);
    return variable || null;
}

// Show when a challenge goes out in key regions (for "all timezones" view). First row = your (browser) time, then global.
const TZ_LABELS = [
    { tz: 'America/Los_Angeles', label: 'LA' },
    { tz: 'America/New_York', label: 'NYC' },
    { tz: 'Europe/London', label: 'London' },
    { tz: 'Europe/Paris', label: 'Paris' },
    { tz: 'Asia/Tokyo', label: 'Tokyo' },
    { tz: 'Australia/Sydney', label: 'Sydney' },
    { tz: 'America/Sao_Paulo', label: 'São Paulo' },
];
function getTimesByRegion(scheduledTimeIso) {
    if (!scheduledTimeIso) return [];
    const d = new Date(scheduledTimeIso);
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const yourTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: browserTz }).format(d);
    const rest = TZ_LABELS.map(({ tz, label }) => ({
        label,
        time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(d)
    }));
    return [{ label: 'You', time: yourTime }, ...rest];
}

// Big pool of prompt ideas - random ones shown each time
// Inspired by The Artist's Way (Julia Cameron), Pinterest, and life-in-your-20s vibes — reflective, creative, human.
// Emoji guideline: default to black/dark skin tone (🏿) for hand/body emojis — never yellow.
// Mixed pool: fun + light depth + interview-inspired (community, connection, life stories, low pressure)
const ALL_PROMPT_IDEAS = [
    // ——— Fun & easy ———
    "what song are you listening to right now? 🎧",
    "what did you eat for breakfast? 🍳",
    "what's your comfort food? 🍜",
    "what's making you happy today? ✨",
    "what's your go-to snack? 🍿",
    "what's your favorite way to relax? 🧘",
    "what movie could you watch 100 times? 🎬",
    "what's the last photo you took? 📸",
    "show us your view right now 🌅",
    "what makes you laugh uncontrollably? 😂",
    "what's your favorite local slang word? 🗣️",
    "what's a song that always gets you dancing? 💃",
    "show us your pets (or plants!) 🌿",
    "what's your favorite ice cream flavor? 🍦",
    "describe your mood using only emojis 😎",
    "what language are you learning and why? 🌍",
    // ——— Life stories / connection (interview-inspired) ———
    "what's a tradition in your culture? 🎊",
    "share a song that reminds you of home 🎵",
    "what's something you learned recently? 🧠",
    "what's your morning routine? ☀️",
    "what did you dream about last night? 💭",
    "what's a word in your language that doesn't translate? 🤔",
    "what's your favorite thing about where you live? 🏡",
    "who's someone you're grateful for and why? 💛",
    "what's a small win from this week? 🏆",
    "what would you tell a friend who's learning your language? 🤝",
    "what's the kindest thing someone said to you recently? 💛",
    "what's something beautiful you noticed today? 👀",
    "describe your perfect weekend 🛋️",
    "what's your favorite holiday tradition? 🎄",
    "what's something you collect? 🧸",
    // ——— Artist's Way / gentle depth ———
    "what would you try if you knew you couldn't fail? 🚀",
    "what's something you're secretly good at? 🌟",
    "what song or place makes you feel most like yourself? 🎵",
    "what did you love creating when you were a kid? 🧒",
    "what's a hobby you gave up that you miss? 💭",
    "what would you make if you had one uninterrupted hour? ⏳",
    "what's a rule you're ready to break? 🔓",
    "what do you wish you had more time to create? 🎨",
    "what's one thing your inner critic says that you're ready to ignore? 🗣️",
    "where would you go on a solo 'artist date' just to fill the well? 🎨",
    "what's your version of morning pages — what do you need to get out of your head? 📝",
    // ——— From user interviews: community, connection, low pressure, life stories ———
    "what's one thing you'd tell someone who's scared to speak in a new language? 🗣️",
    "who's someone you practice with (or wish you could)? 🤝",
    "what's a phrase you use all the time in your language? 💬",
    "what made you laugh in your target language recently? 😂",
    "what's the nicest thing another learner said to you? 💛",
    "what's a small win you had this week with the language? 🏆",
    "if you could have coffee with any native speaker, who and why? ☕",
    "what's something you're proud of saying out loud? 🌟",
    "what's a goal you're working towards with this language? 🎯",
    "what do you do when you don't feel like practicing? 🛋️",
    // ——— Learn from others' stories (not invasive; typical day, habits, small details) ———
    "what does a typical day look like for you? ☀️",
    "do you usually walk or drive to work (or wherever you go)? 🚶",
    "what's the first thing you do when you wake up? 🌅",
    "how do you usually get your coffee or tea? ☕",
    "what do you do to unwind after a long day? 🛋️",
    "what's a small ritual you have that you really love? ✨",
    "what does your morning look like before you leave the house? 🏠",
    "do you cook most days or grab something? 🍳",
    "what's one thing you always have in your bag or pocket? 🎒",
    "how do you get around your city or town? 🚌",
    "what's your favorite time of day and why? ⏰",
    "what do you do on a lazy weekend? 📖",
    "where do you usually work or study? 💻",
    "what's a phrase you say every day in your language? 💬",
    "who do you usually eat dinner with? 🍽️",
    "what's one thing that's different about life where you live? 🌍",
];

const getRandomIdeas = (count = 6, exclude = [], recentlyShown = []) => {
    const excludeSet = new Set([...exclude, ...(recentlyShown || []).slice(-18)]); // exclude sent + last 18 shown so we cycle
    const available = ALL_PROMPT_IDEAS.filter(i => !excludeSet.has(i));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

// Dynamic mix: up to 2 from top performers (response-rate data), rest from pool. Never from recent history.
const getDynamicIdeas = (count, exclude, topPerformers = [], recentlyShown = []) => {
    const fromTop = (topPerformers || [])
        .map(t => (typeof t === 'string' ? t : t?.text))
        .filter(Boolean)
        .filter(text => !exclude.includes(text));
    const fromPool = getRandomIdeas(count - Math.min(2, fromTop.length), [...exclude, ...fromTop], recentlyShown);
    const topPicks = fromTop.slice(0, 2).sort(() => Math.random() - 0.5);
    return [...topPicks, ...fromPool].slice(0, count).sort(() => Math.random() - 0.5);
};

export default function QueueTab({ user, groups = [], getDeepLLangCode, getGoogleLangCode, handleSendToGroups }) {
    const [queuedChallenges, setQueuedChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftText, setDraftText] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [translations, setTranslations] = useState({});
    const [translating, setTranslating] = useState(false);
    const [translationFallbackUsed, setTranslationFallbackUsed] = useState(false);
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDay, setEditDay] = useState('');
    const [editTime, setEditTime] = useState('');
    const [translationCache, setTranslationCache] = useState({});
    const [showSoupInfo, setShowSoupInfo] = useState(false);
    const [prediction, setPrediction] = useState(null);

    // Random prompt ideas - exclude already-sent and used; track recently shown so we cycle (less repetition)
    const [excludedSentTexts, setExcludedSentTexts] = useState([]);
    const [promptIdeas, setPromptIdeas] = useState([]);
    const [usedIdeas, setUsedIdeas] = useState([]);
    const recentlyShownRef = useRef([]);

    // Past challenges for inspiration
    const [pastChallenges, setPastChallenges] = useState({ top: [], recent: [] });
    // Sent challenges from last 7 days (so "Past 3 days" always has data; main queue can be capped at 1000)
    const [recentSentChallenges, setRecentSentChallenges] = useState([]);

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

    // Dynamic ideas: top performers + new prompts; exclude sent + recently shown so we see more variety
    useEffect(() => {
        const recent = recentlyShownRef.current;
        const next = getDynamicIdeas(6, excludedSentTexts, pastChallenges.top, recent);
        setPromptIdeas(next);
        recentlyShownRef.current = [...recent, ...next].slice(-24);
    }, [excludedSentTexts, pastChallenges.top]);

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
                .select('id, created_by, challenge_text, scheduled_time, status, translations, created_at')
                .order('scheduled_time', { ascending: true });

            if (error) throw error;
            const normalized = (data || []).map((row) => {
                let trans = row.translations;
                if (typeof trans === 'string') {
                    try { trans = JSON.parse(trans); } catch (_) { trans = null; }
                }
                return { ...row, translations: trans ?? null };
            });
            setQueuedChallenges(normalized);

            // Load sent challenges from last 14 days so "Past 3 days" has data (timezone + sparse sends)
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            const { data: recentSent } = await supabase
                .from('app_scheduled_challenges')
                .select('id, created_by, challenge_text, scheduled_time, status, translations, created_at')
                .eq('status', 'sent')
                .gte('scheduled_time', fourteenDaysAgo.toISOString())
                .order('scheduled_time', { ascending: false })
                .limit(100);
            setRecentSentChallenges(recentSent || []);

            // Load past challenges for inspiration
            loadPastChallenges();
        } catch (err) {
            console.error('Error loading queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatChallengeText = (text) => {
        if (!text) return '';
        return text
            .replace(/^#challenge\s*/i, '')
            .split('\n')[0]
            .trim();
    };

    const loadPastChallenges = async () => {
        try {
            // Get recent sent challenges (for "recent" display)
            const { data: recent } = await supabase
                .from('app_scheduled_challenges')
                .select('challenge_text')
                .eq('status', 'sent')
                .order('scheduled_time', { ascending: false })
                .limit(5);

            // Get ALL sent challenge texts so we never suggest them again
            const { data: allSent } = await supabase
                .from('app_scheduled_challenges')
                .select('challenge_text')
                .eq('status', 'sent');

            const excluded = (allSent || []).map(c => formatChallengeText(c.challenge_text)).filter(Boolean);
            setExcludedSentTexts(excluded);

            // Get top performers from challenge_performance_log
            const { data: top } = await supabase
                .from('challenge_performance_log')
                .select('challenge_text, response_rate, sent_at')
                .gte('sent_at', '2026-01-01')
                .not('response_rate', 'is', null)
                .order('response_rate', { ascending: false })
                .limit(5);

            setPastChallenges({
                recent: (recent || []).map(c => formatChallengeText(c.challenge_text)),
                top: (top || []).slice(0, 3).map(c => ({
                    text: formatChallengeText(c.challenge_text),
                    rate: c.response_rate ? Math.round(c.response_rate) : null
                }))
            });
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
            // 1. Insert the challenge as APPROVED (auto-translations below; cron will send at scheduled time)
            const { data: newChallenge, error } = await supabase
                .from('app_scheduled_challenges')
                .insert({
                    created_by: user.id,
                    challenge_text: draftText.trim(),
                    scheduled_time: scheduleDate.toISOString(),
                    status: 'approved'
                })
                .select()
                .single();

            if (error) throw error;

            // 2. Generate Translations (Synchronously now, to ensure they aren't "missing")
            try {
                const uniqueLanguages = [...new Set(groups.map(g => g.language).filter(Boolean))];
                console.log('[QueueTab saveDraft] groups:', groups.length, '| languages:', uniqueLanguages);
                if (uniqueLanguages.length === 0) {
                    console.warn('⚠️ No groups with language; translations will be empty. Add groups in Groups & Requests.');
                }

                const cleanEnglish = newChallenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
                console.log('[QueueTab saveDraft] cleanEnglish (first 60 chars):', cleanEnglish.substring(0, 60) + (cleanEnglish.length > 60 ? '…' : ''));
                const translationPromises = uniqueLanguages.map(async (language) => {
                    console.log('[QueueTab saveDraft] translating to:', language);
                    const translated = await translateText(
                        cleanEnglish,
                        language,
                        getDeepLLangCode,
                        getGoogleLangCode,
                        supabase
                    );
                    const isFallback = translated === cleanEnglish || !translated;
                    console.log('[QueueTab saveDraft]', language, '→', isFallback ? '⚠️ FALLBACK (same as English)' : '✅ translated', isFallback ? '' : `(${translated?.length ?? 0} chars)`);
                    return [language, translated];
                });

                const translationPairs = await Promise.all(translationPromises);
                const rawResults = Object.fromEntries(translationPairs);

                const finalTranslations = {};

                uniqueLanguages.forEach(lang => {
                    const isEnglish = lang.toLowerCase() === 'english';
                    const trans = rawResults[lang];
                    if (isEnglish) {
                        finalTranslations[lang] = `#challenge\n${cleanEnglish}`;
                    } else {
                        finalTranslations[lang] = `#challenge\n${cleanEnglish}\n${trans || cleanEnglish}`;
                    }
                });

                // Update the record with translations
                const { error: updateErr } = await supabase
                    .from('app_scheduled_challenges')
                    .update({ translations: finalTranslations })
                    .eq('id', newChallenge.id);

                if (updateErr) {
                    console.error('❌ Failed to save translations:', updateErr);
                    alert('Translations generated but save failed. You can use Backfill Translations or open Preview and Approve to save them.');
                } else {
                    console.log('✅ Auto-translations generated and saved.');
                }

            } catch (transErr) {
                console.error('Translation failed:', transErr);
                alert('Warning: Translations failed. You may need to regenerate them manually.');
            }

            console.log('✅ Challenge queued:', draftText.trim().substring(0, 50));
            setDraftText('');
            loadQueue(); // Refresh UI only AFTER translations are done

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

    // Helper: get value from translations object by language (case-insensitive key match)
    const getTranslationForLang = (transObj, lang) => {
        if (!transObj || typeof transObj !== 'object' || !lang) return null;
        if (transObj[lang] !== undefined && transObj[lang] !== null) return transObj[lang];
        const key = Object.keys(transObj).find(k => String(k).toLowerCase() === String(lang).toLowerCase());
        return key ? transObj[key] : null;
    };

    // For Backfill: treat as "missing" if no translation OR (non-English) translation is just the English fallback
    const hasValidTranslation = (transObj, lang, cleanEnglish) => {
        const raw = getTranslationForLang(transObj, lang);
        if (!raw || typeof raw !== 'string') return false;
        if (String(lang).toLowerCase() === 'english') return true;
        const parts = raw.replace(/^#challenge\s*/i, '').trim().split('\n');
        const translatedPart = parts.length > 1 ? parts.slice(1).join('\n').trim() : '';
        return translatedPart.length > 0 && translatedPart !== cleanEnglish;
    };

    const openPreview = async (challenge) => {
        setSelectedChallenge(challenge);
        setShowPreview(true);

        let existing = challenge.translations;
        if (typeof existing === 'string') {
            try { existing = JSON.parse(existing); } catch (_) { existing = null; }
        }
        const requiredLangs = [...new Set(groups.map(g => g.language).filter(Boolean))];
        const hasCompleteTranslations = existing && typeof existing === 'object' && requiredLangs.length > 0 && requiredLangs.every(lang => getTranslationForLang(existing, lang));
        if (hasCompleteTranslations) {
            setTranslations(existing);
            setTranslating(false);
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
            const anyFallback = requiredLangs.some(lang => {
                if (String(lang).toLowerCase() === 'english') return false;
                const raw = getTranslationForLang(existing, lang);
                const parts = (raw || '').replace(/^#challenge\s*/i, '').trim().split('\n');
                const translatedPart = parts.length > 1 ? parts.slice(1).join('\n').trim() : '';
                return !translatedPart || translatedPart === cleanEnglish;
            });
            setTranslationFallbackUsed(anyFallback);
            return;
        }

        if (translationCache[challenge.challenge_text]) {
            const cached = translationCache[challenge.challenge_text];
            setTranslations(cached);
            setTranslating(false);
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
            const anyFallback = Object.keys(cached).some(lang => {
                if (String(lang).toLowerCase() === 'english') return false;
                const raw = cached[lang];
                const parts = (raw || '').replace(/^#challenge\s*/i, '').trim().split('\n');
                const translatedPart = parts.length > 1 ? parts.slice(1).join('\n').trim() : '';
                return !translatedPart || translatedPart === cleanEnglish;
            });
            setTranslationFallbackUsed(anyFallback);
            await supabase.from('app_scheduled_challenges').update({ translations: cached }).eq('id', challenge.id);
            return;
        }

        setTranslating(true);
        setTranslationFallbackUsed(false);
        try {
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
            const uniqueLanguages = [...new Set(groups.map(g => g.language).filter(Boolean))];
            console.log('[QueueTab openPreview] languages:', uniqueLanguages, '| cleanEnglish (first 50):', cleanEnglish.substring(0, 50) + '…');
            const translationPromises = uniqueLanguages.map(async (language) => {
                console.log('[QueueTab openPreview] translating to:', language);
                const translated = await translateText(
                    cleanEnglish,
                    language,
                    getDeepLLangCode,
                    getGoogleLangCode,
                    supabase
                );
                console.log('[QueueTab openPreview]', language, '→', translated === cleanEnglish ? '⚠️ FALLBACK' : '✅', translated?.substring?.(0, 40) + (translated?.length > 40 ? '…' : ''));
                return [language, translated];
            });
            const translationPairs = await Promise.all(translationPromises);
            const translationResults = Object.fromEntries(translationPairs);
            const fullMessages = {};
            let anyFallback = false;
            uniqueLanguages.forEach(lang => {
                const isEnglish = String(lang).toLowerCase() === 'english';
                const trans = translationResults[lang];
                if (isEnglish) {
                    fullMessages[lang] = `#challenge\n${cleanEnglish}`;
                } else {
                    if (trans === cleanEnglish || !trans) anyFallback = true;
                    fullMessages[lang] = `#challenge\n${cleanEnglish}\n${trans || cleanEnglish}`;
                }
            });
            setTranslationFallbackUsed(anyFallback);
            setTranslations(fullMessages);
            setTranslationCache(prev => ({ ...prev, [challenge.challenge_text]: fullMessages }));
            const { error: saveError } = await supabase
                .from('app_scheduled_challenges')
                .update({ translations: fullMessages })
                .eq('id', challenge.id);
            if (saveError) console.error('❌ DB Save Failed:', saveError);
        } catch (err) {
            console.error('Translation error:', err);
            setTranslationFallbackUsed(true);
            alert('Some translations failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };

    const regenerateTranslationsInPreview = async () => {
        if (!selectedChallenge) return;
        setTranslationCache(prev => {
            const next = { ...prev };
            delete next[selectedChallenge.challenge_text];
            return next;
        });
        setTranslating(true);
        setTranslationFallbackUsed(false);
        try {
            const challenge = selectedChallenge;
            const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
            const uniqueLanguages = [...new Set(groups.map(g => g.language).filter(Boolean))];
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
            const fullMessages = {};
            let anyFallback = false;
            uniqueLanguages.forEach(lang => {
                const isEnglish = String(lang).toLowerCase() === 'english';
                const trans = translationResults[lang];
                if (isEnglish) {
                    fullMessages[lang] = `#challenge\n${cleanEnglish}`;
                } else {
                    if (trans === cleanEnglish || !trans) anyFallback = true;
                    fullMessages[lang] = `#challenge\n${cleanEnglish}\n${trans || cleanEnglish}`;
                }
            });
            setTranslationFallbackUsed(anyFallback);
            setTranslations(fullMessages);
            setTranslationCache(prev => ({ ...prev, [challenge.challenge_text]: fullMessages }));
            const { error: saveError } = await supabase
                .from('app_scheduled_challenges')
                .update({ translations: fullMessages })
                .eq('id', challenge.id);
            if (saveError) console.error('❌ DB Save Failed:', saveError);
            else console.log('✅ Translations regenerated and saved.');
        } catch (err) {
            console.error('Regenerate translations error:', err);
            setTranslationFallbackUsed(true);
            alert('Regenerate failed. Check console and try again.');
        } finally {
            setTranslating(false);
        }
    };

    const approveChallenge = async (challengeId = null) => {
        try {
            // Find the challenge - either from ID or selectedChallenge
            const challenge = challengeId
                ? queuedChallenges.find(c => c.id === challengeId)
                : selectedChallenge;

            if (!challenge) {
                alert('No challenge selected');
                return;
            }

            // SAFEGUARD: Ensure translations exist before saving
            let finalTranslations = { ...translations };

            // If we are regenerating (user skipped preview), we need to do the full construction too
            if (Object.keys(finalTranslations).length === 0) {
                console.log('Translations missing, generating on fly...');
                setTranslating(true);

                const uniqueLanguages = [...new Set(groups.map(g => g.language))];

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

                const translationPairs = await Promise.all(translationPromises);
                const rawResults = Object.fromEntries(translationPairs);

                const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
                // 3. CONSTRUCT FORMATTED MESSAGES (Same logic as Preview)
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
                .eq('id', challenge.id);

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


    const backfillTranslations = async () => {
        if (!confirm('This will find ALL pending/approved challenges with missing translations and generate them. Continue?')) return;

        setTranslating(true);
        try {
            // 1. Get all challenges that might need translation
            const { data: challenges, error } = await supabase
                .from('app_scheduled_challenges')
                .select('*')
                .or('status.eq.approved,status.eq.pending')
                .order('scheduled_time', { ascending: true });

            if (error) throw error;

            console.log('[QueueTab backfill] challenges:', challenges.length, '| groups:', groups.length);
            let updatedCount = 0;

            const uniqueLanguages = [...new Set(groups.map(g => g.language).filter(Boolean))];
            console.log('[QueueTab backfill] uniqueLanguages:', uniqueLanguages);
            if (uniqueLanguages.length === 0) {
                alert('No languages from groups. Load the dashboard with groups (Kitchen → Groups & Requests) and try again.');
                setTranslating(false);
                return;
            }

            for (const challenge of challenges) {
                let currentTrans = challenge.translations;
                if (typeof currentTrans === 'string') {
                    try { currentTrans = JSON.parse(currentTrans); } catch (_) { currentTrans = {}; }
                }
                if (!currentTrans || typeof currentTrans !== 'object') currentTrans = {};
                const cleanEnglish = challenge.challenge_text.replace(/^#challenge\s*/i, '').trim();
                const missingLangs = uniqueLanguages.filter(lang => !hasValidTranslation(currentTrans, lang, cleanEnglish));

                if (missingLangs.length > 0) {
                    console.log('[QueueTab backfill] challenge', challenge.id.substring(0, 8), 'missing langs:', missingLangs.join(', '));

                    // Generate missing translations
                    const newTrans = { ...currentTrans };

                    for (const lang of missingLangs) {
                        console.log('[QueueTab backfill] translating', lang, '…');
                        const translation = await translateText(
                            cleanEnglish,
                            lang,
                            getDeepLLangCode,
                            getGoogleLangCode,
                            supabase
                        );
                        const isFallback = translation === cleanEnglish || !translation;
                        console.log('[QueueTab backfill]', lang, '→', isFallback ? '⚠️ FALLBACK' : '✅', isFallback ? '' : `(${translation?.length ?? 0} chars)`);

                        // Construct format
                        const isEnglish = lang.toLowerCase() === 'english';
                        if (isEnglish) {
                            newTrans[lang] = `#challenge\n${cleanEnglish}`;
                        } else {
                            newTrans[lang] = `#challenge\n${cleanEnglish}\n${translation || cleanEnglish}`;
                        }
                    }

                    // Update challenge
                    await supabase
                        .from('app_scheduled_challenges')
                        .update({ translations: newTrans })
                        .eq('id', challenge.id);

                    updatedCount++;
                }
            }

            alert(`Backfill complete! Updated ${updatedCount} challenges.`);
            loadQueue();

        } catch (err) {
            console.error('Backfill failed:', err);
            alert('Backfill failed: ' + err.message);
        } finally {
            setTranslating(false);
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

            // Send to all groups with proper format (never send to DMs)
            for (const group of groups) {
                if (group.name === 'DM') continue;
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-[var(--soup-dark)] tracking-tight">Daily Pulse 🩺</h2>
                    <button
                        onClick={backfillTranslations}
                        disabled={translating}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-200 transition-all flex items-center gap-2"
                    >
                        {translating ? <Clock size={14} className="animate-spin" /> : '⚡'}
                        Backfill Translations
                    </button>
                </div>

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

                {/* What's going out – past 3 days (sent only) + tomorrow + next 7 days */}
                {(() => {
                    const challengesByDate = {};
                    // Past 3 days: use recentSentChallenges (explicit last-7-days fetch so we always have them)
                    // Match by local calendar date so "Past 3 days" lines up with what you expect
                    recentSentChallenges.forEach(c => {
                        if (!c?.scheduled_time) return;
                        const d = new Date(c.scheduled_time);
                        const dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
                        if (!challengesByDate[dateKey]) challengesByDate[dateKey] = c;
                    });
                    // Future: pending + approved from main queue
                    [...pendingChallenges, ...approvedChallenges].forEach(c => {
                        const dateKey = new Date(c.scheduled_time).toDateString();
                        challengesByDate[dateKey] = c;
                    });
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const past3 = [];
                    for (let i = 3; i >= 1; i--) {
                        const d = new Date(today);
                        d.setDate(d.getDate() - i);
                        past3.push({ date: d, challenge: challengesByDate[d.toDateString()] });
                    }
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowChallenge = challengesByDate[tomorrow.toDateString()];
                    // Next 7 days = day after tomorrow through 7 days out (tomorrow is shown above, so no duplicate)
                    const next7 = [];
                    for (let i = 1; i <= 7; i++) {
                        const d = new Date(tomorrow);
                        d.setDate(tomorrow.getDate() + i);
                        next7.push({ date: d, challenge: challengesByDate[d.toDateString()] });
                    }
                    const clean = (t) => (t || '').replace(/^#challenge\s*/i, '').trim().slice(0, 80) + ((t || '').length > 80 ? '…' : '');
                    const timesLine = (challenge) => {
                        if (!challenge?.scheduled_time) return null;
                        const byRegion = getTimesByRegion(challenge.scheduled_time);
                        return byRegion.map(({ label, time }) => `${label} ${time}`).join(' · ');
                    };
                    return (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-black text-[var(--soup-dark)] uppercase tracking-wider mb-4">What&apos;s going out</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                {/* Past 3 days — compact card */}
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Past 3 days</div>
                                    {past3.map(({ date, challenge }) => (
                                        <div key={date.toISOString()} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-xs font-bold text-gray-500 shrink-0 w-14">{date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                                            <span className="text-xs font-medium text-[var(--soup-dark)] leading-tight">{challenge ? clean(challenge.challenge_text) : '—'}</span>
                                            {challenge?.status === 'sent' && <span className="shrink-0 text-[9px] font-bold text-green-600">✓</span>}
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-gray-400 mt-2">No row = no challenge that day.</p>
                                </div>

                                {/* Tomorrow — highlight */}
                                <div className="rounded-2xl border-2 border-[var(--soup-turquoise)]/30 bg-[var(--soup-turquoise)]/5 p-4">
                                    <div className="text-[10px] font-black text-[var(--soup-turquoise)] uppercase tracking-wider mb-2">Tomorrow</div>
                                    <p className="text-sm font-bold text-[var(--soup-dark)] leading-snug">
                                        {tomorrowChallenge ? clean(tomorrowChallenge.challenge_text) : '— No challenge yet'}
                                    </p>
                                    {tomorrowChallenge?.scheduled_time && (
                                        <p className="text-[9px] text-gray-500 mt-2">{timesLine(tomorrowChallenge)}</p>
                                    )}
                                </div>

                                {/* Next 7 days — compact list */}
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Next 7 days</div>
                                    {next7.map(({ date, challenge }) => (
                                        <div key={date.toISOString()} className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                                            <span className="text-xs font-bold text-gray-500 shrink-0 w-14">{date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                                            <span className="text-xs font-medium text-[var(--soup-dark)] truncate">{challenge ? clean(challenge.challenge_text) : '—'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">One challenge per day per group; notifications by timezone.</p>
                        </div>
                    );
                })()}
            </div>

            {/* Draft Form */}
            <div className="mb-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <h3 className="text-xl font-black text-[var(--soup-dark)] mb-4">Create New Challenge</h3>

                {/* Prompt Ideas — mix of fun, depth, interview-inspired; dynamic (top performers when we have data) */}
                <div className="mb-4 p-4 bg-[var(--soup-beige)]/50 rounded-xl border border-[var(--soup-turquoise)]/20">
                    <span className="text-xs font-black text-[var(--soup-turquoise)] uppercase tracking-wider">💡 need ideas? (dynamic: high responders + new prompts)</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {promptIdeas.map((idea, i) => (
                            <button
                                key={idea}
                                onClick={() => {
                                    setDraftText(idea);
                                    const newUsed = [...usedIdeas, idea];
                                    setUsedIdeas(newUsed);
                                    const remaining = promptIdeas.filter(p => p !== idea);
                                    const next = getDynamicIdeas(1, [...remaining, ...newUsed, ...excludedSentTexts], pastChallenges.top, recentlyShownRef.current)[0];
                                    if (next) {
                                        setPromptIdeas([...remaining, next]);
                                        recentlyShownRef.current = [...recentlyShownRef.current, next].slice(-24);
                                    }
                                }}
                                className="px-3 py-2 bg-white hover:bg-[var(--soup-turquoise)]/10 rounded-lg border border-[var(--soup-turquoise)]/20 text-sm font-medium text-[var(--soup-dark)] transition-all hover:scale-105"
                            >
                                {idea}
                            </button>
                        ))}
                    </div>
                    {pastChallenges.top.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--soup-turquoise)]/20">
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">🔥 High response rate (from your data)</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {pastChallenges.top.slice(0, 3).map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setDraftText(c.text);
                                            const newUsed = [...usedIdeas, c.text];
                                            setUsedIdeas(newUsed);
                                            const remaining = promptIdeas.filter(p => p !== c.text);
                                            const next = getDynamicIdeas(1, [...remaining, ...newUsed, ...excludedSentTexts], pastChallenges.top, recentlyShownRef.current)[0];
                                            if (next) {
                                                setPromptIdeas([...remaining, next]);
                                                recentlyShownRef.current = [...recentlyShownRef.current, next].slice(-24);
                                            }
                                        }}
                                        className="px-2 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 text-xs font-medium text-[var(--soup-dark)]"
                                    >
                                        {c.rate != null ? `${c.rate}% · ` : ''}{(c.text || '').slice(0, 50)}{(c.text || '').length > 50 ? '…' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

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
                    <p className="text-xs text-gray-500 font-bold mt-1">{pendingChallenges.length} pending • {approvedChallenges.length} approved • <span className="text-[var(--soup-pink)]">pink ring = holiday / special day</span></p>
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
                                                const special = getSpecialDay(day);

                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => challenge && startEditing(challenge)}
                                                        className={`p-1.5 rounded-lg text-center transition-all min-h-[60px] ${challenge ? 'cursor-pointer' : ''} ${isToday ? 'ring-2 ring-[var(--soup-turquoise)]' : ''} ${special ? 'ring-1 ring-[var(--soup-pink)]/60 bg-[var(--soup-pink)]/5' : ''} ${challenge?.status === 'approved' ? 'bg-green-100 hover:bg-green-200' : ''} ${challenge?.status === 'pending' ? 'bg-yellow-100 hover:bg-yellow-200' : ''} ${!challenge && !special ? 'bg-gray-50' : ''}`}
                                                    >
                                                        <div className="text-[9px] font-bold text-gray-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                                        <div className="text-sm font-black text-[var(--soup-dark)]">{day.getDate()}</div>
                                                        {special && (
                                                            <div className="text-[8px] font-bold leading-tight text-[var(--soup-pink)] truncate" title={special.label}>{special.label}</div>
                                                        )}
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
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={cancelEditing} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-black hover:bg-gray-200 transition-all">Cancel</button>

                            {/* View Translations Button */}
                            <button
                                onClick={() => {
                                    // Close edit modal, open preview modal
                                    const challenge = queuedChallenges.find(c => c.id === editingId);
                                    if (challenge) {
                                        // We need to set state as if we opened it
                                        setEditText(''); // clear edit state
                                        setEditingId(null); // close edit modal
                                        openPreview(challenge); // open preview
                                    }
                                }}
                                className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-black hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                title="View/Edit Translations"
                            >
                                🌍
                            </button>

                            <button onClick={() => { if (confirm('Delete?')) { deleteChallenge(editingId); cancelEditing(); } }} className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-black hover:bg-red-200 transition-all"><Trash2 size={16} /></button>
                            <button onClick={saveEdit} className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-all">Save</button>
                            {queuedChallenges.find(c => c.id === editingId)?.status === 'pending' && (
                                <button onClick={() => { approveChallenge(editingId); cancelEditing(); }} className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-black hover:scale-105 transition-all flex items-center justify-center gap-2"><Check size={16} /> Approve</button>
                            )}
                        </div>
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
                            <p className="text-sm text-gray-400 font-bold mb-2">
                            all groups • {Object.keys(translations).length} languages
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                            Excluded from send: <strong>app testers</strong> and <strong>noah&apos;s test group solo</strong> won&apos;t receive this challenge (they&apos;re shown here for reference only).
                        </p>
                        {translationFallbackUsed && (
                            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                <p className="text-sm font-bold text-amber-800">Translations couldn’t be loaded (showing English for some or all languages).</p>
                                <p className="text-xs text-amber-700 mt-1">We try <strong>DeepL</strong> first (DEEPL_API_KEY), then <strong>Google</strong> (GOOGLE_TRANSLATE_API_KEY) as fallback. You need at least one of these set in Supabase → Project Settings → Edge Functions → Secrets. If DeepL fails (wrong key, auth change), Google is used; if both are missing or invalid, you get all English.</p>
                                <p className="text-xs text-amber-600 mt-2">Check Edge Function logs for <strong>translate-text</strong> and <strong>translate-google</strong> to see the exact error. See DEV_BUILD_BUG_CHECKLIST.md for verification steps.</p>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={regenerateTranslationsInPreview}
                            disabled={translating}
                            className="mb-6 text-sm font-bold text-[var(--soup-turquoise)] hover:underline disabled:opacity-50"
                        >
                            {translating ? 'translating…' : 'regenerate translations'}
                        </button>

                        {translating ? (
                            <div className="py-12 text-center">
                                <Clock size={48} className="animate-spin mx-auto mb-4 text-[var(--soup-turquoise)]" />
                                <p className="text-gray-500 font-bold">Translating to all languages...</p>
                            </div>
                        ) : (
                            <div className="mb-8 space-y-3">
                                {/* Exact format: prefer challenge's saved translations, then state, then raw text */}
                                {groups.map((group) => {
                                    const lang = group.language;
                                    const nameLower = (group.name || '').toLowerCase();
                                    const isExcluded = nameLower.includes('app testers') || nameLower.includes("noah's test group solo");
                                    let challengeTrans = selectedChallenge?.translations;
                                    if (typeof challengeTrans === 'string') {
                                        try { challengeTrans = JSON.parse(challengeTrans); } catch (_) { challengeTrans = null; }
                                    }
                                    const exactFormat =
                                        getTranslationForLang(challengeTrans, lang) ??
                                        getTranslationForLang(translations, lang) ??
                                        (selectedChallenge?.challenge_text || 'Loading...');

                                    return (
                                        <div key={group.id} className={`p-4 bg-white border-2 rounded-2xl transition-all ${isExcluded ? 'border-amber-200 bg-amber-50/50' : 'border-black/5 hover:border-[var(--soup-turquoise)]/30'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-black text-[var(--soup-turquoise)] uppercase tracking-wider">
                                                    {group.name}
                                                    {isExcluded && <span className="ml-2 text-[10px] font-bold text-amber-600 normal-case">(won&apos;t receive)</span>}
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
                                    setTranslationFallbackUsed(false);
                                }}
                                className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                disabled={sending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => approveChallenge()}
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
