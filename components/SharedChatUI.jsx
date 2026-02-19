import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import AnimatedReanimated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { MessageBubble } from './MessageBubble';
import { ImagePreview } from './ImagePreview';
import { ChatInputBar } from './ChatInputBar';
import { ReplyPreview } from './ReplyPreview';
import { SkeletonMessageBubble, SKELETON_IDS } from './SkeletonMessageBubble';
import { ReactionViewerModal } from './ReactionViewerModal';
import { ChatStyles, CompactChatOverrides } from '../constants/ChatStyles';
import { WhatsAppChatStyles } from '../constants/WhatsAppChatStyles';
import { Colors } from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * SharedChatUI - Self-Contained Universal Chat Template
 * 
 * ALL interaction logic is handled internally.
 * Edit this component once → all chats update automatically ✨
 * 
 * @param {string} chatType - "group" | "support" | "community"
 * @param {string} tableName - Database table for messages
 * @param {string} reactionsTable - Database table for reactions
 * @param {Array} messages - Array of message objects with date separators
 * @param {boolean} loading - Loading state
 * @param {Function} onSendText - Callback when sending text message
 * @param {Function} onSendVoice - Callback when sending voice message
 * @param {string} textInput - Current text input value
 * @param {Function} onTextChange - Callback when text changes
 * @param {boolean} sending - Is currently sending
 * @param {ReactNode} headerComponent - Custom header component
 * @param {ReactNode} bannerComponent - Custom banner component
 * @param {string} placeholderText - Placeholder for text input
 * @param {boolean} showLanguageFlags - Show language emoji flags in messages
 * @param {string} senderKey - Key to access sender data ('sender' or 'user')
 * @param {boolean} isRecording - Is currently recording voice
 * @param {number} recordingDuration - Recording duration in seconds
 * @param {Array} metering - Audio metering data
 * @param {Function} onStartRecording - Start recording callback
 * @param {Function} onCancelRecording - Cancel recording callback
 * @param {Function} onSendRecording - Send recording callback
 * @param {Object} typingIndicatorComponent - Optional typing indicator component
 * @param {Object} flatListRef - Optional ref to FlatList
 * @param {string} userId - Current user ID
 * @param {Object} reactions - Reactions mapped by message ID
 * @param {Function} onReact - React to message callback
 * @param {string} groupName - Group/chat name for display
 * @param {Function} getMessageGroupLabel - Optional. (message) => string for merged feed: per-message group/language label
 */
