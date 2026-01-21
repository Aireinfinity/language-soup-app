// Chat screen with language flag badges and admin toggle
import React, { useState, useEffect, useRef } from 'react';
import { UserPreviewModal } from '../../components/UserPreviewModal';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, Square, ChevronLeft, MoreVertical, Check, Clock, Globe, Lightbulb } from 'lucide-react-native';
import { InspirationModal } from '../../components/InspirationModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioMessage } from '../../components/AudioMessage';
import { LiveAudioWaveform } from '../../components/LiveAudioWaveform';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
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

export default function ChatScreen() {
    const { user } = useAuth();
    const { clearNotifications, clearGroupNotifications } = useNotifications();
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams();
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();
    const channelRef = useRef(null);
    const lastTypingSent = useRef(0);
    const { completeQuest } = useQuests();
    const { permissionStatus, openSettings } = useNotifications();

    const [showInspiration, setShowInspiration] = useState(false);
    const [inspirationMetadata, setInspirationMetadata] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [textInput, setTextInput] = useState('');
    const [sending, setSending] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupLanguage, setGroupLanguage] = useState('');
    const [memberCount, setMemberCount] = useState(0);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [allChallenges, setAllChallenges] = useState([]);
    const [visibleChallenge, setVisibleChallenge] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [recordingUsers, setRecordingUsers] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    const [reactions, setReactions] = useState({}); // { messageId: [{ user_id, reaction, created_at }] }
    const [showNotificationCTA, setShowNotificationCTA] = useState(false);
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
    }, [groupId]);

    // Load data when group or user changes
    useEffect(() => {
        if (user) {
            loadChatData();
            loadUserProfile();
        }
    }, [groupId, user]);

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

    // Subscribe to realtime events
    useEffect(() => {
        if (!user) return;
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
                event: 'INSERT',
                schema: 'public',
                table: 'app_challenges',
                filter: `group_id=eq.${groupId}`,
            }, async (payload) => {
                const { data: challenges } = await supabase
                    .from('app_challenges')
                    .select('id, prompt_text, created_at') // TEST MODE: Removed metadata
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: false });
                if (challenges && challenges.length > 0) {
                    setAllChallenges(challenges);
                    setCurrentChallenge(challenges[0]);
                    setVisibleChallenge(challenges[0]);
                }
            })
            .subscribe();
        channelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentChallenge, user]);

    // Load reactions for current messages
    const loadReactions = async (messageIds) => {
        if (!messageIds || messageIds.length === 0) return;

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
    };

    const loadChatData = async () => {
        try {
            const { data: group } = await supabase.from('app_groups').select('name, member_count, language').eq('id', groupId).single();
            if (group) {
                setGroupName(group.name);
                setMemberCount(group.member_count || 0);
                setGroupLanguage(group.language || '');
            }
            const { data: challenges } = await supabase.from('app_challenges').select('id, prompt_text, created_at, metadata').eq('group_id', groupId).order('created_at', { ascending: false });
            if (challenges && challenges.length > 0) {
                setAllChallenges(challenges);
                setCurrentChallenge(challenges[0]);
                setVisibleChallenge(challenges[0]);
            }
            const { data: messagesData } = await supabase
                .from('app_messages')
                .select(`
                    *,
                    sender:app_users(display_name, avatar_url, fluent_languages, status_text)
                `)
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });
            if (messagesData) {
                // Create lookup map for challenge metadata
                const challengeMetadataMap = {};
                if (challenges) {
                    challenges.forEach(c => {
                        challengeMetadataMap[c.id] = c.metadata;
                    });
                }

                // Handle deleted users by providing fallback data
                const messagesWithFallback = messagesData.map(msg => {
                    // TEST MODE: Force inject metadata for Noah's group if missing
                    let meta = msg.challenge_id ? challengeMetadataMap[msg.challenge_id] : null;

                    if (!meta && group.name.toLowerCase().includes('noah') && msg.content && msg.content.toLowerCase().includes('#challenge')) {
                        meta = {
                            starter_phrase: "Je voudrais un croissant.",
                            vocab_bank: [
                                { word: "Le pain", translation: "Bread" },
                                { word: "La boulangerie", translation: "Bakery" },
                                { word: "Délicieux", translation: "Delicious" }
                            ]
                        };
                    }

                    return {
                        ...msg,
                        // Inject metadata
                        challenge_metadata: meta,
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

                setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
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
        return (
            <View style={styles.typingIndicator}>
                <View style={styles.typingAvatarContainer}>
                    {firstUser.avatar_url ? (
                        <Image source={getAvatarSource(firstUser.avatar_url)} style={styles.typingAvatar} />
                    ) : (
                        <View style={[styles.typingAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{firstUser.display_name?.charAt(0).toUpperCase() || '?'}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.typingBubble}>
                    {isRecording ? (
                        <Mic size={16} color="#8E8E93" />
                    ) : (
                        <View style={styles.typingDots}>
                            <View style={[styles.dot, styles.dot1]} />
                            <View style={[styles.dot, styles.dot2]} />
                            <View style={[styles.dot, styles.dot3]} />
                        </View>
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

    const sendVoiceMemo = async (audioUri) => {
        console.log('🎤 [VOICE] Starting sendVoiceMemo with URI:', audioUri);
        if (!audioUri || !user) {
            console.log('❌ [VOICE] Missing audioUri or user:', { audioUri, userId: user?.id });
            return;
        }
        const tempId = `temp-voice-${Date.now()}`;
        const duration = Math.floor(recordingDuration);
        console.log('⏱️ [VOICE] Recording duration:', duration, 'seconds');

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

            setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg)));
            console.log('🎉 [VOICE] Voice memo sent successfully!');

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




    const messagesWithDates = [...addDateSeparators(messages)].reverse();

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
                groupName={groupName}
                messages={messagesWithDates}
                loading={loading}
                groupLanguage={groupLanguage} // Pass language for Voice Feedback (Fixes "American Accent" bug)
                onSendText={sendMessage}
                onSendVoice={handleSendVoice}
                onPickImage={sendImageMessage}
                textInput={textInput}
                onTextChange={handleTextChange}
                sending={sending}
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
                headerComponent={
                    Platform.OS === 'ios' ? (
                        <BlurView intensity={95} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                            <View style={styles.headerContent}>
                                <Pressable onPress={() => router.back()} style={styles.backButton}>
                                    <ChevronLeft size={30} color={Colors.primary} />
                                </Pressable>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerTitle}>{groupName}</Text>
                                    <Text style={styles.headerSubtitle}>{memberCount} members</Text>

                                </View>
                                {groupLanguage?.toLowerCase() === 'french' && (
                                    <Pressable style={styles.nativeButton} onPress={() => router.push('/native-speakers?language=French')}>
                                        <Text style={styles.nativeButtonText}>💬 Chat with a Native</Text>
                                    </Pressable>
                                )}
                                <Pressable style={styles.headerAction} onPress={() => router.push(`/group-info?id=${groupId}`)}>
                                    <MoreVertical size={24} color={Colors.primary} />
                                </Pressable>
                            </View>
                        </BlurView>
                    ) : (
                        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: '#fff' }]}>
                            <View style={styles.headerContent}>
                                <Pressable onPress={() => router.back()} style={styles.backButton}>
                                    <ChevronLeft size={30} color={Colors.primary} />
                                </Pressable>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerTitle}>{groupName}</Text>
                                    <Text style={styles.headerSubtitle}>{memberCount} members</Text>
                                </View>
                                {groupLanguage?.toLowerCase() === 'french' && (
                                    <Pressable style={styles.nativeButton} onPress={() => router.push('/native-speakers?language=French')}>
                                        <Text style={styles.nativeButtonText}>💬 Chat with a Native</Text>
                                    </Pressable>
                                )}
                                <Pressable style={styles.headerAction} onPress={() => router.push(`/group-info?id=${groupId}`)}>
                                    <MoreVertical size={24} color={Colors.primary} />
                                </Pressable>
                            </View>
                        </View>
                    )
                }

                bannerComponent={
                    <View style={{ width: '100%' }}>
                        {visibleChallenge && (
                            Platform.OS === 'ios' ? (
                                <BlurView intensity={95} tint="light" style={[styles.challengeBanner, { top: insets.top + 65, marginBottom: 12 }]}>
                                    <View style={styles.challengeContent}>
                                        <Text style={styles.challengeHashtag}>#challenge</Text>
                                        {visibleChallenge.prompt_text.split('\n').map((line, index) => (
                                            <Text key={index} style={styles.challengeText}>{line}</Text>
                                        ))}
                                    </View>
                                </BlurView>
                            ) : (
                                <View style={[styles.challengeBanner, { top: insets.top + 65, marginBottom: 12, backgroundColor: '#fff' }]}>
                                    <View style={styles.challengeContent}>
                                        <Text style={styles.challengeHashtag}>#challenge</Text>
                                        {visibleChallenge.prompt_text.split('\n').map((line, index) => (
                                            <Text key={index} style={styles.challengeText}>{line}</Text>
                                        ))}
                                    </View>
                                </View>
                            )
                        )}
                        {showNotificationCTA && (
                            <Pressable
                                style={styles.notificationCTA}
                                onPress={openSettings}
                            >
                                <View style={styles.notificationCTAContent}>
                                    <View style={styles.notificationIconBg}>
                                        <Clock size={16} color="#fff" />
                                    </View>
                                    <Text style={styles.notificationCTAText}>
                                        Turn on notifications to never miss a challenge!
                                    </Text>
                                </View>
                                <ChevronRight size={16} color={Colors.primary} />
                            </Pressable>
                        )}
                    </View>
                }
            />

            <InspirationModal
                visible={showInspiration}
                onClose={() => setShowInspiration(false)}
                metadata={inspirationMetadata || visibleChallenge?.metadata}
                language={groupLanguage}
            />
        </View >
    );
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
    nativeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.blue,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
    },
    nativeButtonText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
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
        left: 16,
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    typingAvatarContainer: {
        marginBottom: 2,
    },
    typingAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        backgroundColor: '#E1E1E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
    },
    typingBubble: {
        backgroundColor: '#fff', // White bubble
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        minWidth: 40,
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#8E8E93',
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 1 },
});
