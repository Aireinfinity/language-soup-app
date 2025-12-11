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
import { MessageBubble } from '../components/MessageBubble';
import { ChatStyles } from '../constants/ChatStyles';
import { SharedChatUI } from '../components/SharedChatUI';
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
        recordingDuration,
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
                    // Don't skip our own messages - we want to see them!
                    // Fetch user data for the new message
                    const { data: userData } = await supabase
                        .from('app_users')
                        .select('display_name, avatar_url, fluent_languages')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg = {
                        ...payload.new,
                        user: userData || { display_name: 'Unknown', avatar_url: null, fluent_languages: [] }
                    };

                    setMessages(prev => {
                        // Remove temp message if it exists
                        const filtered = prev.filter(m => !m.id.startsWith('temp-'));
                        return [...filtered, newMsg];
                    });
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
        console.log('[Community Voice] sendVoiceMessage called, isRecording:', isRecording);
        if (!isRecording) {
            console.log('[Community Voice] Starting recording...');
            await startRecording();
        } else {
            console.log('[Community Voice] Stopping recording...');
            const recording = await stopRecording();
            console.log('[Community Voice] Recording stopped, result:', recording);
            if (recording?.uri) {
                console.log('[Community Voice] Uploading voice message...');
                await uploadVoiceMessage(recording.uri, recording.duration);
            } else {
                console.log('[Community Voice] ERROR: No recording URI!');
            }
        }
    };

    const uploadVoiceMessage = async (uri, duration) => {
        // Create optimistic message
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            user_id: user.id,
            content: '',
            message_type: 'voice',
            media_url: uri, // Temporarily show local URI
            duration_seconds: Math.round(duration / 1000),
            created_at: new Date().toISOString(),
            user: userProfile
        };

        // Add optimistically to UI
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            console.log('[Community Voice] uploadVoiceMessage called with:', { uri, duration });
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            console.log('[Community Voice] File read, base64 length:', base64.length);

            const filePath = `community/${user.id}/voice-${Date.now()}.m4a`;
            console.log('[Community Voice] Uploading to:', filePath);

            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(filePath, decode(base64), { contentType: 'audio/m4a' });

            if (uploadError) {
                console.log('[Community Voice] Upload error:', uploadError);
                throw uploadError;
            }

            console.log('[Community Voice] Upload successful, getting public URL...');
            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(filePath);

            console.log('[Community Voice] Public URL:', publicUrl);
            console.log('[Community Voice] Inserting into database...');

            const { data, error } = await supabase.from('app_community_messages').insert({
                user_id: user.id,
                content: publicUrl, // Store URL in content field
                message_type: 'voice'
            }).select();

            if (error) {
                console.log('[Community Voice] Database insert error:', error);
                throw error;
            }

            console.log('[Community Voice] Voice message sent successfully!', data);

            // Don't remove optimistic message - let realtime subscription replace it
            // setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        } catch (error) {
            console.error('[Community Voice] Error uploading voice message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
    };

    const renderItem = ({ item }) => {
        if (item.type === 'date_separator') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={styles.dateSeparatorBadge}>
                        <Text style={styles.dateSeparatorText}>{item.label}</Text>
                    </View>
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
                showLanguageFlags={true}
                senderKey="user"
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

    const messagesWithDates = [...addDateSeparators(messages)].reverse();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <SharedChatUI
                messages={messagesWithDates}
                loading={loading}
                onSendText={sendTextMessage}
                onSendVoice={sendVoiceMessage}
                textInput={inputText}
                onTextChange={setInputText}
                sending={sending}
                headerComponent={
                    <BlurView intensity={95} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                        <View style={styles.headerContent}>
                            <Pressable onPress={() => router.back()} style={styles.backButton}>
                                <ChevronLeft size={28} color={Colors.primary} />
                            </Pressable>
                            <View style={styles.headerInfo}>
                                <Text style={styles.headerTitle}>Community</Text>
                                <View style={styles.memberBadge}>
                                    <Users size={12} color={Colors.textLight} />
                                    <Text style={styles.memberCount}>{memberCount} members</Text>
                                </View>
                            </View>
                        </View>
                    </BlurView>
                }
                bannerComponent={
                    announcements.length > 0 && latestAnnouncement && (
                        <Pressable
                            style={[styles.announcementBanner, { top: insets.top + 65 }]}
                            onPress={() => scrollToAnnouncementMessage(latestAnnouncement.id)}
                        >
                            <BlurView intensity={95} tint="light" style={styles.announcementBlur}>
                                <Megaphone size={18} color={SOUP_COLORS.pink} />
                                <View style={styles.announcementText}>
                                    <Text style={styles.announcementTitle}>Announcement</Text>
                                    <Text style={styles.announcementPreview} numberOfLines={1}>
                                        {latestAnnouncement.content}
                                    </Text>
                                </View>
                            </BlurView>
                        </Pressable>
                    )
                }
                placeholderText="Message the community..."
                showLanguageFlags={true}
                senderKey="user"
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                metering={metering}
                onStartRecording={startRecording}
                onCancelRecording={cancelRecording}
                onSendRecording={sendVoiceMessage}
                typingIndicatorComponent={null}
                flatListRef={flatListRef}
                userId={user?.id}
                contentContainerStyle={[ChatStyles.messagesList, { paddingBottom: insets.top + (announcements.length > 0 ? 130 : 70), paddingTop: 20 }]}
                inverted={true}
            />
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
        marginBottom: 4,
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
