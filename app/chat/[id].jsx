import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, Square, ChevronLeft, MoreVertical, Check, Clock } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioMessage } from '../../components/AudioMessage';
import { LiveAudioWaveform } from '../../components/LiveAudioWaveform';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

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

            result.push({
                id: `date-${msg.created_at}`,
                type: 'date_separator',
                label
            });
            lastDate = msgDate;
        }

        result.push(msg);
    });

    return result;
}

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
    const { user } = useAuth();
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
    const [memberCount, setMemberCount] = useState(0);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [allChallenges, setAllChallenges] = useState([]);
    const [visibleChallenge, setVisibleChallenge] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});

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

        const channel = supabase
            .channel(`chat-${currentChallenge.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
                filter: `challenge_id=eq.${currentChallenge.id}`
            }, async (payload) => {
                if (payload.new.sender_id === user.id) return;

                const { data: sender } = await supabase
                    .from('app_users')
                    .select('display_name, avatar_url')
                    .eq('id', payload.new.sender_id)
                    .single();

                const newMessage = { ...payload.new, sender };
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => scrollToBottom(), 100);
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                if (payload.user_id === user.id) return;

                setTypingUsers(prev => ({
                    ...prev,
                    [payload.user_id]: {
                        display_name: payload.display_name,
                        timestamp: Date.now()
                    }
                }));

                setTimeout(() => {
                    setTypingUsers(prev => {
                        const updated = { ...prev };
                        delete updated[payload.user_id];
                        return updated;
                    });
                }, 3000);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentChallenge, user]);

    const loadChatData = async () => {
        try {
            const { data: group } = await supabase
                .from('app_groups')
                .select('name, member_count')
                .eq('id', groupId)
                .single();

            if (group) {
                setGroupName(group.name);
                setMemberCount(group.member_count || 0);
            }

            const { data: challenges } = await supabase
                .from('app_challenges')
                .select('id, prompt_text, created_at')
                .eq('group_id', groupId)
                .order('created_at', { ascending: false });

            if (challenges && challenges.length > 0) {
                setAllChallenges(challenges);
                setCurrentChallenge(challenges[0]);
                setVisibleChallenge(challenges[0]);

                const { data: messagesData } = await supabase
                    .from('app_messages')
                    .select(`
                        *,
                        sender:app_users!sender_id(display_name, avatar_url)
                    `)
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: true });

                if (messagesData) {
                    setMessages(messagesData);
                    setTimeout(() => scrollToBottom(), 100);
                }
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!textInput.trim() || sending || !user || !currentChallenge) return;

        const messageText = textInput.trim();
        setTextInput('');
        setSending(true);

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
            sender: { display_name: user.user_metadata?.display_name || 'Me' }
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => scrollToBottom(), 50);

        try {
            const { data, error } = await supabase
                .from('app_messages')
                .insert({
                    sender_id: user.id,
                    group_id: groupId,
                    challenge_id: currentChallenge.id,
                    message_type: 'text',
                    content: messageText
                })
                .select()
                .single();

            if (error) throw error;

            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg
            ));
        } catch (error) {
            console.error('Send failed:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setTextInput(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleSendVoice = async () => {
        const uri = await stopRecording();
        if (uri) await sendVoiceMemo(uri);
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
        setTimeout(() => scrollToBottom(), 50);

        try {
            const fileInfo = await FileSystem.getInfoAsync(audioUri);
            const audioData = await FileSystem.readAsStringAsync(audioUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            const fileName = `voice_${Date.now()}.m4a`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(fileName, decode(audioData), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(fileName);

            const { data, error: insertError } = await supabase
                .from('app_messages')
                .insert({
                    sender_id: user.id,
                    group_id: groupId,
                    challenge_id: currentChallenge.id,
                    message_type: 'voice',
                    media_url: publicUrl,
                    duration_seconds: duration
                })
                .select()
                .single();

            if (insertError) throw insertError;

            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...data, sender: optimisticMessage.sender } : msg
            ));
        } catch (error) {
            console.error('Voice upload failed:', error);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
    };

    const handleTextChange = (text) => {
        setTextInput(text);
        if (!channelRef.current || !user) return;

        const now = Date.now();
        if (now - lastTypingSent.current > 2000) {
            lastTypingSent.current = now;
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    user_id: user.id,
                    display_name: user.user_metadata?.display_name || 'Someone'
                }
            });
        }
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: true });
    };

    const renderMessage = ({ item }) => {
        if (item.type === 'date_separator') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={styles.dateSeparatorBadge}>
                        <Text style={styles.dateSeparatorText}>{item.label}</Text>
                    </View>
                </View>
            );
        }

        const isMe = item.sender_id === user?.id;
        return <MessageBubble message={item} isMe={isMe} />;
    };

    const typingIndicator = () => {
        const ids = Object.keys(typingUsers);
        if (ids.length === 0) return null;

        const name = typingUsers[ids[0]].display_name;
        const others = ids.length - 1;
        const text = others > 0 ? `${name} and ${others} others are typing...` : `${name} is typing...`;

        return (
            <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>{text}</Text>
            </View>
        );
    };

    const messagesWithDates = addDateSeparators(messages);

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

            <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={30} color={Colors.primary} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{groupName}</Text>
                        <Text style={styles.headerSubtitle}>{memberCount} members</Text>
                    </View>

                    <Pressable style={styles.headerAction}>
                        <MoreVertical size={24} color={Colors.primary} />
                    </Pressable>
                </View>
            </BlurView>

            {visibleChallenge && (
                <View style={styles.challengeBanner}>
                    <Text style={styles.challengeLabel}>Current Challenge</Text>
                    <Text style={styles.challengeText}>{visibleChallenge.prompt_text}</Text>
                </View>
            )}

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messagesWithDates}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingTop: insets.top + (currentChallenge ? 130 : 70), paddingBottom: 20 }
                    ]}
                    onContentSizeChange={scrollToBottom}
                    onViewableItemsChanged={({ viewableItems }) => {
                        // Find first visible message
                        const firstVisibleMsg = viewableItems.find(item => item.item.message_type !== undefined && item.item.type !== 'date_separator');
                        if (firstVisibleMsg && allChallenges.length > 0) {
                            const msgChallengeId = firstVisibleMsg.item.challenge_id;
                            const matchingChallenge = allChallenges.find(c => c.id === msgChallengeId);
                            if (matchingChallenge && matchingChallenge.id !== visibleChallenge?.id) {
                                setVisibleChallenge(matchingChallenge);
                            }
                        }
                    }}
                    viewabilityConfig={{
                        itemVisiblePercentThreshold: 50
                    }}
                />

                {typingIndicator()}

                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    {isRecording ? (
                        <View style={styles.recordingBar}>
                            <Pressable onPress={cancelRecording} style={styles.cancelButton}>
                                <Trash2 size={22} color="#FF3B30" />
                            </Pressable>

                            <View style={styles.recordingMain}>
                                <View style={styles.waveformWrapper}>
                                    <LiveAudioWaveform
                                        metering={metering}
                                        recordingDuration={recordingDuration}
                                    />
                                </View>
                                <Text style={styles.recordingTimer}>
                                    {Math.floor(recordingDuration / 60)}:{Math.floor(recordingDuration % 60).toString().padStart(2, '0')}
                                </Text>
                            </View>

                            <Pressable onPress={handleSendVoice} style={styles.sendVoiceButton}>
                                <Send size={22} color="#fff" />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.standardInputBar}>
                            <TextInput
                                style={styles.textInput}
                                value={textInput}
                                onChangeText={handleTextChange}
                                placeholder="Message..."
                                placeholderTextColor={Colors.textLight}
                                multiline
                                maxLength={500}
                            />

                            {textInput.trim() ? (
                                <Pressable onPress={sendMessage} disabled={sending} style={styles.sendButton}>
                                    <Send size={24} color={Colors.primary} />
                                </Pressable>
                            ) : (
                                <View style={styles.voiceButtonGroup}>
                                    <Pressable onPress={startRecording} style={styles.micButton}>
                                        <Mic size={28} color={Colors.primary} />
                                    </Pressable>
                                    <Text style={styles.tapHint}>Tap to{"\n"}record</Text>
                                </View>
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
        backgroundColor: SOUP_COLORS.cream,
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
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backButton: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 13,
        color: Colors.textLight,
    },
    headerAction: {
        padding: 4,
    },
    challengeBanner: {
        position: 'absolute',
        top: 100,  // Moved down to be visible below header
        left: 16,
        right: 16,
        zIndex: 9,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.blue,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    challengeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    challengeText: {
        fontSize: 14,
        lineHeight: 18,
        color: '#000',
        fontWeight: '500',
    },
    keyboardView: {
        flex: 1,
    },
    messagesList: {
        paddingHorizontal: 16,
    },
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateSeparatorBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '600',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    rowMe: {
        justifyContent: 'flex-end',
    },
    rowThem: {
        justifyContent: 'flex-start',
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
    bubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        maxWidth: '70%',
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
    senderName: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 20,
    },
    messageTextMe: {
        color: '#fff',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
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
    typingIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    typingText: {
        fontSize: 13,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    standardInputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: '#000',
    },
    voiceButtonGroup: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    micButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tapHint: {
        position: 'absolute',
        bottom: -20,
        fontSize: 10,
        color: Colors.textLight,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 12,
        letterSpacing: 0.2,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 12,
    },
    cancelButton: {
        padding: 8,
    },
    recordingMain: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    waveformWrapper: {
        width: '100%',
        height: 36,
        backgroundColor: 'rgba(0, 173, 239, 0.08)',
        borderRadius: 18,
        overflow: 'hidden',
        paddingHorizontal: 8,
    },
    recordingTimer: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: 0.5,
    },
    sendVoiceButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
