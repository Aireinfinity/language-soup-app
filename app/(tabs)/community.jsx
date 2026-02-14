import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Pressable, ActivityIndicator, Platform, ScrollView, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Users, ChevronRight, Play, Pause, Globe, PlusCircle, Megaphone, ThumbsUp } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Audio } from 'expo-av';
import WelcomeMissionModal from '../../components/WelcomeMissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LanguageRequestModal from '../../components/LanguageRequestModal';
import { haptics } from '../../utils/haptics';
import { UserPreviewModal } from '../../components/UserPreviewModal';
import { useQuests } from '../../contexts/QuestContext';
import ContextualTooltip from '../../components/ContextualTooltip';
import { getLanguageFlag } from '../../utils/languageFlags';
import { getAvatarSource, getDefaultSoupAvatarForId } from '../../utils/soupUtils';
import { TAB_BAR_HEIGHT } from '../../components/QuestStrip';
import GroupAvatar from '../../components/GroupAvatar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LANGUAGE_SOUP_BOT_ID = '00000000-0000-0000-0000-000000000000';

// Simple deterministic "random" from string (for waveform bar heights)
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

// Format duration like chat: "0:15"
function formatVoiceDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function SpokeTodayWaveform({ durationSeconds, messageId, isPlaying }) {
    const barCount = Math.min(48, Math.max(20, Math.round((durationSeconds || 10) * 2)));
    const heights = useMemo(() => seededHeights(seedFromId(messageId), barCount), [messageId, barCount]);
    return (
        <View style={styles.voiceBubbleWaveform} pointerEvents="none">
            {heights.map((h, i) => (
                <View
                    key={i}
                    style={[
                        styles.voiceBubbleWaveBar,
                        { height: 24 * Math.max(0.3, h) },
                        { backgroundColor: isPlaying ? SOUP_COLORS.pink : SOUP_COLORS.turquoise }
                    ]}
                />
            ))}
        </View>
    );
}

// Brand colors (LANGUAGE_SOUP_CONTEXT: Turquoise, Pink, Cream; Digital Pop Realism)
const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
    red: '#FF3B30',
    yellow: '#FFCC00',
    blue: '#00ADEF', // alias turquoise
};

