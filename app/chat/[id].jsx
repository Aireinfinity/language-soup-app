// Chat screen with language flag badges and admin toggle
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, Square, ChevronLeft, ChevronRight, MoreVertical, Check, Clock, Globe, Lightbulb, Play, Pause } from 'lucide-react-native';
import { InspirationModal } from '../../components/InspirationModal';
import { SoupPhrasesVocabPanel } from '../../components/SoupPhrasesVocabPanel';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioMessage } from '../../components/AudioMessage';
import { LiveAudioWaveform } from '../../components/LiveAudioWaveform';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useGroupChat } from '../../hooks/useGroupChat';
import { getLanguageFlag } from '../../utils/languageFlags';
import { SharedChatUI } from '../../components/SharedChatUI';
import { ReactionViewerModal } from '../../components/ReactionViewerModal';
import { ChatStyles } from '../../constants/ChatStyles';
import { WhatsAppChatStyles, whatsAppHeaderBorder } from '../../constants/WhatsAppChatStyles';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { haptics } from '../../utils/haptics';
import { useQuests } from '../../contexts/QuestContext';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { getAvatarSource } from '../../utils/soupUtils';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { BenjaminBookingBanner } from '../../components/BenjaminBookingBanner';
import { FillProfileThenGroupsModal } from '../../components/FillProfileThenGroupsModal';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

