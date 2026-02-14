import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Pressable, ActivityIndicator, RefreshControl, Text, Image, Platform, Alert, Modal, Dimensions, Animated as RNAnimated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQuests } from '../../contexts/QuestContext';
import { MessageCircle, Users, Plus, Globe, ChevronRight, Megaphone, Mic, Check, Share2, Play, Pause, Edit2, LogOut, Clock } from 'lucide-react-native';
import LanguageRequestModal from '../../components/LanguageRequestModal';
import { FloatingSupportButton } from '../../components/FloatingSupportButton';
import { haptics } from '../../utils/haptics';
import AdminLoginModal from '../../components/AdminLoginModal';
import FounderWelcomeModal from '../../components/FounderWelcomeModal';
import { TAB_BAR_HEIGHT } from '../../constants/Layout';
import ContextualTooltip from '../../components/ContextualTooltip';
import { SecurityBanner } from '../../components/SecurityBanner';
import GroupAvatar from '../../components/GroupAvatar';
import { getAvatarSource, getDefaultSoupAvatarForId, sortPeopleRealPhotosFirst } from '../../utils/soupUtils';
import { ChallengeQueueCard } from '../../components/ChallengeQueueCard';
import { AnimatedIdleWaveform } from '../../components/AnimatedIdleWaveform';
import { uploadChallengeVoiceReply, uploadFirstVoiceToGroups } from '../../lib/uploadChallengeVoice';
import { shareChallenge } from '../../lib/shareChallenge';
import { UserPreviewModal } from '../../components/UserPreviewModal';
import { pickRandom, GENERIC_LOADING_LABELS } from '../../constants/CopyPhilosophy';
import { VoiceFeedbackButton } from '../../components/VoiceFeedbackButton';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Headphones } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeIn,
    FadeOut,
    FadeInUp,
    FadeOutDown,
    FadeInDown,
    FadeOutUp,
    SlideInUp,
    SlideOutDown,
    SlideInRight,
    SlideOutLeft,
    SlideInDown,
    SlideOutUp,
    SlideInLeft,
    SlideOutRight,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated';

// Static waveform bars (show, don't tell) — seed for deterministic heights
function seedFromId(id) {
    if (!id) return 12345;
    let h = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
}
function seededHeights(seed, count) {
    const out = [];
    let v = seed % 9999;
    for (let i = 0; i < count; i++) {
        v = (v * 9301 + 49297) % 233280;
        out.push((v / 233280) * 0.6 + 0.35);
    }
    return out;
}
function formatVoiceDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
// Bold animated "tap me" button for CTA — no text, pulse + waveform
function CtaPulseButton({ onPress, color, style }) {
    const scale = useRef(new RNAnimated.Value(1)).current;
    useEffect(() => {
        const anim = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(scale, { toValue: 1.08, duration: 800, useNativeDriver: true }),
                RNAnimated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [scale]);
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.9 }]}>
            <RNAnimated.View style={{ transform: [{ scale }], justifyContent: 'center', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
                <AnimatedIdleWaveform variant="silky" color={color} barCount={36} barWidth={4} maxHeight={48} />
            </RNAnimated.View>
        </Pressable>
    );
}

function StaticWaveform({ barCount = 24, seed = 42, color = '#fff', heightScale = 1, style }) {
    const heights = useMemo(() => seededHeights(seed, barCount), [seed, barCount]);
    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }, style]} pointerEvents="none">
            {heights.map((h, i) => (
                <View
                    key={i}
                    style={{
                        width: 3,
                        borderRadius: 1.5,
                        height: Math.max(6, 24 * heightScale * Math.max(0.3, h)),
                        backgroundColor: color,
                    }}
                />
            ))}
        </View>
    );
}

// Daily challenge hero card — switch to compare:
// A = dark card + thin light outline (soft)
// B = dark card + blue accent outline (brand)
// C = dark card + dark outline (the one you liked)
const HERO_CARD_VARIANT = 'C';

// Section headers (daily challenge, listen, your chats, your stats) — 3 dramatically different designs:
// A = pill (soft rounded label)
// B = underline (minimal text + thick underline)
// C = emoji + text (friendly, chatty)
const SECTION_HEADER_VARIANT = 'A';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
    dark: '#2A2A2A',
};

// Brand colors for hero card (match ChallengeQueue)
const BRAND_BG_COLORS = [SOUP_COLORS.cream, SOUP_COLORS.green, SOUP_COLORS.pink, '#00ADEF'];
// Colored-only for Today challenge card so it always shows full design (bowls, prompt, group name)
// Card uses only blue, green, pink (no cream — cream on cream is hard to see). Color changes when there's a new challenge (by day of latest challenge).
const TODAY_CHALLENGE_COLORS = [SOUP_COLORS.green, SOUP_COLORS.pink, SOUP_COLORS.blue];
const CHALLENGE_START_SEEN_KEY = 'challenge_start_seen';

