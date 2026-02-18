// Chat screen with language flag badges and admin toggle
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, Square, ChevronLeft, ChevronRight, MoreVertical, Check, Clock, Globe, Lightbulb, Play, Pause } from 'lucide-react-native';
import { InspirationModal } from '../../components/InspirationModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioMessage } from '../../components/AudioMessage';
import { LiveAudioWaveform } from '../../components/LiveAudioWaveform';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { getLanguageFlag } from '../../utils/languageFlags';
import { SharedChatUI } from '../../components/SharedChatUI';
import { ReactionViewerModal } from '../../components/ReactionViewerModal';
import { ChatStyles } from '../../constants/ChatStyles';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { haptics } from '../../utils/haptics';
import { useQuests } from '../../contexts/QuestContext';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { getAvatarSource } from '../../utils/soupUtils';

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
    const { permissionStatus, openSettings } = useNotifications();

    useFocusEffect(
        React.useCallback(() => {
            return () => { stopAudio(); };
        }, [stopAudio])
    );

    const [showInspiration, setShowInspiration] = useState(false);
    const [inspirationMetadata, setInspirationMetadata] = useState(null);

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
    const [allChallenges, setAllChallenges] = useState([]);
    const [visibleChallenge, setVisibleChallenge] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [recordingUsers, setRecordingUsers] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    const [reactions, setReactions] = useState({}); // { messageId: [{ user_id, reaction, created_at }] }
    const [showNotificationCTA, setShowNotificationCTA] = useState(false);
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

    // Load data when group or user changes (use user?.id to avoid infinite re-runs from object reference)
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        if (merged) {
            loadMergedMessages();
        } else if (groupId) {
            loadChatData();
        } else {
            setLoading(false);
            return;
        }
        loadUserProfile();
    }, [groupId, user?.id, merged]);

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
    } = useVoiceRecorder();

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
                console.log('[REACTIONS REALTIME] INSERT event:', payload.new);
                setReactions(prev => {
                    const messageId = payload.new.message_id;
                    const existing = prev[messageId] || [];
                    return {
                        ...prev,
                        [messageId]: [...existing, payload.new]
                    };
                });
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'app_message_reactions',
            }, (payload) => {
                console.log('[REACTIONS REALTIME] DELETE event:', payload.old);
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
        } catch (e) {
            console.warn('loadReactions:', e);
        }
    };

    const loadChatData = async () => {
        const gid = typeof groupId === 'string' ? groupId : (groupId != null ? String(groupId) : null);
        if (!gid) return;
        try {
            setLoading(true);
            const { data: group } = await supabase.from('app_groups').select('name, member_count, language, avatar_url').eq('id', gid).single();
            if (group) {
                if (group.name === 'DM' && group.member_count === 2) {
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
            const { data: memberships, error: memberError } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);
            if (memberError) throw memberError;
            const groupIds = (memberships || []).map((m) => m.group_id).filter(Boolean);
            if (groupIds.length === 0) {
                setMessages([]);
                setLoading(false);
                return;
            }
            mergedGroupIdsRef.current = groupIds;

            // One challenge per day: use the English group's challenge only (default for Language Soup feed)
            let englishChallenge = null;
            let englishGroupId = null;
            if (oneChallengePerDayEnglish) {
                const { data: groupsData } = await supabase
                    .from('app_groups')
                    .select('id, name, language')
                    .in('id', groupIds);
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
            } else if (!oneChallengePerDayEnglish) {
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
                .in('group_id', groupIds)
                .order('created_at', { ascending: true });
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

            setMessages(filtered);
            const messageIds = filtered.map((m) => m.id);
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
        setTextInput('');
        setSending(true);

        // Regular send (reply/edit handled by SharedChatUI)
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: groupId,
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
                group_id: groupId,
                challenge_id: currentChallenge?.id,
                message_type: 'text',
                content: messageText,
            }).select().single();
            if (error) throw error;
            // Reply push notification: voice only (not for text), to avoid spam
            // Mark group as read so we never show unread from our own message
            await supabase.from('app_group_members').update({ last_read_at: new Date().toISOString() }).eq('user_id', user.id).eq('group_id', groupId);
            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg)));

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
            Alert.alert('Message Failed', 'Could not send message. Please check your connection and try again.', [{ text: 'OK' }]);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
            setTextInput(messageText);
        } finally {
            setSending(false);
        }
    };



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

    const sendVoiceMemo = async (audioUri, explicitDuration) => {
        console.log('🎤 [VOICE] Starting sendVoiceMemo with URI:', audioUri);
        if (!audioUri || !user) {
            console.log('❌ [VOICE] Missing audioUri or user:', { audioUri, userId: user?.id });
            return;
        }
        const tempId = `temp-voice-${Date.now()}`;
        // Use explicit duration if provided, otherwise fallback to recordingDuration or 0
        const duration = explicitDuration !== undefined ? explicitDuration : Math.floor(recordingDuration);
        console.log('⏱️ [VOICE] Final duration to save:', duration, 'seconds');

        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: groupId,
            challenge_id: currentChallenge?.id || null,
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
            console.log('📁 [VOICE] Getting file info...');
            const fileInfo = await FileSystem.getInfoAsync(audioUri);
            console.log('📁 [VOICE] File info:', { exists: fileInfo.exists, size: fileInfo.size, uri: fileInfo.uri });

            console.log('🔄 [VOICE] Reading file as base64...');
            const audioData = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
            console.log('✅ [VOICE] Base64 data length:', audioData.length);

            const fileName = `language-chat/${user.id}/voice_${Date.now()}.m4a`;
            console.log('☁️ [VOICE] Uploading to Supabase:', fileName);

            const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
            if (uploadError) {
                console.error('❌ [VOICE] Upload error:', uploadError);
                throw uploadError;
            }
            console.log('✅ [VOICE] Upload successful');

            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);
            console.log('🔗 [VOICE] Public URL:', publicUrl);

            console.log('💾 [VOICE] Inserting into database...');
            const { data, error: insertError } = await supabase.from('app_messages').insert({
                sender_id: user.id,
                group_id: groupId,
                challenge_id: currentChallenge?.id || null,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: duration,
            }).select().single();

            if (insertError) {
                console.error('❌ [VOICE] Database insert error:', insertError);
                throw insertError;
            }
            console.log('✅ [VOICE] Database insert successful:', data);
            if (currentChallenge?.id) {
                supabase.functions.invoke('notify-challenge-reply', { body: { group_id: groupId, sender_id: user.id } }).catch(() => {});
            }
            // Mark group as read so we never show unread from our own message
            await supabase.from('app_group_members').update({ last_read_at: new Date().toISOString() }).eq('user_id', user.id).eq('group_id', groupId);

            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg)));
            console.log('🎉 [VOICE] Voice memo sent successfully!');

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
            if (currentChallenge?.id && permissionStatus !== 'granted') {
                setShowNotificationCTA(true);
            }
        } catch (error) {
            console.error('❌ [VOICE] Complete error:', error);
            console.error('❌ [VOICE] Error details:', JSON.stringify(error, null, 2));
            Alert.alert('Voice Message Failed', 'Could not upload voice message. Please check your connection and try again.', [{ text: 'OK' }]);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        }
    };

    const handleGetTranscript = async (messageId) => {
        const { data, error } = await supabase.functions.invoke('voice-feedback', { body: { task: 'transcribe_message', messageId } });
        if (error) throw error;
        if (data?.transcript != null) {
            setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, transcript: data.transcript } : m));
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
        // Handle both old format (string) and new format (object)
        const imageUri = typeof media === 'string' ? media : media.uri;
        const mediaType = typeof media === 'string' ? 'image' : (media.type || 'image');
        const caption = typeof media === 'string' ? '' : (media.caption || '');

        console.log('[Media Send] Starting upload for:', { imageUri, mediaType, caption });
        if (!imageUri || !user) {
            console.error('[Media Send] Missing imageUri or user');
            return;
        }

        const tempId = `temp-${mediaType}-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: groupId,
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

        console.log('[Media Send] Adding optimistic message');
        setMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 50);

        try {
            console.log('[Media Send] Reading file as base64...');
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            console.log('[Media Send] Base64 length:', base64.length);

            const extension = mediaType === 'video' ? 'mp4' : 'jpg';
            const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
            const fileName = `chat-media/${groupId}/${user.id}/${mediaType}_${Date.now()}.${extension}`;

            console.log('[Media Send] Uploading to:', fileName);
            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(fileName, decode(base64), { contentType });

            if (uploadError) {
                console.error('[Media Send] Upload error:', uploadError);
                throw uploadError;
            }

            console.log('[Media Send] Upload successful, getting URL...');
            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(fileName);

            console.log('[Media Send] Public URL:', publicUrl);
            console.log('[Media Send] Inserting into database...');

            // Insert message into database
            const { data, error: insertError } = await supabase
                .from('app_messages')
                .insert({
                    sender_id: user.id,
                    group_id: groupId,
                    challenge_id: currentChallenge?.id || null,
                    message_type: mediaType,
                    media_url: publicUrl,
                    content: caption || null, // Store caption
                })
                .select()
                .single();

            if (insertError) {
                console.error('[Media Send] Database error:', insertError);
                throw insertError;
            }

            console.log('[Media Send] Success! Message data:', data);
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
            await supabase
                .from('app_message_reactions')
                .delete()
                .eq('id', existingReaction.id);
        } else {
            await supabase
                .from('app_message_reactions')
                .insert({
                    message_id: messageId,
                    user_id: user.id,
                    emoji: emoji
                });
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
    // Scroll to a specific message when opened from podcast (once per scrollToMessageId to avoid update loops)
    useEffect(() => {
        if (!scrollToMessageId || !messagesWithDates.length || !flatListRef.current) return;
        const idx = messagesWithDates.findIndex((m) => m.id === scrollToMessageId);
        if (idx < 0) return;
        if (lastScrolledToMessageIdRef.current === scrollToMessageId) return;
        lastScrolledToMessageIdRef.current = scrollToMessageId;
        const t = setTimeout(() => {
            try {
                flatListRef.current?.scrollToIndex({ index: idx, animated: true });
            } catch (_) {
                const approxOffset = Math.max(0, idx * 100);
                flatListRef.current?.scrollToOffset({ offset: approxOffset, animated: true });
            }
        }, 300);
        return () => clearTimeout(t);
    }, [messagesWithDates, scrollToMessageId]);

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

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <SharedChatUI
                chatType="group"
                tableName="app_messages"
                reactionsTable="app_message_reactions"
                userId={user?.id}
                groupId={groupId}
                groupName={merged ? 'Language Soup' : groupName}
                compact={merged}
                getMessageGroupLabel={(merged || showLanguageTags) ? getMessageGroupLabel : undefined}
                messages={messagesWithDates}
                loading={loading}
                groupLanguage={groupLanguage} // Pass language for Voice Feedback (Fixes "American Accent" bug)
                currentChallenge={currentChallenge} // Pass full challenge for AI Context
                reactions={reactions}
                onReact={handleReact}
                onAvatarPress={handleAvatarPress}
                onGetTranscript={handleGetTranscript}
                onSendText={sendMessage}
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
                onShowInspiration={(metadata) => {
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
                    setShowInspiration(true);
                }}
                headerComponent={embedded ? null : (
                    Platform.OS === 'ios' ? (
                        <BlurView intensity={95} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                            <View style={styles.headerContent}>
                                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}>
                                    <ChevronLeft size={30} color={Colors.primary} />
                                </Pressable>
                                {(groupAvatar || isDM) && (
                                    <View style={styles.headerAvatarContainer}>
                                        {groupAvatar ? (
                                            <Image source={getAvatarSource(groupAvatar)} style={styles.headerAvatar} />
                                        ) : (
                                            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                                                <Text style={styles.headerAvatarLetter}>{(groupName || '?')[0].toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerTitle}>{groupName}</Text>
                                    {!isDM && <Text style={styles.headerSubtitle}>{memberCount} members</Text>}
                                </View>
                                <Pressable style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.9 }]} onPress={() => (onOpenGroupInfo ? onOpenGroupInfo() : router.push(`/group-info?id=${groupId}`))}>
                                    <MoreVertical size={24} color={Colors.primary} />
                                </Pressable>
                            </View>
                        </BlurView>
                    ) : (
                        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#fff' }]}>
                            <View style={styles.headerContent}>
                                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}>
                                    <ChevronLeft size={30} color={Colors.primary} />
                                </Pressable>
                                {(groupAvatar || isDM) && (
                                    <View style={styles.headerAvatarContainer}>
                                        {groupAvatar ? (
                                            <Image source={getAvatarSource(groupAvatar)} style={styles.headerAvatar} />
                                        ) : (
                                            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                                                <Text style={styles.headerAvatarLetter}>{(groupName || '?')[0].toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerTitle}>{groupName}</Text>
                                    {!isDM && <Text style={styles.headerSubtitle}>{memberCount} members</Text>}
                                </View>
                                <Pressable style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.9 }]} onPress={() => (onOpenGroupInfo ? onOpenGroupInfo() : router.push(`/group-info?id=${groupId}`))}>
                                    <MoreVertical size={24} color={Colors.primary} />
                                </Pressable>
                            </View>
                        </View>
                    )
                )}

                bannerComponent={null}
            />

            <InspirationModal
                visible={showInspiration}
                onClose={() => setShowInspiration(false)}
                metadata={inspirationMetadata || visibleChallenge?.metadata}
                language={groupLanguage}
            />

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
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatarContainer: {
        marginRight: 10,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E1E1E1',
    },
    headerAvatarPlaceholder: {
        backgroundColor: '#00adef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarLetter: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 4,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 0,
    },
    headerAction: {
        padding: 8,
        marginRight: -8,
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