// Helper to add date separators
function addDateSeparators(messages) {
    if (!messages || messages.length === 0) return [];
    const result = [];
    let lastDate = null;
    messages.forEach((msg) => {
        const msgDate = new Date(msg.created_at).toDateString();
        if (msgDate !== lastDate) {
            const date = new Date(msg.created_at);
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            let label = 'Today';
            if (msgDate === yesterday) label = 'Yesterday';
            else if (msgDate !== today) {
                label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            result.push({ id: `date-${msg.created_at}`, type: 'date_separator', label });
            lastDate = msgDate;
        }
        result.push(msg);
    });
    return result;
}

const LANGUAGE_SOUP_GROUP_ID = '00000000-0000-0000-0000-000000000000';

// Optional: use from (tabs)/feed with groupId + embedded to show LS chat inside feed layout.
// showLanguageTags: when true (Language Soup group), show per-message language tag.
// oneChallengePerDayEnglish: when true (LS feed), show only one challenge per day (most recent; prefer English when we have it).
export function GroupChatView({ groupId: groupIdProp, embedded: embeddedProp, merged: mergedProp, showLanguageTags: showLanguageTagsProp, oneChallengePerDayEnglish: oneChallengeProp, onOpenGroupInfo }) {
    const { user } = useAuth();
    const { clearNotifications, clearGroupNotifications } = useNotifications();
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupId = groupIdProp ?? params.id;
    const scrollToMessageId = params.messageId;
    const embedded = embeddedProp ?? (params.embedded === '1' || params.embedded === true);
    const merged = mergedProp ?? false;
    const showLanguageTags = showLanguageTagsProp ?? false;
    const oneChallengePerDayEnglish = oneChallengeProp ?? false;
    const mergedGroupIdsRef = useRef([]);
    const currentChallengeRef = useRef(null);
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();
    const channelRef = useRef(null);
    const lastTypingSent = useRef(0);
    const { completeQuest } = useQuests();
    const { stopAudio } = useAudioPlayer();
    const stopAudioRef = useRef(stopAudio);
    stopAudioRef.current = stopAudio;
    const { permissionStatus, openSettings } = useNotifications();

    useFocusEffect(
        React.useCallback(() => {
            if (groupId) track(AnalyticsEvents.CHAT_VIEW, { group_id: groupId });
            return () => { stopAudioRef.current?.(); };
        }, [groupId])
    );

    const [showInspiration, setShowInspiration] = useState(false);
    const [inspirationMetadata, setInspirationMetadata] = useState(null);
    const [showSoupPhrasesVocab, setShowSoupPhrasesVocab] = useState(false);
    const [mergedGroupLanguages, setMergedGroupLanguages] = useState([]);
    const [mergedVoiceGroupId, setMergedVoiceGroupId] = useState(null); // real group id to send voice to when in merged view
    const [phrasesChallengePrompt, setPhrasesChallengePrompt] = useState(null);
    const [phrasesChallengeId, setPhrasesChallengeId] = useState(null);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [textInput, setTextInput] = useState('');
    const [sending, setSending] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupLanguage, setGroupLanguage] = useState('');
    const [memberCount, setMemberCount] = useState(0);
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [isDM, setIsDM] = useState(false);
    const [partner, setPartner] = useState(null);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    currentChallengeRef.current = currentChallenge;
    const chat = useGroupChat(merged ? null : groupId, user?.id, { currentChallengeId: currentChallenge?.id });
    const [allChallenges, setAllChallenges] = useState([]);
    const [visibleChallenge, setVisibleChallenge] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [recordingUsers, setRecordingUsers] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    const [reactions, setReactions] = useState({});
    const [showNotificationCTA, setShowNotificationCTA] = useState(false);
    const [groupMembersReadAt, setGroupMembersReadAt] = useState([]); // { user_id, last_read_at }[] for "Seen"
    // Voice Preview State (listen before sending)
    const [previewAudio, setPreviewAudio] = useState(null); // { uri, duration }
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0); // 0-1 progress
    const previewSoundRef = useRef(null);
    // Note: reply, edit, delete, reaction viewer are now handled internally by SharedChatUI

    // Clear notifications and mark as read when chat opens
    useEffect(() => {
        const markAsRead = async () => {
            if (!user || !groupId) return;

            // Update last_read_at timestamp in app_group_members
            await supabase
                .from('app_group_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('group_id', groupId);
        };

        clearGroupNotifications(groupId);
        markAsRead();
    }, [groupId, user?.id]);

    // Load data when group or user changes. When !merged, useGroupChat hook loads messages; we only run merged path or load challenges here.
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        if (merged) {
            loadMergedMessages();
        } else if (!groupId) {
            setLoading(false);
        }
        loadUserProfile();
    }, [groupId, user?.id, merged]);

    // When !merged: load challenges for this group (for send payload + inspiration). Hook handles messages.
    useEffect(() => {
        if (merged || !groupId || !user?.id) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('app_challenges')
                .select('id, prompt_text, created_at, metadata')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (!cancelled && data?.length) setCurrentChallenge(data[0]);
        })();
        return () => { cancelled = true; };
    }, [groupId, merged, user?.id]);

    const loadUserProfile = async () => {
        const { data } = await supabase
            .from('app_users')
            .select('display_name, avatar_url, fluent_languages')
            .eq('id', user.id)
            .single();
        setUserProfile(data);
    };

    const {
        isRecording,
        isPaused,
        recordingDuration,
        metering,
        startRecording: startRecordingOriginal,
        stopRecording,
        cancelRecording,
        pauseRecording,
        resumeRecording,
        prepareAudioSession,
    } = useVoiceRecorder();

    // Prepare recording session on mount so first mic tap works (no "cannot record audio")
    useEffect(() => {
        let cancelled = false;
        prepareAudioSession().catch((e) => {
            if (!cancelled) { /* warm-up best-effort */ }
        });
        return () => { cancelled = true; };
    }, [prepareAudioSession]);

    const startRecording = async () => {
        // Clear any existing preview first
        if (previewSoundRef.current) {
            await previewSoundRef.current.unloadAsync();
            previewSoundRef.current = null;
        }
        setPreviewAudio(null);
        setIsPlayingPreview(false);

        await startRecordingOriginal();
        if (channelRef.current && userProfile) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording',
                payload: {
                    user_id: user.id,
                    display_name: userProfile?.display_name || 'Someone',
                    avatar_url: userProfile?.avatar_url,
                },
            });
        }
    };



    const handleStopRecording = async () => {
        const result = await stopRecording();
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording_stop',
                payload: { user_id: user.id },
            });
        }
        return result;
    };

    // Pause recording (freezes timer, can resume later)
    const handlePauseRecording = async () => {
        await pauseRecording();
    };

    // Resume recording from where we left off
    const handleResumeRecording = async () => {
        await resumeRecording();
    };

    // Stop recording and enter preview mode
    const handleStopAndPreview = async () => {
        // Capture duration before stop resets it
        const capturedDuration = Math.floor(recordingDuration);
        const result = await handleStopRecording();
        if (result?.uri) {
            // Use captured duration, fallback to result.duration
            const duration = capturedDuration > 0 ? capturedDuration : Math.floor((result.duration || 0) / 1000);
            setPreviewAudio({ uri: result.uri, duration });
        }
    };

    // Play/Pause preview audio
    const handleTogglePreview = async () => {
        if (!previewAudio?.uri) return;

        if (isPlayingPreview && previewSoundRef.current) {
            await previewSoundRef.current.pauseAsync();
            setIsPlayingPreview(false);
            return;
        }

        try {
            // Set audio mode for playback (loud speaker)
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
            });

            // Unload previous sound if exists
            if (previewSoundRef.current) {
                await previewSoundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: previewAudio.uri },
                { shouldPlay: true, volume: 1.0 },
                (status) => {
                    if (status.isLoaded) {
                        // Update playback position (0-1)
                        if (status.durationMillis > 0) {
                            setPlaybackPosition(status.positionMillis / status.durationMillis);
                        }
                        if (status.didJustFinish) {
                            setIsPlayingPreview(false);
                            setPlaybackPosition(0);
                        }
                    }
                }
            );
            previewSoundRef.current = sound;
            setIsPlayingPreview(true);
        } catch (error) {
            console.error('Error playing preview:', error);
        }
    };

    // Discard preview and return to normal input
    const handleDiscardPreview = async () => {
        if (previewSoundRef.current) {
            await previewSoundRef.current.unloadAsync();
            previewSoundRef.current = null;
        }
        setPreviewAudio(null);
        setIsPlayingPreview(false);
    };

    // Confirm send from preview
    const handleConfirmSend = async () => {
        if (!previewAudio?.uri) return;
        const uri = previewAudio.uri;
        const duration = previewAudio.duration; // Capture duration before cleanup
        // Clean up preview state
        if (previewSoundRef.current) {
            await previewSoundRef.current.unloadAsync();
            previewSoundRef.current = null;
        }
        setPreviewAudio(null);
        setIsPlayingPreview(false);
        // Send the voice memo with duration
        await sendVoiceMemo(uri, duration);
    };

    const handleCancelRecording = async () => {
        await cancelRecording();
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording_stop',
                payload: { user_id: user.id },
            });
        }
    };

    const handleAvatarPress = (sender) => {
        if (!sender?.id) return;
        router.push({
            pathname: `/user/${sender.id}`,
            params: {
                display_name: sender.display_name || '',
                status_text: sender.status_text || '',
                avatar_url: sender.avatar_url || '',
            },
        });
    };

    // Subscribe to realtime events (single-group chat; when merged we use a separate subscription)
    useEffect(() => {
        if (!user || merged) return;
        const channel = supabase
            .channel(`chat-${currentChallenge?.id || 'none'}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
                filter: `challenge_id=eq.${currentChallenge?.id}`,
            }, async (payload) => {
                if (payload.new.sender_id === user.id) return;
                const { data: sender } = await supabase
                    .from('app_users')
                    .select('display_name, avatar_url, fluent_languages')
                    .eq('id', payload.new.sender_id)
                    .single();

                // Inject metadata if it matches current challenge
                const metadata = payload.new.challenge_id === currentChallenge?.id ? currentChallenge?.metadata : null;

                const newMessage = { ...payload.new, sender, challenge_metadata: metadata };
                setMessages((prev) => [...prev, newMessage]);
                setTimeout(() => scrollToBottom(), 100);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_messages',
                filter: `challenge_id=eq.${currentChallenge?.id}`,
            }, (payload) => {
                // Handle message edits and deletes
                setMessages((prev) => prev.map((msg) =>
                    msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                ));
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (payload.user_id === user.id) return;
                setTypingUsers((prev) => ({ ...prev, [payload.user_id]: payload }));
                setTimeout(() => {
                    setTypingUsers((prev) => {
                        const updated = { ...prev };
                        delete updated[payload.user_id];
                        return updated;
                    });
                }, 10000);
            })
            .on('broadcast', { event: 'recording' }, ({ payload }) => {
                if (payload.user_id === user.id) return;
                setRecordingUsers((prev) => ({ ...prev, [payload.user_id]: payload }));
                setTimeout(() => {
                    setRecordingUsers((prev) => {
                        const updated = { ...prev };
                        delete updated[payload.user_id];
                        return updated;
                    });
                }, 5000);
            })
            .on('broadcast', { event: 'recording_stop' }, ({ payload }) => {
                if (payload.user_id === user.id) return;
                setRecordingUsers((prev) => {
                    const updated = { ...prev };
                    delete updated[payload.user_id];
                    return updated;
                });
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_message_reactions',
            }, (payload) => {
                const messageId = payload.new.message_id;
                const nu = payload.new;
                setReactions(prev => {
                    const existing = prev[messageId] || [];
                    const withoutOptimistic = existing.filter(r => !(String(r.id).startsWith('opt-') && r.user_id === nu.user_id && r.emoji === nu.emoji));
                    return { ...prev, [messageId]: [...withoutOptimistic, nu] };
                });
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'app_message_reactions',
            }, (payload) => {
                setReactions(prev => {
                    const messageId = payload.old.message_id;
                    const existing = prev[messageId] || [];
                    return {
                        ...prev,
                        [messageId]: existing.filter(r => r.id !== payload.old.id)
                    };
                });
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'app_challenges',
                filter: `group_id=eq.${groupId}`,
            }, async (payload) => {
                const { data: challenges } = await supabase
                    .from('app_challenges')
                    .select('id, prompt_text, created_at, metadata')
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: false });
                if (challenges && challenges.length > 0) {
                    const list = oneChallengePerDayEnglish ? [challenges[0]] : challenges;
                    setAllChallenges(list);
                    setCurrentChallenge(list[0]);
                    setVisibleChallenge(list[0]);
                }
            })
            .subscribe();
        channelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentChallenge?.id, user?.id, merged, oneChallengePerDayEnglish]);

    // Merged feed: subscribe to all new messages in any of the user's groups
    useEffect(() => {
        if (!merged || !user) return;
        const channel = supabase
            .channel('merged-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
            }, async (payload) => {
                const gid = payload.new?.group_id;
                if (!gid || !mergedGroupIdsRef.current.includes(gid) || payload.new.sender_id === user.id) return;
                const { data: full } = await supabase
                    .from('app_messages')
                    .select(`
                        *,
                        sender:app_users(id, display_name, avatar_url, fluent_languages, status_text),
                        app_groups(name, language)
                    `)
                    .eq('id', payload.new.id)
                    .single();
                if (!full) return;
                const grp = Array.isArray(full.app_groups) ? full.app_groups[0] : full.app_groups;
                const newMsg = {
                    ...full,
                    sender: Array.isArray(full.sender) ? full.sender[0] : full.sender,
                    group_name: grp?.name || null,
                    group_language: grp?.language || null,
                };
                const isFromBot = (newMsg.sender?.display_name || '').toLowerCase() === 'language soup';
                setMessages((prev) => {
                    if (isFromBot && oneChallengePerDayEnglish) {
                        const day = (newMsg.created_at || '').slice(0, 10);
                        const alreadyHasBotForDay = prev.some((m) => (m.sender?.display_name || '').toLowerCase() === 'language soup' && (m.created_at || '').slice(0, 10) === day);
                        if (alreadyHasBotForDay) return prev;
                    }
                    return [...prev, newMsg];
                });
                setTimeout(() => scrollToBottom(), 100);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [merged, user?.id, oneChallengePerDayEnglish]);

    // Load reactions for current messages
    const loadReactions = async (messageIds) => {
        if (!messageIds || messageIds.length === 0) return;
        try {
            const { data: reactionsData } = await supabase
                .from('app_message_reactions')
                .select('id, message_id, user_id, emoji, created_at')
                .in('message_id', messageIds);

            if (reactionsData) {
                const reactionsMap = {};
                reactionsData.forEach(reaction => {
                    if (!reactionsMap[reaction.message_id]) {
                        reactionsMap[reaction.message_id] = [];
                    }
                    reactionsMap[reaction.message_id].push(reaction);
                });
                setReactions(reactionsMap);
            }
        } catch (_) {}
    };

    const loadChatData = async () => {
        const gid = typeof groupId === 'string' ? groupId : (groupId != null ? String(groupId) : null);
        if (!gid) return;
        try {
            setLoading(true);
            const { data: group } = await supabase.from('app_groups').select('name, member_count, language, avatar_url').eq('id', gid).single();
            if (group) {
                if (group.name === 'DM') {
                    setIsDM(true);
                    const { data: members } = await supabase
                        .from('app_group_members')
                        .select('user_id, app_users(id, display_name, avatar_url)')
                        .eq('group_id', gid)
                        .neq('user_id', user.id)
                        .limit(1);

                    const partnerData = members?.[0]?.app_users;
                    const partnerUser = partnerData ? (Array.isArray(partnerData) ? partnerData[0] : partnerData) : null;
                    if (partnerUser) {
                        setPartner(partnerUser);
                        setGroupName(partnerUser.display_name || 'Direct Message');
                        setGroupAvatar(partnerUser.avatar_url ?? null);
                    } else {
                        setGroupName('Direct Message');
                        setGroupAvatar(null);
                    }
                } else {
                    setGroupName(group.name);
                    setGroupAvatar(group.avatar_url);
                }
                setMemberCount(group.member_count || 0);
                setGroupLanguage(group.language || '');
            }
            const { data: challenges } = await supabase.from('app_challenges').select('id, prompt_text, created_at, metadata').eq('group_id', gid).order('created_at', { ascending: false });
            if (challenges && challenges.length > 0) {
                const one = oneChallengePerDayEnglish ? challenges[0] : null;
                const list = oneChallengePerDayEnglish && one ? [one] : challenges;
                setAllChallenges(list);
                setCurrentChallenge(list[0]);
                setVisibleChallenge(list[0]);
            }
            const { data: messagesDataRaw } = await supabase
                .from('app_messages')
                .select(`
                    *,
                    sender:app_users(id, display_name, avatar_url, fluent_languages, learning_languages, status_text)
                `)
                .eq('group_id', gid)
                .order('created_at', { ascending: false })
                .limit(80);
            const messagesData = messagesDataRaw?.slice(0).reverse() ?? null;
            if (messagesData) {
                // Create lookup map for challenge metadata & prompts
                const challengeMetadataMap = {};
                const challengePromptMap = {};
                if (challenges) {
                    challenges.forEach(c => {
                        challengeMetadataMap[c.id] = c.metadata;
                        challengePromptMap[c.id] = c.prompt_text;
                    });
                }

                // Handle deleted users by providing fallback data
                const messagesWithFallback = messagesData.map(msg => {
                    // Start with DB metadata
                    const meta = msg.challenge_id ? challengeMetadataMap[msg.challenge_id] : null;
                    const prompt = msg.challenge_id ? challengePromptMap[msg.challenge_id] : null;

                    return {
                        ...msg,
                        // Inject metadata & prompt context
                        challenge_metadata: meta,
                        challenge_prompt: prompt,
                        sender: msg.sender || {
                            display_name: 'Deleted User',
                            avatar_url: null,
                            fluent_languages: []
                        }
                    };
                });
                setMessages(messagesWithFallback);

                // Fetch other members' last_read_at for read receipts
                const { data: readData } = await supabase
                    .from('app_group_members')
                    .select('user_id, last_read_at')
                    .eq('group_id', groupId);
                setGroupMembersReadAt(readData || []);

                // Load reactions for these messages
                const messageIds = messagesData.map(m => m.id);
                await loadReactions(messageIds);

                if (messagesData.length > 0) setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMergedMessages = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            setMergedVoiceGroupId(null); // clear until we have a group the user is actually in
            // User's groups: for phrases/vocab modal and English challenge only
            const { data: memberships, error: memberError } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);
            if (memberError) throw memberError;
            const userGroupIds = (memberships || []).map((m) => m.group_id).filter(Boolean);

            // All non-DM groups: feed shows messages from every group so people see activity (exclude all DMs)
            const { data: allGroups, error: allGroupsError } = await supabase
                .from('app_groups')
                .select('id, name, language, member_count');
            if (allGroupsError) throw allGroupsError;
            const allGroupIds = (allGroups || [])
                .filter((g) => g.name !== 'DM')
                .map((g) => g.id)
                .filter(Boolean);
            if (allGroupIds.length === 0) {
                setMessages([]);
                setLoading(false);
                return;
            }
            mergedGroupIdsRef.current = allGroupIds;

            // User's groups data: languages for phrases/vocab modal + English group for challenge
            let groupsData = [];
            if (userGroupIds.length > 0) {
                const { data } = await supabase
                    .from('app_groups')
                    .select('id, name, language')
                    .in('id', userGroupIds);
                groupsData = data || [];
            }
            // Dedupe by base language so "English" and "English (US)" don't show twice
            const langMap = new Map();
            (groupsData || [])
                .filter((g) => g.id !== LANGUAGE_SOUP_GROUP_ID && g.language)
                .forEach((g) => {
                    const l = (g.language || '').trim();
                    const key = l.toLowerCase().split(/[\s(]+/)[0] || l;
                    if (!langMap.has(key)) langMap.set(key, l);
                });
            setMergedGroupLanguages([...langMap.values()]);

            // One challenge per day: use the English group's challenge only (default for Language Soup feed).
            // Only pick from the user's groups so we never send voice to a group they're not in.
            let englishChallenge = null;
            let englishGroupId = null;
            if (oneChallengePerDayEnglish && (groupsData || []).length > 0) {
                const englishGroup = (groupsData || []).find(
                    (g) =>
                        (g.language && String(g.language).toLowerCase().includes('english')) ||
                        (g.name && String(g.name).toLowerCase().includes('english'))
                );
                if (englishGroup) {
                    englishGroupId = englishGroup.id;
                    const { data: engChallenges } = await supabase
                        .from('app_challenges')
                        .select('id, prompt_text, created_at, metadata')
                        .eq('group_id', englishGroup.id)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    if (engChallenges?.length > 0) englishChallenge = engChallenges[0];
                }
            }

            if (oneChallengePerDayEnglish && englishChallenge) {
                setAllChallenges([englishChallenge]);
                setCurrentChallenge(englishChallenge);
                setVisibleChallenge(englishChallenge);
            }
            // Always set mergedVoiceGroupId when user has an English group so they can send from the main Language Soup chat (even if no challenge yet)
            if (oneChallengePerDayEnglish && englishGroupId) {
                setMergedVoiceGroupId(englishGroupId);
            }
            if (!oneChallengePerDayEnglish) {
                const { data: challenges } = await supabase
                    .from('app_challenges')
                    .select('id, prompt_text, created_at, metadata')
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: false });
                if (challenges?.length > 0) {
                    setAllChallenges(challenges);
                    setCurrentChallenge(challenges[0]);
                    setVisibleChallenge(challenges[0]);
                }
            }

            const { data: messagesData, error: msgError } = await supabase
                .from('app_messages')
                .select(`
                    *,
                    sender:app_users(id, display_name, avatar_url, fluent_languages, status_text),
                    app_groups(name, language)
                `)
                .in('group_id', allGroupIds)
                .order('created_at', { ascending: false })
                .limit(500);
            if (msgError) throw msgError;

            const normalized = (messagesData || []).map((msg) => {
                const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
                const grp = Array.isArray(msg.app_groups) ? msg.app_groups[0] : msg.app_groups;
                return {
                    ...msg,
                    sender: sender || { display_name: 'Deleted User', avatar_url: null, fluent_languages: [] },
                    group_name: grp?.name || null,
                    group_language: grp?.language || null,
                };
            });

            // One challenge post per day: keep all user messages; only one message from the Language Soup bot per day (pick one at random)
            const isFromLanguageSoupBot = (m) => (m.sender?.display_name || '').toLowerCase() === 'language soup';
            const byDay = {};
            normalized.filter(isFromLanguageSoupBot).forEach((m) => {
                const day = (m.created_at || '').slice(0, 10);
                if (!day) return;
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(m);
            });
            const keepChallengeIds = new Set();
            Object.keys(byDay).forEach((day) => {
                const list = byDay[day];
                const pick = list[Math.floor(Math.random() * list.length)];
                keepChallengeIds.add(pick.id);
            });
            const filtered = normalized.filter((m) => !isFromLanguageSoupBot(m) || keepChallengeIds.has(m.id));
            filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

            // Attach challenge_prompt and challenge_metadata per message (for dynamic "need more ingredients")
            const challengeIds = [...new Set(filtered.map((m) => m.challenge_id).filter(Boolean))];
            let challengePromptMap = {};
            let challengeMetadataMap = {};
            if (challengeIds.length > 0) {
                const { data: challenges } = await supabase
                    .from('app_challenges')
                    .select('id, prompt_text, metadata')
                    .in('id', challengeIds);
                (challenges || []).forEach((c) => {
                    challengePromptMap[c.id] = c.prompt_text;
                    challengeMetadataMap[c.id] = c.metadata;
                });
            }
            const withChallengeContext = filtered.map((msg) => ({
                ...msg,
                challenge_prompt: msg.challenge_id ? challengePromptMap[msg.challenge_id] : undefined,
                challenge_metadata: msg.challenge_id ? challengeMetadataMap[msg.challenge_id] : undefined,
            }));

            setMessages(withChallengeContext);
            const messageIds = withChallengeContext.map((m) => m.id);
            if (messageIds.length > 0) await loadReactions(messageIds);
            setTimeout(() => scrollToBottom(), 100);
        } catch (e) {
            console.error('loadMergedMessages:', e);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const typingIndicator = () => {
        const recordingIds = Object.keys(recordingUsers);
        const typingIds = Object.keys(typingUsers);
        if (recordingIds.length === 0 && typingIds.length === 0) return null;
        const isRecording = recordingIds.length > 0;
        const firstUser = isRecording ? recordingUsers[recordingIds[0]] : typingUsers[typingIds[0]];
        const name = firstUser?.display_name || 'Someone';
        return (
            <View style={styles.typingIndicator}>
                <View style={styles.typingAvatarContainer}>
                    {firstUser?.avatar_url ? (
                        <Image source={getAvatarSource(firstUser.avatar_url)} style={styles.typingAvatar} />
                    ) : (
                        <View style={[styles.typingAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
                        </View>
                    )}
                </View>
                <View style={[styles.typingBubble, isRecording && styles.typingBubbleRecording]}>
                    {isRecording ? (
                        <>
                            <Mic size={18} color={SOUP_COLORS.pink} />
                            <Text style={styles.typingBubbleText}>{name} is recording…</Text>
                        </>
                    ) : (
                        <>
                            <View style={styles.typingDots}>
                                <View style={[styles.dot, styles.dot1]} />
                                <View style={[styles.dot, styles.dot2]} />
                                <View style={[styles.dot, styles.dot3]} />
                            </View>
                            <Text style={styles.typingBubbleText}>{name} is typing…</Text>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const sendMessage = async () => {
        if (!textInput.trim() || sending || !user) return;
        const messageText = textInput.trim();
        const targetGroupId = merged && mergedVoiceGroupId ? mergedVoiceGroupId : groupId;
        if (merged && !targetGroupId) {
            Alert.alert('Message Failed', 'No group to send to. Join an English group from the picker first.', [{ text: 'OK' }]);
            return;
        }
        setTextInput('');
        setSending(true);

        // Regular send (reply/edit handled by SharedChatUI)
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: targetGroupId,
            challenge_id: currentChallenge?.id || null,
            message_type: 'text',
            content: messageText,
            created_at: new Date().toISOString(),
            status: 'sending',
            sender: {
                display_name: userProfile?.display_name || user.user_metadata?.display_name || 'Me',
                avatar_url: userProfile?.avatar_url,
                fluent_languages: userProfile?.fluent_languages || [],
            },
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 50);
        try {
            const { data, error } = await supabase.from('app_messages').insert({
                sender_id: user.id,
                group_id: targetGroupId,
                challenge_id: currentChallenge?.id,
                message_type: 'text',
                content: messageText,
            }).select().single();
            if (error) throw error;
            // Reply push notification: voice only (not for text), to avoid spam
            // Mark group as read so we never show unread from our own message
            await supabase.from('app_group_members').update({ last_read_at: new Date().toISOString() }).eq('user_id', user.id).eq('group_id', targetGroupId);
            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg)));

            track(AnalyticsEvents.TEXT_SENT, { group_id: targetGroupId });

            // Complete quest for first text message
            await completeQuest('first_text');

            // Complete quest for replying to challenge if this message is part of a challenge
            if (currentChallenge?.id) {
                await completeQuest('reply_challenge');
                // Nudge to turn on notifications if they are off
                if (permissionStatus !== 'granted') {
                    setShowNotificationCTA(true);
                }
            }
        } catch (error) {
            console.error('Send failed:', error);
            const message = error?.message ? `Could not send: ${error.message}` : 'Could not send message. Please check your connection and try again.';
            Alert.alert('Message Failed', message, [{ text: 'OK' }]);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
            setTextInput(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleSendText = useCallback(async () => {
        const t = textInput.trim();
        if (!t || sending || !user) return;
        if (merged) {
            sendMessage();
            return;
        }
        setTextInput('');
        setSending(true);
        try {
            await chat.sendText(t);
            track(AnalyticsEvents.TEXT_SENT, { group_id: groupId });
            await completeQuest('first_text');
            if (currentChallenge?.id) {
                await completeQuest('reply_challenge');
                if (permissionStatus !== 'granted') setShowNotificationCTA(true);
            }
        } catch (_) {
            setTextInput(t);
        } finally {
            setSending(false);
        }
    }, [merged, textInput, sending, user, sendMessage, chat?.sendText, currentChallenge?.id, permissionStatus, completeQuest]);

    const handleDeleteMessage = async (messageId) => {
        try {
            // Delete for everyone - update message to show system message
            const { error } = await supabase
                .from('app_messages')
                .update({
                    content: 'This message was deleted',
                    message_type: 'system',
                    deleted_at: new Date().toISOString()
                })
                .eq('id', messageId)
                .eq('sender_id', user.id);

            if (error) {
                console.error('[ChatScreen] Error deleting message:', error);
                Alert.alert('Error', 'Failed to delete message');
            } else {
                // Update local state immediately
                setMessages((prev) => prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, content: 'This message was deleted', message_type: 'system', deleted_at: new Date().toISOString() }
                        : msg
                ));
            }
        } catch (error) {
            console.error('[ChatScreen] Error deleting message:', error);
        }
    };



    const handleSendVoice = async () => {
        const result = await handleStopRecording();
        if (result?.uri) await sendVoiceMemo(result.uri);
    };

    // Hold-to-record: release sends if duration >= 0.5s, else cancel
    const handleReleaseRecording = async () => {
        const result = await stopRecording();
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording_stop',
                payload: { user_id: user.id },
            });
        }
        if (result && result.duration >= 500) {
            await sendVoiceMemo(result.uri, Math.floor(result.duration / 1000));
        } else {
            await cancelRecording();
        }
    };

    const sendVoiceMemo = async (audioUri, explicitDuration, challengeIdOverride) => {
        if (!audioUri || !user) return;
        const duration = explicitDuration !== undefined ? explicitDuration : Math.floor(recordingDuration);
        const effectiveChallengeId = challengeIdOverride ?? currentChallenge?.id;
        if (!merged && chat?.sendVoice) {
            await chat.sendVoice(audioUri, duration);
            await completeQuest('first_audio');
            if (currentChallenge?.id && permissionStatus !== 'granted') setShowNotificationCTA(true);
            return;
        }
        const targetGroupId = merged && mergedVoiceGroupId ? mergedVoiceGroupId : groupId;
        if (merged && !targetGroupId) {
            Alert.alert('Voice Message Failed', 'No group to send to. Join an English group from the picker to use phrases & vocab.', [{ text: 'OK' }]);
            return;
        }
        const tempId = `temp-voice-${Date.now()}`;

        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: targetGroupId,
            challenge_id: effectiveChallengeId || null,
            message_type: 'voice',
            media_url: audioUri,
            duration_seconds: duration,
            created_at: new Date().toISOString(),
            status: 'uploading',
            sender: { display_name: 'Me' },
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 50);

        try {
            const fileInfo = await FileSystem.getInfoAsync(audioUri);
            if (!fileInfo.exists) throw new Error('Voice file not found');

            const audioData = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            const fileName = `language-chat/${user.id}/voice_${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);

            const { data, error: insertError } = await supabase.from('app_messages').insert({
                sender_id: user.id,
                group_id: targetGroupId,
                challenge_id: effectiveChallengeId || null,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: duration,
            }).select().single();

            if (insertError) throw insertError;

            if (effectiveChallengeId) {
                supabase.functions.invoke('notify-challenge-reply', { body: { group_id: targetGroupId, sender_id: user.id } }).catch(() => {});
            }
            // Mark group as read so we never show unread from our own message
            await supabase.from('app_group_members').update({ last_read_at: new Date().toISOString() }).eq('user_id', user.id).eq('group_id', targetGroupId);

            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg)));

            track(AnalyticsEvents.VOICE_SENT, { group_id: targetGroupId });

            // Fire-and-forget: transcribe voice memo for reading when you can't listen
            supabase.functions.invoke('voice-feedback', { body: { task: 'transcribe_message', messageId: data.id } })
                .then(({ data: resData }) => {
                    if (resData?.transcript) {
                        setMessages((prev) => prev.map((m) => m.id === data.id ? { ...m, transcript: resData.transcript } : m));
                    }
                })
                .catch((err) => console.warn('[VOICE] Transcript request failed:', err));

            // Complete quest for first audio message
            await completeQuest('first_audio');

            // Nudge to turn on notifications if they are off
            if (effectiveChallengeId && permissionStatus !== 'granted') {
                setShowNotificationCTA(true);
            }
        } catch (error) {
            console.error('❌ [VOICE] Complete error:', error);
            console.error('❌ [VOICE] Error details:', JSON.stringify(error, null, 2));
            const message = error?.message ? `Could not upload: ${error.message}` : 'Could not upload voice message. Please check your connection and try again.';
            Alert.alert('Voice Message Failed', message, [{ text: 'OK' }]);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        }
    };

    const handleGetTranscript = async (messageId) => {
        const { data, error } = await supabase.functions.invoke('voice-feedback', { body: { task: 'transcribe_message', messageId } });
        if (error) throw error;
        if (data?.transcript != null) {
            const updater = (prev) => prev.map((m) => m.id === messageId ? { ...m, transcript: data.transcript } : m);
            if (merged) setMessages(updater);
            else chat.setMessages?.(updater);
            return data.transcript;
        }
        throw new Error(data?.error || 'No transcript');
    };

    const handleTextChange = (text) => {
        setTextInput(text);
        if (!channelRef.current || !user) return;
        const now = Date.now();
        if (now - lastTypingSent.current > 3000) {
            lastTypingSent.current = now;
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: user.id,
                    display_name: userProfile?.display_name || 'Someone',
                    avatar_url: userProfile?.avatar_url,
                },
            });
        }
    };



    const sendImageMessage = async (media) => {
        const imageUri = typeof media === 'string' ? media : media?.uri;
        if (!imageUri || !user) return;
        if (!merged && chat?.sendImage) {
            await chat.sendImage(media);
            return;
        }
        const targetGroupId = merged && mergedVoiceGroupId ? mergedVoiceGroupId : groupId;
        if (merged && !targetGroupId) {
            Alert.alert('Message Failed', 'No group to send to. Join an English group from the picker first.', [{ text: 'OK' }]);
            return;
        }
        const mediaType = typeof media === 'string' ? 'image' : (media?.type || 'image');
        const caption = typeof media === 'string' ? '' : (media?.caption || '');

        const tempId = `temp-${mediaType}-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: targetGroupId,
            challenge_id: currentChallenge?.id || null,
            message_type: mediaType,
            media_url: imageUri,
            content: caption, // Store caption in content field
            created_at: new Date().toISOString(),
            status: 'uploading',
            sender: {
                display_name: userProfile?.display_name || 'Me',
                avatar_url: userProfile?.avatar_url,
                fluent_languages: userProfile?.fluent_languages || [],
            },
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 50);

        try {
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const extension = mediaType === 'video' ? 'mp4' : 'jpg';
            const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
            const fileName = `chat-media/${targetGroupId}/${user.id}/${mediaType}_${Date.now()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(fileName, decode(base64), { contentType });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(fileName);

            // Insert message into database
            const { data, error: insertError } = await supabase
                .from('app_messages')
                .insert({
                    sender_id: user.id,
                    group_id: targetGroupId,
                    challenge_id: currentChallenge?.id || null,
                    message_type: mediaType,
                    media_url: publicUrl,
                    content: caption || null, // Store caption
                })
                .select()
                .single();

            if (insertError) throw insertError;

            setMessages((prev) =>
                prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg))
            );
        } catch (error) {
            console.error('[Media Send] Complete error:', error);
            Alert.alert(`${mediaType === 'video' ? 'Video' : 'Image'} Failed`, `Could not upload ${mediaType}. Please try again.`);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        }
    };

    const handleReact = async (messageId, emoji) => {
        if (!user) return;
        const messageReactions = reactions[messageId] || [];
        const existingReaction = messageReactions.find(
            r => r.user_id === user.id && r.emoji === emoji
        );

        if (existingReaction) {
            setReactions(prev => {
                const next = { ...prev };
                next[messageId] = (next[messageId] || []).filter(r => r.id !== existingReaction.id);
                return next;
            });
            await supabase
                .from('app_message_reactions')
                .delete()
                .eq('id', existingReaction.id);
        } else {
            const optimistic = { id: `opt-${messageId}-${user.id}-${emoji}`, message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() };
            setReactions(prev => ({
                ...prev,
                [messageId]: [...(prev[messageId] || []).filter(r => !(String(r.id).startsWith('opt-') && r.user_id === user.id && r.emoji === emoji)), optimistic]
            }));
            const { error } = await supabase
                .from('app_message_reactions')
                .insert({
                    message_id: messageId,
                    user_id: user.id,
                    emoji: emoji
                });
            if (error) {
                setReactions(prev => ({
                    ...prev,
                    [messageId]: (prev[messageId] || []).filter(r => r.id !== optimistic.id)
                }));
            }
        }
    };

    const getMessageGroupLabel = useCallback(
        (msg) => {
            if (!(merged || showLanguageTags)) return undefined;
            if (msg.type === 'date_separator') return null;
            return msg.transcript_language || msg.group_name || msg.group_language || msg.sender?.learning_languages?.[0] || msg.sender?.fluent_languages?.[0] || '';
        },
        [merged, showLanguageTags]
    );

    const messagesWithDates = useMemo(
        () => [...addDateSeparators(messages)].reverse(),
        [messages]
    );

    const lastScrolledToMessageIdRef = useRef(null);
    useEffect(() => {
        if (!scrollToMessageId) lastScrolledToMessageIdRef.current = null;
    }, [scrollToMessageId]);
    const listRefForScroll = merged ? flatListRef : chat.listRef;
    const displayMessagesForScroll = merged ? messagesWithDates : chat.messagesWithDates;
    // Scroll to a specific message when opened from podcast (once per scrollToMessageId to avoid update loops)
    useEffect(() => {
        if (!scrollToMessageId || !displayMessagesForScroll?.length || !listRefForScroll?.current) return;
        const idx = displayMessagesForScroll.findIndex((m) => m.id === scrollToMessageId);
        if (idx < 0) return;
        if (lastScrolledToMessageIdRef.current === scrollToMessageId) return;
        lastScrolledToMessageIdRef.current = scrollToMessageId;
        const t = setTimeout(() => {
            try {
                listRefForScroll.current?.scrollToIndex({ index: idx, animated: true });
            } catch (_) {
                const approxOffset = Math.max(0, idx * 100);
                listRefForScroll.current?.scrollToOffset({ offset: approxOffset, animated: true });
            }
        }, 300);
        return () => clearTimeout(t);
    }, [displayMessagesForScroll, scrollToMessageId, listRefForScroll]);

    if (!groupId) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text style={{ fontSize: 16, color: Colors.text, textAlign: 'center', marginBottom: 16 }}>
                    This chat couldn&apos;t be loaded. The group may be invalid or you may need to refresh.
                </Text>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 12 }, pressed && { opacity: 0.9 }]}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Go back</Text>
                </Pressable>
            </SafeAreaView>
        );
    }


    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <SharedChatUI
                chatType={isDM ? 'dm' : 'group'}
                tableName="app_messages"
                emptyStateDMPartner={isDM ? groupName : null}
                reactionsTable="app_message_reactions"
                userId={user?.id}
                groupId={groupId}
                groupName={merged ? 'Language Soup' : (chat.group?.name ?? groupName)}
                compact={embedded || merged}
                getMessageGroupLabel={(merged || showLanguageTags) ? getMessageGroupLabel : undefined}
                messages={merged ? (loading ? [] : messagesWithDates) : (chat.loading ? [] : chat.messagesWithDates)}
                loading={merged ? loading : chat.loading}
                groupMembersReadAt={merged ? [] : chat.groupMembersReadAt}
                currentUserId={user?.id}
                groupLanguage={merged ? groupLanguage : (chat.group?.language ?? groupLanguage)}
                currentChallenge={currentChallenge} // Pass full challenge for AI Context
                reactions={merged ? reactions : chat.reactions}
                onReact={merged ? handleReact : chat.handleReact}
                onAvatarPress={handleAvatarPress}
                onGetTranscript={handleGetTranscript}
                onSendText={handleSendText}
                onSendVoice={handleSendVoice}
                onPickImage={sendImageMessage}
                textInput={textInput}
                onTextChange={handleTextChange}
                sending={sending}
                // Recording props
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                metering={metering}
                onStartRecording={startRecording}
                onCancelRecording={handleCancelRecording}
                onSendRecording={handleStopAndPreview}
                onReleaseRecording={handleReleaseRecording}
                // Voice Preview props (listen before send)
                previewAudio={previewAudio}
                isPlayingPreview={isPlayingPreview}
                previewPosition={playbackPosition}
                onTogglePreview={handleTogglePreview}
                onDiscardPreview={handleDiscardPreview}
                onConfirmSend={handleConfirmSend}
                // Pause/Resume Recording
                isPaused={isPaused}
                onPauseRecording={pauseRecording}
                onResumeRecording={resumeRecording}
                onShowInspiration={(metadata, context) => {
                    if (merged) {
                        setPhrasesChallengePrompt(context?.prompt ?? visibleChallenge?.prompt_text);
                        setPhrasesChallengeId(context?.challengeId ?? visibleChallenge?.id);
                        track(AnalyticsEvents.PHRASES_MODAL_OPEN, { group_id: groupId });
                        setShowSoupPhrasesVocab(true);
                        return;
                    }
                    // TEST MODE: Inject dummy data ONLY for specific group
                    let dataToUse = metadata;
                    const isTestGroup = groupName && groupName.toLowerCase().includes('noah');

                    if (!dataToUse && isTestGroup) {
                        dataToUse = {
                            starter_phrase: "Je voudrais un croissant.",
                            vocab_bank: [
                                { word: "Le pain", translation: "Bread" },
                                { word: "La boulangerie", translation: "Bakery" },
                                { word: "Délicieux", translation: "Delicious" }
                            ]
                        };
                    }

                    setInspirationMetadata(dataToUse);
                    setPhrasesChallengePrompt(context?.prompt ?? visibleChallenge?.prompt_text);
                    setPhrasesChallengeId(context?.challengeId ?? visibleChallenge?.id);
                    setShowInspiration(true);
                }}
                flatListRef={merged ? flatListRef : chat.listRef}
                theme="whatsapp"
                aboveInputComponent={merged && (
                    <SoupPhrasesVocabPanel
                        visible={showSoupPhrasesVocab}
                        onClose={() => { setShowSoupPhrasesVocab(false); setPhrasesChallengePrompt(null); setPhrasesChallengeId(null); }}
                        prompt={phrasesChallengePrompt ?? visibleChallenge?.prompt_text}
                        challengeId={phrasesChallengeId ?? visibleChallenge?.id}
                        userId={user?.id}
                        languages={mergedGroupLanguages}
                    />
                )}
                headerComponent={embedded ? null : (() => {
                    const goGroup = () => onOpenGroupInfo ? onOpenGroupInfo() : router.push(`/group-info?id=${groupId}`);
                    const goPartner = () => partner?.id && router.push(`/user/${partner.id}`);
                    const HeaderWrap = Platform.OS === 'ios' ? BlurView : View;
                    const displayName = merged ? groupName : (isDM ? groupName : (chat.group?.name ?? groupName));
                    const displayAvatar = merged ? groupAvatar : (isDM ? groupAvatar : (chat.group?.avatar_url ?? null));
                    const displayIsDM = merged ? isDM : isDM;
                    const headerStyle = [styles.header, { paddingTop: insets.top }, Platform.OS !== 'ios' && { backgroundColor: '#fff' }, whatsAppHeaderBorder].filter(Boolean);
                    return (
                        <HeaderWrap {...(Platform.OS === 'ios' && { intensity: 95, tint: 'light' })} style={headerStyle}>
                            <View style={styles.headerContent}>
                                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}>
                                    <ChevronLeft size={30} color={Colors.primary} />
                                </Pressable>
                                <Pressable style={({ pressed }) => [styles.headerMiddle, pressed && { opacity: 0.9 }]} onPress={displayIsDM ? goPartner : goGroup}>
                                    {(displayAvatar || displayIsDM) && (
                                        <View style={styles.headerAvatarContainer}>
                                            {displayAvatar ? (
                                                typeof displayAvatar === 'string' && displayAvatar.startsWith('emoji:') ? (
                                                    <View style={[styles.headerAvatar, styles.headerAvatarEmoji]}>
                                                        <Text style={styles.headerAvatarEmojiText}>{displayAvatar.replace(/^emoji:/, '')}</Text>
                                                    </View>
                                                ) : (
                                                    <Image source={getAvatarSource(displayAvatar)} style={styles.headerAvatar} />
                                                )
                                            ) : (
                                                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                                                    <Text style={styles.headerAvatarLetter}>{(displayName || '?')[0].toUpperCase()}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.headerInfo}>
                                        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
                                        {!displayIsDM && (merged ? memberCount : (chat.group?.member_count ?? 0)) !== 2 && (
                                            <Text style={styles.headerSubtitle}>
                                                {(merged ? memberCount : (chat.group?.member_count ?? 0))} members · tap for group
                                            </Text>
                                        )}
                                    </View>
                                </Pressable>
                                {!displayIsDM && (
                                    <Pressable style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.9 }]} onPress={goGroup}>
                                        <MoreVertical size={26} color={Colors.primary} />
                                    </Pressable>
                                )}
                                {displayIsDM && <View style={styles.headerAction} />}
                            </View>
                        </HeaderWrap>
                    );
                })()}

                bannerComponent={merged ? <BenjaminBookingBanner /> : null}
            />

            <InspirationModal
                visible={showInspiration}
                onClose={() => setShowInspiration(false)}
                metadata={inspirationMetadata || visibleChallenge?.metadata}
                language={groupLanguage}
                prompt={phrasesChallengePrompt ?? visibleChallenge?.prompt_text}
                challengeId={phrasesChallengeId ?? visibleChallenge?.id}
            />


            <FillProfileThenGroupsModal visible={false} onClose={() => {}} onComplete={() => {}} />

            </View>
    );
}

