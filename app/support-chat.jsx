import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Send, Mic, Trash2, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AudioMessage } from '../components/AudioMessage';
import { LiveAudioWaveform } from '../components/LiveAudioWaveform';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { Colors } from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    green: '#2ecc71',
};

// Date separator helper
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

export default function SupportChatScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const {
        isRecording,
        metering,
        startRecording,
        stopRecording,
        cancelRecording
    } = useVoiceRecorder();

    useEffect(() => {
        loadMessages();

        const channel = supabase
            .channel('support-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_messages',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                // Replace temp optimistic message with real one, or add if new
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.id.startsWith('temp-'));
                    return [...filtered, payload.new];
                });
                scrollToBottom();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user.id]);

    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error loading support messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const sendTextMessage = async () => {
        if (!inputText.trim()) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        // Optimistic update
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            content: messageText,
            from_admin: false,
            message_type: 'text',
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            await supabase.from('app_support_messages').insert({
                user_id: user.id,
                content: messageText,
                from_admin: false,
                message_type: 'text'
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setInputText(messageText);
        } finally {
            setSending(false);
        }
    };

    const sendVoiceMessage = async () => {
        if (!isRecording) {
            await startRecording();
        } else {
            const recording = await stopRecording();
            if (recording?.uri) {
                await uploadVoiceMessage(recording.uri, recording.duration);
            }
        }
    };

    const uploadVoiceMessage = async (uri, duration) => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const filePath = `support/${user.id}/voice-${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filePath, decode(base64), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(filePath);

            await supabase.from('app_support_messages').insert({
                user_id: user.id,
                content: '',
                from_admin: false,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: Math.round(duration / 1000)
            });
        } catch (error) {
            console.error('Error uploading voice message:', error);
        }
    };

    const renderItem = ({ item }) => {
        if (item.type === 'date_separator') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateLabel}>{item.label}</Text>
                    <View style={styles.dateLine} />
                </View>
            );
        }

        const isFromAdmin = item.from_admin;
        const formatTime = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        };

        return (
            <View style={[styles.messageRow, isFromAdmin ? styles.rowThem : styles.rowMe]}>
                {isFromAdmin && (
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>N</Text>
                        </View>
                    </View>
                )}

                <View style={[
                    styles.bubble,
                    item.message_type === 'voice' && styles.bubbleVoice,
                    isFromAdmin ? styles.bubbleThem : styles.bubbleMe,
                ]}>
                    {isFromAdmin && (
                        <Text style={styles.senderName}>Noah</Text>
                    )}

                    {item.message_type === 'voice' ? (
                        <AudioMessage
                            audioUrl={item.media_url}
                            duration={item.duration_seconds}
                            senderName={isFromAdmin ? 'Noah' : 'You'}
                            isMe={!isFromAdmin}
                        />
                    ) : (
                        <Text style={[styles.messageText, !isFromAdmin && styles.messageTextMe]}>
                            {item.content}
                        </Text>
                    )}
                </View>
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color={SOUP_COLORS.blue} />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>Get Help</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Usually responds in a few hours</Text>
                    </View>
                </View>
            </View>

            <View style={styles.noticeBar}>
                <Text style={styles.noticeText}>
                    hey! i'm noah, i check messages 3x daily (morning, afternoon, evening). usually respond within a few hours 🍜
                </Text>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messagesWithDates}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingBottom: 20 }
                    ]}
                    onContentSizeChange={() => scrollToBottom()}
                    ListHeaderComponent={
                        <View style={styles.welcomeMessage}>
                            <Text style={styles.welcomeEmoji}>👋</Text>
                            <Text style={styles.welcomeTitle}>Need help?</Text>
                            <Text style={styles.welcomeText}>
                                I'm here to help with anything about Language Soup!
                            </Text>
                        </View>
                    }
                />

                {/* Input Area */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                    {isRecording ? (
                        <View style={styles.recordingBar}>
                            <Pressable onPress={cancelRecording} style={styles.cancelButton}>
                                <Trash2 size={22} color="#FF3B30" />
                            </Pressable>

                            <View style={styles.waveformContainer}>
                                <LiveAudioWaveform metering={metering} isRecording={isRecording} />
                            </View>

                            <Pressable onPress={sendVoiceMessage} style={styles.sendVoiceButton}>
                                <Send size={20} color="#fff" />
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Type a message..."
                                placeholderTextColor="#8E8E93"
                                multiline
                                maxLength={500}
                            />

                            {inputText.trim() ? (
                                <Pressable onPress={sendTextMessage} style={styles.sendButton}>
                                    <Send size={20} color="#fff" />
                                </Pressable>
                            ) : (
                                <Pressable onPress={sendVoiceMessage} style={styles.micButton}>
                                    <Mic size={22} color={SOUP_COLORS.blue} />
                                </Pressable>
                            )}
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    keyboardView: {
        flex: 1,
    },

    // Header
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    backButton: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.green, // Assuming green exists or hardcode #34C759
        marginRight: 4,
    },
    statusText: {
        fontSize: 11,
        color: '#636e72',
        fontWeight: '500',
    },
    noticeBar: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    noticeText: {
        fontSize: 13,
        color: '#636e72',
        lineHeight: 18,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 1,
    },
    knownIssuesButton: {
        padding: 4,
        width: 30,
        alignItems: 'center',
    },

    // Messages
    messagesList: {
        paddingHorizontal: 16,
    },
    welcomeMessage: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 16,
    },
    welcomeEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },

    // Date Separator
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    dateLabel: {
        paddingHorizontal: 12,
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '600',
    },

    // Message Rows
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
    },
    rowMe: {
        justifyContent: 'flex-end',
    },
    rowThem: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Bubbles
    bubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: 18,
    },
    bubbleMe: {
        backgroundColor: SOUP_COLORS.blue,
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
    },
    bubbleVoice: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    senderName: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 21,
    },
    messageTextMe: {
        color: '#fff',
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: '#fff',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    input: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${SOUP_COLORS.blue}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Recording
    recordingBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cancelButton: {
        padding: 8,
    },
    waveformContainer: {
        flex: 1,
    },
    sendVoiceButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