// Bowl accents for queue-vibe hero (intro/done/recording)
const BOWL_ICON = require('../../assets/ls-icon-bowl.png');
const BOWL_ACCENTS = [
    { key: 'tl', top: '8%', left: '5%', size: 72, opacity: 0.58 },
    { key: 'tr', top: '22%', right: '4%', size: 72, opacity: 0.54 },
    { key: 'bl', bottom: '26%', left: '8%', size: 72, opacity: 0.56 },
    { key: 'br', bottom: '10%', right: '10%', size: 72, opacity: 0.6 },
];
// Status line — game/challenge vibe
const STATUS_READY_LINES = ['your turn', "let's go", 'round ready', 'go time', 'challenge is live', 'ready? set. go.', 'mission available', 'your challenge is waiting'];
const FIRST_CHALLENGE_PROMPT = "what's ur favorite word in this language? curse words count 😏 this isn't a classroom.";
// Hero left label (mission / round / challenge)
const HERO_ROUND_LABELS = ["today's mission", "your challenge", "fun challenge", "your turn", "the challenge", "today's round"];
const HERO_CTA_PLAY = 'play';
const HERO_CTA_DONE = 'mission complete!';
const HERO_CTA_AGAIN = 'play again';
const HERO_MAIN_DONE = "you crushed it!";
const HERO_MAIN_NEXT = 'next challenge';
const SECTION_DONE_TITLES = ["you're done", 'nice one', 'done'];
const SECTION_NEXT_TITLE = 'next challenge';
const BTN_PLAY_AGAIN = 'do another';
const START_CONTEXT_LINE = 'new challenges just dropped';
const START_CONTEXT_LINES = ['new challenges just dropped', 'challenge is out', "your turn — let's go"];
const START_FIRST_TITLE = 'record a voice reply';
const START_FIRST_SUBTITLE = 'tap the button below, say your answer in your learning language, and send it to your group.';
const START_FIRST_BUTTON = 'start';
const START_TITLES = ['today\'s soup is ready', 'voice memo o\'clock', 'your group is waiting (no pressure)', 'rip the bandaid off', 'fail the subjunctive', 'sound like a toddler (it\'s fine)', 'nobody\'s judging (we promise)'];
const START_SUBTITLES = ['tap below. say something. that\'s it.', 'one quick voice note. you\'ve got this.', 'small steps. your group has your back.', 'just hit the button. we\'ll do the rest.'];
const START_BUTTONS = ['start souping', 'let\'s go', 'record', 'do the thing', 'ok fine', 'rip the bandaid', 'send it'];
const getRandomStartCopy = () => ({
    title: START_TITLES[Math.floor(Math.random() * START_TITLES.length)],
    subtitle: START_SUBTITLES[Math.floor(Math.random() * START_SUBTITLES.length)],
    button: START_BUTTONS[Math.floor(Math.random() * START_BUTTONS.length)],
});
const COMPLETION_TITLE = "i drank my soup";
const COMPLETION_SUBTITLES = ["you did it. come back tomorrow or explore groups below.", "slay. see you tomorrow.", "mission complete. see who else played.", "challenge crushed. check the replies.", "round complete. see who else played.", "slay. see you tomorrow, or explore the app if u want more."];
const COMPLETION_BUTTONS = ["go see who replied", "listen to everyone's voice memos", "open the group chat", "see who replied", "check the replies", "check tomorrow's challenge", "take a breath, you're done", "see who else did the thing", "you're officially soupy today", "get soupy", "check out the group chat", "see you tomorrow", "explore language soup", "hear how others did it today"];
const getRandomCompletion = () => ({
    title: COMPLETION_TITLE,
    subtitle: COMPLETION_SUBTITLES[Math.floor(Math.random() * COMPLETION_SUBTITLES.length)],
    button: COMPLETION_BUTTONS[Math.floor(Math.random() * COMPLETION_BUTTONS.length)],
    bgColor: BRAND_BG_COLORS[Math.floor(Math.random() * BRAND_BG_COLORS.length)],
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VOICES_GRID_COLS = 4;
const VOICES_GRID_GAP = 10;
const VOICES_CARD_SIZE = (SCREEN_WIDTH - 16 * 2 - VOICES_GRID_GAP * (VOICES_GRID_COLS - 1)) / VOICES_GRID_COLS;

// Test controls (challenge flow, etc.) only for this account
const NOAH_DISPLAY_NAME = 'noah';
// Language Soup bot sends challenges; exclude from "who replied"
const LANGUAGE_SOUP_BOT_ID = '00000000-0000-0000-0000-000000000000';

export default function HomeScreen() {
    const { user, signOut } = useAuth();
    const { completeQuest } = useQuests();
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showProfileCard, setShowProfileCard] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCommunityManager, setIsCommunityManager] = useState(false);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminModeEnabled, setAdminModeEnabled] = useState(false);
    const [showOnboardingMission, setShowOnboardingMission] = useState(false);
    const [showFounderWelcome, setShowFounderWelcome] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
    const [pendingChallenges, setPendingChallenges] = useState([]);
    const [todayChallengeStats, setTodayChallengeStats] = useState({ total: 0, responded: 0 });
    const [todayChallengeReplyCount, setTodayChallengeReplyCount] = useState(0); // community pulse: how many replies to today's challenges
    const [todayChallengePrompt, setTodayChallengePrompt] = useState('');
    const [yesterdayChallengePrompt, setYesterdayChallengePrompt] = useState('');
    const [yesterdayChallengeDidRespond, setYesterdayChallengeDidRespond] = useState(false);
    const [recentChallengeResponses, setRecentChallengeResponses] = useState([]);
    const [nextChallengeDropAt, setNextChallengeDropAt] = useState(null); // Date | null from dashboard schedule
    const [nextChallengeIn, setNextChallengeIn] = useState('');
    const [countdownLastMinuteSeconds, setCountdownLastMinuteSeconds] = useState(null); // 1–60 when in final minute, for dramatic countdown
    const [earlyBirdToday, setEarlyBirdToday] = useState(false);
    const [showChallengeListPicker, setShowChallengeListPicker] = useState(false);
    const [heroRecordingMode, setHeroRecordingMode] = useState('intro'); // 'intro' | 'recording' | 'done'
    const [heroChallengeIndex, setHeroChallengeIndex] = useState(0);
    const [heroLoading, setHeroLoading] = useState(false);
    const [heroFirstTimeStart, setHeroFirstTimeStart] = useState(true);
    const [heroStartCopy, setHeroStartCopy] = useState(getRandomStartCopy);
    const [heroCompletionCopy, setHeroCompletionCopy] = useState(getRandomCompletion);
    const [speakItems, setSpeakItems] = useState([]); // { language, color }[] shuffled for banner
    const [speakIndex, setSpeakIndex] = useState(0);
    const heroCardIdRef = useRef(null);
    const lastCompletedGroupIdRef = useRef(null);
    const heroCurrentChallengeRef = useRef(null);
    const statusReadyLineRef = useRef(null);
    const todayScrollRef = useRef(null);
    const heroContextLineRef = useRef(null);
    const [historicalChallenges, setHistoricalChallenges] = useState([]);
    const [historicalChallengesLoading, setHistoricalChallengesLoading] = useState(false);
    const [heroCtaLoading, setHeroCtaLoading] = useState(false);
    const [showChallengeCardInHero, setShowChallengeCardInHero] = useState(false); // false = first card (CTA); true = showing challenge
    const [heroPendingSettled, setHeroPendingSettled] = useState(false); // true after first checkPendingChallenges — avoids brief card flash on reload
    // One challenge per day (past 7 days) for "another challenge" modal — pick a day, see that day's question
    const historicalChallengesByDay = useMemo(() => {
        if (!historicalChallenges?.length) return [];
        const byDay = new Map();
        historicalChallenges.forEach(c => {
            const dateKey = (c.created_at || '').slice(0, 10);
            if (!dateKey) return;
            if (!byDay.has(dateKey)) byDay.set(dateKey, c);
        });
        const sorted = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
        const todayKey = new Date().toISOString().slice(0, 10);
        return sorted.filter(([k]) => k !== todayKey).slice(0, 7).map(([dateKey, challenge]) => {
            const d = new Date(dateKey);
            const now = new Date();
            const daysAgo = Math.floor((now - d) / (24 * 60 * 60 * 1000));
            let dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            if (daysAgo === 1) dateLabel = 'yesterday';
            else if (daysAgo === 2) dateLabel = '2 days ago';
            return { dateKey, dateLabel, challenge };
        });
    }, [historicalChallenges]);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(null);
    const [userTagline, setUserTagline] = useState('');
    const [daysSpokenThisWeek, setDaysSpokenThisWeek] = useState(0);
    const [wordsSpokenThisWeek, setWordsSpokenThisWeek] = useState(0);
    const [latestVoiceMessage, setLatestVoiceMessage] = useState(null); // { id, group_id, media_url, language, created_at, challengeContext }
    const [myRecentVoiceMemos, setMyRecentVoiceMemos] = useState([]); // { id, media_url, group_id, group_name, language, created_at }
    const [othersRecentVoiceMemos, setOthersRecentVoiceMemos] = useState([]); // kept for empty-state fallback
    const [respondedInLanguagesToday, setRespondedInLanguagesToday] = useState([]); // ['Spanish', 'French'] when done today
    const [spokenDaysThisWeekArray, setSpokenDaysThisWeekArray] = useState([false, false, false, false, false, false, false]); // [6d ago ... today]
    const [recentlyActivePeople, setRecentlyActivePeople] = useState([]); // voices in your soup: id, display_name, avatar_url, status_text
    const [selectedUser, setSelectedUser] = useState(null); // for UserPreviewModal (same as community tab)
    const [showChallengeFriendPicker, setShowChallengeFriendPicker] = useState(false);
    const [podcastLoading, setPodcastLoading] = useState(false);
    const [podcastLoadingLabel, setPodcastLoadingLabel] = useState('loading…');
    const [podcastPreviewCount, setPodcastPreviewCount] = useState(null); // voice memos from others (for card overview)
    const [podcastPreviewMinutes, setPodcastPreviewMinutes] = useState(null);
    const [minutesSpoken, setMinutesSpoken] = useState(null); // total from get_user_stats
    const [minutesListened, setMinutesListened] = useState(null); // total from AsyncStorage
    const podcastStartInProgressRef = useRef(false);
    const { startQueue, setIsPlayerExpanded, currentAudio, isPlaying: globalIsPlaying, playAudio, pauseAudio } = useAudioPlayer();

    const insets = useSafeAreaInsets();
    const { permissionStatus: notificationPermission, openSettings: openNotificationSettings } = useNotifications();

    const formatStatMinutes = (m) => {
        if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60 || ''}`.trim();
        return String(m);
    };

    // Podcast mode: fetch recent voice messages, cap at 5 min total so people can plan
    const PODCAST_MAX_SECONDS = 5 * 60;
    const startPodcastMode = useCallback(async () => {
        if (!user?.id) return;
        if (podcastStartInProgressRef.current) return;
        podcastStartInProgressRef.current = true;
        setPodcastLoadingLabel(pickRandom(GENERIC_LOADING_LABELS));
        setPodcastLoading(true);
        try {
            const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
            const groupIds = (myGroups || []).map(g => g.group_id).filter(Boolean);
            if (groupIds.length === 0) {
                setPodcastLoading(false);
                return;
            }
            const { data: rows } = await supabase
                .from('app_messages')
                .select('id, media_url, group_id, sender_id, duration_seconds, created_at, sender:app_users!sender_id(display_name, avatar_url, status_text), group:app_groups!group_id(name)')
                .in('group_id', groupIds)
                .neq('sender_id', user.id)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(60);
            if (!rows?.length) {
                setPodcastLoading(false);
                return;
            }
            let total = 0;
            const capped = [];
            for (const r of rows) {
                const sec = r.duration_seconds ?? 30;
                if (total + sec > PODCAST_MAX_SECONDS && capped.length > 0) break;
                capped.push(r);
                total += sec;
            }
            const queueItems = capped
                .filter(r => r.media_url != null && String(r.media_url).trim() !== '')
                .map(r => ({
                    url: r.media_url,
                    durationSeconds: r.duration_seconds ?? 30,
                    messageId: r.id,
                    senderName: r.sender?.display_name ?? 'Someone',
                    senderAvatar: r.sender?.avatar_url ?? null,
                    senderStatus: r.sender?.status_text ?? null,
                    groupName: r.group?.name ?? 'Group',
                    groupId: r.group_id,
                }));
            if (queueItems.length === 0) {
                Alert.alert('No playable voices', 'No playable voice messages right now. Try again later.');
                return;
            }
            startQueue(queueItems);
            setIsPlayerExpanded?.(true);
        } catch (e) {
            console.warn('Podcast mode failed:', e);
        } finally {
            setPodcastLoading(false);
            podcastStartInProgressRef.current = false;
        }
    }, [user?.id, startQueue, setIsPlayerExpanded]);

    // Podcast card overview: count and total minutes of others' voice memos (same cap as podcast)
    const loadPodcastPreview = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
            const groupIds = (myGroups || []).map(g => g.group_id).filter(Boolean);
            if (groupIds.length === 0) {
                setPodcastPreviewCount(0);
                setPodcastPreviewMinutes(0);
                return;
            }
            const { data: rows } = await supabase
                .from('app_messages')
                .select('id, duration_seconds')
                .in('group_id', groupIds)
                .neq('sender_id', user.id)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(60);
            if (!rows?.length) {
                setPodcastPreviewCount(0);
                setPodcastPreviewMinutes(0);
                return;
            }
            const PODCAST_MAX = 5 * 60;
            let total = 0;
            let count = 0;
            for (const r of rows) {
                const sec = r.duration_seconds ?? 30;
                if (total + sec > PODCAST_MAX && count > 0) break;
                total += sec;
                count += 1;
            }
            setPodcastPreviewCount(count);
            setPodcastPreviewMinutes(Math.round(total / 60) || 1);
        } catch (_) {
            setPodcastPreviewCount(null);
            setPodcastPreviewMinutes(null);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                setHeroPendingSettled(false);
                checkAdminStatus();
                fetchNextChallengeDropAt();
                loadUserHomeData();
                loadPodcastPreview();
                // Load groups first, then onboarding check — so new users see the first-challenge modal without a flash of Today
                (async () => {
                    await loadGroups();
                    await checkOnboardingStatus();
                })();
                checkPendingChallenges();
                // Cap "loading…" so we never block the hero for more than ~1.2s
                const t = setTimeout(() => setHeroPendingSettled(true), 1200);
                return () => clearTimeout(t);
            }
        }, [user])
    );

    // Refetch next challenge drop time every 10s so countdown matches admin dashboard schedule
    useEffect(() => {
        const t = setInterval(fetchNextChallengeDropAt, 10 * 1000);
        return () => clearInterval(t);
    }, []);

    // "Speak Portuguese" / "Speak Spanish" — build from groups, reshuffle when groups load and every time user returns to tab
    const todayGroupsForSpeak = useMemo(() => {
        const list = groups.filter(g => g.isDM || (!String(g.name || '').toLowerCase().includes('support') && !g.isDM));
        return list.map((g, i) => ({
            language: (g.language || g.name || 'group').replace(/^\w/, c => c.toUpperCase()),
            color: TODAY_CHALLENGE_COLORS[i % TODAY_CHALLENGE_COLORS.length],
        }));
    }, [groups]);
    const speakSourceRef = useRef([]);
    speakSourceRef.current = todayGroupsForSpeak;
    useEffect(() => {
        if (todayGroupsForSpeak.length === 0) return;
        const shuffled = [...todayGroupsForSpeak].sort(() => Math.random() - 0.5);
        setSpeakItems(shuffled);
        setSpeakIndex(0);
    }, [todayGroupsForSpeak.length]);
    useFocusEffect(
        useCallback(() => {
            const source = speakSourceRef.current;
            if (source && source.length > 0) {
                setSpeakItems([...source].sort(() => Math.random() - 0.5));
                setSpeakIndex(0);
            }
        }, [])
    );
    // Cycle "speak [language]" only on the CTA card. Once they tap, lock to current challenge language. Faster cycle.
    useEffect(() => {
        if (speakItems.length <= 1 || showChallengeCardInHero) return;
        const t = setInterval(() => setSpeakIndex(i => (i + 1) % speakItems.length), 900);
        return () => clearInterval(t);
    }, [speakItems.length, showChallengeCardInHero]);

    // When user has pending challenges, refresh start copy so returning users get fresh fun copy
    useEffect(() => {
        if (pendingChallenges?.length > 0) setHeroStartCopy(getRandomStartCopy());
    }, [pendingChallenges?.length]);

    // Live feed: refresh challenge pulse (reply count, who replied) every 45s while on home
    const fetchChallengePulseRef = useRef(() => {});
    fetchChallengePulseRef.current = () => {
        fetchTodayChallengeStats();
        fetchYesterdayChallengeData();
        fetchRecentChallengeResponses();
    };
    useEffect(() => {
        if (!user?.id) return;
        const t = setInterval(() => fetchChallengePulseRef.current(), 45000);
        return () => clearInterval(t);
    }, [user?.id]);

    // Personalized home data: display name, days this week, latest voice (for "your day")
    const loadUserHomeData = async () => {
        if (!user?.id) return;
        try {
            const [{ data: profile }, { data: weekMessages }, { data: latestRow }] = await Promise.all([
                supabase.from('app_users').select('display_name, avatar_url, status_text').eq('id', user.id).maybeSingle(),
                supabase
                    .from('app_messages')
                    .select('created_at, duration_seconds')
                    .eq('sender_id', user.id)
                    .eq('message_type', 'voice')
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                supabase
                    .from('app_messages')
                    .select('id, media_url, group_id, challenge_id, created_at')
                    .eq('sender_id', user.id)
                    .eq('message_type', 'voice')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ]);
            setUserDisplayName(profile?.display_name || '');
            setUserAvatarUrl(profile?.avatar_url || null);
            setUserTagline(profile?.status_text?.trim() || '');
            if (weekMessages?.length) {
                const uniqueDays = new Set(weekMessages.map(m => new Date(m.created_at).toDateString()));
                setDaysSpokenThisWeek(uniqueDays.size);
                const totalSeconds = weekMessages.reduce((sum, m) => sum + (m.duration_seconds || 0), 0);
                setWordsSpokenThisWeek(Math.round((totalSeconds / 60) * 120));
                const arr = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    arr.push(uniqueDays.has(d.toDateString()));
                }
                setSpokenDaysThisWeekArray(arr);
            } else {
                setDaysSpokenThisWeek(0);
                setWordsSpokenThisWeek(0);
                setSpokenDaysThisWeekArray([false, false, false, false, false, false, false]);
            }
            if (latestRow?.media_url) {
                let language = null;
                let prompt_text = null;
                if (latestRow.group_id) {
                    const { data: g } = await supabase.from('app_groups').select('language').eq('id', latestRow.group_id).maybeSingle();
                    language = g?.language || null;
                }
                if (latestRow.challenge_id) {
                    const { data: c } = await supabase.from('app_challenges').select('prompt_text').eq('id', latestRow.challenge_id).maybeSingle();
                    prompt_text = c?.prompt_text || null;
                }
                setLatestVoiceMessage({
                    id: latestRow.id,
                    group_id: latestRow.group_id,
                    media_url: latestRow.media_url,
                    language: language || 'your language',
                    created_at: latestRow.created_at,
                    challengeContext: prompt_text ? { prompt: prompt_text } : undefined
                });
            } else {
                setLatestVoiceMessage(null);
            }

            // Your recent voice memos (for "show, don't tell")
            const { data: myVoiceRows } = await supabase
                .from('app_messages')
                .select('id, media_url, group_id, created_at')
                .eq('sender_id', user.id)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(8);
            if (myVoiceRows?.length) {
                const gids = [...new Set(myVoiceRows.map(m => m.group_id).filter(Boolean))];
                const { data: grps } = await supabase.from('app_groups').select('id, name, language').in('id', gids);
                const groupMap = new Map((grps || []).map(g => [g.id, { name: g.name || g.language, language: g.language }]));
                setMyRecentVoiceMemos(myVoiceRows.map(m => ({
                    id: m.id,
                    media_url: m.media_url,
                    group_id: m.group_id,
                    group_name: groupMap.get(m.group_id)?.name || 'Group',
                    language: groupMap.get(m.group_id)?.language || '',
                    created_at: m.created_at,
                })));
            } else {
                setMyRecentVoiceMemos([]);
            }

            // Others' recent voice memos (when user has none, to encourage)
            const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
            const groupIds = (myGroups || []).map(g => g.group_id).filter(Boolean);
            if (groupIds.length > 0) {
                const { data: otherRows } = await supabase
                    .from('app_messages')
                    .select('id, media_url, group_id, sender_id, created_at')
                    .in('group_id', groupIds)
                    .neq('sender_id', user.id)
                    .eq('message_type', 'voice')
                    .order('created_at', { ascending: false })
                    .limit(8);
                if (otherRows?.length) {
                    const gids = [...new Set(otherRows.map(m => m.group_id))];
                    const sids = [...new Set(otherRows.map(m => m.sender_id))];
                    const [{ data: grps }, { data: senders }] = await Promise.all([
                        supabase.from('app_groups').select('id, name, language').in('id', gids),
                        supabase.from('app_users').select('id, display_name').in('id', sids),
                    ]);
                    const groupMap = new Map((grps || []).map(g => [g.id, { name: g.name || g.language, language: g.language }]));
                    const senderMap = new Map((senders || []).map(s => [s.id, s.display_name || 'Someone']));
                    setOthersRecentVoiceMemos(otherRows.map(m => ({
                        id: m.id,
                        media_url: m.media_url,
                        group_id: m.group_id,
                        group_name: groupMap.get(m.group_id)?.name || 'Group',
                        sender_name: senderMap.get(m.sender_id) || 'Someone',
                        created_at: m.created_at,
                    })));
                } else {
                    setOthersRecentVoiceMemos([]);
                }
            } else {
                setOthersRecentVoiceMemos([]);
            }

            // Recently active (voice in last 3 days) — up to 10 people, most recent first
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            const { data: myGroupsForActive } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
            const activeGroupIds = (myGroupsForActive || []).map(g => g.group_id).filter(Boolean);
            if (activeGroupIds.length > 0) {
                const { data: recentVoiceRows } = await supabase
                    .from('app_messages')
                    .select('sender_id, created_at')
                    .in('group_id', activeGroupIds)
                    .eq('message_type', 'voice')
                    .gte('created_at', threeDaysAgo)
                    .neq('sender_id', user.id)
                    .order('created_at', { ascending: false });
                const seen = new Set();
                const orderedSenderIds = [];
                for (const row of recentVoiceRows || []) {
                    if (!seen.has(row.sender_id)) {
                        seen.add(row.sender_id);
                        orderedSenderIds.push(row.sender_id);
                        if (orderedSenderIds.length >= 80) break;
                    }
                }
                if (orderedSenderIds.length > 0) {
                    const { data: activeUsers } = await supabase
                        .from('app_users')
                        .select('id, display_name, avatar_url, status_text, fluent_languages, learning_languages')
                        .in('id', orderedSenderIds);
                    const byId = new Map((activeUsers || []).map(u => [u.id, u]));
                    setRecentlyActivePeople(orderedSenderIds.map(id => byId.get(id)).filter(Boolean));
                } else {
                    setRecentlyActivePeople([]);
                }
            } else {
                setRecentlyActivePeople([]);
            }

            // Big stats: total minutes spoken (backend) and listened (AsyncStorage)
            if (user?.id) {
                try {
                    const { data: stats } = await supabase.rpc('get_user_stats', { uid: user.id });
                    const sec = (stats && stats.total_speaking_seconds) != null ? stats.total_speaking_seconds : 0;
                    setMinutesSpoken(Math.floor(Number(sec) / 60));
                } catch (_) {
                    setMinutesSpoken(0);
                }
                try {
                    const raw = await AsyncStorage.getItem('listening_total_seconds');
                    const sec = raw != null ? parseInt(raw, 10) : 0;
                    setMinutesListened(isNaN(sec) ? 0 : Math.floor(sec / 60));
                } catch (_) {
                    setMinutesListened(0);
                }
            }
        } catch (e) {
            console.error('loadUserHomeData:', e);
        }
    };

    // Relative time for "what you sent" (e.g. "2m ago", "today")
    const getRelativeTime = (isoDate) => {
        const d = new Date(isoDate);
        const now = new Date();
        const diffMs = now - d;
        const diffM = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffM < 1) return 'just now';
        if (diffM < 60) return `${diffM}m ago`;
        if (diffH < 24) return `${diffH}h ago`;
        if (diffDays < 2) return 'yesterday';
        return `${diffDays} days ago`;
    };



    // Realtime updates for Admin Badges
    useEffect(() => {
        if (!isAdmin) return;
        console.log('Setting up admin realtime subscription');

        const channel = supabase
            .channel('admin-badge-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, (payload) => {
                console.log('Realtime support message update:', payload);
                fetchAdminStats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_language_requests' }, (payload) => {
                console.log('Realtime language request update:', payload);
                fetchAdminStats();
            })
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        return () => {
            console.log('Removing admin realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    // Realtime listener for NEW Challenges — only auto-show queue when a challenge just dropped (once). Rest of the time user opens from the daily challenge card.
    useEffect(() => {
        if (!user) return;
        const challengeChannel = supabase
            .channel('public:app_challenges')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_challenges' }, async () => {
                console.log('🥣 New challenge dropped.');
                await checkPendingChallenges();
                setHeroRecordingMode('intro');
                setHeroChallengeIndex(0);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(challengeChannel);
        };
    }, [user, groups]); // Re-run if user/groups change

    // Reset hero flow when no pending challenges; clamp index when list shrinks so we never show wrong prompt
    useEffect(() => {
        const n = pendingChallenges?.length ?? 0;
        if (!n) {
            setHeroRecordingMode('intro');
            setHeroChallengeIndex(0);
            return;
        }
        setHeroChallengeIndex((prev) => Math.min(prev, n - 1));
    }, [pendingChallenges?.length]);

    // First-time vs returning: read AsyncStorage when hero has pending and is on intro
    useEffect(() => {
        const hasPending = pendingChallenges?.length > 0;
        if (!hasPending || heroRecordingMode !== 'intro') return;
        let cancelled = false;
        (async () => {
            try {
                const seen = await AsyncStorage.getItem(CHALLENGE_START_SEEN_KEY);
                if (cancelled) return;
                setHeroFirstTimeStart(seen !== 'true');
                if (seen === 'true') setHeroStartCopy(getRandomStartCopy());
            } catch (_) {
                if (!cancelled) setHeroFirstTimeStart(true);
            }
        })();
        return () => { cancelled = true; };
    }, [pendingChallenges?.length, heroRecordingMode]);

    // Fetches pending (uncompleted) challenges for a given date range. Used for today (normal) and yesterday (admin test).
    const fetchPendingChallengesInRange = async (rangeStart, rangeEnd) => {
        if (!user || user.id === undefined) return [];
        const { data: myGroups } = await supabase
            .from('app_group_members')
            .select('group_id')
            .eq('user_id', user.id);
        if (!myGroups || myGroups.length === 0) return [];
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('*, app_groups(name, language)')
            .in('group_id', groupIds)
            .gte('created_at', rangeStart.toISOString())
            .lt('created_at', rangeEnd.toISOString())
            .order('created_at', { ascending: false });
        if (!challenges || challenges.length === 0) return [];
        const challengeIds = challenges.map(c => c.id);
        const { data: completions } = await supabase
            .from('app_messages')
            .select('challenge_id')
            .eq('sender_id', user.id)
            .in('challenge_id', challengeIds);
        const completedSet = new Set(completions?.map(c => c.challenge_id));
        const uncompleted = challenges
            .filter(c => !completedSet.has(c.id))
            .map(c => ({
                ...c,
                group_name: c.app_groups?.name || c.app_groups?.language || 'Group',
                group_language: c.app_groups?.language || c.app_groups?.name || null
            }));
        const latestByGroup = new Map();
        uncompleted.forEach(c => {
            const existing = latestByGroup.get(c.group_id);
            if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
                latestByGroup.set(c.group_id, c);
            }
        });
        return Array.from(latestByGroup.values()).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    };

    // Today's challenge stats: how many groups have a challenge, how many the user has responded in
    const fetchTodayChallengeStats = async () => {
        if (!user?.id) return { total: 0, responded: 0 };
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const { data: myGroups } = await supabase
            .from('app_group_members')
            .select('group_id')
            .eq('user_id', user.id);
        if (!myGroups?.length) return { total: 0, responded: 0 };
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('id, group_id, prompt_text')
            .in('group_id', groupIds)
            .gte('created_at', todayStart.toISOString())
            .lt('created_at', todayEnd.toISOString())
            .order('created_at', { ascending: false });
        if (!challenges?.length) {
            setTodayChallengeStats({ total: 0, responded: 0 });
            setTodayChallengePrompt('');
            setTodayChallengeReplyCount(0);
            return { total: 0, responded: 0 };
        }
        const first = challenges[0];
        setTodayChallengePrompt(first?.prompt_text || '');
        const challengeIds = challenges.map(c => c.id);
        const challengeToGroup = new Map(challenges.map(c => [c.id, c.group_id]));
        const totalGroups = new Set(challenges.map(c => c.group_id)).size;
        const { count: replyCount } = await supabase.from('app_messages').select('*', { count: 'exact', head: true }).in('challenge_id', challengeIds).neq('sender_id', LANGUAGE_SOUP_BOT_ID);
        setTodayChallengeReplyCount(replyCount ?? 0);
        const { data: completions } = await supabase
            .from('app_messages')
            .select('challenge_id')
            .eq('sender_id', user.id)
            .in('challenge_id', challengeIds);
        const respondedGroupIds = [...new Set((completions ?? []).map(c => challengeToGroup.get(c.challenge_id)).filter(Boolean))];
        const respondedGroups = respondedGroupIds.length;
        setTodayChallengeStats({ total: totalGroups, responded: respondedGroups });
        if (respondedGroupIds.length > 0) {
            const { data: grps } = await supabase.from('app_groups').select('language').in('id', respondedGroupIds);
            const langs = [...new Set((grps || []).map(g => g.language).filter(Boolean))];
            setRespondedInLanguagesToday(langs);
        } else {
            setRespondedInLanguagesToday([]);
        }
        return { total: totalGroups, responded: respondedGroups };
    };

    // Yesterday's challenge: prompt + did the user respond? (for "no drop yet" state — show yesterday, then did/didn't do it)
    const fetchYesterdayChallengeData = async () => {
        if (!user?.id) return;
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
        const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
        if (!myGroups?.length) {
            setYesterdayChallengePrompt('');
            setYesterdayChallengeDidRespond(false);
            return;
        }
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('id, group_id, prompt_text')
            .in('group_id', groupIds)
            .gte('created_at', yesterdayStart.toISOString())
            .lt('created_at', yesterdayEnd.toISOString())
            .order('created_at', { ascending: false });
        if (!challenges?.length) {
            setYesterdayChallengePrompt('');
            setYesterdayChallengeDidRespond(false);
            return;
        }
        const first = challenges[0];
        setYesterdayChallengePrompt(first?.prompt_text || '');
        const challengeIds = challenges.map(c => c.id);
        const { data: completions } = await supabase
            .from('app_messages')
            .select('challenge_id')
            .eq('sender_id', user.id)
            .in('challenge_id', challengeIds);
        setYesterdayChallengeDidRespond(completions != null && completions.length > 0);
    };

    // Early bird: did the user respond within 60 min of today's first challenge drop?
    const fetchEarlyBirdToday = async () => {
        if (!user?.id) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
        if (!myGroups?.length) return;
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('id, created_at')
            .in('group_id', groupIds)
            .gte('created_at', todayStart.toISOString())
            .lt('created_at', todayEnd.toISOString());
        if (!challenges?.length) {
            setEarlyBirdToday(false);
            return;
        }
        const challengeIds = challenges.map(c => c.id);
        const firstChallengeAt = new Date(Math.min(...challenges.map(c => new Date(c.created_at))));
        const { data: myMessages } = await supabase
            .from('app_messages')
            .select('created_at')
            .eq('sender_id', user.id)
            .in('challenge_id', challengeIds)
            .order('created_at', { ascending: true })
            .limit(1);
        if (!myMessages?.length) {
            setEarlyBirdToday(false);
            return;
        }
        const firstResponseAt = new Date(myMessages[0].created_at);
        const diffMs = firstResponseAt - firstChallengeAt;
        const EARLY_BIRD_MINUTES = 60;
        setEarlyBirdToday(diffMs >= 0 && diffMs < EARLY_BIRD_MINUTES * 60 * 1000);
    };

    // 3 most recent responses to today's challenges (anyone in your groups)
    const fetchRecentChallengeResponses = async () => {
        if (!user?.id) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
        if (!myGroups?.length) return;
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('id, group_id')
            .in('group_id', groupIds)
            .gte('created_at', todayStart.toISOString())
            .lt('created_at', todayEnd.toISOString());
        if (!challenges?.length) {
            setRecentChallengeResponses([]);
            return;
        }
        const challengeIds = challenges.map(c => c.id);
        const challengeToGroup = new Map(challenges.map(c => [c.id, c.group_id]));
        const { data: groups } = await supabase.from('app_groups').select('id, name, language').in('id', [...new Set(challengeToGroup.values())]);
        const groupNameMap = new Map((groups || []).map(g => [g.id, g.name || g.language || 'Group']));
        const { data: messages } = await supabase
            .from('app_messages')
            .select('id, challenge_id, sender_id, message_type, created_at, media_url, duration_seconds')
            .in('challenge_id', challengeIds)
            .order('created_at', { ascending: false })
            .limit(15);
        if (!messages?.length) {
            setRecentChallengeResponses([]);
            return;
        }
        // Dedupe by sender so same person from different groups appears once; exclude Language Soup bot
        const noBot = messages.filter(m => m.sender_id !== LANGUAGE_SOUP_BOT_ID);
        const firstReply = noBot.length ? noBot.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b) : null;
        const firstSenderId = firstReply?.sender_id || null;
        const seen = new Set();
        const deduped = [];
        for (const m of noBot) {
            if (seen.has(m.sender_id)) continue;
            seen.add(m.sender_id);
            deduped.push(m);
            if (deduped.length >= 5) break;
        }
        const senderIds = [...new Set(deduped.map(m => m.sender_id))];
        const { data: senders } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', senderIds);
        const senderNameMap = new Map((senders || []).map(s => [s.id, s.display_name || 'Someone']));
        const senderAvatarMap = new Map((senders || []).map(s => [s.id, s.avatar_url || null]));
        const out = deduped
            .map(m => ({
                senderId: m.sender_id,
                senderName: senderNameMap.get(m.sender_id) || 'Someone',
                avatarUrl: senderAvatarMap.get(m.sender_id) || null,
                groupName: groupNameMap.get(challengeToGroup.get(m.challenge_id)) || 'Group',
                groupId: challengeToGroup.get(m.challenge_id) || null,
                message_type: m.message_type,
                created_at: m.created_at,
                firstReplier: m.sender_id === firstSenderId,
                messageId: m.id,
                mediaUrl: (m.message_type === 'voice' && m.media_url && String(m.media_url).trim()) ? m.media_url : null,
                durationSeconds: (m.duration_seconds != null ? m.duration_seconds : 30),
            }))
            .filter(r => r.senderName && !/^language soup$/i.test(r.senderName.trim()));
        setRecentChallengeResponses(out);
    };

    // Fetch next challenge drop time: RPC first, then fallback direct query so countdown is always live when schedule exists
    const fetchNextChallengeDropAt = async () => {
        try {
            const { data, error } = await supabase.rpc('get_next_challenge_drop_at');
            if (!error && data != null) {
                const at = typeof data === 'string' ? new Date(data.trim()) : new Date(data);
                if (!Number.isNaN(at.getTime())) {
                    setNextChallengeDropAt(at);
                    return;
                }
            }
            const now = new Date().toISOString();
            const { data: row } = await supabase
                .from('app_scheduled_challenges')
                .select('scheduled_time')
                .in('status', ['pending', 'approved'])
                .gt('scheduled_time', now)
                .order('scheduled_time', { ascending: true })
                .limit(1)
                .maybeSingle();
            if (row?.scheduled_time) {
                const at = new Date(row.scheduled_time);
                if (!Number.isNaN(at.getTime())) setNextChallengeDropAt(at);
                else setNextChallengeDropAt(null);
            } else setNextChallengeDropAt(null);
        } catch (_) {
            setNextChallengeDropAt(null);
        }
    };

    // Live countdown: hours → minutes → dramatic 60-second countdown in final minute
    useEffect(() => {
        const update = () => {
            if (!nextChallengeDropAt) {
                setNextChallengeIn('soon');
                setCountdownLastMinuteSeconds(null);
                return;
            }
            const ms = nextChallengeDropAt - Date.now();
            if (ms <= 0) {
                setNextChallengeIn('any moment now');
                setCountdownLastMinuteSeconds(null);
                return;
            }
            const h = Math.floor(ms / (1000 * 60 * 60));
            const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((ms % (1000 * 60)) / 1000);
            const totalSeconds = Math.ceil(ms / 1000);
            if (totalSeconds <= 60) {
                setCountdownLastMinuteSeconds(totalSeconds);
                setNextChallengeIn(`0:${String(totalSeconds).padStart(2, '0')}`);
            } else {
                setCountdownLastMinuteSeconds(null);
                if (h > 0) setNextChallengeIn(`${h}h ${m}m`);
                else setNextChallengeIn(`${m}m`);
            }
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, [nextChallengeDropAt]);

    const checkPendingChallenges = async () => {
        try {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setDate(todayEnd.getDate() + 1);
            const stats = await fetchTodayChallengeStats();
            let pending = await fetchPendingChallengesInRange(todayStart, todayEnd);
            if (pending.length === 0 && stats?.total > 0 && stats?.responded < stats?.total) {
                pending = await fetchTodayUncompletedChallenges(todayStart, todayEnd);
            }
            setPendingChallenges(pending);
            await fetchYesterdayChallengeData();
            await fetchEarlyBirdToday();
            await fetchRecentChallengeResponses();
            await fetchNextChallengeDropAt();
            setHeroPendingSettled(true);
            return pending;
        } catch (error) {
            console.error('Error checking pending challenges:', error);
            setPendingChallenges([]);
            setHeroPendingSettled(true);
            return [];
        }
    };

    // Fallback when today has challenges (user hasn't done all) but fetchPendingChallengesInRange returned empty (e.g. timezone)
    const fetchTodayUncompletedChallenges = async (rangeStart, rangeEnd) => {
        if (!user?.id) return [];
        const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
        if (!myGroups?.length) return [];
        const groupIds = myGroups.map(g => g.group_id);
        const { data: challenges } = await supabase
            .from('app_challenges')
            .select('*, app_groups(name, language)')
            .in('group_id', groupIds)
            .gte('created_at', rangeStart.toISOString())
            .lt('created_at', rangeEnd.toISOString())
            .order('created_at', { ascending: false });
        if (!challenges?.length) return [];
        const challengeIds = challenges.map(c => c.id);
        const { data: completions } = await supabase
            .from('app_messages')
            .select('challenge_id')
            .eq('sender_id', user.id)
            .in('challenge_id', challengeIds);
        const completedSet = new Set(completions?.map(c => c.challenge_id));
        const uncompleted = challenges
            .filter(c => !completedSet.has(c.id))
            .map(c => ({ ...c, group_name: c.app_groups?.name || c.app_groups?.language || 'Group', group_language: c.app_groups?.language || c.app_groups?.name || null }));
        const latestByGroup = new Map();
        uncompleted.forEach(c => {
            const existing = latestByGroup.get(c.group_id);
            if (!existing || new Date(c.created_at) > new Date(existing.created_at)) latestByGroup.set(c.group_id, c);
        });
        return Array.from(latestByGroup.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    // Admin test: load yesterday's challenges so you can test the flow when today is empty.
    const loadYesterdayChallengesForTest = async () => {
        try {
            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(yesterdayStart);
            yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
            const pending = await fetchPendingChallengesInRange(yesterdayStart, yesterdayEnd);
            setPendingChallenges(pending);
            setHeroChallengeIndex(0);
            setHeroRecordingMode(pending.length > 0 ? 'intro' : 'intro');
            return pending;
        } catch (error) {
            console.error('Error loading yesterday challenges:', error);
            Alert.alert('Couldn’t load yesterday’s challenges', error?.message || 'Something went wrong.');
            return [];
        }
    };

    // Admin test: load recent challenges (last 7 days) including completed ones, so you can always test the card/flow.
    const loadRecentChallengesForTest = async () => {
        if (!user?.id) return [];
        try {
            const { data: myGroups } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);
            if (!myGroups?.length) {
                Alert.alert('No groups', 'You need to be in a group to load test challenges.');
                return [];
            }
            const groupIds = myGroups.map(g => g.group_id);
            const rangeEnd = new Date();
            const rangeStart = new Date();
            rangeStart.setDate(rangeStart.getDate() - 7);
            const { data: challenges } = await supabase
                .from('app_challenges')
                .select('*, app_groups(name, language)')
                .in('group_id', groupIds)
                .gte('created_at', rangeStart.toISOString())
                .lt('created_at', rangeEnd.toISOString())
                .order('created_at', { ascending: false });
            if (!challenges?.length) {
                Alert.alert('No recent challenges', 'No challenges in the last 7 days for your groups.');
                return [];
            }
            const withGroupName = challenges.map(c => ({
                ...c,
                group_name: c.app_groups?.name || c.app_groups?.language || 'Group'
            }));
            const latestByGroup = new Map();
            withGroupName.forEach(c => {
                const existing = latestByGroup.get(c.group_id);
                if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
                    latestByGroup.set(c.group_id, c);
                }
            });
            const list = Array.from(latestByGroup.values()).sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            setPendingChallenges(list);
            setHeroChallengeIndex(0);
            setHeroRecordingMode(list.length > 0 ? 'intro' : 'intro');
            setShowChallengeCardInHero(false);
            return list;
        } catch (error) {
            console.error('Error loading recent challenges for test:', error);
            Alert.alert('Couldn’t load challenges', error?.message || 'Something went wrong.');
            return [];
        }
    };

    // Historical pending challenges (past 7 days, excl. today) for "do another" list picker
    const fetchHistoricalChallengesOnly = async () => {
        if (!user?.id) return [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const rangeStart = new Date(todayStart);
        rangeStart.setDate(rangeStart.getDate() - 7);
        const pending = await fetchPendingChallengesInRange(rangeStart, todayStart);
        setHistoricalChallenges(pending);
        return pending;
    };

    const loadHistoricalPendingChallenges = async () => {
        if (!user?.id) return [];
        setHistoricalChallengesLoading(true);
        try {
            await fetchHistoricalChallengesOnly();
            setShowChallengeListPicker(true);
        } finally {
            setHistoricalChallengesLoading(false);
        }
    };

    // Pre-load past challenges when Today tab is active so the list is ready when they tap "do another from the past"
    useEffect(() => {
        if (!user?.id) return;
        fetchHistoricalChallengesOnly();
    }, [user?.id]);

    const checkOnboardingStatus = async () => {
        if (!user) return;
        try {
            const { count, error } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', user.id);

            if (error) throw error;

            // New user (0 messages): show first-challenge flow so they send their first memo and learn Today → Community
            if (count === 0) {
                setShowOnboardingMission(true);
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
        }
    };

    const checkAdminStatus = async () => {
        if (!user) return;

        try {
            // 1. Get current status
            const { data } = await supabase
                .from('app_users')
                .select('display_name, is_admin, is_community_manager')
                .eq('id', user.id)
                .single();

            // 2. AUTO-PROMOTE NOAH :)
            if (data?.display_name === 'Noah :)' && !data.is_admin) {
                console.log('👑 Auto-promoting Founder Daddy...');
                const { error: updateError } = await supabase
                    .from('app_users')
                    .update({
                        is_admin: true,
                        is_community_manager: true
                    })
                    .eq('id', user.id);

                if (!updateError) {
                    setIsAdmin(true);
                    setIsCommunityManager(true);
                    fetchAdminStats();
                    return;
                }
            }

            console.log('Admin check:', data);
            if (data) {
                setIsAdmin(data.is_admin || false);
                setIsCommunityManager(data.is_community_manager || false);
                if (data.is_admin) {
                    fetchAdminStats();
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    };

    const fetchAdminStats = async () => {
        try {
            // Count unread support threads
            const { data: supportMessages } = await supabase
                .from('app_support_messages')
                .select('user_id, from_admin')
                .order('created_at', { ascending: false });

            const unreadThreads = new Set();
            const checkedUsers = new Set();

            supportMessages?.forEach(msg => {
                if (!checkedUsers.has(msg.user_id)) {
                    checkedUsers.add(msg.user_id);
                    if (!msg.from_admin) {
                        unreadThreads.add(msg.user_id);
                    }
                }
            });
            console.log('Final Unread Threads:', unreadThreads.size);
            setUnreadSupportCount(unreadThreads.size);

            // Count pending language requests
            const { count: pendingRequests } = await supabase
                .from('app_language_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            setPendingRequestsCount(pendingRequests || 0);

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        }
    };

    const loadGroups = async () => {
        try {
            // Get groups the user is a member of
            const { data: memberships, error: memberError } = await supabase
                .from('app_group_members')
                .select(`
                    group_id,
                    last_read_at,
                    app_groups (
                        id,
                        name,
                        language,
                        level,
                        member_count,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id);

            if (memberError) throw memberError;

            if (!memberships || memberships.length === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }

            const groupIds = memberships.map(m => m.app_groups?.id).filter(Boolean);
            if (groupIds.length === 0) {
                setGroups([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }
            const lastReadByGroup = new Map(memberships.map(m => [m.app_groups?.id, m.last_read_at || '1970-01-01']));

            // Single query: recent messages for all user's groups (batch instead of N queries)
            const { data: allMessages, error: msgError } = await supabase
                .from('app_messages')
                .select('id, group_id, content, created_at, message_type, sender_id')
                .in('group_id', groupIds)
                .order('created_at', { ascending: false })
                .limit(400);

            if (msgError) throw msgError;

            const lastMessageByGroup = {};
            const unreadCountByGroup = {};
            groupIds.forEach(gid => {
                unreadCountByGroup[gid] = 0;
            });

            const recentSenderIdsByGroup = {}; // gid -> [sender_id] up to 3 unique, most recent first (excluding self)
            for (const msg of allMessages || []) {
                const gid = msg.group_id;
                if (!lastMessageByGroup[gid]) lastMessageByGroup[gid] = msg;
                const lastRead = lastReadByGroup.get(gid) || '1970-01-01';
                if (msg.created_at > lastRead && msg.sender_id !== user.id) {
                    unreadCountByGroup[gid] = (unreadCountByGroup[gid] || 0) + 1;
                }
                if (msg.sender_id === user.id) continue;
                const arr = recentSenderIdsByGroup[gid] || (recentSenderIdsByGroup[gid] = []);
                if (arr.length < 3 && !arr.includes(msg.sender_id)) arr.push(msg.sender_id);
            }

            const senderIds = [...new Set(Object.values(lastMessageByGroup).map(m => m.sender_id).filter(Boolean))];
            const recentSpeakerIds = [...new Set(Object.values(recentSenderIdsByGroup).flat())];
            const allSenderIds = [...new Set([...senderIds, ...recentSpeakerIds])];
            const senderNames = {};
            const senderAvatars = {};
            if (allSenderIds.length > 0) {
                const { data: senders } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', allSenderIds);
                (senders || []).forEach(s => {
                    senderNames[s.id] = s.display_name || 'Unknown';
                    senderAvatars[s.id] = s.avatar_url || null;
                });
            }

            const groupsWithDetails = memberships.map((membership) => {
                const group = membership.app_groups;
                if (!group) return null;
                const lastMsg = lastMessageByGroup[group.id];
                const recentIds = (recentSenderIdsByGroup[group.id] || []).filter(sid => sid !== '00000000-0000-0000-0000-000000000000');
                const recentSpeakers = sortPeopleRealPhotosFirst(recentIds.map(sid => ({
                    id: sid,
                    display_name: senderNames[sid] || 'Unknown',
                    avatar_url: senderAvatars[sid] ?? null,
                })));
                return {
                    id: group.id,
                    name: group.name,
                    language: group.language,
                    level: group.level,
                    memberCount: group.member_count || 0,
                    avatarUrl: group.avatar_url,
                    recentSpeakers,
                    lastMessage: lastMsg ? {
                        content: lastMsg.content,
                        type: lastMsg.message_type,
                        senderName: senderNames[lastMsg.sender_id] || 'Unknown',
                        time: lastMsg.created_at
                    } : null,
                    unreadCount: unreadCountByGroup[group.id] || 0
                };
            }).filter(Boolean);

            // Sort by most recent message (newest first)
            groupsWithDetails.sort((a, b) => {
                const timeA = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
                const timeB = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
                return timeB - timeA; // Descending order (newest first)
            });

            // --- DM PROCESSING START ---
            // Identify DMs and fetch partner details
            const dmGroups = groupsWithDetails.filter(g => g.name === 'DM' && g.memberCount === 2);
            const dmGroupIds = dmGroups.map(g => g.id);

            if (dmGroupIds.length > 0) {
                // Fetch the partner for each DM (the other member)
                const { data: partners } = await supabase
                    .from('app_group_members')
                    .select('group_id, app_users(display_name, avatar_url)')
                    .in('group_id', dmGroupIds)
                    .neq('user_id', user.id);

                // Map partner info to group objects
                const partnerMap = {}; // groupId -> user object
                partners?.forEach(p => {
                    if (p.app_users) {
                        partnerMap[p.group_id] = p.app_users;
                    }
                });

                // Update groupsWithDetails with isDM and partner info
                groupsWithDetails.forEach(g => {
                    if (g.name === 'DM' && g.memberCount === 2) {
                        g.isDM = true;
                        g.partner = partnerMap[g.id];
                        // Fallback if partner not found (shouldn't happen)
                        if (!g.partner) {
                            g.partner = { display_name: 'Unknown User', avatar_url: null };
                        }
                    }
                });
            }
            // --- DM PROCESSING END ---

            // For groups with no recent speakers, show up to 3 group members (excluding self and bot)
            const BOT_ID = '00000000-0000-0000-0000-000000000000';
            const groupsNeedingMemberFaces = groupsWithDetails.filter(g => !g.isDM && (!g.recentSpeakers || g.recentSpeakers.length === 0));
            if (groupsNeedingMemberFaces.length > 0) {
                const groupIdsNeeding = groupsNeedingMemberFaces.map(g => g.id);
                const { data: memberRows } = await supabase
                    .from('app_group_members')
                    .select('group_id, user_id')
                    .in('group_id', groupIdsNeeding)
                    .neq('user_id', user.id)
                    .neq('user_id', BOT_ID);
                const memberIdsByGroup = {};
                (memberRows || []).forEach(row => {
                    const arr = memberIdsByGroup[row.group_id] || (memberIdsByGroup[row.group_id] = []);
                    if (arr.length < 3 && !arr.includes(row.user_id)) arr.push(row.user_id);
                });
                const allMemberIds = [...new Set(Object.values(memberIdsByGroup).flat())];
                let memberProfiles = {};
                if (allMemberIds.length > 0) {
                    const { data: profiles } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', allMemberIds);
                    (profiles || []).forEach(p => { memberProfiles[p.id] = p; });
                }
                groupsWithDetails.forEach(g => {
                    if (!g.isDM && (!g.recentSpeakers || g.recentSpeakers.length === 0)) {
                        const ids = memberIdsByGroup[g.id] || [];
                        g.groupMemberFaces = sortPeopleRealPhotosFirst(ids.map(sid => ({
                            id: sid,
                            display_name: memberProfiles[sid]?.display_name || 'Unknown',
                            avatar_url: memberProfiles[sid]?.avatar_url ?? null,
                        })));
                    }
                });
            }

            setGroups(groupsWithDetails);
            setLoadError(false);
        } catch (error) {
            console.error('Error loading groups:', error);
            setLoadError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        checkAdminStatus();
        await loadGroups();
        await checkPendingChallenges();
        await checkOnboardingStatus();
        await loadUserHomeData();
        setRefreshing(false);
    }, [user]);

    const handleLanguageRequest = async ({ country, language, note }) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('app_language_requests')
                .insert({
                    user_id: user.id,
                    country,
                    language,
                    note,
                    status: 'pending'
                });

            if (error) throw error;
            await completeQuest('request_language');
            setShowRequestModal(false);
            Alert.alert('Request Sent', 'Thank you! We will look into adding this language.');
        } catch (error) {
            console.error('Error submitting language request:', error);
            Alert.alert('Error', 'Could not submit request. Please try again.');
        }
    };

    // ... (rest of functions)

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const now = new Date();
        const date = new Date(timeString);

        // Is it today?
        if (now.toDateString() === date.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Within last 6 days?
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderGroup = ({ item }) => {
        // dynamic values based on DM or Group
        const isDM = item.isDM;
        const displayName = isDM ? (item.partner?.display_name || 'User') : item.name;
        const avatarSource = isDM ? (item.partner?.avatar_url) : item.avatarUrl;
        // For DMs, use partner avatar source logic
        // For Groups, use item.avatarUrl directly (assuming it's a URL or needs processing)

        return (
            <View style={styles.conversationCardWrap}>
                <Pressable
                    style={[
                        styles.conversationCard,
                        item.unreadCount > 0 && { borderLeftColor: SOUP_COLORS.blue }
                    ]}
                    onPress={() => {
                    if (!item?.id) {
                        Alert.alert('Couldn\'t open chat', 'This group couldn\'t be opened. Please try again or pull to refresh.');
                        return;
                    }
                    try { haptics.light(); } catch (_) {}
                    // Optimistically clear the badge immediately
                    setGroups(prev => prev.map(g =>
                        g.id === item.id ? { ...g, unreadCount: 0 } : g
                    ));
                    router.push(`/chat/${item.id}`);
                }}
            >
                {/* Avatar */}
                <View style={styles.littleCardAvatarWrap}>
                    {isDM ? (
                        <Image
                            source={getAvatarSource(avatarSource)}
                            style={styles.littleCardAvatar}
                        />
                    ) : (
                        <GroupAvatar language={item.language} size={48} />
                    )}
                    <View style={[styles.littleCardBadge, isDM && { backgroundColor: SOUP_COLORS.blue }]}>
                        {isDM ? (
                            <MessageCircle size={8} color="#fff" />
                        ) : (
                            <Users size={10} color="#fff" />
                        )}
                    </View>
                </View>

                <View style={styles.groupInfo}>
                    <View style={styles.groupHeader}>
                        <View style={styles.groupTitleRow}>
                            <ThemedText style={styles.groupName} numberOfLines={1}>{displayName}</ThemedText>
                            {!isDM && (
                                <View style={[styles.memberBadge, { backgroundColor: `${SOUP_COLORS.blue}18` }]}>
                                    <Users size={10} color={SOUP_COLORS.blue} />
                                    <Text style={[styles.memberBadgeText, { color: SOUP_COLORS.blue }]}>{item.memberCount}</Text>
                                </View>
                            )}
                        </View>
                        {item.lastMessage && (
                            <Text style={styles.time}>{formatTime(item.lastMessage.time)}</Text>
                        )}
                    </View>

                    <View style={styles.groupFooter}>
                        {item.lastMessage ? (
                            <View style={styles.lastMessageRow}>
                                {item.lastMessage.type === 'voice' && (
                                    <View style={styles.voiceIconWrap}>
                                        <Mic size={12} color={SOUP_COLORS.green} strokeWidth={2.5} />
                                    </View>
                                )}
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    <Text style={styles.senderNameInPreview}>
                                        {item.lastMessage.senderName === 'Me' ? 'You' : item.lastMessage.senderName}:
                                    </Text>
                                    {' '}
                                    {item.lastMessage.type === 'voice' ? 'Voice message' : item.lastMessage.content}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.noMessages}>No messages yet</Text>
                        )}

                        {item.unreadCount > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: SOUP_COLORS.pink }]}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.arrowContainer}>
                    <ChevronRight size={18} color={SOUP_COLORS.blue} />
                </View>
            </Pressable>
            </View>
        )
    };

    // Helper to render section header (optional subline for vibe)
    const renderSectionHeader = (title, subline) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            {subline ? <Text style={styles.sectionHeaderSubline}>{subline}</Text> : null}
        </View>
    );

    // Small section headers: 3 variants — change SECTION_HEADER_VARIANT above to try A, B, or C
    const SECTION_HEADER_EMOJIS = { 'daily challenge': '🎯', 'listen': '🎧', 'your chats': '💬', 'your stats': '📊' };
    const renderSmallSectionHeader = (title, rightElement = null) => {
        const variant = SECTION_HEADER_VARIANT;
        const isRowWithRight = !!rightElement;
        if (variant === 'A') {
            return (
                <View style={[styles.sectionHeaderRow, isRowWithRight && styles.sectionHeaderRowWithRight]}>
                    <View style={styles.sectionHeaderPill}>
                        <Text style={styles.sectionHeaderPillText}>{title}</Text>
                    </View>
                    {rightElement}
                </View>
            );
        }
        if (variant === 'B') {
            return (
                <View style={[styles.sectionHeaderRow, isRowWithRight && styles.sectionHeaderRowWithRight]}>
                    <View style={styles.sectionHeaderUnderlineWrap}>
                        <Text style={styles.sectionHeaderUnderlineText}>{title}</Text>
                        <View style={styles.sectionHeaderUnderline} />
                    </View>
                    {rightElement}
                </View>
            );
        }
        // C = emoji + text
        const emoji = SECTION_HEADER_EMOJIS[title.toLowerCase()] || '•';
        return (
            <View style={[styles.sectionHeaderRow, isRowWithRight && styles.sectionHeaderRowWithRight]}>
                <View style={styles.sectionHeaderEmojiRow}>
                    <Text style={styles.sectionHeaderEmoji}>{emoji}</Text>
                    <Text style={styles.sectionHeaderEmojiText}>{title}</Text>
                </View>
                {rightElement}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Split groups for rendering
    const dmGroups = groups.filter(g => g.isDM);
    const commGroups = groups.filter(g => !g.isDM && !g.name.toLowerCase().includes('support'));

    const displayName = userDisplayName?.trim() || 'Souper';
    const isNoah = (userDisplayName || '').toLowerCase().trim() === NOAH_DISPLAY_NAME;

    const handleHeroSend = async (audioResult) => {
        const current = heroCurrentChallengeRef.current;
        if (!current || !audioResult?.uri || !user?.id) return;
        lastCompletedGroupIdRef.current = current.group_id;
        setHeroLoading(true);
        try {
            if (current.id === 'onboarding-icebreaker') {
                await uploadFirstVoiceToGroups(
                    { uri: audioResult.uri, duration: audioResult.duration ?? 0 },
                    commGroups,
                    user.id
                );
                setShowOnboardingMission(false);
                await loadUserHomeData();
                setHeroCompletionCopy(getRandomCompletion());
                setHeroRecordingMode('done');
                return;
            }
            await uploadChallengeVoiceReply(
                { uri: audioResult.uri, duration: audioResult.duration ?? 0 },
                current,
                user.id
            );
            const remaining = await checkPendingChallenges();
            if (remaining?.length > 0) {
                setHeroChallengeIndex(0);
            } else {
                setHeroCompletionCopy(getRandomCompletion());
                setHeroRecordingMode('done');
            }
        } catch (err) {
            console.error('Hero send error:', err);
            Alert.alert('Error', 'Failed to send. Please try again.');
        } finally {
            setHeroLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Security Migration Banner */}
            < SecurityBanner />

            <View style={styles.todayColumn}>
            {/* Header: same as Community — profile, support, groups so design aligns and all buttons go somewhere */}
            <View style={[styles.homeHeader, { paddingTop: insets.top + 12, marginBottom: 14 }]}>
                <Pressable
                    style={({ pressed }) => [styles.homeHeaderLeft, pressed && { opacity: 0.85 }]}
                    onPress={() => {
                        try { haptics.light(); } catch (_) {}
                        router.push('/(tabs)/profile');
                    }}
                >
                    <View style={styles.homeHeaderAvatarCard}>
                        {userAvatarUrl ? (
                            <Image source={getAvatarSource(userAvatarUrl)} style={styles.homeHeaderAvatarImg} />
                        ) : (
                            <View style={styles.homeHeaderAvatarPlaceholder}>
                                <Text style={styles.homeHeaderAvatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.homeHeaderNameWrap}>
                        <Text style={styles.homeHeaderTitle} numberOfLines={1}>{displayName}</Text>
                        {userTagline ? (
                            <Text style={styles.homeHeaderTagline} numberOfLines={1}>{userTagline}</Text>
                        ) : null}
                    </View>
                </Pressable>
                <View style={styles.homeHeaderButtons}>
                    <Pressable style={({ pressed }) => [styles.homeHeaderIconBtn, pressed && { opacity: 0.85 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/support-chat'); }}>
                        <View style={[styles.homeHeaderIconCircle, { backgroundColor: SOUP_COLORS.pink }]}>
                            <MessageCircle size={16} color="#fff" />
                        </View>
                        <Text style={styles.homeHeaderIconLabel}>support</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.homeHeaderIconBtn, pressed && { opacity: 0.85 }]} onPress={() => { try { haptics.light(); } catch (_) {} setShowMoreMenu(true); }}>
                        <View style={[styles.homeHeaderIconCircle, { backgroundColor: SOUP_COLORS.green }]}>
                            <Globe size={16} color="#fff" />
                        </View>
                        <Text style={styles.homeHeaderIconLabel}>groups</Text>
                    </Pressable>
                </View>
            </View>
            {(dmGroups.length > 0 || commGroups.length > 0) ? (
            <>
            {/* Today = same design language as Community tab (two-tone hero, redesignSection cards).
            UNDER THE HOOD:
            - Main attraction: record your challenge if you haven't. When pendingChallenges.length > 0 we show
              the record flow first (intro → recording → done). Tap hero or card to start.
            - Second: when the next challenge drops. When !hasPending we show "next challenge in X" with a live
              countdown (nextChallengeIn updates every second from nextChallengeDropAt).
            - Data: checkPendingChallenges() fetches today's uncompleted challenges → setPendingChallenges.
              fetchNextChallengeDropAt() → setNextChallengeDropAt; useEffect turns that into nextChallengeIn (e.g. "5h 23m").
            - Order: Hero (record CTA or countdown) → pulse stats → record-your-challenge section (if pending) →
              next-challenge section (if no pending) → who replied → your groups.
            - Path: see challenge → read/hear (prompt + phrases/vocab) → record → send. One hero action (record). */}
            {(() => {
                const hasTodayDrop = !!todayChallengePrompt;
                const didIt = hasTodayDrop ? todayChallengeStats.responded > 0 : yesterdayChallengeDidRespond;
                const promptToShow = (hasTodayDrop ? (todayChallengePrompt || '').replace(/^#challenge\s*\n?/i, '').trim().split('\n')[0] : (yesterdayChallengePrompt || '').replace(/^#challenge\s*\n?/i, '').trim().split('\n')[0]) || 'Say something in your language!';
                const isFirstChallengeMode = showOnboardingMission && commGroups.length > 0 && !(pendingChallenges?.length > 0);
                const firstChallengeSynthetic = commGroups[0] ? {
                    id: 'onboarding-icebreaker',
                    prompt_text: FIRST_CHALLENGE_PROMPT,
                    group_id: commGroups[0].id,
                    group_name: commGroups[0].name || 'Soup',
                    group_language: commGroups[0].language,
                } : null;
                const hasPending = pendingChallenges?.length > 0;
                const effectiveHasPending = hasPending || isFirstChallengeMode;
                const clampedIndex = hasPending ? Math.min(heroChallengeIndex, pendingChallenges.length - 1) : 0;
                const currentChallenge = hasPending ? (pendingChallenges[clampedIndex] ?? pendingChallenges[0]) : (isFirstChallengeMode ? firstChallengeSynthetic : null);
                heroCurrentChallengeRef.current = currentChallenge;
                const showIntro = effectiveHasPending && heroRecordingMode === 'intro';
                const showRecording = effectiveHasPending && heroRecordingMode === 'recording';
                const showHeroDone = effectiveHasPending && heroRecordingMode === 'done';
                const showClassicDone = !effectiveHasPending;
                const showCard = (effectiveHasPending && showChallengeCardInHero) || isFirstChallengeMode;

                let statusLine;
                if (hasTodayDrop && !didIt) {
                    if (!statusReadyLineRef.current) statusReadyLineRef.current = STATUS_READY_LINES[Math.floor(Math.random() * STATUS_READY_LINES.length)];
                    statusLine = statusReadyLineRef.current;
                } else {
                                                    statusLine = didIt ? 'mission complete ✓' : `next in ${nextChallengeIn}`;
                }
                const dotColor = hasTodayDrop && !didIt ? SOUP_COLORS.green : (didIt ? SOUP_COLORS.green : SOUP_COLORS.subtext);

                const handleStartOrRecord = () => {
                    try { haptics.light(); } catch (_) {}
                    if (heroFirstTimeStart) AsyncStorage.setItem(CHALLENGE_START_SEEN_KEY, 'true');
                    setHeroRecordingMode('recording');
                };
                const handleHeroSkip = () => {
                    try { haptics.light(); } catch (_) {}
                    if (heroCurrentChallengeRef.current?.id === 'onboarding-icebreaker') {
                        setShowOnboardingMission(false);
                        return;
                    }
                    if (heroChallengeIndex < pendingChallenges.length - 1) {
                        setHeroChallengeIndex((prev) => prev + 1);
                    } else {
                        setHeroCompletionCopy(getRandomCompletion());
                        setHeroRecordingMode('done');
                    }
                };
                const effectivePendingCount = hasPending ? pendingChallenges.length : (isFirstChallengeMode ? 1 : 0);

                return (
                <ScrollView
                    ref={todayScrollRef}
                    style={[styles.todayScroll, { backgroundColor: SOUP_COLORS.cream }]}
                    contentContainerStyle={[styles.todayScrollContent, { paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.todayContentWrap, { paddingTop: insets.top + 16 }]}>
                    {/* "today's challenge" + big "speak [language]" right above the blue card; speak is static, only languages move (soupy slide) */}
                    {(effectiveHasPending || (dmGroups.length + commGroups.length) > 0) && (
                        (() => {
                            // Color by "new challenge" (day of first pending or today) so it changes when a new challenge drops; only blue/green/pink
                            const colorSeed = pendingChallenges[0]?.created_at || (todayChallengePrompt ? new Date().toISOString() : null) || new Date().toISOString();
                            const colorIndex = Math.floor(new Date(colorSeed).getTime() / (24 * 60 * 60 * 1000)) % TODAY_CHALLENGE_COLORS.length;
                            const heroBg = TODAY_CHALLENGE_COLORS[colorIndex];
                            const isCreamBg = false; // we no longer use cream for the card
                            const heroTextColor = isCreamBg ? SOUP_COLORS.dark : '#fff';
                            // Card area height: fit above tab bar so back/skip are visible
                            const todayBannerHeight = 100;
                            const todayCardAreaHeight = Math.max(320, SCREEN_HEIGHT - insets.top - 16 - todayBannerHeight - TAB_BAR_HEIGHT - insets.bottom - 24);
                            return (
                                <>
                                {/* Thin red banner + next countdown + speak ticker — one color for card + language */}
                                <View style={styles.todayAboveCard}>
                                    <View style={styles.todayThinBannerRow}>
                                        <View style={styles.todayThinBanner}>
                                            <Text style={styles.todayThinBannerText}>today's challenge</Text>
                                        </View>
                                                <View style={[styles.todayCountdownPill, countdownLastMinuteSeconds != null && styles.todayCountdownPillDramatic]}>
                                            <Text style={[styles.todayCountdownPillText, countdownLastMinuteSeconds != null && styles.todayCountdownPillTextDramatic]}>
                                                {nextChallengeIn === 'soon' || nextChallengeIn === 'any moment now' ? nextChallengeIn : countdownLastMinuteSeconds != null ? nextChallengeIn : `next in ${nextChallengeIn}`}
                                            </Text>
                                        </View>
                                    </View>
                                                <View style={styles.todaySpeakRow} collapsable={false}>
                                        {showCard ? (
                                            <>
                                                <Text style={styles.todaySpeakStatic}>speak </Text>
                                                <Text style={[styles.todaySpeakTick, { color: heroBg }]}>
                                                    {((currentChallenge?.group_language || currentChallenge?.group_name) || 'another').toLowerCase()}
                                                </Text>
                                            </>
                                        ) : speakItems.length > 0 ? (
                                            <>
                                                <Text style={styles.todaySpeakStatic}>speak </Text>
                                                <View style={styles.todaySpeakSlot}>
                                                    <Animated.View key={speakIndex} entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.todaySpeakTickWrap}>
                                                        <Text style={[styles.todaySpeakTick, { color: heroBg }]}>{speakItems[speakIndex % speakItems.length]?.language?.toLowerCase()}</Text>
                                                    </Animated.View>
                                                </View>
                                            </>
                                        ) : (
                                            <Text style={[styles.todaySpeakTick, { color: SOUP_COLORS.subtext }]}>time to speak</Text>
                                        )}
                                    </View>
                                    {(effectiveHasPending && (showHeroDone || showRecording || statusLine) || todayChallengeReplyCount > 0) && (
                                        <View style={styles.todayBannerStatusRow}>
                                            {effectiveHasPending && (
                                                <Text style={styles.todayBannerStatusDot}>
                                                    {showHeroDone ? 'done' : (statusLine || 'your turn')}
                                                </Text>
                                            )}
                                            {todayChallengeReplyCount > 0 && (
                                                <Text style={styles.todayBannerPulse}>{todayChallengeReplyCount} replied</Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                                <View style={[
                                    styles.todayRecordWindow,
                                    styles.todayReplyZone,
                                    { backgroundColor: heroBg, height: todayCardAreaHeight },
                                ]}>
                                    <View style={styles.todayReplyZoneInner}>
                                    {!heroPendingSettled ? (
                                        <View style={[styles.todayHeroNoPendingWrap, styles.todayHeroNoPendingFill]}>
                                            <ActivityIndicator size="large" color={heroTextColor} />
                                            <Text style={[styles.todayHeroNoPendingHint, { color: heroTextColor, opacity: 0.9, marginTop: 12 }]}>loading…</Text>
                                        </View>
                                    ) : effectiveHasPending && !showChallengeCardInHero && !isFirstChallengeMode ? (
                                        <View style={[styles.todayHeroNoPendingWrap, styles.todayHeroNoPendingFill]}>
                                            <Text style={[styles.todayHeroNoPendingPrompt, styles.todayHeroNoPendingPromptBig, { color: heroTextColor }]}>time to do your challenges</Text>
                                            <Text style={[styles.todayHeroNoPendingHint, { color: heroTextColor, opacity: 0.9 }]}>tap below to start</Text>
                                            <CtaPulseButton
                                                color={heroBg}
                                                style={[styles.todayHeroNoPendingCta, styles.todayHeroNoPendingCtaScream]}
                                                onPress={() => { try { haptics.light(); } catch (_) {} setShowChallengeCardInHero(true); }}
                                            />
                                        </View>
                                    ) : showCard ? (
                                        <>
                                            {showHeroDone ? (
                                                <View style={[styles.todayHeroCompletionContent, styles.todayHeroNoPendingFill]}>
                                                    <Text style={[styles.todayHeroNoPendingPrompt, styles.todayHeroNoPendingPromptBig, { color: heroTextColor }]}>{heroCompletionCopy.title}</Text>
                                                    <Text style={[styles.todayHeroNoPendingHint, { color: heroTextColor, opacity: 0.9 }]}>back to today</Text>
                                                    <Pressable
                                                        style={({ pressed }) => [styles.todayHeroNoPendingCta, styles.todayHeroCompletionCta, pressed && { opacity: 0.9 }, { backgroundColor: '#fff' }]}
                                                        onPress={() => {
                                                            try { haptics.light(); } catch (_) {}
                                                            setShowChallengeCardInHero(false);
                                                            setHeroChallengeIndex(0);
                                                            setHeroRecordingMode('intro');
                                                            checkPendingChallenges().then(p => setPendingChallenges(p || []));
                                                        }}
                                                    >
                                                        <Text style={[styles.todayHeroStartCtaText, { color: heroBg, fontSize: 20 }]}>back to today</Text>
                                                    </Pressable>
                                                    {lastCompletedGroupIdRef.current && (
                                                        <Pressable
                                                            style={({ pressed }) => [styles.todayHeroCompletionSecondary, pressed && { opacity: 0.8 }]}
                                                            onPress={() => {
                                                                try { haptics.light(); } catch (_) {}
                                                                router.push(`/chat/${lastCompletedGroupIdRef.current}`);
                                                            }}
                                                        >
                                                            <Headphones size={18} color={heroTextColor} strokeWidth={2} />
                                                            <Text style={[styles.todayHeroCompletionSecondaryText, { color: heroTextColor }]}>see who replied</Text>
                                                        </Pressable>
                                                    )}
                                                </View>
                                            ) : (
                                                <>
                                                    {currentChallenge ? (
                                                        <>
                                                            <View style={styles.todayCardWrapper}>
                                                                <ChallengeQueueCard
                                                                    key={currentChallenge.id}
                                                                    challenge={currentChallenge}
                                                                    groupName={currentChallenge.group_name}
                                                                    onSend={handleHeroSend}
                                                                    loading={heroLoading}
                                                                    isLightBackground={isCreamBg}
                                                                    currentCardIdRef={heroCardIdRef}
                                                                    isCompact={false}
                                                                    embedInSection
                                                                    minimal={false}
                                                                />
                                                            </View>
                                                            <View style={styles.todayCardNavBar}>
                                                                <Pressable
                                                                    onPress={async () => {
                                                                        try { haptics.light(); } catch (_) {}
                                                                        if (currentChallenge?.id === 'onboarding-icebreaker') {
                                                                            setShowOnboardingMission(false);
                                                                            return;
                                                                        }
                                                                        if (heroChallengeIndex > 0) {
                                                                            setHeroChallengeIndex((prev) => prev - 1);
                                                                        } else {
                                                                            setShowChallengeCardInHero(false);
                                                                            setHeroChallengeIndex(0);
                                                                            setHeroRecordingMode('intro');
                                                                        }
                                                                    }}
                                                                    style={({ pressed }) => [styles.todayCardNavBtn, pressed && { opacity: 0.8 }]}
                                                                >
                                                                    <Text style={[styles.todayCardNavBtnText, { color: heroTextColor }]}>← back</Text>
                                                                </Pressable>
                                                                <View style={styles.todayCardNavProgressWrap}>
                                                                    <Text style={[styles.todayCardNavProgress, { color: heroTextColor }]}>
                                                                        {clampedIndex + 1} of {effectivePendingCount}
                                                                        {currentChallenge?.group_language || currentChallenge?.group_name ? ` · ${(currentChallenge.group_language || currentChallenge.group_name).toLowerCase()}` : ''}
                                                                    </Text>
                                                                </View>
                                                                <Pressable style={({ pressed }) => [styles.todayCardNavBtn, pressed && { opacity: 0.8 }]} onPress={handleHeroSkip}>
                                                                    <Text style={[styles.todayCardNavBtnText, { color: heroTextColor }]}>skip →</Text>
                                                                </Pressable>
                                                            </View>
                                                        </>
                                                    ) : (
                                                        <View style={styles.todayCardPlaceholder}>
                                                            <Pressable style={({ pressed }) => [styles.todayStartCta, pressed && { opacity: 0.9 }]} onPress={() => checkPendingChallenges()}>
                                                                <Mic size={28} color="#fff" />
                                                                <Text style={styles.todayStartCtaText}>refresh</Text>
                                                            </Pressable>
                                                        </View>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <View style={styles.todayHeroNoPendingWrap}>
                                            {(todayChallengePrompt || yesterdayChallengePrompt) ? (
                                                <>
                                                    <Text style={styles.todayHeroNoPendingPrompt}>
                                                        {(todayChallengePrompt || yesterdayChallengePrompt).replace(/^#challenge\s*\n?/i, '').trim().split('\n')[0]}
                                                    </Text>
                                                    <Text style={styles.todayHeroNoPendingHint}>tap below to start. prompt, phrases, then record.</Text>
                                                </>
                                            ) : (
                                                <Text style={[styles.todayHeroNoPendingPrompt, { fontSize: 28 }]}>today's challenge will show here once it drops</Text>
                                            )}
                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.todayHeroNoPendingCta,
                                                    pressed && !heroCtaLoading && styles.todayHeroNoPendingCtaPressed,
                                                ]}
                                                onPress={async () => {
                                                    if (heroCtaLoading) return;
                                                    try { haptics.light(); } catch (_) {}
                                                    setHeroCtaLoading(true);
                                                    if (historicalChallenges?.length > 0) {
                                                        setPendingChallenges([historicalChallenges[0]]);
                                                        setHeroChallengeIndex(0);
                                                        setHeroRecordingMode('recording');
                                                        setHeroCtaLoading(false);
                                                        return;
                                                    }
                                                    const pending = await checkPendingChallenges();
                                                    if (pending?.length > 0) {
                                                        setPendingChallenges(pending);
                                                        setHeroChallengeIndex(0);
                                                        setHeroRecordingMode('intro');
                                                        setShowChallengeCardInHero(true);
                                                    } else {
                                                        const hist = await fetchHistoricalChallengesOnly();
                                                        if (hist?.length > 0) {
                                                            setPendingChallenges([hist[0]]);
                                                            setHeroChallengeIndex(0);
                                                            setHeroRecordingMode('recording');
                                                            setShowChallengeCardInHero(true);
                                                        }
                                                    }
                                                    setHeroCtaLoading(false);
                                                }}
                                                disabled={heroCtaLoading}
                                            >
                                                {heroCtaLoading ? (
                                                    <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                                                ) : (
                                                    <AnimatedIdleWaveform
                                                        variant="silky"
                                                        color={SOUP_COLORS.blue}
                                                        barCount={32}
                                                        barWidth={4}
                                                        maxHeight={40}
                                                    />
                                                )}
                                            </Pressable>
                                        </View>
                                    )}
                                    </View>
                                </View>

                                </>
                            );
                        })()
                    )}

                    {/* Minimal footer: countdown · replies (another challenge is in done screen; groups link removed per request) */}
                    {(() => {
                        const parts = [];
                        if (showClassicDone && nextChallengeIn) parts.push({ label: `next in ${nextChallengeIn}`, onPress: () => loadHistoricalPendingChallenges() });
                        if (todayChallengeReplyCount > 0) parts.push({ label: `${todayChallengeReplyCount} replied`, onPress: () => { if (recentChallengeResponses[0]?.groupId) router.push(`/chat/${recentChallengeResponses[0].groupId}`); else router.push('/(tabs)/community'); } });
                        if (parts.length === 0) return null;
                        return (
                            <View style={styles.todayFooterLine}>
                                {parts.map((p, i) => (
                                    <Pressable key={i} style={({ pressed }) => [styles.todayFooterLink, pressed && { opacity: 0.7 }]} onPress={() => { try { haptics.light(); } catch (_) {} p.onPress?.(); }}>
                                        <Text style={styles.todayFooterLinkText}>{p.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        );
                    })()}
                </View>
                </ScrollView>
                );
            })()}
            </>
            ) : (
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.list, styles.listContent, { paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.scrollContentWrap} />
            </ScrollView>
            )}

            {/* Noah-only: test daily challenge flow */}
            {isNoah && (dmGroups.length > 0 || commGroups.length > 0) && (
                <Pressable
                    style={({ pressed }) => [styles.adminTestChallengeRow, pressed && { opacity: 0.8 }]}
                    onPress={async () => {
                        try { haptics.light(); } catch (_) {}
                        await loadRecentChallengesForTest();
                    }}
                >
                    <Megaphone size={18} color={SOUP_COLORS.pink} />
                    <Text style={styles.adminTestChallengeText}>test challenge flow</Text>
                </Pressable>
            )}

            </View>

            <LanguageRequestModal
                visible={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSubmit={handleLanguageRequest}
            />

            <Modal visible={showMoreMenu} transparent animationType="fade">
                <Pressable style={styles.moreMenuBackdrop} onPress={() => setShowMoreMenu(false)}>
                    <View style={styles.moreMenuSheet} pointerEvents="box-none">
                        <Pressable style={({ pressed }) => [styles.moreMenuRow, pressed && { opacity: 0.8 }]} onPress={() => { setShowMoreMenu(false); router.push('/browse-groups'); }}>
                            <Text style={styles.moreMenuLabel}>browse groups</Text>
                            <ChevronRight size={18} color={SOUP_COLORS.subtext} />
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.moreMenuRow, pressed && { opacity: 0.8 }]} onPress={() => { setShowMoreMenu(false); setShowRequestModal(true); }}>
                            <Text style={styles.moreMenuLabel}>request a language</Text>
                            <ChevronRight size={18} color={SOUP_COLORS.subtext} />
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            <Modal visible={showProfileCard} transparent animationType="fade">
                <Pressable style={styles.profileCardBackdrop} onPress={() => setShowProfileCard(false)}>
                    <Pressable style={styles.profileCard} onPress={e => e.stopPropagation()}>
                        <View style={styles.profileCardAvatarWrap}>
                            {userAvatarUrl ? (
                                <Image source={getAvatarSource(userAvatarUrl)} style={styles.profileCardAvatar} />
                            ) : (
                                <View style={[styles.profileCardAvatar, styles.profileCardAvatarPlaceholder]}>
                                    <Text style={styles.profileCardAvatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.profileCardName}>{displayName}</Text>
                        {userTagline ? <Text style={styles.profileCardTagline}>"{userTagline}"</Text> : null}
                        <View style={styles.profileCardStats}>
                            <Text style={styles.profileCardStat}>{groups.filter(g => !g.isDM && !g.name?.toLowerCase().includes('support')).length} groups</Text>
                            {(minutesSpoken != null || minutesListened != null) && (
                                <Text style={styles.profileCardStat}>
                                    {formatStatMinutes(minutesSpoken ?? 0)} min spoken · {formatStatMinutes(minutesListened ?? 0)} min listened
                                </Text>
                            )}
                        </View>
                        <Pressable style={({ pressed }) => [styles.profileCardBtn, pressed && { opacity: 0.9 }]} onPress={() => { setShowProfileCard(false); router.push('/(tabs)/profile'); }}>
                            <Edit2 size={18} color={SOUP_COLORS.blue} />
                            <Text style={styles.profileCardBtnText}>edit profile</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.profileCardBtn, styles.profileCardBtnLogout, pressed && { opacity: 0.9 }]} onPress={() => { setShowProfileCard(false); signOut(); }}>
                            <LogOut size={18} color={SOUP_COLORS.pink} />
                            <Text style={[styles.profileCardBtnText, { color: SOUP_COLORS.pink }]}>log out</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <Pressable
                style={styles.adminToggleButton}
                onPress={() => {
                    if (adminModeEnabled) {
                        setAdminModeEnabled(false);
                        setIsAdmin(false);
                    } else {
                        setShowAdminModal(true);
                    }
                }}
            >
                <Text style={styles.adminToggleText}>
                    {adminModeEnabled ? '👤' : '🔐'}
                </Text>
            </Pressable>

            {/* Admin Password Modal */}
            <AdminLoginModal
                visible={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onSuccess={() => {
                    setAdminModeEnabled(true);
                    setIsAdmin(true);
                    setShowFounderWelcome(true); // TRIGGER THE EGO BOOST
                }}
            />

            <FounderWelcomeModal
                visible={showFounderWelcome}
                onClose={() => {
                    setShowFounderWelcome(false);
                    router.push('/(tabs)/profile'); // Navigate to profile after enjoying the praise
                }}
            />

            <Modal visible={showChallengeListPicker} animationType="slide" transparent>
                <Pressable style={styles.challengePickerBackdrop} onPress={() => setShowChallengeListPicker(false)}>
                    <SafeAreaView style={styles.challengePickerSheet} pointerEvents="box-none">
                        <Pressable style={styles.challengePickerContent} onPress={e => e.stopPropagation()}>
                            <View style={styles.challengePickerHeader}>
                                <Text style={styles.challengePickerTitle}>past challenges</Text>
                                <Pressable onPress={() => setShowChallengeListPicker(false)} hitSlop={12}>
                                    <Text style={styles.challengePickerClose}>close</Text>
                                </Pressable>
                            </View>
                            {historicalChallengesLoading && historicalChallengesByDay.length === 0 ? (
                                <View style={styles.challengePickerEmpty}>
                                    <ActivityIndicator size="large" color={SOUP_COLORS.green} style={{ marginBottom: 12 }} />
                                    <Text style={styles.challengePickerEmptyText}>loading past challenges…</Text>
                                </View>
                            ) : historicalChallengesByDay.length === 0 ? (
                                <View style={styles.challengePickerEmpty}>
                                    <Text style={styles.challengePickerEmptyText}>you're all caught up</Text>
                                    <Text style={styles.challengePickerEmptySub}>no past challenges left to do</Text>
                                    {([...(dmGroups || []), ...(commGroups || [])][0]?.id) ? (
                                        <Pressable
                                            style={({ pressed }) => [styles.challengePickerOpenGroup, pressed && { opacity: 0.9 }]}
                                            onPress={() => {
                                                const firstId = [...(dmGroups || []), ...(commGroups || [])][0]?.id;
                                                setShowChallengeListPicker(false);
                                                if (firstId) router.push(`/chat/${firstId}`);
                                            }}
                                        >
                                            <Text style={styles.challengePickerOpenGroupText}>open group</Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            ) : (
                                <FlatList
                                    data={historicalChallengesByDay}
                                    keyExtractor={row => row.dateKey}
                                    style={styles.challengePickerList}
                                    renderItem={({ item, index }) => {
                                        const { dateLabel, challenge } = item;
                                        const promptPreview = (challenge.prompt_text || '').replace(/^#challenge\s*\n?/i, '').trim().split('\n')[0] || 'Challenge';
                                        const rowAccent = [SOUP_COLORS.green, SOUP_COLORS.blue, SOUP_COLORS.pink][index % 3];
                                        return (
                                            <Pressable
                                                style={({ pressed }) => [styles.challengePickerRow, { borderLeftColor: rowAccent }, pressed && { opacity: 0.8 }]}
                                                onPress={() => {
                                                    try { haptics.light(); } catch (_) {}
                                                    setPendingChallenges([challenge]);
                                                    setShowChallengeListPicker(false);
                                                    setHeroChallengeIndex(0);
                                                    setHeroRecordingMode('recording');
                                                    setTimeout(() => todayScrollRef.current?.scrollTo?.({ y: 0, animated: true }), 150);
                                                }}
                                            >
                                                <Text style={styles.challengePickerRowPrompt} numberOfLines={2}>{promptPreview}</Text>
                                                <Text style={styles.challengePickerRowMeta}>{dateLabel}</Text>
                                            </Pressable>
                                        );
                                    }}
                                />
                            )}
                        </Pressable>
                    </SafeAreaView>
                </Pressable>
            </Modal>

            <UserPreviewModal
                visible={!!selectedUser}
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    sectionHeaderSubline: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
        opacity: 0.9,
    },
    yourPeopleSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 10,
    },
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    scrollView: {
        flex: 1,
    },



    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    homeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 16,
        backgroundColor: SOUP_COLORS.blue,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    homeHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        gap: 12,
    },
    homeHeaderAvatarCard: {
        width: 52,
        height: 52,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    homeHeaderAvatarImg: {
        width: 52,
        height: 52,
        borderRadius: 14,
    },
    homeHeaderAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    homeHeaderAvatarLetter: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    homeHeaderNameWrap: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    homeHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.3,
    },
    homeHeaderTagline: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    homeHeaderButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    homeHeaderIconBtn: {
        alignItems: 'center',
        padding: 4,
    },
    homeHeaderIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    homeHeaderIconLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerLogo: {
        width: 52,
        height: 52,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textLight,
        fontWeight: '500',
        marginTop: 2,
    },
    browseButton: {
        padding: 8,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerButtonWithLabel: {
        alignItems: 'center',
        gap: 4,
    },
    headerIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${SOUP_COLORS.blue}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    headerButton: {
        padding: 8,
    },
    // Admin Section
    adminSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
        gap: 10,
    },
    adminCardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    adminCardSmall: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    adminCardSmallTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    adminCardSmallSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    adminCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 14,
    },
    adminCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminCardInfo: {
        flex: 1,
    },
    adminCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    adminCardSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
    },
    list: {
        paddingVertical: 4,
    },
    listContent: {
        paddingTop: 0,
        paddingBottom: 24,
    },
    scrollContentWrap: {
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        paddingTop: 0,
        marginTop: 2,
    },
    adminTestChallengeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 8,
        backgroundColor: 'rgba(236, 0, 139, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.2)',
    },
    adminTestChallengeText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
    },
    footerBlock: {
        marginTop: 16,
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    moreSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        letterSpacing: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    moreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    moreRowLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: SOUP_COLORS.text,
    },
    conversationCardWrap: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    arrowContainer: {
        paddingLeft: 4,
        justifyContent: 'center',
    },
    groupAvatarWrapper: {
        position: 'relative',
        marginRight: 16,
    },
    groupAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    littleCardAvatarWrap: {
        position: 'relative',
        marginRight: 12,
    },
    littleCardAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    littleCardBadge: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        backgroundColor: SOUP_COLORS.green,
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    groupAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    groupBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.secondary,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    groupInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8, // Add breathing room from arrow
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 8, // More breathing room
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        flexShrink: 1, // Allow name to shrink if needed
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        flexShrink: 0, // Don't shrink the badge
    },
    memberBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textLight,
    },
    time: {
        fontSize: 12,
        color: Colors.textLight,
        flexShrink: 0, // Never shrink the time
        minWidth: 35, // Ensure space for time like "now", "12h"
    },
    groupFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    senderNameInPreview: {
        fontWeight: '600',
        color: Colors.text,
    },
    lastMessageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    voiceIconWrap: {
        marginRight: 6,
        justifyContent: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: Colors.textLight,
        flex: 1,
        minWidth: 0,
    },
    noMessages: {
        fontSize: 14,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    cardBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: SOUP_COLORS.red,
        borderRadius: 10,
        height: 20,
        minWidth: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 999, // Force on top
        elevation: 10,
    },
    unreadBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
        marginLeft: 4,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    groupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberCount: {
        fontSize: 12,
        color: Colors.textLight,
    },
    emptyState: {
        padding: 64,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 72,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        marginBottom: 24,
    },
    loadErrorBanner: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(236,0,139,0.06)',
        borderRadius: 12,
        marginTop: 4,
    },
    loadErrorText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    loadErrorSubtext: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
    },
    loadErrorButton: {
        backgroundColor: SOUP_COLORS.blue,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    loadErrorButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    addButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 24,
        gap: 14,
    },
    requestIcon: {
        marginRight: 4,
    },
    requestButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.green,
    },
    // Floating Request Group Button
    floatingRequestBtn: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        zIndex: 1000,
        alignItems: 'center',
    },
    listHeader: {
        paddingTop: 10,
    },
    todayColumn: {
        flex: 1,
    },
    todayScroll: {
        flex: 1,
    },
    todayScrollContent: {
        paddingHorizontal: 0,
        paddingTop: 0,
    },
    todayContentWrap: {
        paddingBottom: 48,
        paddingHorizontal: 20,
    },
    todayPageTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.3,
        marginBottom: 14,
        textTransform: 'lowercase',
    },
    todayHeaderStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: `${SOUP_COLORS.blue}14`,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${SOUP_COLORS.blue}28`,
    },
    todayAboveCard: {
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    todayThinBannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 10,
    },
    todayThinBanner: {
        backgroundColor: '#c0392b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    todayCountdownPill: {
        backgroundColor: SOUP_COLORS.blue + '22',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    todayCountdownPillDramatic: {
        backgroundColor: SOUP_COLORS.blue + '35',
        paddingVertical: 10,
        paddingHorizontal: 18,
    },
    todayCountdownPillText: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayCountdownPillTextDramatic: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    todayNextChallengeIn: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todayAnotherChallengeBtn: {
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 24,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: SOUP_COLORS.blue + '50',
        alignSelf: 'center',
    },
    todayAnotherChallengeBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayThinBannerText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        textTransform: 'lowercase',
        letterSpacing: 0.3,
    },
    todaySpeakRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 6,
    },
    todaySpeakStatic: {
        fontSize: 32,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        textTransform: 'lowercase',
        letterSpacing: -0.3,
    },
    todaySpeakSlot: {
        marginLeft: 6,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        minWidth: 100,
    },
    todaySpeakTickWrap: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    todaySpeakTick: {
        fontSize: 32,
        fontWeight: '900',
        textTransform: 'lowercase',
        letterSpacing: -0.3,
    },
    todayBannerStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    todayBannerStatusDot: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayBannerPulse: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todayLanguagePill: {
        marginTop: 6,
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 12,
        alignSelf: 'center',
    },
    todayLanguagePillText: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.dark,
        textTransform: 'lowercase',
    },
    todayHeaderMinimal: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    todayHeaderMinimalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        letterSpacing: 0.3,
    },
    todayHeaderMinimalStatus: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        maxWidth: 200,
    },
    todayHeaderPulse: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 24,
        textTransform: 'lowercase',
    },
    todayPunchLine: {
        fontSize: 34,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.8,
        marginBottom: 8,
        textTransform: 'lowercase',
    },
    todayPromptOneLine: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
        marginBottom: 24,
    },
    todayChallengeHeroWrap: {
        marginBottom: 20,
    },
    todayChallengeBubbleWrap: {
        marginBottom: 0,
        alignItems: 'flex-start',
    },
    todayChatRow: {
        marginBottom: 4,
        alignItems: 'flex-start',
    },
    todayBubbleContainer: {
        maxWidth: '100%',
    },
    todayBubbleSender: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        marginBottom: 4,
        marginLeft: 4,
    },
    todayBubbleWithTail: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        minHeight: 24,
    },
    todayBubbleTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 0,
        borderTopWidth: 14,
        borderBottomWidth: 0,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#C7C7CC',
        borderBottomColor: 'transparent',
        marginLeft: 2,
        marginBottom: 8,
    },
    todayBubble: {
        backgroundColor: '#C7C7CC',
        borderRadius: 22,
        borderTopLeftRadius: 6,
        paddingVertical: 18,
        paddingHorizontal: 22,
        maxWidth: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    todayBubbleText: {
        fontSize: 28,
        fontWeight: '800',
        color: SOUP_COLORS.dark,
        lineHeight: 36,
        letterSpacing: -0.3,
    },
    todayChallengeHero: {
        fontSize: 28,
        fontWeight: '800',
        color: SOUP_COLORS.dark,
        lineHeight: 36,
        letterSpacing: -0.3,
    },
    todayChallengeHeroMuted: {
        color: SOUP_COLORS.subtext,
        fontWeight: '700',
    },
    todayReplyContext: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    todayReplyContextMuted: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 12,
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    todayChallengeSub: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginTop: 8,
        textTransform: 'lowercase',
    },
    todayHeaderTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.3,
        textTransform: 'lowercase',
    },
    todayHeaderStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        justifyContent: 'flex-end',
    },
    todayHeaderStatus: {
        fontSize: 14,
        fontWeight: '800',
        color: SOUP_COLORS.green,
        textTransform: 'lowercase',
        maxWidth: 160,
    },
    todayHeaderPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${SOUP_COLORS.green}20`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    todayHeaderPillText: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    todayHeaderPillDot: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginHorizontal: 2,
    },
    todayRecordWindowTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 14,
        textTransform: 'lowercase',
    },
    todaySectionListenLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        marginBottom: 6,
        textTransform: 'lowercase',
    },
    todayListenReassurance: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 10,
        textTransform: 'lowercase',
    },
    todayHeroTwoTone: {
        flexDirection: 'row',
        marginHorizontal: -16,
        marginBottom: 14,
        minHeight: 110,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    todayHeroLeft: {
        flex: 1,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 12,
    },
    todayHeroRight: {
        flex: 1,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 12,
    },
    todayHeroBig: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    todayHeroLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.95)',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    todayHeroSub: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    todayTimelineCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        gap: 2,
    },
    todayTimelineCompactGray: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    todayTimelineCompactBold: {
        fontSize: 13,
        fontWeight: '800',
        color: SOUP_COLORS.green,
    },
    todayTimelineCompactDot: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '400',
    },
    todayTimelineDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 18,
    },
    todayTimelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    todayTimelineDotGray: {
        backgroundColor: SOUP_COLORS.subtext,
        opacity: 0.5,
    },
    todayTimelineDotCurrent: {
        backgroundColor: SOUP_COLORS.green,
        transform: [{ scale: 1.2 }],
    },
    todayDataStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    todayDataStripLeft: {},
    todayDataStripLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    todayDataStripValue: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    todayDataStripRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    todayDataStripStat: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    todayDataStripDot: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    todayTimelineWrap: {
        flexDirection: 'row',
        marginBottom: 18,
        gap: 8,
    },
    todayTimelineSlot: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 18,
        minHeight: 72,
    },
    todayTimelineSlotGray: {
        backgroundColor: `${SOUP_COLORS.blue}08`,
    },
    todayTimelineSlotCurrent: {
        backgroundColor: `${SOUP_COLORS.blue}18`,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
    },
    todayTimelineSlotLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    todayTimelineSlotLabelCurrent: {
        color: SOUP_COLORS.blue,
    },
    todayTimelineSlotText: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    todayTimelineSlotTextBold: {
        fontSize: 13,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    todayRecordWindow: {
        marginTop: 8,
        marginHorizontal: -20,
        backgroundColor: SOUP_COLORS.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 20,
        minHeight: 320,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
    },
    todayReplyZone: {
        borderTopWidth: 0,
    },
    todayReplyZoneInner: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    todayVoiceStrip: {
        marginHorizontal: -4,
    },
    todayVoiceStripWrap: {
        gap: 12,
        paddingVertical: 4,
    },
    todayVoiceCard: {
        width: 140,
        alignItems: 'center',
    },
    todayVoiceCardFirst: {
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
        borderRadius: 16,
        padding: 8,
        margin: -2,
    },
    todayVoiceCardAvatarWrap: {
        marginBottom: 6,
    },
    todayVoiceCardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    todayVoiceCardAvatarPh: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayVoiceCardAvatarLetter: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    todayVoiceCardName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 6,
        maxWidth: '100%',
    },
    todayVoiceCardBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${SOUP_COLORS.blue}15`,
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 6,
        width: '100%',
        justifyContent: 'center',
    },
    todayVoiceCardPlayBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayVoiceCardPlayBtnActive: {
        backgroundColor: SOUP_COLORS.pink,
    },
    todayVoiceCardDuration: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    todayNextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 8,
    },
    todayListenEmptyWrap: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 10,
    },
    todayRedesignSection: {
        marginTop: 32,
        marginHorizontal: 0,
        backgroundColor: 'transparent',
        borderRadius: 0,
        paddingVertical: 20,
        paddingHorizontal: 0,
    },
    todaySectionNext: {},
    todaySectionListen: {},
    todayRedesignSectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.3,
        marginBottom: 14,
    },
    todaySectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        opacity: 0.85,
        textTransform: 'lowercase',
        letterSpacing: 0.3,
        marginBottom: 14,
    },
    todayFooterLine: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        paddingVertical: 28,
        paddingHorizontal: 20,
    },
    todayFooterLink: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    todayFooterLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todayNextSub: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 14,
        textTransform: 'lowercase',
    },
    todaySectionCtaButton: {
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todaySectionCtaButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        textTransform: 'lowercase',
    },
    todaySectionGroups: {},
    todayHeadline: {
        marginBottom: 16,
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cream,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginHorizontal: -4,
    },
    todayHeadlineLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.green,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    todayHeadlineMain: {
        fontSize: 22,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        textAlign: 'center',
        letterSpacing: -0.3,
        lineHeight: 28,
    },
    todayCountdownBanner: {
        fontSize: 42,
        fontWeight: '900',
        color: SOUP_COLORS.green,
        letterSpacing: -0.5,
        marginVertical: 8,
    },
    todayTimeline: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    todayTimelineSlot: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 16,
        minHeight: 72,
    },
    todayTimelineSlotGray: {
        backgroundColor: `${SOUP_COLORS.green}08`,
    },
    todayTimelineSlotCurrent: {
        backgroundColor: `${SOUP_COLORS.green}18`,
        borderWidth: 2,
        borderColor: SOUP_COLORS.green,
    },
    todayTimelineLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 6,
    },
    todayTimelineLabelCurrent: {
        color: SOUP_COLORS.green,
    },
    todayTimelinePromptGray: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        opacity: 0.9,
    },
    todayTimelinePromptBold: {
        fontSize: 14,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    todayListenEmpty: {
        fontSize: 14,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        paddingVertical: 12,
    },
    todaySectionSub: {
        fontSize: 15,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        marginTop: 4,
        marginBottom: 16,
    },
    todayCountdownBig: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.blue,
        letterSpacing: -0.3,
        marginTop: 4,
        marginBottom: 8,
    },
    todayPulseRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        minHeight: 36,
    },
    todayPulsePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: `${SOUP_COLORS.green}20`,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    todayPulsePillAlt: {
        backgroundColor: `${SOUP_COLORS.pink}18`,
    },
    todayPulseNum: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    todayPulseText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textTransform: 'lowercase',
    },
    todayPulseMuted: {
        fontSize: 13,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todaySectionBack: {
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    todayHero: {
        flexDirection: 'row',
        marginHorizontal: 0,
        marginTop: 16,
        minHeight: 110,
    },
    todayHeroLeft: {
        flex: 1,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    todayHeroRight: {
        flex: 1,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    todayHeroLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    todayHeroMain: {
        fontSize: 18,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
    },
    todayHeroCta: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        textTransform: 'lowercase',
    },
    todayHeroCtaLarge: {
        fontSize: 15,
        fontWeight: '900',
        color: '#fff',
        textTransform: 'lowercase',
        letterSpacing: 0.2,
    },
    todayHeroCtaSub: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    todayHeroGoPill: {
        backgroundColor: 'rgba(255,255,255,0.35)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 6,
    },
    todayHeroGoPillText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    todayHeroLivePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        marginBottom: 6,
        gap: 6,
    },
    todayHeroLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ff4444',
    },
    todaySection: {
        marginTop: 20,
        marginHorizontal: 0,
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 5,
    },
    todaySectionChallenge: {
        minHeight: 200,
    },
    todaySectionListen: {
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.pink,
    },
    todaySectionNext: {
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
    },
    todayChallengeHeroLabel: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.5,
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    todayCurrentPromptWrap: {
        backgroundColor: `${SOUP_COLORS.green}12`,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.green,
    },
    todayCurrentPromptText: {
        fontSize: 17,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        lineHeight: 24,
    },
    todayStartCtaLarge: {
        paddingVertical: 20,
        paddingHorizontal: 28,
    },
    todayStartCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: SOUP_COLORS.green,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginBottom: 16,
    },
    todayStartCtaText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        textTransform: 'lowercase',
    },
    todayCardPlaceholder: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    todayCardPlaceholderText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 16,
    },
    todaySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    todaySectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.3,
    },
    todaySectionGoPill: {
        backgroundColor: SOUP_COLORS.green,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    todaySectionChallengePill: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: SOUP_COLORS.green,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 14,
    },
    todaySectionGoPillText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    todaySectionChallengePillText: {
        fontSize: 10,
        fontWeight: '900',
        color: SOUP_COLORS.green,
        letterSpacing: 0.8,
    },
    todaySectionRoundBadge: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todaySectionCta: {},
    todaySectionCtaText: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todaySkipBtn: {
        alignSelf: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    todaySkipBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayOnePage: {
        flex: 1,
        minHeight: 0,
    },
    dailyStatusBar: {
        backgroundColor: SOUP_COLORS.cream,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    dailyStatusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginHorizontal: 20,
        marginBottom: 8,
        gap: 8,
    },
    dailyStatusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dailyStatusPrompt: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        flexShrink: 1,
    },
    dailyStatusVibeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    dailyStatusDot: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
    },
    dailyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    dailyStatusLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayGroupsSection: {
        marginBottom: 20,
    },
    todayGroupsLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    todayGroupsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    todayGroupsStrip: {
        marginHorizontal: -4,
        maxHeight: 64,
    },
    todayGroupsStripContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 6,
    },
    todayGroupChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${SOUP_COLORS.blue}14`,
        paddingVertical: 10,
        paddingLeft: 8,
        paddingRight: 16,
        borderRadius: 999,
        gap: 10,
        maxWidth: 160,
    },
    todayGroupChipAvatarWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    todayGroupChipAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    todayGroupChipLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    dailyStatusSub: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    dailyStatusRepliers: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        flex: 1,
    },
    dailyStatusEarly: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.green,
    },
    dailyStatusNext: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    heroCardWrap: {
        flex: 1,
        minHeight: 0,
        marginHorizontal: 20,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    whoRepliedWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        gap: 12,
        backgroundColor: `${SOUP_COLORS.green}18`,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
    },
    whoRepliedLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textTransform: 'lowercase',
    },
    whoRepliedAvatarsScroll: {
        flex: 1,
        maxHeight: 40,
    },
    whoRepliedAvatarsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    whoRepliedAvatarWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    whoRepliedAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    whoRepliedAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    whoRepliedAvatarLetter: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    whoRepliedListenBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: SOUP_COLORS.green,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    whoRepliedListenBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'lowercase',
    },
    heroCardSlot: {
        width: '100%',
        maxWidth: 400,
        flex: 1,
        minHeight: 220,
        borderRadius: 20,
        overflow: 'hidden',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionHeaderRowWithRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionHeaderAccent: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.blue,
        marginRight: 10,
        opacity: 0.7,
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        letterSpacing: 0.1,
        textTransform: 'lowercase',
    },
    sectionHeaderRowSub: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        marginTop: 10,
    },
    sectionHeaderAccentSub: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: SOUP_COLORS.blue,
        marginRight: 8,
        opacity: 0.5,
    },
    sectionHeaderTitleSub: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        letterSpacing: 0.2,
        textTransform: 'lowercase',
        opacity: 0.9,
    },
    // Variant A: pill (soft rounded label)
    sectionHeaderPill: {
        alignSelf: 'flex-start',
        backgroundColor: `${SOUP_COLORS.blue}18`,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    sectionHeaderPillText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    // Variant B: underline (minimal text + thick underline)
    sectionHeaderUnderlineWrap: {
        alignSelf: 'flex-start',
    },
    sectionHeaderUnderlineText: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        letterSpacing: -0.2,
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    sectionHeaderUnderline: {
        height: 3,
        borderRadius: 2,
        backgroundColor: SOUP_COLORS.blue,
        width: '100%',
    },
    // Variant C: emoji + text (friendly, chatty)
    sectionHeaderEmojiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionHeaderEmoji: {
        fontSize: 18,
    },
    sectionHeaderEmojiText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textTransform: 'lowercase',
    },
    comingSoonPlaceholder: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 2,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    comingSoonText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    podcastSectionWrap: {
        marginHorizontal: 12,
        marginTop: 0,
        marginBottom: 12,
    },
    podcastAnchoredWrap: {
        paddingHorizontal: 16,
        paddingTop: 8,
        backgroundColor: SOUP_COLORS.cream,
    },
    chatsStatsBlock: {
        marginHorizontal: 16,
        marginBottom: 14,
    },
    chatsContentBlock: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 14,
        overflow: 'hidden',
    },
    statsSectionWrap: {
        marginTop: 14,
    },
    homeSection: {
        marginTop: 16,
    },
    homeSectionBlock: {
        backgroundColor: SOUP_COLORS.cream,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 0,
        marginBottom: 0,
    },
    homeSectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    homeSectionTitleAccent: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: SOUP_COLORS.blue,
        marginRight: 10,
    },
    homeSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        paddingHorizontal: 0,
        marginBottom: 0,
    },
    homeSectionTitleRowSoft: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    homeSectionTitleSoft: {
        fontSize: 17,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        paddingHorizontal: 0,
    },
    seeAllLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeAllLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    homeSectionSubline: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 4,
        paddingHorizontal: 0,
    },
    homeSectionNudge: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        marginBottom: 8,
        paddingHorizontal: 0,
    },
    heroLiveBlock: {
        marginHorizontal: 0,
        marginTop: 0,
        marginBottom: 0,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: SOUP_COLORS.cream,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    heroLiveBlockFlex: {
        minHeight: 180,
    },
    heroCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    heroStatusPill: {
        backgroundColor: `${SOUP_COLORS.blue}18`,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    heroStatusPillDone: {
        backgroundColor: `${SOUP_COLORS.green}22`,
    },
    heroStatusPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textTransform: 'lowercase',
    },
    heroBackTextLight: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
    },
    heroProgressDotLight: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    heroProgressDotActiveLight: {
        backgroundColor: SOUP_COLORS.blue,
        transform: [{ scale: 1.2 }],
    },
    heroProgressDotDoneLight: {
        backgroundColor: SOUP_COLORS.green,
    },
    heroNavButtonTextLight: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    heroChallengeContextLight: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 2,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    heroChallengeTitleLight: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 2,
        textAlign: 'center',
        lineHeight: 20,
    },
    heroChallengeSubtitleLight: {
        fontSize: 12,
        marginBottom: 4,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        lineHeight: 16,
    },
    heroChallengeCountdownLight: {
        fontSize: 15,
        fontWeight: '800',
        color: '#c00',
        marginBottom: 2,
        textAlign: 'center',
    },
    heroSuccessIconLight: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    heroBowlAccentWrap: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
    },
    todayHeroStartContent: {
        paddingVertical: 24,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayHeroStartContext: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    todayHeroStartTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 34,
    },
    todayHeroStartSubtitle: {
        fontSize: 17,
        marginBottom: 36,
        textAlign: 'center',
        lineHeight: 24,
    },
    todayHeroStartCta: {
        paddingHorizontal: 32,
        paddingVertical: 18,
        borderRadius: 32,
        width: '100%',
        maxWidth: 320,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        flexDirection: 'row',
        gap: 10,
    },
    todayHeroRecordCta: {
        paddingVertical: 24,
        width: '100%',
        maxWidth: '100%',
    },
    todayHeroStartCtaText: {
        fontSize: 20,
        fontWeight: '800',
        textTransform: 'lowercase',
    },
    todayHeroCompletionContent: {
        paddingVertical: 24,
        paddingHorizontal: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayHeroCompletionIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    todayHeroCompletionTitle: {
        fontSize: 32,
        lineHeight: 40,
    },
    todayHeroCompletionCta: {
        paddingVertical: 22,
        paddingHorizontal: 36,
        minWidth: 280,
    },
    todayBackToTodayBtn: {
        paddingVertical: 24,
        paddingHorizontal: 40,
        minWidth: 300,
    },
    todayHeroCompletionSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    todayHeroCompletionSecondaryText: {
        fontSize: 15,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
    todayDoAnotherSection: {
        marginTop: 28,
        width: '100%',
        alignItems: 'center',
    },
    todayDoAnotherLabel: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'lowercase',
        marginBottom: 12,
        opacity: 0.95,
    },
    todayDoAnotherChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    todayDoAnotherChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 14,
        borderRadius: 999,
        gap: 8,
        borderWidth: 1.5,
    },
    todayDoAnotherChipAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    todayDoAnotherChipText: {
        fontSize: 14,
        fontWeight: '700',
        maxWidth: 120,
    },
    todayCardWrapper: {
        width: '100%',
        maxWidth: '100%',
        alignSelf: 'stretch',
        flex: 1,
        minHeight: 200,
    },
    todayCardNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
        paddingHorizontal: 4,
        width: '100%',
    },
    todayCardNavProgressWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayCardNavProgress: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.9,
    },
    todayCardNavBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    todayCardNavBtnText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
    todayHeroNoPendingWrap: {
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'stretch',
        width: '100%',
    },
    todayHeroNoPendingFill: {
        flex: 1,
        justifyContent: 'center',
    },
    todayHeroNoPendingPrompt: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 36,
        marginBottom: 12,
        paddingHorizontal: 12,
        letterSpacing: -0.4,
    },
    todayHeroNoPendingPromptBig: {
        fontSize: 32,
        lineHeight: 40,
        marginBottom: 16,
    },
    todayHeroNoPendingHint: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 16,
        textTransform: 'lowercase',
        lineHeight: 22,
    },
    todayHeroNoPendingCtaScream: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayHeroNoPendingSub: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    todayHeroNoPendingCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#fff',
        paddingVertical: 18,
        paddingHorizontal: 28,
        borderRadius: 28,
        width: '100%',
        alignSelf: 'stretch',
        marginBottom: 8,
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue + '40',
    },
    todayHeroNoPendingCtaPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.98 }],
    },
    todayHeroNoPendingCtaWaveform: {
        marginRight: 4,
    },
    todayHeroNoPendingCtaText: {
        fontSize: 26,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'lowercase',
    },
    todayHeroNoPendingWaveformWrap: {
        width: '100%',
        height: 56,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayHeroNoPendingCtaSub: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'lowercase',
        marginTop: 8,
        marginBottom: 4,
    },
    todayHeroPastLink: {
        marginTop: 16,
    },
    todayHeroPastLinkText: {
        fontSize: 17,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.95)',
        textTransform: 'lowercase',
    },
    heroPrimaryButton: {
        backgroundColor: SOUP_COLORS.green,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
        width: '100%',
        maxWidth: 280,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        flexDirection: 'row',
    },
    heroPrimaryButtonBig: {
        paddingVertical: 16,
        maxWidth: 320,
    },
    heroPrimaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    heroPrimaryButtonOutline: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: SOUP_COLORS.green,
        width: '100%',
        maxWidth: 280,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    heroPrimaryButtonOutlineText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.green,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    todayPromptBubbleWrap: {
        alignSelf: 'stretch',
        marginBottom: 4,
    },
    todayPromptBubbleLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        marginBottom: 6,
    },
    todayPromptBubble: {
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.green,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    todayPromptBubbleText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        lineHeight: 22,
    },
    todayChallengeCtaLine: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        marginBottom: 12,
        textAlign: 'center',
    },
    heroStartContent: {
        flex: 1,
        minHeight: 0,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    heroCenterContent: {
        flex: 1,
        minHeight: 0,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    heroTextBlock: {
        flex: 1,
        flexShrink: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 0,
        maxWidth: '100%',
        paddingVertical: 2,
    },
    heroChallengeContext: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    heroChallengeTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
        textAlign: 'center',
        lineHeight: 18,
    },
    heroChallengeSubtitle: {
        fontSize: 11,
        marginBottom: 4,
        textAlign: 'center',
        lineHeight: 14,
    },
    heroChallengeCountdown: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
        textAlign: 'center',
    },
    heroStartCtaButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        width: '100%',
        maxWidth: 260,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 3,
    },
    heroStartCtaText: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    heroSuccessIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    heroWhiteButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        width: '100%',
        maxWidth: 260,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 3,
    },
    heroWhiteButtonText: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    heroBackRow: {
        paddingVertical: 4,
        paddingHorizontal: 0,
        alignSelf: 'flex-start',
    },
    heroBackText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.95)',
    },
    heroBackTextOnLight: {
        color: '#1a1a2e',
    },
    heroProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 4,
    },
    heroProgressDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    heroProgressDotActive: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        transform: [{ scale: 1.2 }],
    },
    heroProgressDotDone: {
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    heroCardScroll: {
        flex: 1,
        minHeight: 0,
    },
    heroCardScrollContent: {
        flexGrow: 1,
        paddingBottom: 8,
        alignItems: 'center',
    },
    heroCardScrollInner: {
        width: '100%',
        alignSelf: 'stretch',
        flex: 1,
        minHeight: 0,
    },
    heroCompletionWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    heroCompletionIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroCompletionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroCompletionSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    heroTextOnLight: {
        color: '#1a1a2e',
    },
    heroSubtitleOnLight: {
        color: '#555',
    },
    heroCompletionButton: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 999,
    },
    heroCompletionButtonOnLight: {
        backgroundColor: '#1a1a2e',
    },
    heroCompletionButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    heroStartBlock: {
        marginTop: 12,
    },
    heroStartContext: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 4,
        textTransform: 'lowercase',
    },
    heroStartTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    heroStartSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 16,
    },
    heroStartButton: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    heroStartButtonOnLight: {
        backgroundColor: '#1a1a2e',
    },
    heroStartButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1e2a3a',
    },
    heroRecordCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    heroRecordCtaText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    heroLiveDroppedPillOnLight: {
        backgroundColor: 'rgba(200,60,60,0.9)',
    },
    heroLiveBlock_A: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    heroLiveBlock_B: {
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
    },
    heroLiveBlock_C: {
        borderWidth: 2,
        borderColor: '#1a1a2e',
    },
    heroLiveStatusCorner: {
        position: 'absolute',
        left: 14,
        bottom: 10,
        zIndex: 2,
    },
    heroLiveContent: {
        flex: 1,
        minHeight: 0,
        paddingVertical: 4,
        paddingHorizontal: 10,
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
    },
    heroRecordingColumn: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
    },
    heroNavRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        width: '100%',
        flexShrink: 0,
    },
    heroNavSpacer: {
        width: 1,
    },
    heroNavButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    heroNavButtonText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '600',
    },
    heroNavButtonTextOnLight: {
        color: '#141414',
    },
    heroLiveContentTop: {
        flex: 1,
    },
    heroLiveTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    heroLiveDroppedPill: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,80,80,0.85)',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        marginBottom: 4,
    },
    heroLiveDroppedPillText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#fff',
    },
    heroLiveCountdownLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 2,
        textTransform: 'lowercase',
    },
    heroLiveCountdownRed: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ff4444',
        letterSpacing: -0.5,
        marginBottom: 4,
        textShadowColor: 'rgba(255,68,68,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    heroLiveYesterdayPrompt: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 2,
        fontStyle: 'italic',
    },
    heroLiveWhoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    heroLiveWhoAvatarWrap: {
        width: 42,
        height: 42,
        position: 'relative',
    },
    heroLiveWhoSection: {
        marginTop: 8,
    },
    heroLiveWhoAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.45)',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroLivePlayOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLiveFirstBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: 'rgba(255,182,193,0.95)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 5,
    },
    heroLiveFirstBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#1a1a2e',
    },
    heroLiveWhoText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 6,
    },
    heroLiveBeFirst: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 8,
        fontStyle: 'italic',
    },
    heroLivePrompt: {
        fontSize: 19,
        fontWeight: '800',
        color: '#fff',
        lineHeight: 25,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    heroLiveBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        width: '100%',
        marginTop: 2,
    },
    heroLiveStatusPill: {
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    heroLiveStatusDone: {
        backgroundColor: SOUP_COLORS.green,
    },
    heroLiveStatusSkipped: {
        backgroundColor: '#f97316',
    },
    heroLiveStatusNotReplied: {
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroLiveStatusPillText: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.95)',
    },
    heroLiveStatusPillTextOnColor: {
        color: '#fff',
    },
    heroLiveDoItPill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    heroLiveDoItPillText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    heroLiveCtaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.22)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    heroLiveCtaBigArrow: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 'auto',
    },
    heroLiveCtaButtonPressed: {
        opacity: 0.9,
    },
    heroLiveCtaButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    heroLiveNotifWrap: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        position: 'relative',
        zIndex: 1,
    },
    heroLiveNotif: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    moreMenuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    moreMenuSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical: 8,
        paddingBottom: 24,
    },
    moreMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    moreMenuLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    profileCardBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    profileCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    profileCardAvatarWrap: {
        marginBottom: 12,
    },
    profileCardAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileCardAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileCardAvatarLetter: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    profileCardName: {
        fontSize: 20,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    profileCardTagline: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        marginBottom: 12,
        textAlign: 'center',
    },
    profileCardStats: {
        marginBottom: 16,
        alignItems: 'center',
    },
    profileCardStat: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '500',
    },
    profileCardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'stretch',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: 'rgba(0,173,239,0.1)',
    },
    profileCardBtnLogout: {
        backgroundColor: 'rgba(236,0,139,0.08)',
    },
    profileCardBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    challengePickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    challengePickerSheet: {
        maxHeight: '70%',
        backgroundColor: SOUP_COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    challengePickerContent: {
        paddingBottom: 24,
    },
    challengePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 3,
        borderBottomColor: SOUP_COLORS.green,
        backgroundColor: `${SOUP_COLORS.cream}`,
    },
    challengePickerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    challengePickerClose: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    challengePickerEmpty: {
        padding: 32,
        alignItems: 'center',
    },
    challengePickerEmptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 8,
    },
    challengePickerEmptySub: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        marginBottom: 20,
    },
    challengePickerOpenGroup: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 999,
    },
    challengePickerOpenGroupText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    challengePickerList: {
        maxHeight: 400,
    },
    challengePickerRow: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: `${SOUP_COLORS.green}18`,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    challengePickerRowPrompt: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    challengePickerRowMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    podcastModeCard: {
        marginHorizontal: 0,
        marginBottom: 0,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 56,
        borderWidth: 0,
    },
    podcastModeBg: {
        backgroundColor: SOUP_COLORS.blue,
    },
    podcastModeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    podcastModeIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    podcastModeTextWrap: { flex: 1 },
    podcastModeLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2.2,
        color: SOUP_COLORS.subtext,
        marginBottom: 4,
    },
    podcastModeLabelBlue: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2.2,
        color: SOUP_COLORS.blue,
        marginBottom: 4,
    },
    podcastModeLabelOnGreen: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2.2,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
    },
    podcastModeTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    podcastModeTitleOnGreen: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    podcastModeOverview: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    podcastModeMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        lineHeight: 18,
    },
    podcastModePlayBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    bigStatsCard: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    bigStatsCardInBlock: {
        marginHorizontal: 0,
        marginTop: 0,
        marginBottom: 0,
    },
    bigStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 0,
        paddingVertical: 0,
        gap: 28,
    },
    bigStatsBlock: {
        alignItems: 'center',
        minWidth: 88,
    },
    bigStatsNumber: {
        fontSize: 34,
        fontWeight: '800',
        marginBottom: 2,
    },
    bigStatsLabel: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
    statusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: 12,
    },
    statusLineText: {
        flex: 1,
        fontSize: 14,
        color: SOUP_COLORS.text,
    },
    heroWrapper: {
        marginBottom: 24,
    },
    heroBlock: {
        paddingTop: 32,
        paddingBottom: 28,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    heroBlockActive: {
        backgroundColor: 'rgba(25, 176, 145, 0.12)',
    },
    heroBlockDone: {
        backgroundColor: 'rgba(25, 176, 145, 0.18)',
    },
    heroBlockInactive: {
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    heroContent: {
        position: 'relative',
    },
    heroIconWrap: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    heroChallengeText: {
        fontSize: 16,
        color: SOUP_COLORS.text,
        lineHeight: 22,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    heroLanguagesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    heroLanguagePill: {
        backgroundColor: 'rgba(25, 176, 145, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    heroLanguagePillText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.green,
    },
    heroSubtitle: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
        maxWidth: '90%',
    },
    heroTimer: {
        fontSize: 13,
        color: SOUP_COLORS.green,
        marginTop: 10,
        fontWeight: '600',
    },
    heroEarlyBird: {
        fontSize: 13,
        color: SOUP_COLORS.pink,
        marginTop: 8,
        fontWeight: '600',
    },
    heroChevron: {
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    whatsNextRow: {
        marginTop: 10,
        marginHorizontal: 20,
        minHeight: 24,
        justifyContent: 'center',
    },
    whatsNextPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    whatsNextCard: {
        alignSelf: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(25, 176, 145, 0.12)',
        borderRadius: 14,
    },
    whatsNextText: {
        fontSize: 15,
        color: SOUP_COLORS.green,
        fontWeight: '600',
    },
    whatsNextSubtext: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
        fontWeight: '500',
    },
    yourWeekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginHorizontal: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 14,
        gap: 10,
    },
    yourWeekDots: {
        flexDirection: 'row',
        gap: 4,
    },
    yourWeekDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    yourWeekDotFilled: {
        backgroundColor: SOUP_COLORS.green,
    },
    yourWeekTextWrap: {
        flex: 1,
    },
    yourWeekText: {
        fontSize: 14,
        color: SOUP_COLORS.text,
        fontWeight: '500',
    },
    yourWeekWordsText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
        fontWeight: '500',
    },
    whatYouSentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginHorizontal: 20,
        gap: 8,
    },
    whatYouSentIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(25, 176, 145, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    whatYouSentText: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        fontWeight: '500',
    },
    aiFeedbackRow: {
        marginTop: 16,
        marginHorizontal: 20,
    },
    aiFeedbackButtonWrap: {
        alignItems: 'flex-start',
    },
    aiFeedbackHint: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 6,
    },
    aiFeedbackEmpty: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },
    weekCalendarWrap: {
        marginTop: 16,
        marginHorizontal: 20,
    },
    weekCalendarLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 8,
    },
    weekCalendarDots: {
        flexDirection: 'row',
        gap: 8,
    },
    weekCalendarDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    weekCalendarDotFilled: {
        backgroundColor: SOUP_COLORS.green,
    },
    challengeFriendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginHorizontal: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(236, 0, 139, 0.08)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.2)',
        gap: 12,
    },
    challengeFriendCardInRow: {
        marginTop: 0,
        marginHorizontal: 0,
        flex: 1,
    },
    challengeFriendIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(236, 0, 139, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    challengeFriendFire: {
        fontSize: 22,
    },
    challengeFriendTextWrap: {
        flex: 1,
    },
    challengeFriendTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        marginBottom: 2,
    },
    challengeFriendSubtitle: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        lineHeight: 18,
    },
    latestMemoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginHorizontal: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        gap: 12,
    },
    latestMemoIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.green,
        alignItems: 'center',
        justifyContent: 'center',
    },
    latestMemoTextWrap: { flex: 1 },
    latestMemoGroupName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 2,
    },
    latestMemoMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    whatsNextLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        marginTop: 20,
        marginBottom: 10,
        marginHorizontal: 20,
    },
    whatsNextRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 12,
    },
    correctMeCard: {
        flex: 1,
    },
    correctMeCardDisabled: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    correctMeCardDisabledText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    voicesInSoupWrap: {
        marginTop: 24,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    voicesInSoupLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 12,
    },
    voicesInSoupGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: VOICES_GRID_GAP,
    },
    voicesInSoupScroll: {
        flexDirection: 'row',
        paddingBottom: 8,
    },
    voicesInSoupCard: {
        alignItems: 'center',
    },
    voicesInSoupAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    voicesInSoupAvatarPlaceholder: {
        backgroundColor: 'rgba(236, 0, 139, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    voicesInSoupAvatarLetter: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    voicesInSoupName: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginTop: 4,
        textAlign: 'center',
    },
    voicesInSoupTagline: {
        fontSize: 10,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    communityAudiosLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginTop: 16,
        marginBottom: 8,
    },
    communityAudiosScroll: {
        flexDirection: 'row',
        gap: 10,
    },
    communityAudioCard: {
        width: 140,
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    communityAudioIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SOUP_COLORS.blue,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    communityAudioSender: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 2,
    },
    communityAudioGroup: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    challengePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    challengePickerCard: {
        width: '100%',
        maxWidth: 340,
        maxHeight: '70%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
    },
    challengePickerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 12,
    },
    challengePickerList: {
        maxHeight: 320,
    },
    challengePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
        gap: 8,
    },
    challengePickerRowLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    challengePickerRowMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    challengePickerCancel: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    challengePickerCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    voiceMemosBlock: {
        marginTop: 20,
        marginHorizontal: 20,
    },
    voiceMemosLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 2,
    },
    voiceMemosSublabel: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
    },
    voiceMemosScroll: {
        paddingRight: 20,
        flexDirection: 'row',
    },
    voiceMemoCard: {
        width: 140,
        marginRight: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    voiceMemoCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.green,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    voiceMemoCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 2,
    },
    voiceMemoCardMeta: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    voiceMemoEmptyCard: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    voiceMemoEmptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginTop: 10,
    },
    voiceMemoEmptySub: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
    },
    announcementBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.pink,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    announcementLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginRight: 10,
    },
    announcementPreview: {
        flex: 1,
        fontSize: 14,
        color: SOUP_COLORS.text,
    },
    announcementBadge: {
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginRight: 8,
    },
    announcementBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    recentResponsesSection: {
        marginTop: 12,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    recentResponsesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    recentResponseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        gap: 10,
    },
    recentResponseIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentResponseText: {
        flex: 1,
        fontSize: 13,
        color: SOUP_COLORS.text,
    },
    chatFeedList: {
        paddingVertical: 4,
        paddingBottom: 8,
    },
    chatFeedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 16,
        marginHorizontal: 4,
    },
    chatFeedRowNotFirst: {
        marginTop: 2,
    },
    chatFeedRowUnread: {
        backgroundColor: 'rgba(0,173,239,0.06)',
    },
    chatFeedAvatarWrap: {
        position: 'relative',
        marginRight: 12,
        minHeight: 48,
        justifyContent: 'center',
    },
    chatFeedAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.blue,
    },
    chatFeedStackedAvatarWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: SOUP_COLORS.cream,
        borderWidth: 2,
        borderColor: '#fff',
    },
    chatFeedStackedAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    chatFeedBody: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    chatFeedTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    chatFeedName: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    chatFeedNameUnread: {
        fontWeight: '700',
    },
    chatFeedTime: {
        fontSize: 12,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        marginLeft: 8,
    },
    chatFeedPreview: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    chatFeedDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: SOUP_COLORS.cream,
    },
    chatFeedChevron: {
        opacity: 0.6,
        marginLeft: 4,
    },
    horizontalCardsContainer: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        gap: 10,
        paddingBottom: 8,
    },
    horizontalCard: {
        width: 148,
        marginRight: 10,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: `${SOUP_COLORS.blue}40`,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        position: 'relative',
    },
    horizontalCardChevron: {
        position: 'absolute',
        right: 12,
        bottom: 12,
    },
    horizontalCardAvatarWrap: {
        alignSelf: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    horizontalCardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.blue,
    },
    recentSpeakersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentSpeakerAvatarWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: SOUP_COLORS.cream,
        borderWidth: 2,
        borderColor: '#fff',
    },
    recentSpeakerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    recentSpeakerPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentSpeakerInitial: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    horizontalCardName: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 2,
        textAlign: 'center',
    },
    horizontalCardNewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        marginBottom: 4,
        textAlign: 'center',
    },
    horizontalCardPreview: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
    },
    soupKitchenRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    soupKitchenBtn: {
        alignItems: 'center',
        minWidth: 100,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    soupKitchenIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    soupKitchenLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    unreadBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12,
        minWidth: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    floatingRequestCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingRequestLabel: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.green,
        textAlign: 'center',
    },
});