export default function ChatScreen() {
    return <GroupChatView />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 12,
        paddingBottom: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0,173,239,0.15)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerMiddle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 0,
    },
    headerAvatarContainer: {
        marginRight: 12,
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E8E8E8',
    },
    headerAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarEmoji: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    headerAvatarEmojiText: {
        fontSize: 28,
    },
    headerAvatarLetter: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    backButton: {
        padding: 10,
        marginLeft: -4,
        marginRight: 2,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#667781',
        marginTop: 2,
    },
    headerAction: {
        padding: 10,
        marginRight: -4,
    },
    inspirationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.blue,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        marginTop: 8,
    },
    inspirationText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    challengeBanner: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        zIndex: 5,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    challengeContent: {
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
    challengeHashtag: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    earlyBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    challengeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        lineHeight: 22,
    },
    notificationCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFE5E5',
        marginHorizontal: 16,
        marginTop: 90, // Push below challenge banner
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFD1D1',
    },
    notificationCTAContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    notificationIconBg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationCTAText: {
        fontSize: 13,
        color: Colors.text,
        flex: 1,
        fontWeight: '500',
    },
    typingIndicator: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    typingAvatarContainer: {
        marginBottom: 2,
    },
    typingAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderBottomLeftRadius: 6,
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
        shadowColor: SOUP_COLORS.turquoise,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 40,
    },
    typingBubbleRecording: {
        borderColor: SOUP_COLORS.pink,
        shadowColor: SOUP_COLORS.pink,
    },
    typingBubbleText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.turquoise,
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 1 },
});
