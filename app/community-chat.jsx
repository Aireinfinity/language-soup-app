import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, TextInput, KeyboardAvoidingView, Platform, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Send, Mic, X, Trash2, ChevronLeft, Users, Megaphone } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioMessage } from '../components/AudioMessage';
import { LiveAudioWaveform } from '../components/LiveAudioWaveform';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
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

    const avatarElement = (
        <View style={[styles.avatarContainer, isMe && styles.avatarContainerMe]}>
            {message.user?.avatar_url ? (
                <Image source={{ uri: message.user.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                        {message.user?.display_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
            )}
        </View>
    );

    const bubbleElement = (
        <View style={[
            styles.bubble,
            message.message_type === 'voice' && styles.bubbleVoice,
            isMe ? styles.bubbleMe : styles.bubbleThem,
        ]}>
            {!isMe && message.user && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.senderName}>{message.user.display_name}</Text>
                    {message.user.fluent_languages && message.user.fluent_languages.slice(0, 2).map((lang, idx) => (
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

            {/* Show languages for Me too */}
            {isMe && message.user && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'flex-end' }}>
                    {message.user.fluent_languages && message.user.fluent_languages.slice(0, 2).map((lang, idx) => (
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
                    senderName={message.user?.display_name}
                    isMe={isMe}
                />
            ) : (
                <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {message.content}
                </Text>
            )}
        </View>
    );

    return (
        <View style={[styles.messageRow, isMe ? styles.rowMe : styles.rowThem]}>
            {/* For sent messages (isMe), show bubble first then avatar on right */}
            {/* For received messages, show avatar first then bubble */}
            {isMe ? (
                <>
                    {bubbleElement}
                    {avatarElement}
                </>
            ) : (
                <>
                    {avatarElement}
                    {bubbleElement}
                </>
            )}
        </View>
    );
}

export default function CommunityChatScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const flatListRef = useRef(null);
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [userProfile, setUserProfile] = useState(null);

    // Fetch my own full profile to show my languages in optimistic updates
    useEffect(() => {
        if (user) {
            supabase.from('app_users')
                .select('display_name, avatar_url, fluent_languages')
                .eq('id', user.id)
                .single()
                .then(({ data }) => setUserProfile(data));
        }
    }, [user]);

    const {
        isRecording,
        metering,
        startRecording,
        stopRecording,
        cancelRecording
    } = useVoiceRecorder();

    useEffect(() => {
        loadData();
        const unsubscribe = subscribeToMessages();
        return unsubscribe;
    }, []);

    useEffect(() => {
        // Scroll to bottom whenever messages change
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }
    }, [messages]);

    const loadData = async () => {
        try {
            // Load messages raw
            const { data: msgData, error } = await supabase
                .from('app_community_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) {
                console.error('Error loading msgs:', error);
                return;
            }

            if (!msgData || msgData.length === 0) {
                setMessages([]);
                return;
            }

            // Collect user IDs
            const userIds = [...new Set(msgData.map(m => m.user_id).filter(Boolean))];

            // Fetch users
            const { data: usersData } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url, fluent_languages')
                .in('id', userIds);

            // Map users to messages
            const userMap = {};
            usersData?.forEach(u => {
                userMap[u.id] = u;
            });

            const formatted = msgData.map(msg => ({
                ...msg,
                user: userMap[msg.user_id] || { display_name: 'Unknown', avatar_url: null, fluent_languages: [] }
            }));

            setMessages(formatted);

            // Load announcements
            const { data: announcementData } = await supabase
                .from('app_community_announcements')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(3);
            setAnnouncements(announcementData || []);

            // Get member count
            const { count } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true });
            setMemberCount(count || 0);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel('community-chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'app_community_messages' },
                async (payload) => {
                    if (payload.new.user_id === user?.id) return;

                    const { data: userData } = await supabase
                        .from('app_users')
                        .select('display_name, avatar_url, fluent_languages')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMessage = { ...payload.new, user: userData };
                    setMessages(prev => [...prev, newMessage]);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const sendTextMessage = async () => {
        if (!inputText.trim() || sending) return;

        setSending(true);
        const text = inputText.trim();
        setInputText('');

        // Optimistic update
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            content: text,
            message_type: 'text',
            created_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            user: {
                display_name: userProfile?.display_name || user.user_metadata?.display_name || 'Me',
                avatar_url: userProfile?.avatar_url || null,
                fluent_languages: userProfile?.fluent_languages || []
            }
        };
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            await supabase.from('app_community_messages').insert({
                user_id: user.id,
                content: text,
                message_type: 'text'
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setInputText(text);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
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
            const filePath = `community/${user.id}/voice-${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filePath, decode(base64), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(filePath);

            await supabase.from('app_community_messages').insert({
                user_id: user.id,
                content: '',
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

        // System message (announcement)
        if (item.type === 'announcement') {
            return (
                <View style={styles.systemMessage}>
                    <Megaphone size={14} color={SOUP_COLORS.pink} />
                    <Text style={styles.systemText}>{item.content}</Text>
                </View>
            );
        }

        return (
            <MessageBubble
                message={item}
                isMe={item.user_id === user?.id}
            />
        );
    };

    // Find and scroll to announcement message in the chat
    const scrollToAnnouncementMessage = (announcementId) => {
        const messagesWithDates = addDateSeparators(messages);
        // Find message that is the announcement (by matching content or id)
        const announcement = announcements.find(a => a.id === announcementId);
        if (!announcement) return;

        // Find the message index that contains the announcement content
        const messageIndex = messagesWithDates.findIndex(msg =>
            msg.message_type === 'announcement' ||
            (msg.content && msg.content === announcement.content)
        );

        if (messageIndex >= 0 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: messageIndex, animated: true });
        }
    };

    // Just add date separators, no announcements mixed in
    const getMessagesWithDates = () => {
        return addDateSeparators(messages);
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

            {/* Header */}
            <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={30} color={Colors.primary} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>🌍 Community</Text>
                        <Text style={styles.headerSubtitle}>{memberCount} members</Text>
                    </View>

                    <View style={{ width: 30 }} />
                </View>
            </BlurView>

            {/* Announcement Banner - Tap to view on Community tab */}
            {announcements.length > 0 && (
                <Pressable
                    style={[styles.announcementBanner, { top: insets.top + 65 }]}
                    onPress={() => router.back()}
                >
                    <Megaphone size={16} color={SOUP_COLORS.pink} />
                    <Text style={styles.announcementBannerText} numberOfLines={2}>
                        {announcements[0].content}
                    </Text>
                    <Text style={styles.tapToViewText}>TAP TO VIEW</Text>
                </Pressable>
            )}

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={[...addDateSeparators(messages)].reverse()}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    inverted
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingBottom: insets.top + (announcements.length > 0 ? 130 : 70), paddingTop: 20 }
                    ]}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>👋</Text>
                            <Text style={styles.emptyTitle}>Welcome to the Community!</Text>
                            <Text style={styles.emptyText}>Say hi to fellow language learners</Text>
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
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 1,
    },

    // Announcement Banner
    announcementBanner: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 99,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: `${SOUP_COLORS.pink}15`,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: `${SOUP_COLORS.pink}30`,
    },
    announcementBannerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
        lineHeight: 20,
    },
    tapToViewText: {
        fontSize: 9,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        opacity: 0.7,
        marginLeft: 8,
    },

    // Messages
    messagesList: {
        paddingHorizontal: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#8E8E93',
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

    // System Message (Announcement)
    systemMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: `${SOUP_COLORS.pink}15`,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    systemText: {
        fontSize: 13,
        color: SOUP_COLORS.pink,
        fontWeight: '600',
        flex: 1,
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
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    avatarContainerMe: {
        marginRight: 0,
        marginLeft: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
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
        padding: 14,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    bubbleMe: {
        backgroundColor: SOUP_COLORS.blue,
        borderBottomRightRadius: 6,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 6,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    bubbleVoice: {
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        marginBottom: 5,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 22,
    },
    messageTextMe: {
        color: '#fff',
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 3,
    },
    input: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 11,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    micButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
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
