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
            {/* Avatar now shown for everyone, me and them */}
            <View style={[styles.avatarContainer, isMe && { order: 2, marginLeft: 8, marginRight: 0 }]}>
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

            <View style={[
                styles.bubble,
                message.message_type === 'voice' && styles.bubbleVoice,
                isMe ? styles.bubbleMe : styles.bubbleThem,
                isSending && styles.bubbleSending,
                isMe && { marginRight: 0, order: 1 } // Flex order doesn't work like this in RN usually, handled by rowMe
            ]}>
                {!isMe && message.sender && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={styles.senderName}>{message.sender.display_name}</Text>
                        {message.sender.fluent_languages && message.sender.fluent_languages.slice(0, 2).map((lang, idx) => (
                            <View key={idx} style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                                marginLeft: 4
                            }}>
                                <Text style={{ fontSize: 9, color: '#fff', opacity: 0.9 }}>{lang}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Show languages for Me too? user said "let the user see their own avatar/ photo when they send a text" and "based on the languages a user has in their profile can u put them on their texts" */}
                {isMe && message.sender && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'flex-end' }}>
                        {message.sender.fluent_languages && message.sender.fluent_languages.slice(0, 2).map((lang, idx) => (
                            <View key={idx} style={{
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                borderRadius: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                                marginLeft: 4
                            }}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>{lang}</Text>
                            </View>
                        ))}
                    </View>
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
    const [groupLanguage, setGroupLanguage] = useState('');
    const [memberCount, setMemberCount] = useState(0);
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [allChallenges, setAllChallenges] = useState([]);
    const [visibleChallenge, setVisibleChallenge] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [recordingUsers, setRecordingUsers] = useState({});
    const [userProfile, setUserProfile] = useState(null);

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
        resumeRecording
    } = useVoiceRecorder();

    const startRecording = async () => {
        await startRecordingOriginal();

        // Broadcast recording status
        if (channelRef.current && userProfile) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording',
                payload: {
                    user_id: user.id,
                    display_name: userProfile?.display_name || 'Someone',
                    avatar_url: userProfile?.avatar_url
                }
            });
        }
    };

    const handleStopRecording = async () => {
        const result = await stopRecording();

        // Broadcast stop recording
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording_stop',
                payload: { user_id: user.id }
            });
        }

        return result;
    };

    const handleCancelRecording = async () => {
        await cancelRecording();

        // Broadcast stop recording
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'recording_stop',
                payload: { user_id: user.id }
            });
        }
    };

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
                    .select('display_name, avatar_url, fluent_languages')
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
                        avatar_url: payload.avatar_url,
                        timestamp: Date.now()
                    }
                }));

                setTimeout(() => {
                    setTypingUsers(prev => {
                        const updated = { ...prev };
                        delete updated[payload.user_id];
                        return updated;
                    });
                }, 10000); // 10 seconds for typing
            })
            .on('broadcast', { event: 'recording' }, ({ payload }) => {
                if (payload.user_id === user.id) return;

                setRecordingUsers(prev => ({
                    ...prev,
                    [payload.user_id]: {
                        display_name: payload.display_name,
                        avatar_url: payload.avatar_url,
                        timestamp: Date.now()
                    }
                }));

                setTimeout(() => {
                    setRecordingUsers(prev => {
                        const updated = { ...prev };
                        delete updated[payload.user_id];
                        return updated;
                    });
                }, 5000);
            })
            .on('broadcast', { event: 'recording_stop' }, ({ payload }) => {
                if (payload.user_id === user.id) return;
                setRecordingUsers(prev => {
                    const updated = { ...prev };
                    delete updated[payload.user_id];
                    return updated;
                });
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_challenges',
                filter: `group_id=eq.${groupId}`
            }, async (payload) => {
                // New challenge added - reload challenges
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
            const { data: group } = await supabase
                .from('app_groups')
                .select('name, member_count, language')
                .eq('id', groupId)
                .single();

            if (group) {
                setGroupName(group.name);
                setMemberCount(group.member_count || 0);
                setGroupLanguage(group.language || '');
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
                        sender:app_users!sender_id(display_name, avatar_url, fluent_languages)
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
            sender: {
                display_name: userProfile?.display_name || user.user_metadata?.display_name || 'Me',
                avatar_url: userProfile?.avatar_url,
                fluent_languages: userProfile?.fluent_languages || []
            }
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
            Alert.alert(
                'Message Failed',
                'Could not send message. Please check your connection and try again.',
                [{ text: 'OK' }]
            );
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            setTextInput(messageText);
        } finally {
            setSending(false);
        }
    };

    const handleSendVoice = async () => {
        const uri = await handleStopRecording();
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
            Alert.alert(
                'Voice Message Failed',
                'Could not upload voice message. Please check your connection and try again.',
                [{ text: 'OK' }]
            );
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
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
                    avatar_url: userProfile?.avatar_url
                }
            });
        }
    };

    const scrollToBottom = () => {
        // For inverted list, offset 0 is the bottom (most recent)
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
        // Check for recording first, then typing
        const recordingIds = Object.keys(recordingUsers);
        const typingIds = Object.keys(typingUsers);

        if (recordingIds.length === 0 && typingIds.length === 0) return null;

        const isRecording = recordingIds.length > 0;
        const firstUser = isRecording ? recordingUsers[recordingIds[0]] : typingUsers[typingIds[0]];

        return (
            <View style={styles.typingIndicator}>
                {/* Avatar */}
                <View style={styles.typingAvatarContainer}>
                    {firstUser.avatar_url ? (
                        <Image source={{ uri: firstUser.avatar_url }} style={styles.typingAvatar} />
                    ) : (
                        <View style={[styles.typingAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {firstUser.display_name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Animated dots or mic */}
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

            <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={30} color={Colors.primary} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{groupName}</Text>
                        <Text style={styles.headerSubtitle}>{memberCount} members</Text>
                    </View>

                    {groupLanguage?.toLowerCase() === 'french' && (
                        <Pressable
                            style={styles.nativeButton}
                            onPress={() => router.push('/native-speakers?language=French')}
                        >
                            <Text style={styles.nativeButtonText}>💬 Chat with a Native</Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={styles.headerAction}
                        onPress={() => router.push(`/group-info?id=${groupId}`)}
                    >
                        <MoreVertical size={24} color={Colors.primary} />
                    </Pressable>
                </View>
            </BlurView>

            {visibleChallenge && (
                <View style={[styles.challengeBanner, { top: insets.top + 65 }]}>
                    <Text style={styles.challengeHashtag}>#challenge</Text>
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
                    inverted={true}
                    initialScrollIndex={0}
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingTop: 20, paddingBottom: insets.top + (currentChallenge ? 130 : 70) }
                    ]}
                    onViewableItemsChanged={({ viewableItems }) => {
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
                            <Pressable onPress={handleCancelRecording} style={styles.cancelButton}>
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
                                    <Send size={24} color="#fff" />
                                </Pressable>
                            ) : (
                                <View style={styles.micContainer}>
                                    <Pressable onPress={startRecording} style={styles.micButton}>
                                        <Mic size={26} color={Colors.primary} />
                                    </Pressable>
                                    <Text style={styles.tapHint}>Tap to record</Text>
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
    nativeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#19b091',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    nativeButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    challengeBanner: {
        position: 'absolute',
        top: 105,
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
    challengeHashtag: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        marginBottom: 6,
    },
    challengeText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#000',
        fontWeight: '500',
        paddingLeft: 12,
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
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: '75%',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    bubbleVoice: {
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    bubbleMe: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 6,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 6,
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
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 4,
    },
    typingAvatarContainer: {
        marginRight: 8,
    },
    typingAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    typingBubble: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8E8E93',
    },
    dot1: {
        opacity: 0.4,
    },
    dot2: {
        opacity: 0.6,
    },
    dot3: {
        opacity: 0.8,
    },
    inputContainer: {
        backgroundColor: SOUP_COLORS.cream,
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
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: '#000',
    },
    micContainer: {
        alignItems: 'center',
        gap: 2,
    },
    micButton: {
        padding: 8,
    },
    tapHint: {
        fontSize: 9,
        color: Colors.textLight,
        fontWeight: '500',
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
        height: 42,
        backgroundColor: 'rgba(0, 173, 239, 0.04)',
        borderRadius: 21,
        overflow: 'hidden',
        paddingHorizontal: 12,
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