export function SharedChatUI({
    chatType, // "group" | "support" | "community"
    tableName, // e.g., "app_messages", "app_support_messages"
    reactionsTable, // e.g., "app_message_reactions"
    messages,
    loading,
    onSendText,
    onSendVoice,
    onPickImage,
    textInput,
    onTextChange,
    sending,
    headerComponent,
    bannerComponent,
    placeholderText,
    showLanguageFlags = false,
    senderKey = "sender",
    isRecording,
    recordingDuration,
    metering,
    onStartRecording,
    onCancelRecording,
    onSendRecording,
    onReleaseRecording,
    typingIndicatorComponent,
    flatListRef,
    userId,
    contentContainerStyle,
    inverted = true,
    reactions = {},
    onReact,
    groupId = null,
    groupName = null,
    groupLanguage = null,
    getMessageGroupLabel = null,
    currentChallenge = null,
    groupMembersReadAt = [], // { user_id, last_read_at }[] for read receipts
    currentUserId = null,
    onAvatarPress,
    onShowInspiration, // New Prop
    onGetTranscript, // (messageId) => Promise<transcript> for voice messages without transcript
    // Voice Preview Props (listen before send)
    previewAudio = null,
    isPlayingPreview = false,
    previewPosition = 0, // 0-1 progress for scrubbing
    onTogglePreview,
    onDiscardPreview,
    onConfirmSend,
    // Pause/Resume Recording
    isPaused = false,
    onPauseRecording,
    onResumeRecording,
    compact = false, // smaller messages so ~5–7 fit (e.g. Language Soup feed)
    theme, // 'whatsapp' = paper bg, simple date sep, light input bar
}) {
    // ========== INTERNAL STATE (Self-Contained) ==========
    const [replyTo, setReplyTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [reactionViewer, setReactionViewer] = useState({ visible: false, reactions: [], users: [] });
    const scrollOffsetRef = useRef(0);
    const prevMessageCountRef = useRef(messages?.length ?? 0);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    // ========== INTERNAL HANDLERS ==========
    const handleReply = (message) => {
        const sender = message[senderKey];
        setReplyTo({
            messageId: message.id,
            content: message.content,
            senderName: sender?.display_name || sender?.username || 'User'
        });
    };

    const handleEdit = (message) => {
        // Don't allow editing deleted messages
        if (message.deleted_at || message.message_type === 'system') {
            return;
        }

        setEditingMessage({
            messageId: message.id,
            originalContent: message.content
        });
        onTextChange(message.content); // Populate input with original text
    };

    const handleDelete = async (messageId) => {
        try {
            const { error } = await supabase
                .from(tableName)
                .update({
                    content: 'This message was deleted',
                    message_type: 'system',
                    deleted_at: new Date().toISOString()
                })
                .eq('id', messageId)
                .eq(senderKey === 'sender' ? 'sender_id' : 'user_id', userId);

            if (error) {
                console.error('[SharedChatUI] Error deleting message:', error);
                Alert.alert('Error', 'Failed to delete message');
            }
        } catch (error) {
            console.error('[SharedChatUI] Delete error:', error);
        }
    };

    const handleReactionPress = async (message, emojiClicked, userIdsOfEmoji) => {
        const { haptics } = require('../utils/haptics');
        haptics.light();

        const allMessageReactions = reactions[message.id] || [];
        if (allMessageReactions.length === 0) return;

        const allUserIds = [...new Set(allMessageReactions.map(r => r.user_id))];
        const { data: users, error } = await supabase
            .from('app_users')
            .select('id, display_name, avatar_url')
            .in('id', allUserIds);

        if (error) {
            console.error('[SharedChatUI] Error fetching reaction users:', error);
            return;
        }

        setTimeout(() => {
            setReactionViewer({
                visible: true,
                reactions: allMessageReactions,
                users: users || []
            });
        }, 100);
    };

    const handleCancelReply = () => {
        setReplyTo(null);
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        onTextChange('');
    };

    // ========== SEND WRAPPER (Handles Edit/Reply) ==========
    const handleSendWrapper = async () => {
        if (!textInput.trim()) return;

        // Handle Edit Mode (handled internally by SharedChatUI)
        if (editingMessage) {
            try {
                const { error } = await supabase
                    .from(tableName)
                    .update({
                        content: textInput.trim(),
                        edited_at: new Date().toISOString()
                    })
                    .eq('id', editingMessage.messageId)
                    .eq(senderKey === 'sender' ? 'sender_id' : 'user_id', userId);

                if (error) throw error;

                // Clear edit state
                setEditingMessage(null);
                onTextChange('');
                try { require('../utils/haptics').haptics.success(); } catch (_) {}
            } catch (error) {
                console.error('[SharedChatUI] Edit error:', error);
                Alert.alert('Error', 'Failed to edit message');
            }
            return;
        }

        // Handle Reply Mode - Pass replyTo data to parent's onSendText
        if (replyTo) {
            await onSendText();
            setReplyTo(null);
            try { require('../utils/haptics').haptics.success(); } catch (_) {}
            return;
        }

        // Regular send
        await onSendText();
        try { require('../utils/haptics').haptics.success(); } catch (_) {}
    };

    const insets = useSafeAreaInsets();
    const internalFlatListRef = useRef(null);
    const listRef = flatListRef ?? internalFlatListRef;
    const [imagePreview, setImagePreview] = useState(null);
    const [mediaType, setMediaType] = useState('image');

    // Dynamic focus/blur for input context
    useEffect(() => {
        if (editingMessage || replyTo) {
            // Optional: small haptic or focus logic
        }
    }, [editingMessage, replyTo]);

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: false,
                quality: 0.8,
                videoMaxDuration: 60,
            });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setImagePreview(asset.uri);
                setMediaType(asset.type || (asset.uri.match(/\.(mp4|mov|m4v)$/i) ? 'video' : 'image'));
            }
        } catch (error) {
            console.error('[SharedChatUI] Error picking image:', error);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Camera access', 'Allow camera access to take a photo.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setImagePreview(result.assets[0].uri);
                setMediaType('image');
            }
        } catch (error) {
            console.error('[SharedChatUI] Error taking photo:', error);
        }
    };

    const handlePhotoPress = () => {
        Alert.alert(
            'Photo',
            'Take a photo or choose from your camera roll',
            [
                { text: 'Take photo', onPress: handleTakePhoto },
                { text: 'Choose from library', onPress: handlePickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSendImage = async (caption) => {
        if (imagePreview && onPickImage) {
            await onPickImage({ uri: imagePreview, type: mediaType, caption });
            setImagePreview(null);
            setMediaType('image');
        }
    };

    const handleCancelImage = () => {
        setImagePreview(null);
        setMediaType('image');
    };

    const skeletonData = useMemo(() => SKELETON_IDS.slice(0, 3).map((id, i) => ({ id, type: 'skeleton', isMe: i % 2 === 1 })), []);

    const voiceMessagesList = useMemo(() => {
        const list = (messages || []).filter((m) => m && m.message_type === 'voice');
        return list.map((m) => ({
            url: m.media_url || m.content,
            durationSeconds: m.duration_seconds ?? (m.duration ? m.duration / 1000 : undefined),
            messageId: m.id,
            senderName: m.sender?.display_name,
            senderAvatar: m.sender?.avatar_url,
            senderStatus: m.sender?.status_text,
            groupName: getMessageGroupLabel ? getMessageGroupLabel(m) : groupName,
            groupId,
        }));
    }, [messages, groupName, groupId, getMessageGroupLabel]);

    useEffect(() => {
        const prev = prevMessageCountRef.current;
        const count = messages?.length ?? 0;
        if (count > prev && scrollOffsetRef.current > 30) {
            setNewMessagesCount((n) => n + (count - prev));
        }
        prevMessageCountRef.current = count;
    }, [messages?.length, loading]);

    const scrollToBottom = () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        setNewMessagesCount(0);
    };

    const isWhatsApp = theme === 'whatsapp';
    const listStyles = isWhatsApp ? WhatsAppChatStyles : ChatStyles;
    const listContentStyle = contentContainerStyle ?? (compact ? [ChatStyles.messagesList, CompactChatOverrides.messagesList] : listStyles.messagesList);

    const renderMessage = ({ item }) => {
        if (item.type === 'skeleton') {
            return <SkeletonMessageBubble isMe={item.isMe} />;
        }
        if (item.type === 'date_separator') {
            const sepStyle = compact ? [ChatStyles.dateSeparator, CompactChatOverrides.dateSeparator] : listStyles.dateSeparator;
            const badgeStyle = compact ? [ChatStyles.dateSeparatorBadge, CompactChatOverrides.dateSeparatorBadge] : listStyles.dateSeparatorBadge;
            const textStyle = compact ? [ChatStyles.dateSeparatorText, CompactChatOverrides.dateSeparatorText] : listStyles.dateSeparatorText;
            return (
                <AnimatedReanimated.View entering={FadeIn.duration(280)} style={sepStyle}>
                    <View style={badgeStyle}>
                        <Text style={textStyle}>{item.label}</Text>
                    </View>
                </AnimatedReanimated.View>
            );
        }

        // Logic to determine if message is from the current user
        let isMe = false;
        if (chatType === 'support') {
            // In support chat, if from_admin is false, it's from the user
            isMe = !item.from_admin;
        } else {
            // In group/community chat, compare IDs
            isMe = item.sender_id === userId || item.user_id === userId;
        }

        const messageReactions = reactions[item.id] || [];
        const perMessageGroupName = getMessageGroupLabel ? getMessageGroupLabel(item) : null;
        const others = (groupMembersReadAt || []).filter((m) => m.user_id !== currentUserId);
        const seen = isMe && item.created_at && others.length > 0 && others.every((m) => new Date(m.last_read_at || 0) >= new Date(item.created_at));
        return (
            <MessageBubble
                message={item}
                isMe={isMe}
                showLanguageFlags={showLanguageFlags}
                senderKey={senderKey}
                reactions={messageReactions}
                onReact={onReact}
                onReactionPress={handleReactionPress}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                groupId={groupId}
                groupName={perMessageGroupName != null ? perMessageGroupName : groupName}
                groupLanguage={groupLanguage}
                onAvatarPress={onAvatarPress}
                onShowInspiration={onShowInspiration}
                onGetTranscript={onGetTranscript}
                currentChallenge={currentChallenge}
                currentUserId={currentUserId ?? userId}
                compact={compact}
                seen={seen}
                voiceMessagesList={voiceMessagesList}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            {/* Custom Header */}
            {headerComponent}

            {/* Custom Banner (Challenge, Announcement, etc) */}
            {bannerComponent}

            {/* Messages List */}
            <FlatList
                ref={listRef}
                data={loading ? skeletonData : messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted={inverted}
                initialScrollIndex={0}
                initialNumToRender={14}
                maxToRenderPerBatch={10}
                windowSize={11}
                removeClippedSubviews={Platform.OS !== 'web'}
                keyboardDismissMode="on-drag"
                onScroll={(e) => {
                    const y = e.nativeEvent.contentOffset.y;
                    scrollOffsetRef.current = y;
                    if (y <= 30) setNewMessagesCount(0);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={[listContentStyle, { paddingBottom: 28 }]}
                ListEmptyComponent={!loading && (!messages || messages.length === 0) ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyTitle}>tap the mic to talk or type a message.</Text>
                    </View>
                ) : null}
            />
            {newMessagesCount > 0 && (
                <Pressable
                    onPress={() => { try { require('../utils/haptics').haptics.light(); } catch (_) {} scrollToBottom(); }}
                    style={({ pressed }) => [styles.newMessagesPill, pressed && { opacity: 0.9 }]}
                >
                    <Text style={styles.newMessagesPillText}>
                        {newMessagesCount} new message{newMessagesCount !== 1 ? 's' : ''}
                    </Text>
                </Pressable>
            )}

            {/* Typing Indicator */}
            {typingIndicatorComponent}

            {/* Reply/Edit Preview - WhatsApp Style */}
            {(replyTo || editingMessage) && (
                <View style={ChatStyles.previewContainerMerged}>
                    {replyTo && (
                        <ReplyPreview
                            replyTo={replyTo}
                            onCancel={handleCancelReply}
                        />
                    )}
                    {editingMessage && (
                        <View style={ChatStyles.editPreviewInline}>
                            <View style={ChatStyles.editBarInline} />
                            <View style={ChatStyles.editContentInline}>
                                <Text style={ChatStyles.editLabelInline}>editing message</Text>
                                <Text style={ChatStyles.editMessageInline} numberOfLines={1}>
                                    {editingMessage.originalContent}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => { try { require('../utils/haptics').haptics.light(); } catch (_) {} handleCancelEdit(); }}
                                style={({ pressed }) => [ChatStyles.editCloseButtonInline, pressed && { opacity: 0.7 }]}
                            >
                                <X size={18} color="#666" />
                            </Pressable>
                        </View>
                    )}
                </View>
            )}

            {/* Input bar: text, photo, voice. Green for group chat. */}
            <View style={[isWhatsApp ? WhatsAppChatStyles.inputContainer : ChatStyles.inputContainer, (replyTo || editingMessage) && ChatStyles.inputContainerWithPreview]}>
                <ChatInputBar
                    theme={chatType === 'group' || chatType === 'support' ? 'creamGreen' : theme}
                    value={textInput}
                    onChangeText={onTextChange}
                    onSendText={handleSendWrapper}
                    sending={sending}
                    placeholder={placeholderText}
                    isEditing={!!editingMessage}
                    onPhotoPress={handlePhotoPress}
                    onStartRecording={onStartRecording}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    metering={metering}
                    onCancelRecording={onCancelRecording}
                    onSendRecording={onSendRecording}
                    previewAudio={previewAudio}
                    isPlayingPreview={isPlayingPreview}
                    previewPosition={previewPosition}
                    onTogglePreview={onTogglePreview}
                    onDiscardPreview={onDiscardPreview}
                    onConfirmSend={onConfirmSend}
                />
            </View>

            <ImagePreview
                visible={!!imagePreview}
                imageUri={imagePreview}
                mediaType={mediaType}
                onSend={handleSendImage}
                onCancel={handleCancelImage}
            />

            {/* Reaction Viewer Modal (Self-Contained) */}
            <ReactionViewerModal
                visible={reactionViewer.visible}
                reactions={reactionViewer.reactions}
                users={reactionViewer.users}
                onClose={() => setReactionViewer({ ...reactionViewer, visible: false })}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    voiceNudgeWrap: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
        marginBottom: 4,
        backgroundColor: 'rgba(0,173,239,0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,173,239,0.2)',
    },
    voiceNudgePressed: {
        opacity: 0.85,
    },
    voiceNudgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    newMessagesPill: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
    },
    newMessagesPillText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    emptyWrap: {
        paddingVertical: 56,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 10,
    },
    emptySub: {
        fontSize: 16,
        color: Colors.textLight,
        lineHeight: 24,
        textAlign: 'center',
    },
});

