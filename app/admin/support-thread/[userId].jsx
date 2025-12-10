import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send, Mic, Trash2, Edit3 } from 'lucide-react-native';
import TicketModal from '../../../components/TicketModal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { AudioMessage } from '../../../components/AudioMessage';
import { LiveAudioWaveform } from '../../../components/LiveAudioWaveform';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder';
import { Colors } from '../../../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
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

export default function AdminSupportThreadScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef(null);

    const [modalVisible, setModalVisible] = useState(false);

    const [messages, setMessages] = useState([]);
    const [threadUser, setThreadUser] = useState(null);
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
        loadThreadData();

        const channel = supabase
            .channel(`support-thread-${userId}`)
            .on('postgres_changes', {
                event: '*', // Listen to INSERT and UPDATE
                schema: 'public',
                table: 'app_support_messages',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Deduplicate by ID
                    if (!messages.find(m => m.id === payload.new.id)) {
                        setMessages(prev => {
                            if (prev.find(m => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                        scrollToBottom();
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    // Also update threadUser if tagging changed? No, tagging is on message.
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [userId]);

    const loadThreadData = async () => {
        try {
            // Get user info
            const { data: userData } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url')
                .eq('id', userId)
                .single();
            setThreadUser(userData);

            // Get messages
            const { data: msgData } = await supabase
                .from('app_support_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            setMessages(msgData || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error loading thread data:', error);
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
            user_id: userId,
            content: messageText,
            from_admin: true,
            message_type: 'text',
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            const { data, error } = await supabase.from('app_support_messages').insert({
                user_id: userId,
                content: messageText,
                from_admin: true,
                message_type: 'text'
            }).select().single();

            if (error) throw error;

            // Replace optimistic message with real one
            setMessages(prev => prev.map(m =>
                m.id === optimisticMsg.id ? data : m
            ));
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
            const filePath = `support/admin/voice-${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filePath, decode(base64), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(filePath);

            await supabase.from('app_support_messages').insert({
                user_id: userId,
                content: '',
                from_admin: true,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: Math.round(duration / 1000)
            });
        } catch (error) {
            console.error('Error uploading voice message:', error);
        }
    };

    const updateThreadStatus = async (priority, status, category = null) => {
        try {
            // We need to update the LATEST message from this user to tag the thread?
            // Actually, the dashboard query groups by user_id and grabs *some* message. 
            // The DB schema says `app_support_messages` has these columns.
            // Ideally we'd have a `support_tickets` table, but we embedded metadata on messages.
            // So we update the MOST RECENT message from this user to tag the "thread".
            // Or better: update ALL messages? Or just the last one?
            // "Ticket" concept is loose. Updating the last message works for the dashboard query.

            // First find last message ID
            const { data: lastMsg } = await supabase
                .from('app_support_messages')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastMsg) {
                // If it's a full update from modal
                if (typeof priority === 'object') {
                    const formData = priority; // It's actually the object passed from modal
                    await supabase
                        .from('app_support_messages')
                        .update({
                            priority: formData.priority,
                            status: formData.status,
                            category: formData.category,
                            title: formData.title,
                            public_visible: formData.public_visible
                        })
                        .eq('id', lastMsg.id);
                } else {
                    // Quick Action
                    const updatePayload = { priority, status };
                    if (category) updatePayload.category = category;

                    await supabase
                        .from('app_support_messages')
                        .update(updatePayload)
                        .eq('id', lastMsg.id);
                }

                // Refresh local data to show new status?
                // The subscription might not catch UPDATEs if I only listen to INSERT.
                // I need to listen to UPDATE too.
            }
        } catch (error) {
            console.error('Error updating status:', error);
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

        return (
            <View style={[styles.messageRow, isFromAdmin ? styles.rowMe : styles.rowThem]}>
                {!isFromAdmin && (
                    <View style={styles.avatarContainer}>
                        {threadUser?.avatar_url ? (
                            <Image source={{ uri: threadUser.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {threadUser?.display_name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[
                    styles.bubble,
                    item.message_type === 'voice' && styles.bubbleVoice,
                    isFromAdmin ? styles.bubbleMe : styles.bubbleThem,
                ]}>
                    {!isFromAdmin && (
                        <Text style={styles.senderName}>{threadUser?.display_name || 'User'}</Text>
                    )}

                    {item.message_type === 'voice' ? (
                        <AudioMessage
                            audioUrl={item.media_url}
                            duration={item.duration_seconds}
                            senderName={isFromAdmin ? 'You' : threadUser?.display_name}
                            isMe={isFromAdmin}
                        />
                    ) : (
                        <Text style={[styles.messageText, isFromAdmin && styles.messageTextMe]}>
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <SafeAreaView style={styles.header} edges={['top']}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={30} color={SOUP_COLORS.blue} />
                    </Pressable>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{threadUser?.display_name || 'User'}</Text>
                        <Text style={styles.headerSubtitle}>Support Thread</Text>
                    </View>

                    <View style={{ width: 30 }} />
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Pressable
                        style={styles.createTicketButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Edit3 size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.createTicketText}>Create Ticket</Text>
                    </Pressable>
                </View>

                <TicketModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSubmit={updateThreadStatus}
                    initialData={messages.length > 0 ? messages[messages.length - 1] : null}
                // Pass last message as initial data to edit its tags
                />
            </SafeAreaView>

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
                        { paddingTop: 20, paddingBottom: 20 }
                    ]}
                    onContentSizeChange={() => scrollToBottom()}
                />

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
                                placeholder="Reply as admin..."
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
    container: { flex: 1, backgroundColor: SOUP_COLORS.cream },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    keyboardView: { flex: 1 },
    container: { flex: 1, backgroundColor: SOUP_COLORS.cream },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    keyboardView: { flex: 1 },
    header: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },

    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    backButton: { padding: 4 },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
    headerSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
    messagesList: { paddingHorizontal: 16 },
    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
    dateLabel: { paddingHorizontal: 12, fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    rowMe: { justifyContent: 'flex-end' },
    rowThem: { justifyContent: 'flex-start' },
    avatarContainer: { marginRight: 8 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: { backgroundColor: SOUP_COLORS.blue, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
    bubbleMe: { backgroundColor: SOUP_COLORS.pink, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    bubbleVoice: { paddingVertical: 8, paddingHorizontal: 12 },
    senderName: { fontSize: 12, fontWeight: '600', color: SOUP_COLORS.blue, marginBottom: 4 },
    messageText: { fontSize: 16, color: '#000', lineHeight: 21 },
    messageTextMe: { color: '#fff' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
    input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, marginRight: 8 },
    sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: SOUP_COLORS.pink, justifyContent: 'center', alignItems: 'center' },
    micButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${SOUP_COLORS.pink}20`, justifyContent: 'center', alignItems: 'center' },
    recordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cancelButton: { padding: 8 },
    waveformContainer: { flex: 1 },
    sendVoiceButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: SOUP_COLORS.pink, justifyContent: 'center', alignItems: 'center' },
    createTicketButton: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        flex: 1,
        justifyContent: 'center',
    },
    createTicketText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