export default function CommunityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [activeGroups, setActiveGroups] = useState([]);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});
    const [knownIssues, setKnownIssues] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeUsers, setActiveUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [sortMode, setSortMode] = useState('all');
    const { completeQuest } = useQuests();

    // Global Welcome Logic
    const [globalWelcomes, setGlobalWelcomes] = useState([]);
    const [isPlayingGlobal, setIsPlayingGlobal] = useState(false);
    const [activeGlobalUri, setActiveGlobalUri] = useState(null);
    const [globalSound, setGlobalSound] = useState(null);
    const [showWelcomeMission, setShowWelcomeMission] = useState(false);
    const [myGroups, setMyGroups] = useState([]);
    const [voiceLeaderboard, setVoiceLeaderboard] = useState([]);
    const [challengeLeaderboard, setChallengeLeaderboard] = useState([]);
    const [chatGroups, setChatGroups] = useState([]);
    const [chatsLoadError, setChatsLoadError] = useState(false);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(null);
    const [userTagline, setUserTagline] = useState('');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [scrollContentHeight, setScrollContentHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
    // What we're building: feature list + upvotes (from public roadmap)
    const [roadmapItems, setRoadmapItems] = useState([]);
    // Pulse: "In the soup" — 24h active count, recent voices, ticker
    const [pulseActiveCount, setPulseActiveCount] = useState(0);      // distinct senders in last 24h
    const [pulseRecentVoices, setPulseRecentVoices] = useState([]);     // voice messages in last 24h
    const [tickerItems, setTickerItems] = useState([]);                 // "what's going on" — recent activity
    const [activeVoiceMediaUrl, setActiveVoiceMediaUrl] = useState(null);
    const [voiceSound, setVoiceSound] = useState(null);

    const loadCommunityChats = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: memberships, error: memberError } = await supabase
                .from('app_group_members')
                .select('group_id, last_read_at, app_groups(id, name, language, member_count, avatar_url)')
                .eq('user_id', user.id);
            if (memberError) throw memberError;
            if (!memberships?.length) {
                setChatGroups([]);
                return;
            }
            const groupIds = memberships.map(m => m.app_groups?.id).filter(Boolean);
            if (!groupIds.length) {
                setChatGroups([]);
                return;
            }
            const lastReadByGroup = new Map(memberships.map(m => [m.app_groups?.id, m.last_read_at || '1970-01-01']));
            const { data: allMessages, error: msgError } = await supabase
                .from('app_messages')
                .select('id, group_id, content, created_at, message_type, sender_id')
                .in('group_id', groupIds)
                .order('created_at', { ascending: false })
                .limit(300);
            if (msgError) throw msgError;
            const lastMessageByGroup = {};
            const unreadByGroup = {};
            groupIds.forEach(gid => { unreadByGroup[gid] = 0; });
            for (const msg of allMessages || []) {
                const gid = msg.group_id;
                if (!lastMessageByGroup[gid]) lastMessageByGroup[gid] = msg;
                const lastRead = lastReadByGroup.get(gid) || '1970-01-01';
                if (msg.created_at > lastRead && msg.sender_id !== user.id) unreadByGroup[gid]++;
            }
            const senderIds = [...new Set(Object.values(lastMessageByGroup).map(m => m.sender_id).filter(Boolean))];
            let senderNames = {};
            if (senderIds.length > 0) {
                const { data: senders } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', senderIds);
                (senders || []).forEach(s => { senderNames[s.id] = s.display_name || 'Unknown'; });
            }
            const list = memberships.map(m => {
                const g = m.app_groups;
                if (!g || !g.id) return null;
                const lastMsg = lastMessageByGroup[g.id];
                return {
                    id: g.id,
                    name: g.name,
                    language: g.language,
                    memberCount: g.member_count || 0,
                    lastMessage: lastMsg ? { content: lastMsg.content, type: lastMsg.message_type, time: lastMsg.created_at, senderName: senderNames[lastMsg.sender_id] || 'Unknown' } : null,
                    unreadCount: unreadByGroup[g.id] || 0,
                };
            }).filter(Boolean);
            list.sort((a, b) => {
                const ta = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
                const tb = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
                return tb - ta;
            });
            setChatGroups(list.filter(g => !g.name?.toLowerCase().includes('support')));
            setChatsLoadError(false);
        } catch (e) {
            console.warn('Community load chats:', e);
            setChatsLoadError(true);
        }
    }, [user?.id]);

    const loadLeaderboards = async () => {
        try {
            const [voiceRes, challengeRes] = await Promise.all([
                supabase.rpc('get_global_leaderboard', { p_limit: 10 }),
                supabase.rpc('get_challenge_share_leaderboard', { p_limit: 10 }),
            ]);
            setVoiceLeaderboard(voiceRes.data || []);
            setChallengeLeaderboard(challengeRes.data || []);
        } catch (e) {
            console.error('Error loading leaderboards:', e);
        }
    };

    const loadPulse = useCallback(async () => {
        if (!user?.id) return;
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: myGroups } = await supabase.from('app_group_members').select('group_id').eq('user_id', user.id);
            if (!myGroups?.length) {
                setPulseActiveCount(0);
                setPulseRecentVoices([]);
                setTickerItems([]);
                return;
            }
            const groupIds = myGroups.map(g => g.group_id);
            const { data: messages, error } = await supabase
                .from('app_messages')
                .select('id, sender_id, group_id, message_type, created_at, media_url, duration_seconds, app_users(display_name, avatar_url), app_groups(name, language)')
                .in('group_id', groupIds)
                .gte('created_at', twentyFourHoursAgo)
                .order('created_at', { ascending: false })
                .limit(80);
            if (error) throw error;
            const list = messages || [];
            const noBotNoSelf = list.filter(m => m.sender_id !== LANGUAGE_SOUP_BOT_ID && m.sender_id !== user.id);
            const activeSenderIds = new Set(noBotNoSelf.map(m => m.sender_id));
            setPulseActiveCount(activeSenderIds.size);
            const isNoahOrDicebear = (name, avatar) => {
                const n = (name || '').toLowerCase();
                const a = (avatar || '').toLowerCase();
                return n.includes('noah') || a.includes('dicebear');
            };
            const senderData = (m) => (m.app_users && Array.isArray(m.app_users) ? m.app_users[0] : m.app_users) || {};
            const groupData = (m) => (m.app_groups && Array.isArray(m.app_groups) ? m.app_groups[0] : m.app_groups) || {};
            const ticker = noBotNoSelf.slice(0, 25).map(m => ({
                id: m.id,
                groupId: m.group_id,
                senderName: senderData(m).display_name || 'Someone',
                type: m.message_type === 'voice' ? 'voice' : 'text',
                groupName: groupData(m).name || groupData(m).language || 'Soup',
                createdAt: m.created_at,
            })).filter(t => t.senderName && !/^language soup$/i.test(t.senderName.trim()) && !isNoahOrDicebear(t.senderName, ''));
            setTickerItems(ticker);
            const voiceOnly = noBotNoSelf.filter(m => m.message_type === 'voice' && m.media_url && String(m.media_url).trim());
            const voiceList = voiceOnly.slice(0, 30).map(m => {
                const s = senderData(m);
                return {
                senderId: m.sender_id,
                senderName: s.display_name || 'Someone',
                avatarUrl: s.avatar_url || null,
                mediaUrl: m.media_url,
                durationSeconds: m.duration_seconds != null ? m.duration_seconds : 30,
                messageId: m.id,
                createdAt: m.created_at,
            };
            }).filter(r => r.senderName && !/^language soup$/i.test(r.senderName.trim()) && !isNoahOrDicebear(r.senderName, r.avatarUrl || ''));
            setPulseRecentVoices(voiceList);
        } catch (e) {
            console.error('Error loading pulse:', e);
            setPulseActiveCount(0);
            setPulseRecentVoices([]);
            setTickerItems([]);
        }
    }, [user?.id]);

    const playVoice = useCallback(async (mediaUrl) => {
        if (!mediaUrl) return;
        try {
            if (activeVoiceMediaUrl === mediaUrl && voiceSound) {
                await voiceSound.unloadAsync();
                setVoiceSound(null);
                setActiveVoiceMediaUrl(null);
                return;
            }
            if (voiceSound) {
                await voiceSound.unloadAsync();
                setVoiceSound(null);
            }
            const { sound } = await Audio.Sound.createAsync(
                { uri: mediaUrl },
                { shouldPlay: true }
            );
            setVoiceSound(sound);
            setActiveVoiceMediaUrl(mediaUrl);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setActiveVoiceMediaUrl(null);
                }
            });
        } catch (e) {
            console.error('Error playing voice:', e);
        }
    }, [voiceSound, activeVoiceMediaUrl]);

    const loadRoadmap = useCallback(async () => {
        try {
            const { data: rawItems, error: itemsError } = await supabase
                .from('app_support_messages')
                .select('id, title, content, status')
                .eq('public_visible', true)
                .eq('category', 'feature_request')
                .order('created_at', { ascending: false })
                .limit(25);
            if (itemsError) throw itemsError;
            const items = (rawItems || []).filter((i) => i.status !== 'fixed' && i.status !== 'wontfix');
            if (!items.length) {
                setRoadmapItems([]);
                return;
            }
            const ids = items.map((i) => i.id);
            const { data: reactions, error: reactError } = await supabase
                .from('app_support_reactions')
                .select('message_id, user_id')
                .in('message_id', ids)
                .eq('reaction', 'upvote');
            if (reactError) throw reactError;
            const countByMessage = {};
            const userVotedSet = new Set();
            (reactions || []).forEach((r) => {
                countByMessage[r.message_id] = (countByMessage[r.message_id] || 0) + 1;
                if (r.user_id === user?.id) userVotedSet.add(r.message_id);
            });
            const list = items.map((item) => ({
                id: item.id,
                title: item.title || item.content?.slice(0, 60) || 'Feature',
                content: item.content,
                vote_count: countByMessage[item.id] || 0,
                user_voted: userVotedSet.has(item.id),
            }));
            list.sort((a, b) => b.vote_count - a.vote_count);
            setRoadmapItems(list);
        } catch (e) {
            console.error('Error loading roadmap:', e);
            setRoadmapItems([]);
        }
    }, [user?.id]);

    const toggleRoadmapVote = useCallback(async (messageId) => {
        if (!user?.id) return;
        const item = roadmapItems.find((i) => i.id === messageId);
        if (!item) return;
        try {
            if (item.user_voted) {
                await supabase
                    .from('app_support_reactions')
                    .delete()
                    .eq('message_id', messageId)
                    .eq('user_id', user.id)
                    .eq('reaction', 'upvote');
            } else {
                await supabase.from('app_support_reactions').insert({
                    message_id: messageId,
                    user_id: user.id,
                    reaction: 'upvote',
                });
            }
            await loadRoadmap();
        } catch (e) {
            console.error('Error toggling vote:', e);
        }
    }, [user?.id, roadmapItems, loadRoadmap]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            loadGlobalWelcomes();
            loadMyGroups();
            loadLeaderboards();
            loadCommunityChats();
            loadPulse();
        }, [loadCommunityChats, loadPulse])
    );

    useEffect(() => {
        // Realtime updates for announcements and tickets
        const channel = supabase
            .channel('community-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_community_announcements' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, loadData)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_messages', filter: "challenge_id=eq.global-welcome" }, loadGlobalWelcomes)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_messages' }, loadPulse)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (globalSound) globalSound.unloadAsync();
            if (voiceSound) voiceSound.unloadAsync();
        };
    }, [globalSound, voiceSound]);

    const loadData = async () => {
        try {
            if (user?.id) {
                const { data: profile } = await supabase.from('app_users').select('display_name, avatar_url, status_text').eq('id', user.id).maybeSingle();
                setUserDisplayName(profile?.display_name || '');
                setUserAvatarUrl(profile?.avatar_url || null);
                setUserTagline(profile?.status_text?.trim() || '');
            }
            // Load announcements
            const { data: announcementData } = await supabase
                .from('app_community_announcements')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            setAnnouncements(announcementData || []);

            // Load Known Issues
            const { data: issuesData } = await supabase
                .from('app_support_messages')
                .select('id, title, priority, category, status')
                .eq('public_visible', true)
                // Showing all statuses including fixed to show progress
                .order('created_at', { ascending: false })
                .limit(10);

            // Actually, let's show all open public issues but maybe limit if too many.
            setKnownIssues(issuesData || []);

            // Load active groups (by member count)
            const { data: groupData } = await supabase
                .from('app_groups')
                .select('*')
                .order('member_count', { ascending: false })
                .limit(6);
            setActiveGroups(groupData || []);

            // Get total member count (excluding bots, test profiles, noah's, blank names)
            const { count } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true })
                .not('display_name', 'is', null)
                .neq('display_name', '')
                .not('display_name', 'ilike', '%test%')
                .not('display_name', 'ilike', '%noah%')
                .not('display_name', 'ilike', '%bot%');
            setMemberCount(count || 0);

        } catch (error) {
            console.error('Error loading community data:', error);
        } finally {
            setLoading(false);

            // Complete quest for peeking at active groups
            if (activeGroups.length > 0) {
                completeQuest('peek_active_groups');
            }
        }
    };

    const loadGlobalWelcomes = async () => {
        try {
            const { data } = await supabase
                .from('app_messages')
                .select('*, sender:app_users(display_name, avatar_url)')
                .eq('challenge_id', 'global-welcome')
                .order('created_at', { ascending: false })
                .limit(20);

            // Filter to unique senders for the gallery; hide noah bots and dicebear avatars
            const unique = [];
            const seen = new Set();
            const isNoahOrDicebear = (msg) => {
                const name = (msg.sender?.display_name || '').toLowerCase();
                const avatar = (msg.sender?.avatar_url || '').toLowerCase();
                return name.includes('noah') || avatar.includes('dicebear');
            };
            data?.forEach(msg => {
                if (isNoahOrDicebear(msg)) return;
                if (!seen.has(msg.sender_id)) {
                    seen.add(msg.sender_id);
                    unique.push(msg);
                }
            });

            setGlobalWelcomes(unique);
        } catch (e) {
            console.error('Error loading global welcomes:', e);
        }
    };

    const loadMyGroups = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('app_group_members')
            .select('group_id, app_groups(id, name)')
            .eq('user_id', user.id);

        setMyGroups(data?.map(m => m.app_groups) || []);
    };

    const playGlobalGreeting = async (uri) => {
        try {
            if (globalSound) {
                await globalSound.unloadAsync();
                setGlobalSound(null);
            }

            if (activeGlobalUri === uri && isPlayingGlobal) {
                setIsPlayingGlobal(false);
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );

            setGlobalSound(sound);
            setActiveGlobalUri(uri);
            setIsPlayingGlobal(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setIsPlayingGlobal(false);
                    setActiveGlobalUri(null);
                }
            });
        } catch (e) {
            console.error('Error playing greeting:', e);
        }
    };

    const loadActiveUsers = async () => {
        try {
            // Fetch a much larger pool to show "everybody"
            const { data: usersData } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url, status_text, fluent_languages, learning_languages, created_at')
                .not('display_name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(500);

            if (!usersData) return;

            // --- FILTER OUT NOAH BOTS & DICEBEAR ---
            // Admin dashboard creates Noah bots; hide all noah's and any dicebear avatars
            const filteredUsers = usersData.filter(u => {
                const name = (u.display_name || '').toLowerCase();
                const avatar = (u.avatar_url || '').toLowerCase();
                if (name.includes('noah')) return false;
                if (avatar.includes('dicebear')) return false;
                return true;
            });

            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const now = new Date();

            // 0. New Chefs (Joined in last 72 hours) - The VIP tier
            const newChefs = filteredUsers.filter(u => {
                if (!u.created_at) return false;
                return (now - new Date(u.created_at)) < THREE_DAYS_MS;
            });

            const remaining = filteredUsers.filter(u => {
                if (!u.created_at) return true;
                return (now - new Date(u.created_at)) >= THREE_DAYS_MS;
            });

            // Helper to check if it's a "Real Photo"
            const isRealPhoto = (avatarUrl) => {
                if (!avatarUrl) return false;
                const url = avatarUrl.toLowerCase();
                return url.includes('.jpg') || url.includes('.jpeg') || url.includes('googleusercontent') || url.includes('fbsbx.com');
            };

            // 1. Split remaining into tiers
            const photos = remaining.filter(u => isRealPhoto(u.avatar_url));
            const soupAndAvatars = remaining.filter(u => u.avatar_url && !isRealPhoto(u.avatar_url));
            const rest = remaining.filter(u => !u.avatar_url);

            // Also split NEW CHEFS by photos vs avatars for maximum VIP priority
            const newChefsWithPhotos = newChefs.filter(u => isRealPhoto(u.avatar_url));
            const newChefsOthers = newChefs.filter(u => !isRealPhoto(u.avatar_url));

            // 2. Shuffle each tier individually for constant randomization
            const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

            // 3. Combine in priority order: 
            // New Chefs (Photos) -> New Chefs (Others) -> Photos -> Soup/Avatars -> Rest
            const finalSelection = [
                ...shuffle(newChefsWithPhotos),
                ...shuffle(newChefsOthers),
                ...shuffle(photos),
                ...shuffle(soupAndAvatars),
                ...shuffle(rest)
            ];

            setActiveUsers(finalSelection);
        } catch (error) {
            console.error('Error loading active users:', error);
        }
    };



    const renderIssue = ({ item }) => (
        <View style={styles.issueCard}>
            <View style={[styles.issueBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.issueBadgeText}>{item.priority || 'Bug'}</Text>
            </View>
            <Text style={styles.issueTitle} numberOfLines={2}>{item.title || 'Untitled Issue'}</Text>
            <Text style={styles.issueStatus}>{item.status}</Text>
        </View>
    );

    const renderGroup = ({ item }) => (
        <Pressable
            style={({ pressed }) => [styles.groupCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.groupAvatar}>
                <Text style={styles.groupEmoji}>{item.emoji || '🥣'}</Text>
            </View>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.memberRow}>
                <Users size={12} color={SOUP_COLORS.subtext} />
                <Text style={styles.memberText}>{item.member_count || 0}</Text>
            </View>

        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.turquoise} />
            </View>
        );
    }

    const displayName = userDisplayName?.trim() || 'Souper';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Header: blue bar — avatar, name + tagline, support, groups (moved from Today) */}
            <View style={[styles.homeHeader, { paddingTop: insets.top + 12 }]}>
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

            <ScrollView
                onLayout={(e) => setScrollContentHeight(e.nativeEvent.layout.height)}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 24, minHeight: scrollContentHeight }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.scrollContentWrap}>
                {/* HERO: Two-tone pulse — left turquoise, right pink (tap to refresh) */}
                <Pressable style={({ pressed }) => [styles.pulseHero, pressed && { opacity: 0.97 }]} onPress={() => { try { haptics.light(); } catch (_) {} loadPulse(); }}>
                    <View style={styles.pulseHeroLeft}>
                        <Text style={styles.pulseHeroNumber}>{memberCount}</Text>
                        <Text style={styles.pulseHeroLabel}>soupers in the soup</Text>
                    </View>
                    <View style={styles.pulseHeroRight}>
                        <View style={styles.pulseHeroLiveRow}>
                            <View style={styles.pulseHeroLiveDot} />
                            <Text style={styles.pulseHeroNumber}>{pulseActiveCount}</Text>
                        </View>
                        <Text style={styles.pulseHeroLabel}>in the soup now</Text>
                    </View>
                </Pressable>

                {/* SECTION 1: Voices first (content before metadata) */}
                <View style={styles.redesignSection}>
                    <View style={styles.redesignSectionHeader}>
                        <Text style={styles.redesignSectionTitle}>voices in the soup</Text>
                        {pulseRecentVoices.length > 0 && (
                            <Pressable style={({ pressed }) => [styles.redesignSectionCta, pressed && { opacity: 0.8 }]} onPress={() => router.push('/(tabs)/index')}>
                                <Text style={styles.redesignSectionCtaText}>see all</Text>
                                <ChevronRight size={18} color={SOUP_COLORS.turquoise} strokeWidth={2.5} />
                            </Pressable>
                        )}
                    </View>
                    {pulseRecentVoices.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voiceStripWrap} style={styles.voiceStripScroll}>
                            {pulseRecentVoices.map((item, idx) => {
                                const avatarSource = getAvatarSource(item.avatarUrl || getDefaultSoupAvatarForId(item.senderId));
                                const isPlaying = activeVoiceMediaUrl === item.mediaUrl;
                                const recency = item.createdAt && idx === 0 ? (() => {
                                    const diffMins = Math.floor((Date.now() - new Date(item.createdAt)) / 60000);
                                    if (diffMins < 1) return 'now';
                                    if (diffMins < 60) return `${diffMins}m`;
                                    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
                                    return null;
                                })() : null;
                                return (
                                    <Pressable
                                        key={item.messageId}
                                        style={({ pressed }) => [styles.voiceStripCard, idx === 0 && styles.voiceStripCardFirst, pressed && { opacity: 0.95 }]}
                                        onPress={() => { if (!item.mediaUrl) return; try { haptics.light(); } catch (_) {} playVoice(item.mediaUrl); }}
                                    >
                                        <View style={styles.voiceStripAvatarWrap}>
                                            {avatarSource ? (
                                                <Image source={avatarSource} style={styles.voiceStripAvatar} />
                                            ) : (
                                                <View style={[styles.voiceStripAvatar, styles.voiceStripAvatarPh]}>
                                                    <Text style={styles.voiceStripAvatarLetter}>{(item.senderName || '?')[0].toUpperCase()}</Text>
                                                </View>
                                            )}
                                            {recency && <View style={styles.voiceStripRecencyPill}><Text style={styles.voiceStripRecencyText}>{recency}</Text></View>}
                                        </View>
                                        <Text style={styles.voiceStripName} numberOfLines={1}>{item.senderName || 'Souper'}</Text>
                                        {item.mediaUrl ? (
                                            <View style={styles.voiceStripBubble}>
                                                <View style={[styles.voiceStripPlayBtn, isPlaying && styles.voiceStripPlayBtnActive]}>
                                                    {isPlaying ? <Pause size={14} color="#fff" fill="#fff" /> : <Play size={14} color="#fff" fill="#fff" />}
                                                </View>
                                                <SpokeTodayWaveform durationSeconds={item.durationSeconds} messageId={item.messageId} isPlaying={isPlaying} />
                                                <Text style={styles.voiceStripDuration}>{formatVoiceDuration(item.durationSeconds || 0)}</Text>
                                            </View>
                                        ) : null}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <Pressable style={({ pressed }) => [styles.heroEmpty, pressed && { opacity: 0.95 }]} onPress={() => router.push('/(tabs)/index')}>
                            <Text style={styles.heroEmptyEmoji}>🎤</Text>
                            <Text style={styles.heroEmptyText}>be the first to drop a voice</Text>
                            <Text style={styles.heroEmptyCtaText}>record →</Text>
                        </Pressable>
                    )}
                </View>

                {/* SECTION 2: Live ticker — full-width strip */}
                {tickerItems.length > 0 && (
                    <View style={styles.tickerStrip}>
                        <View style={styles.tickerStripHeader}>
                            <View style={styles.tickerLivePill}>
                                <View style={styles.tickerLiveDot} />
                                <Text style={styles.tickerLiveText}>LIVE</Text>
                            </View>
                            <Text style={styles.tickerStripLabel}>what's going on</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerWrap} style={styles.tickerScroll}>
                            {tickerItems.map((item) => {
                                const recency = item.createdAt ? (() => {
                                    const d = new Date(item.createdAt);
                                    const diffMins = Math.floor((Date.now() - d) / 60000);
                                    if (diffMins < 1) return 'now';
                                    if (diffMins < 60) return `${diffMins}m`;
                                    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
                                    return null;
                                })() : null;
                                return (
                                    <Pressable
                                        key={item.id}
                                        style={({ pressed }) => [styles.tickerPill, pressed && { opacity: 0.9 }]}
                                        onPress={() => { try { haptics.light(); } catch (_) {} if (item.groupId) router.push(`/chat/${item.groupId}`); }}
                                    >
                                        <Text style={styles.tickerText} numberOfLines={1}>
                                            {item.senderName} · {item.type === 'voice' ? 'voice' : 'message'} · {item.groupName}
                                            {recency ? ` · ${recency}` : ''}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* SECTION 3: Top soupers — card */}
                {voiceLeaderboard.length > 0 && (
                    <View style={styles.redesignCard}>
                        <Text style={styles.redesignCardTitle}>top soupers this week</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topSoupersStrip}>
                            {voiceLeaderboard.slice(0, 12).map((u, rank) => (
                                <View key={u.user_id} style={styles.topSouperItem}>
                                    <View style={[styles.topSouperAvatarWrap, rank < 3 && styles.topSouperRankRing]}>
                                        {rank < 3 && (
                                            <View style={styles.topSouperRankBadge}>
                                                <Text style={styles.topSouperRankText}>{rank + 1}</Text>
                                            </View>
                                        )}
                                        {u.avatar_url ? (
                                            <Image source={getAvatarSource(u.avatar_url)} style={styles.topSouperAvatar} />
                                        ) : (
                                            <View style={[styles.topSouperAvatar, styles.topSouperAvatarPlaceholder]}>
                                                <Text style={styles.topSouperAvatarLetter}>{(u.display_name || '?')[0].toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.topSouperName} numberOfLines={1}>{u.display_name || 'Souper'}</Text>
                                    <Text style={styles.topSouperCount}>{u.voice_count || 0} voices</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* SECTION 4: Conversations — chips + big CTA */}
                <View style={styles.redesignSection}>
                    <Text style={styles.redesignSectionTitle}>your conversations</Text>
                    {chatsLoadError ? (
                        <Pressable style={styles.chatsErrorRow} onPress={() => loadCommunityChats()}>
                            <Text style={styles.chatsErrorText}>tap to try again</Text>
                        </Pressable>
                    ) : chatGroups.length === 0 ? (
                        <Pressable style={({ pressed }) => [styles.chatsEmptyRow, pressed && { opacity: 0.9 }]} onPress={() => router.push('/group-selection')}>
                            <Text style={styles.chatsEmptyText}>add languages to start</Text>
                            <ChevronRight size={20} color={SOUP_COLORS.turquoise} />
                        </Pressable>
                    ) : (
                        <>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.convoChipsWrap}>
                                {chatGroups.slice(0, 5).map((item) => {
                                    const hasNew = (item.unreadCount || 0) > 0;
                                    return (
                                        <Pressable
                                            key={item.id}
                                            style={({ pressed }) => [styles.convoChip, hasNew && styles.convoChipUnread, pressed && { opacity: 0.9 }]}
                                            onPress={() => {
                                                if (!item?.id) return;
                                                setChatGroups(prev => prev.map(g => (g.id === item.id ? { ...g, unreadCount: 0 } : g)));
                                                router.push(`/chat/${item.id}`);
                                            }}
                                        >
                                            <View style={styles.convoChipAvatar}>
                                                <GroupAvatar language={item.language} size={36} />
                                                {hasNew && <View style={styles.convoChipDot} />}
                                            </View>
                                            <Text style={styles.convoChipName} numberOfLines={1}>{item.name}</Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                            <Pressable
                                style={({ pressed }) => [styles.seeAllCard, pressed && styles.seeAllCardPressed]}
                                onPress={() => router.push('/your-groups')}
                            >
                                <Text style={styles.seeAllCardLabel}>
                                    {chatGroups.length > 5 ? `open all ${chatGroups.length} conversations` : 'open all conversations'}
                                </Text>
                                <ChevronRight size={24} color="#fff" strokeWidth={2.5} />
                            </Pressable>
                        </>
                    )}
                </View>
                </View>
            </ScrollView>

            {/* User Preview Modal */}
            <UserPreviewModal
                visible={!!selectedUser}
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

            <WelcomeMissionModal
                visible={showWelcomeMission}
                onClose={() => setShowWelcomeMission(false)}
                groups={myGroups}
            />

            <LanguageRequestModal
                visible={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSubmit={async (requestText) => {
                    if (!user?.id || !requestText?.trim()) return;
                    try {
                        const { error } = await supabase.from('app_language_requests').insert({
                            user_id: user.id,
                            language: requestText.trim(),
                            status: 'pending',
                        });
                        if (error) throw error;
                        completeQuest('request_language');
                        setShowRequestModal(false);
                        Alert.alert('Request sent', 'Thanks! We\'ll look into adding this.');
                    } catch (e) {
                        console.error(e);
                        Alert.alert('Error', 'Could not submit. Try again.');
                    }
                }}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    homeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 16,
        backgroundColor: SOUP_COLORS.turquoise,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
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
        paddingHorizontal: 16,
    },
    moreMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
    },
    moreMenuLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        backgroundColor: SOUP_COLORS.cream,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    headerSubtext: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    spokeTodayCardList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    voiceMessageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    voiceMessageRowNotFirst: { marginTop: 4 },
    voiceMessageAvatarWrap: { marginRight: 10 },
    voiceMessageAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    voiceMessageAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceMessageAvatarLetter: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    voiceMessageContent: { flex: 1, minWidth: 0 },
    voiceMessageSenderName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
    },
    voiceMessageBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F2F2F7',
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 6,
        minWidth: 200,
        maxWidth: '100%',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    voiceMessagePlayBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    voiceMessagePlayBtnActive: {
        backgroundColor: SOUP_COLORS.pink,
    },
    voiceBubbleWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    voiceBubbleWaveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    voiceMessageDuration: {
        fontSize: 11,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        flexShrink: 0,
    },
    spokeTodayCardNoVoice: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },
    heroEmpty: {
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 24,
        marginHorizontal: 16,
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
        borderStyle: 'dashed',
    },
    heroEmptyEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    heroEmptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 6,
    },
    heroEmptyCtaText: {
        fontSize: 17,
        fontWeight: '800',
        color: SOUP_COLORS.turquoise,
    },
    socialProofCard: {
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    socialProofLine: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 6,
    },
    pulseLine: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 4,
        marginTop: 4,
        paddingHorizontal: 16,
    },
    communityNudge: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    scrollContent: {},
    scrollContentWrap: {
        backgroundColor: SOUP_COLORS.cream,
        paddingTop: 16,
        paddingBottom: 32,
    },
    pulseHero: {
        flexDirection: 'row',
        marginHorizontal: 0,
        marginBottom: 0,
        minHeight: 120,
    },
    pulseHeroLeft: {
        flex: 1,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 28,
    },
    pulseHeroRight: {
        flex: 1,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 28,
    },
    pulseHeroNumber: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    pulseHeroLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.95)',
        marginTop: 4,
    },
    pulseHeroLiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pulseHeroLiveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    redesignSection: {
        marginTop: 20,
        marginHorizontal: 16,
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 24,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    redesignSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    redesignSectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.3,
    },
    redesignSectionCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    redesignSectionCtaText: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.turquoise,
    },
    voiceStripCardFirst: {
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
    },
    tickerStrip: {
        marginTop: 16,
        backgroundColor: 'rgba(236,0,139,0.08)',
        borderLeftWidth: 6,
        borderLeftColor: SOUP_COLORS.pink,
        paddingVertical: 14,
        paddingLeft: 16,
    },
    tickerStripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    tickerLivePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.pink,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 5,
    },
    tickerStripLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    tickerLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    tickerLiveText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    redesignCard: {
        marginTop: 20,
        marginHorizontal: 16,
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 24,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    redesignCardTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        marginBottom: 14,
        letterSpacing: -0.3,
    },
    topSouperRankRing: {
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
    },
    topSouperRankBadge: {
        position: 'absolute',
        top: -6,
        left: -2,
        backgroundColor: SOUP_COLORS.pink,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    topSouperRankText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#fff',
    },
    convoChipsWrap: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4,
        marginBottom: 14,
    },
    convoChip: {
        alignItems: 'center',
        width: 72,
    },
    convoChipUnread: {
        opacity: 1,
    },
    convoChipAvatar: {
        position: 'relative',
        marginBottom: 6,
    },
    convoChipDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: SOUP_COLORS.pink,
        borderWidth: 2,
        borderColor: SOUP_COLORS.card,
    },
    convoChipName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        textAlign: 'center',
    },
    tickerScroll: { marginBottom: 4 },
    tickerWrap: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tickerPill: {
        backgroundColor: SOUP_COLORS.card,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        maxWidth: 240,
    },
    tickerText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    chatsErrorRow: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    chatsErrorText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    chatsEmptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: 14,
    },
    chatsEmptyText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    chatFeedList: { paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 8, gap: 8 },
    chatTile: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 18,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    chatTilePressed: { opacity: 0.9 },
    chatTileAvatarWrap: {
        position: 'relative',
        marginRight: 10,
    },
    chatTileAvatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    chatTileAvatarCircleUnread: {
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
    },
    chatTileUnreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    chatTileUnreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    chatTileContent: { flex: 1, minWidth: 0, justifyContent: 'center' },
    chatTileName: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 1,
    },
    chatTileNameUnread: { fontWeight: '800', color: SOUP_COLORS.text },
    chatTilePreview: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    chatTileMeta: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
        marginLeft: 6,
    },
    chatTileTime: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    seeAllCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SOUP_COLORS.turquoise,
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 10,
        marginTop: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    seeAllCardPressed: { opacity: 0.9 },
    seeAllCardLabel: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    sectionTitleEmoji: {
        fontSize: 26,
        marginLeft: 4,
    },
    spokeTodayProofPill: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginLeft: 10,
    },
    spokeTodayProofText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    seeAllVoicesLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeAllVoicesLinkText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
    voiceStripScroll: { marginBottom: 4 },
    voiceStripWrap: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        gap: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    voiceStripCard: {
        width: 158,
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    voiceStripAvatarWrap: { alignSelf: 'center', marginBottom: 4, position: 'relative' },
    voiceStripAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    voiceStripAvatarPh: {
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voiceStripAvatarLetter: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    voiceStripRecencyPill: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: SOUP_COLORS.pink,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    voiceStripRecencyText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },
    voiceStripName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    voiceStripBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F2F2F7',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 6,
        gap: 4,
        minHeight: 28,
        overflow: 'hidden',
    },
    voiceStripPlayBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    voiceStripPlayBtnActive: {
        backgroundColor: SOUP_COLORS.pink,
    },
    voiceStripDuration: {
        fontSize: 10,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        flexShrink: 0,
    },
    facesStripScroll: { marginBottom: 4 },
    facesStrip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    facesStripAvatarWrap: { marginRight: 12 },
    facesStripAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    facesStripAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
    },
    facesStripAvatarLetter: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    topSoupersStrip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 18,
    },
    topSouperItem: {
        alignItems: 'center',
        width: 60,
    },
    topSouperAvatarWrap: { position: 'relative' },
    topSouperAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    topSouperAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSouperAvatarLetter: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    topSouperName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginTop: 4,
    },
    topSouperCount: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginTop: 1,
    },
    voiceMessageTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 3,
    },
    recencyPill: {
        backgroundColor: SOUP_COLORS.pink,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    recencyPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
    },
    // Chat Card
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    chatCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    chatMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chatMetaText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: SOUP_COLORS.red,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Chat with a native CTA
    nativeCtaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 20,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    nativeCtaIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    nativeCtaText: { flex: 1 },
    nativeCtaTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    nativeCtaSubtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },

    // Sections
    section: {
        marginTop: 22,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        paddingHorizontal: 0,
        marginBottom: 0,
        letterSpacing: -0.4,
    },
    // Leaderboards (avatars + bars)
    leaderboardCard: {
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 20,
        padding: 16,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    leaderboardSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 8,
        marginTop: 4,
    },
    leaderboardDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.08)',
        marginVertical: 14,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    leaderboardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    leaderboardInfo: {
        flex: 1,
    },
    leaderboardName: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    leaderboardBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    leaderboardBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    leaderboardCount: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginLeft: 8,
    },
    leaderboardEmpty: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        paddingVertical: 12,
        fontStyle: 'italic',
    },

    // What we're building (roadmap + upvote)
    roadmapSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    roadmapList: {
        paddingHorizontal: 16,
        gap: 10,
    },
    roadmapCard: {
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 16,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.green,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    roadmapCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    roadmapCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        flex: 1,
        marginRight: 12,
    },
    roadmapVoteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    roadmapVoteRowVoted: {},
    roadmapVoteCount: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    roadmapVoteCountVoted: {
        color: SOUP_COLORS.blue,
    },
    roadmapEmpty: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    roadmapEmptyText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },

    // Announcements
    announcementsList: {
        paddingHorizontal: 16,
    },
    announcementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginRight: 12,
        maxWidth: 280,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    announcementIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 20,
    },

    // Groups
    groupsList: {
        paddingHorizontal: 16,
    },
    groupCard: {
        backgroundColor: '#fff',
        width: 110,
        padding: 14,
        borderRadius: 18,
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    groupAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupEmoji: {
        fontSize: 26,
    },
    groupName: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textAlign: 'center',
        marginBottom: 6,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },

    // Full Announcement Cards
    fullAnnouncementCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.pink,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    announcementIconLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementContent: {
        flex: 1,
    },
    announcementFullText: {
        fontSize: 15,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 22,
        marginBottom: 6,
    },
    announcementDate: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    readMoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        marginTop: 6,
        marginBottom: 4,
    },

    // Issue Cards
    issueCard: {
        backgroundColor: '#fff',
        width: 160,
        padding: 12,
        borderRadius: 16,
        marginRight: 12,
        justifyContent: 'space-between',
        height: 110,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    issueBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    issueBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    issueTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        lineHeight: 18,
        flex: 1,
    },
    issueStatus: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
        marginTop: 6,
        textTransform: 'capitalize',
    },

    // People Cards
    peopleList: {
        paddingHorizontal: 16,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    personAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 14,
    },
    personInfo: {
        flex: 1,
    },
    personName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    personTagline: {
        fontSize: 14,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        marginBottom: 6,
    },
    languageFlags: {
        flexDirection: 'row',
        gap: 4,
    },
    flagEmoji: {
        fontSize: 16,
    },
    dmButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.blue + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dmEmoji: {
        fontSize: 20,
    },

    // Language Filters
    filterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.08)',
        minWidth: 40,
    },
    filterChipActive: {
        backgroundColor: SOUP_COLORS.blue,
        borderColor: SOUP_COLORS.blue,
    },
    filterEmoji: {
        fontSize: 18,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    filterTextActive: {
        color: '#fff',
    },

    // Pinterest Grid
    pinterestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    pinterestCard: {
        width: '47%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#f0f0f0',
    },
    cardContent: {
        padding: 12,
    },
    cardName: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    newBadgeDiagonal: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: SOUP_COLORS.red,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderBottomRightRadius: 16,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    newBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardTagline: {
        fontSize: 13,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        lineHeight: 18,
        marginBottom: 8,
    },
    cardFlags: {
        flexDirection: 'row',
        gap: 4,
        flexWrap: 'wrap',
    },
    cardFlag: {
        fontSize: 18,
    },

    // Gallery / Welcome Wall Styles
    galleryContainer: {
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 8,
        gap: 16,
    },
    recordGreetingCard: {
        width: 100,
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
        borderStyle: 'dashed',
        gap: 8,
    },
    recordIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordText: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
    },
    greetingItem: {
        width: 100,
        alignItems: 'center',
        gap: 8,
    },
    greetingAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        padding: 4,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    greetingAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
    },
    playOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    greetingName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
});

function getPriorityColor(p) {
    switch (p) {
        case 'P0': return SOUP_COLORS.red || '#FF3B30';
        case 'P1': return SOUP_COLORS.yellow || '#FFCC00';
        case 'P2': return SOUP_COLORS.green || '#19b091';
        default: return '#ccc';
    }
}
