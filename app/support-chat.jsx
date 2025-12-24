import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, StatusBar, Image, Alert } from 'react-native';
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
import { MessageBubble } from '../components/MessageBubble';
import { ChatStyles } from '../constants/ChatStyles';
import { SharedChatUI } from '../components/SharedChatUI';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useQuests } from '../contexts/QuestContext';

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
    const [reactions, setReactions] = useState({}); // { messageId: [{ user_id, reaction, created_at }] }
    const { completeQuest } = useQuests();

    const {
        isRecording,
        recordingDuration,
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
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_support_messages',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                // Handle message edit s and deletes
                setMessages(prev => prev.map(msg =>
                    msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                ));
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_reactions',
            }, (payload) => {
                setReactions(prev => {
                    const messageId = payload.new.message_id;
                    const existing = prev[messageId] || [];
                    return { ...prev, [messageId]: [...existing, payload.new] };
                });
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'app_support_reactions',
            }, (payload) => {
                setReactions(prev => {
                    const messageId = payload.old.message_id;
                    const existing = prev[messageId] || [];
                    return { ...prev, [messageId]: existing.filter(r => r.id !== payload.old.id) };
                });
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

            // Load reactions
            if (data && data.length > 0) {
                const messageIds = data.map(m => m.id);
                const { data: reactionsData } = await supabase
                    .from('app_support_reactions')
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
            }

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

            // Complete quest for sending bug report
            await completeQuest('send_bug');

            // Check if message contains language request keywords
            const lowerMessage = messageText.toLowerCase();
            if (lowerMessage.includes('language') && (lowerMessage.includes('request') || lowerMessage.includes('add') || lowerMessage.includes('new'))) {
                await completeQuest('request_language');
            }
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
                .from('voice-memos')
                .upload(filePath, decode(base64), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
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

    const sendImageMessage = async (media) => {
        // Handle both old format (string) and new format (object)
        const imageUri = typeof media === 'string' ? media : media.uri;
        const mediaType = typeof media === 'string' ? 'image' : (media.type || 'image');
        const caption = typeof media === 'string' ? '' : (media.caption || '');

        console.log('[Support Media] Starting upload for:', { imageUri, mediaType, caption });
        try {
            console.log('[Support Media] Reading as base64...');
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            console.log('[Support Media] Base64 length:', base64.length);

            const extension = mediaType === 'video' ? 'mp4' : 'jpg';
            const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
            const fileName = `support/${user.id}/${mediaType}_${Date.now()}.${extension}`;

            console.log('[Support Media] Uploading to:', fileName);
            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(fileName, decode(base64), { contentType });

            if (uploadError) {
                console.error('[Support Media] Upload error:', uploadError);
                throw uploadError;
            }

            console.log('[Support Media] Getting public URL...');
            const { data: { publicUrl } } = supabase.storage
                .from('voice-memos')
                .getPublicUrl(fileName);

            console.log('[Support Media] Public URL:', publicUrl);
            console.log('[Support Media] Inserting into database...');

            const { data, error: insertError } = await supabase.from('app_support_messages').insert({
                user_id: user.id,
                content: caption || '',
                from_admin: false,
                message_type: mediaType,
                media_url: publicUrl,
            }).select();

            if (insertError) {
                console.error('[Support Media] Database error:', insertError);
                throw insertError;
            }

            console.log('[Support Media] Success! Data:', data);
        } catch (error) {
            console.error('[Support Media] Complete error:', error);
            Alert.alert(`${mediaType === 'video' ? 'Video' : 'Image'} Failed`, `Could not upload ${mediaType}.`);
        }
    };

    // Handle reaction toggle
    const handleReact = async (messageId, emoji) => {
        if (!user) return;

        const messageReactions = reactions[messageId] || [];
        const existingReaction = messageReactions.find(
            r => r.user_id === user.id && r.emoji === emoji
        );

        if (existingReaction) {
            await supabase
                .from('app_support_reactions')
                .delete()
                .eq('id', existingReaction.id);
        } else {
            await supabase
                .from('app_support_reactions')
                .insert({
                    message_id: messageId,
                    user_id: user.id,
                    emoji: emoji  // Changed from 'reaction' to 'emoji'
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
                chatType="support"
                tableName="app_support_messages"
                reactionsTable="app_support_reactions"
                messages={messagesWithDates}
                loading={loading}
                onSendText={sendTextMessage}
                onSendVoice={sendVoiceMessage}
                onPickImage={sendImageMessage}
                textInput={inputText}
                onTextChange={setInputText}
                sending={sending}
                headerComponent={
                    <BlurView intensity={95} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
                        <View style={styles.headerContent}>
                            <Pressable onPress={() => router.back()} style={styles.iconButton}>
                                <ChevronLeft size={28} color={SOUP_COLORS.blue} />
                            </Pressable>
                            <View style={styles.headerInfo}>
                                <Text style={styles.headerTitle}>Support</Text>
                                <View style={styles.dot} />
                                <Text style={styles.headerSubtitle}>Noah</Text>
                            </View>
                        </View>
                    </BlurView>
                }
                bannerComponent={null}
                placeholderText="Type a message..."
                showLanguageFlags={false}
                senderKey="sender"
                isRecording={isRecording}
                recordingDuration={recordingDuration}
                metering={metering}
                onStartRecording={startRecording}
                onCancelRecording={cancelRecording}
                onSendRecording={sendVoiceMessage}
                typingIndicatorComponent={null}
                flatListRef={flatListRef}
                userId={user?.id}
                contentContainerStyle={[ChatStyles.messagesList, { paddingTop: 20, paddingBottom: insets.top + 80 }]}
                inverted={true}
                reactions={reactions}
                onReact={handleReact}
                groupName="Support"
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
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
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
        textAlign: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 3,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#34C759',
        marginRight: 5,
    },
    statusText: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    noticeBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        gap: 12,
    },
    noticeEmoji: {
        fontSize: 32,
    },
    noticeContent: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        marginBottom: 2,
    },
    noticeText: {
        fontSize: 13,
        color: '#636e72',
        lineHeight: 18,
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
