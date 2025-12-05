import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, Vibration, StatusBar, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Lock, Pause, Play, Check, Clock, Trash2, Square, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { AudioMessage } from '../../components/AudioMessage';
import { LiveAudioWaveform } from '../../components/LiveAudioWaveform';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

import { useAuth } from '../../contexts/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Message Bubble Component
function MessageBubble({ message, isMe }) {
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const isSending = message.status === 'sending' || message.status === 'uploading';

    return (
        <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowThem]}>
            {!isMe && (
                <View style={styles.avatarContainer}>
                    {message.sender?.avatar_url ? (
                        <Image source={{ uri: message.sender.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {message.sender?.display_name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleThem,
                isSending && styles.bubbleSending
            ]}>
                {!isMe && message.sender && (
                    <Text style={styles.senderName}>{message.sender.display_name}</Text>
                )}

                {message.message_type === 'voice' ? (
                    <AudioMessage
                        audioUrl={message.media_url}
                        duration={message.duration_seconds}
                        senderName={message.sender?.display_name}
                        isMe={isMe}
                    />
                ) : (
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                        {message.content}
                    </Text>
                )}

                <View style={styles.footer}>
                    <Text style={[styles.time, isMe && styles.timeMe]}>
                        {formatTime(message.created_at)}
                    </Text>
                    {isMe && (
                        <View style={styles.statusIcon}>
                            {isSending ? (
                                <Clock size={12} color="rgba(255,255,255,0.7)" />
                            ) : (
                                <Check size={12} color="rgba(255,255,255,0.7)" />
                            )}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

export default function ChatScreen() {
    const { user } = useAuth(); // Get real user
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams();
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [textInput, setTextInput] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [memberCount, setMemberCount] = useState(0);
    const [currentChallenge, setCurrentChallenge] = useState(null);

    const {
        isRecording,
        isPaused,
        recordingDuration,
        metering,
        startRecording,
        stopRecording,
        cancelRecording,
        pauseRecording,
        resumeRecording
    } = useVoiceRecorder();

    useEffect(() => {
        if (user) {
            loadChatData();
        }
    }, [groupId, user]);

    useEffect(() => {
        if (!currentChallenge || !user) return;

        const channel = setupRealtimeSubscription();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentChallenge, user]);

    const loadChatData = async () => {
        try {
            console.log('Loading chat data for group:', groupId);
            // 1. Load group info from app_groups
            const { data: group, error: groupError } = await supabase
                .from('app_groups')
                .select('name, member_count')
                .eq('id', groupId)
                .single();

            if (groupError) console.error('Error loading group:', groupError);
            if (group) {
                console.log('Group loaded:', group.name);
                setGroupName(group.name);
                setMemberCount(group.member_count || 0);
            }

            // 2. Get current challenge from app_challenges
            const { data: challenge, error: challengeError } = await supabase
                .from('app_challenges')
                .select('id, prompt_text')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (challengeError) console.warn('Error loading challenge (might be none):', challengeError);

            if (challenge) {
                console.log('Current challenge loaded:', challenge.id);
                setCurrentChallenge(challenge);

                // 3. Load messages for this challenge with sender info
                const { data: messagesData, error: messagesError } = await supabase
                    .from('app_messages')
                    .select(`
                        *,
                        sender:app_users!sender_id(display_name, avatar_url)
                    `)
                    .eq('challenge_id', challenge.id)
                    .order('created_at', { ascending: true });

                if (messagesError) console.error('Error loading messages:', messagesError);

                if (messagesData) {
                    console.log('Messages loaded:', messagesData.length);
                    setMessages(messagesData);
                    setTimeout(() => scrollToBottom(), 100);
                }
            } else {
                console.log('No active challenge found for group');
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        const channel = supabase
            .channel(`chat-${currentChallenge.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
                filter: `challenge_id=eq.${currentChallenge.id}`
            }, (payload) => {
                if (payload.new.sender_id === user.id) return; // Ignore own messages

                const newMessage = {
                    ...payload.new,
                    sender: {
                        display_name: 'Other User' // Ideally fetch user details or use a join if possible in realtime (not directly)
                    }
                };

                // Fetch sender details for the new message
                fetchSenderDetails(newMessage);
            })
            .subscribe();

        return channel;
    };

    const fetchSenderDetails = async (message) => {
        const { data } = await supabase
            .from('app_users')
            .select('display_name, avatar_url')
            .eq('id', message.sender_id)
            .single();

        if (data) {
            setMessages(prev => prev.map(msg =>
                msg.id === message.id ? { ...msg, sender: data } : msg
            ));
        } else {
            setMessages(prev => [...prev, message]);
            setTimeout(() => scrollToBottom(), 100);
        }
    };

    const sendMessage = async () => {
        if (!textInput.trim() || sending || !currentChallenge || !user) return;

        const messageText = textInput.trim();
        setTextInput('');

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: groupId,
            challenge_id: currentChallenge.id,
            message_type: 'text',
            content: messageText,
            created_at: new Date().toISOString(),
            status: 'sending',
            sender: { display_name: 'Me' } // Placeholder until refresh
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 100);

        try {
            const { data, error } = await supabase.from('app_messages').insert({
                sender_id: user.id,
                group_id: groupId,
                challenge_id: currentChallenge.id,
                message_type: 'text',
                content: messageText
            }).select().single();

            if (error) throw error;

            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg
            ));

        } catch (error) {
            console.error('Send failed:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setTextInput(messageText);
        }
    };

    const handleSendVoice = async () => {
        Vibration.vibrate(50);
        const uri = await stopRecording();
        if (uri) {
            await sendVoiceMemo(uri);
        }
    };

    const handleMicPress = async () => {
        Vibration.vibrate(50);
        if (isRecording) {
            if (isPaused) {
                await resumeRecording();
            } else {
                await pauseRecording();
            }
        } else {
            await startRecording();
        }
    };

    const sendVoiceMemo = async (audioUri) => {
        if (!audioUri || !currentChallenge || !user) return;

        const tempId = `temp-voice-${Date.now()}`;
        const duration = Math.floor(recordingDuration);

        const optimisticMessage = {
            id: tempId,
            sender_id: user.id,
            group_id: groupId,
            challenge_id: currentChallenge.id,
            message_type: 'voice',
            media_url: audioUri,
            duration_seconds: duration,
            created_at: new Date().toISOString(),
            status: 'uploading',
            sender: { display_name: 'Me' }
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 100);

        try {
            const base64 = await FileSystem.readAsStringAsync(audioUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const fileName = `voice-${Date.now()}.m4a`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(filePath, decode(base64), {
                    contentType: 'audio/m4a',
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(filePath);

            const { data, error: insertError } = await supabase.from('app_messages').insert({
                sender_id: user.id,
                group_id: groupId,
                challenge_id: currentChallenge.id,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: duration
            }).select().single();

            if (insertError) throw insertError;

            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg
            ));

        } catch (error) {
            console.error('Voice upload failed:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    const renderMessage = ({ item }) => {
        const isMe = item.sender_id === user?.id;
        return <MessageBubble message={item} isMe={isMe} />;
    };

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

            {/* Absolute Header with Blur */}
            <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={30} color={Colors.primary} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{groupName}</Text>
                        <Text style={styles.headerSubtitle}>
                            {memberCount} soup lovers active
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Pressable style={styles.headerAction}>
                            <MoreVertical size={24} color={Colors.primary} />
                        </Pressable>
                    </View>
                </View>
                <View style={styles.headerBorder} />
            </BlurView>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingTop: insets.top + 60, paddingBottom: 20 } // Add padding for absolute header
                    ]}
                    onContentSizeChange={scrollToBottom}
                    ListHeaderComponent={
                        currentChallenge ? (
                            <View style={styles.challengeCard}>
                                <Text style={styles.challengeLabel}>Today's Challenge</Text>
                                <Text style={styles.challengeText}>{currentChallenge.prompt_text}</Text>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !currentChallenge && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No messages yet. Start the conversation! 💬</Text>
                            </View>
                        )
                    }
                />

                {/* Input / Recording Container */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    {isRecording ? (
                        // Recording UI
                        <View style={styles.recordingBar}>
                            {/* Left: Trash */}
                            <Pressable onPress={cancelRecording} style={styles.iconButton}>
                                <Trash2 size={24} color={Colors.textLight} />
                            </Pressable>

                            {/* Center: Waveform & Timer */}
                            <View style={styles.recordingCenter}>
                                <View style={styles.recordingWaveform}>
                                    <LiveAudioWaveform metering={metering} />
                                </View>
                                <Text style={styles.recordingTimer}>
                                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                </Text>
                            </View>

                            {/* Right: Actions (Pause/Resume + Send) */}
                            <View style={styles.recordingActions}>
                                <Pressable onPress={handleMicPress} style={styles.iconButton}>
                                    {isPaused ? (
                                        <Mic size={24} color={Colors.primary} />
                                    ) : (
                                        <Pause size={24} color={Colors.error} />
                                    )}
                                </Pressable>

                                <Pressable onPress={handleSendVoice} style={styles.sendButtonSmall}>
                                    <Send size={18} color="#fff" />
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        // Standard Input UI
                        <View style={styles.standardInputBar}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Message..."
                                placeholderTextColor={Colors.textLight}
                                value={textInput}
                                onChangeText={setTextInput}
                                multiline
                                maxLength={500}
                            />

                            {textInput.trim().length > 0 ? (
                                <Pressable onPress={sendMessage} style={styles.sendButton} disabled={sending}>
                                    {sending ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Send size={20} color="#fff" />
                                    )}
                                </Pressable>
                            ) : (
                                <Pressable
                                    onPress={handleMicPress}
                                    style={styles.micButton}
                                >
                                    <Mic size={24} color={Colors.primary} />
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7', // Keep iOS gray for standard chat feel, or switch to Colors.background for soup feel
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        height: 54,
    },
    headerBorder: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    headerAction: {
        padding: 4,
    },
    challengeCard: {
        backgroundColor: '#fff',
        padding: 16,
        margin: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    challengeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    challengeText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 22,
        fontWeight: '500',
    },
    messagesList: {
        paddingHorizontal: 16,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
    },
    messageRow: {
        marginBottom: 8,
        width: '100%',
        flexDirection: 'row',
    },
    rowMe: {
        justifyContent: 'flex-end',
    },
    rowThem: {
        justifyContent: 'flex-start',
    },
    bubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        maxWidth: '75%',
        minWidth: 60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    bubbleMe: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
    },
    bubbleSending: {
        opacity: 0.7,
    },
    avatarContainer: {
        marginRight: 8,
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    senderName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.primary, // Or a specific color for names like WhatsApp uses
        marginBottom: 4,
    },
    messageText: {
        fontSize: 17,
        color: '#000',
        lineHeight: 22,
    },
    messageTextMe: {
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    time: {
        fontSize: 11,
        color: '#8E8E93',
    },
    timeMe: {
        color: 'rgba(255,255,255,0.7)',
    },
    statusIcon: {
        marginLeft: 2,
    },
    inputContainer: {
        backgroundColor: 'rgba(249,249,249,0.94)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: 10,
        paddingTop: 8,
    },
    standardInputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 17,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    sendButton: {
        backgroundColor: Colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        paddingHorizontal: 4,
    },
    recordingCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    recordingWaveform: {
        flex: 1,
        maxWidth: 160,
    },
    recordingTimer: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
        minWidth: 45,
        textAlign: 'center',
    },
    recordingActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonSmall: {
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
