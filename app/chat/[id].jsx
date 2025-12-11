// Chat screen with language flag badges and admin toggle
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, Square, ChevronLeft, MoreVertical, Check, Clock, Globe } from 'lucide-react-native';
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
import { ChatStyles } from '../../constants/ChatStyles';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { haptics } from '../../utils/haptics';

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
    const { clearNotifications } = useNotifications();
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams();
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();
    const channelRef = useRef(null);
    const lastTypingSent = useRef(0);

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

    // Clear notifications when chat opens
    useEffect(() => {
        clearNotifications();
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
                const newMessage = { ...payload.new, sender };
                setMessages((prev) => [...prev, newMessage]);
                setTimeout(() => scrollToBottom(), 100);
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
                table: 'app_challenges',
                filter: `group_id=eq.${groupId}`,
            }, async (payload) => {
                const { data: challenges } = await supabase
                    .from('app_challenges')
                    .select('id, prompt_text, created_at')
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

    const loadChatData = async () => {
        try {
            const { data: group } = await supabase.from('app_groups').select('name, member_count, language').eq('id', groupId).single();
            if (group) {
                setGroupName(group.name);
                setMemberCount(group.member_count || 0);
                setGroupLanguage(group.language || '');
            }
            const { data: challenges } = await supabase.from('app_challenges').select('id, prompt_text, created_at').eq('group_id', groupId).order('created_at', { ascending: false });
            if (challenges && challenges.length > 0) {
                setAllChallenges(challenges);
                setCurrentChallenge(challenges[0]);
                setVisibleChallenge(challenges[0]);
            }
            const { data: messagesData } = await supabase
                .from('app_messages')
                .select(`
                    *,
                    sender:app_users(display_name, avatar_url, fluent_languages)
                `)
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });

            if (messagesData) {
                // Handle deleted users by providing fallback data
                const messagesWithFallback = messagesData.map(msg => ({
                    ...msg,
                    sender: msg.sender || {
                        display_name: 'Deleted User',
                        avatar_url: null,
                        fluent_languages: []
                    }
                }));
                setMessages(messagesWithFallback);
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
                        <Image source={{ uri: firstUser.avatar_url }} style={styles.typingAvatar} />
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
        } catch (error) {
            console.error('Send failed:', error);
            Alert.alert('Message Failed', 'Could not send message. Please check your connection and try again.', [{ text: 'OK' }]);
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
            setTextInput(messageText);
        } finally {
            setSending(false);
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
            <SharedChatUI
                messages={messagesWithDates}
                loading={loading}
                onSendText={sendMessage}
                onSendVoice={handleSendVoice}
                textInput={textInput}
                onTextChange={handleTextChange}
                sending={sending}
                headerComponent={
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
                }
                bannerComponent={
                    visibleChallenge && (
                        <BlurView intensity={95} tint="light" style={[styles.challengeBanner, { top: insets.top + 65 }]}>
                            <View style={styles.challengeContent}>
                                <Text style={styles.challengeHashtag}>#challenge</Text>
                                <Text style={styles.challengeText}>{visibleChallenge.prompt_text}</Text>
                            </View>
                        </BlurView>
                    )
                }
                placeholderText="Message..."
                showLanguageFlags={true}
                senderKey="sender"
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                metering={metering}
                onStartRecording={startRecording}
                onCancelRecording={handleCancelRecording}
                onSendRecording={handleSendVoice}
                typingIndicatorComponent={typingIndicator()}
                flatListRef={flatListRef}
                userId={user?.id}
                contentContainerStyle={[ChatStyles.messagesList, { paddingTop: 20, paddingBottom: insets.top + (currentChallenge ? 130 : 70) }]}
            />
        </View>
    );
}

// Chat-specific styles (not in ChatStyles)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: SOUP_COLORS.cream },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backButton: { padding: 4 },
    headerInfo: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
    headerSubtitle: { fontSize: 13, color: Colors.textLight },
    headerAction: { padding: 4 },
    nativeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#19b091', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
    nativeButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    challengeBanner: { position: 'absolute', left: 12, right: 12, zIndex: 999, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
    challengeContent: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 18, paddingVertical: 16, minHeight: 70 },
    challengeHashtag: { fontSize: 11, fontWeight: '800', color: SOUP_COLORS.pink, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    challengeText: { fontSize: 15, lineHeight: 21, color: '#000', fontWeight: '600', flexWrap: 'wrap' },
    keyboardView: { flex: 1 },
});
