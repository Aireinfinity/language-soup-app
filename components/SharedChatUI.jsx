import React, { useRef, useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Keyboard, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Mic, Trash2, Image as ImageIcon, X } from 'lucide-react-native';
import { MessageBubble } from './MessageBubble';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { ImagePreview } from './ImagePreview';
import { ReplyPreview } from './ReplyPreview';
import { ReactionViewerModal } from './ReactionViewerModal';
import { ChatStyles } from '../constants/ChatStyles';
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
    placeholderText = "Message...",
    showLanguageFlags = false,
    senderKey = "sender",
    isRecording,
    recordingDuration,
    metering,
    onStartRecording,
    onCancelRecording,
    onSendRecording,
    typingIndicatorComponent,
    flatListRef,
    userId,
    contentContainerStyle,
    inverted = true,
    reactions = {},
    onReact,
    groupName = null,
}) {
    // ========== INTERNAL STATE (Self-Contained) ==========
    const [replyTo, setReplyTo] = useState(null); // { messageId, content, senderName }
    const [editingMessage, setEditingMessage] = useState(null); // { messageId, originalContent }
    const [reactionViewer, setReactionViewer] = useState({ visible: false, reactions: [], users: [] });

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

    const handleReactionPress = async (messageId, messageReactions) => {
        const { haptics } = require('../utils/haptics');
        haptics.light();

        if (!messageReactions || messageReactions.length === 0) return;

        const userIds = [...new Set(messageReactions.map(r => r.user_id))];
        const { data: users, error } = await supabase
            .from('app_users')
            .select('id, display_name, avatar_url')
            .in('id', userIds);

        if (error) {
            console.error('[SharedChatUI] Error fetching reaction users:', error);
            return;
        }

        setTimeout(() => {
            setReactionViewer({
                visible: true,
                reactions: messageReactions,
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
            } catch (error) {
                console.error('[SharedChatUI] Edit error:', error);
                Alert.alert('Error', 'Failed to edit message');
            }
            return;
        }

        // Handle Reply Mode - Pass replyTo data to parent's onSendText
        // The parent should handle inserting reply_to field
        if (replyTo) {
            // Call parent's send with reply context
            // For now, just call onSendText and clear reply
            await onSendText();
            setReplyTo(null);
            return;
        }

        // Regular send
        await onSendText();
    };

    const insets = useSafeAreaInsets();
    const internalFlatListRef = useRef(null);
    const listRef = flatListRef || internalFlatListRef;
    const [imagePreview, setImagePreview] = useState(null);

    // Dynamic focus/blur for input context
    useEffect(() => {
        if (editingMessage || replyTo) {
            // Optional: small haptic or focus logic
        }
    }, [editingMessage, replyTo]);

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'Images',
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setImagePreview(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[SharedChatUI] Error picking image:', error);
        }
    };

    const handleSendImage = async () => {
        console.log('[SharedChatUI] handleSendImage called', { imagePreview, hasCallback: !!onPickImage });
        if (imagePreview && onPickImage) {
            console.log('[SharedChatUI] Calling onPickImage with:', imagePreview);
            await onPickImage(imagePreview);
            setImagePreview(null);
        } else {
            console.log('[SharedChatUI] NOT calling - missing:', { imagePreview: !!imagePreview, onPickImage: !!onPickImage });
        }
    };

    const handleCancelImage = () => {
        setImagePreview(null);
    };

    const renderMessage = ({ item }) => {
        if (item.type === 'date_separator') {
            return (
                <View style={ChatStyles.dateSeparator}>
                    <View style={ChatStyles.dateSeparatorBadge}>
                        <Text style={ChatStyles.dateSeparatorText}>{item.label}</Text>
                    </View>
                </View>
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
                groupName={groupName}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Custom Header */}
            {headerComponent}

            {/* Custom Banner (Challenge, Announcement, etc) */}
            {bannerComponent}

            {/* Messages List */}
            <FlatList
                ref={listRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted={inverted}
                initialScrollIndex={0}
                keyboardDismissMode="on-drag"
                contentContainerStyle={contentContainerStyle || ChatStyles.messagesList}
            />

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
                                <Text style={ChatStyles.editLabelInline}>Editing message</Text>
                                <Text style={ChatStyles.editMessageInline} numberOfLines={1}>
                                    {editingMessage.originalContent}
                                </Text>
                            </View>
                            <Pressable onPress={handleCancelEdit} style={ChatStyles.editCloseButtonInline}>
                                <X size={18} color="#666" />
                            </Pressable>
                        </View>
                    )}
                </View>
            )}

            {/* Input Area */}
            <View style={[
                ChatStyles.inputContainer,
                (replyTo || editingMessage) && ChatStyles.inputContainerWithPreview,
                { paddingBottom: Math.max(insets.bottom, 10) }
            ]}>
                {isRecording ? (
                    <View style={ChatStyles.recordingBar}>
                        <Pressable onPress={onCancelRecording} style={ChatStyles.cancelButton}>
                            <Trash2 size={22} color="#FF3B30" />
                        </Pressable>
                        <View style={ChatStyles.recordingMain}>
                            <View style={ChatStyles.waveformWrapper}>
                                <LiveAudioWaveform
                                    metering={metering}
                                    recordingDuration={recordingDuration}
                                    isRecording={isRecording}
                                />
                            </View>
                            <Text style={ChatStyles.recordingTimer}>
                                {Math.floor(recordingDuration / 60)}:{String(Math.floor(recordingDuration % 60)).padStart(2, '0')}
                            </Text>
                        </View>
                        <Pressable onPress={onSendRecording} style={ChatStyles.sendVoiceButton}>
                            <Send size={22} color="#fff" />
                        </Pressable>
                    </View>
                ) : (
                    <View style={ChatStyles.standardInputBar}>
                        <TextInput
                            style={[
                                ChatStyles.textInput,
                                editingMessage && ChatStyles.textInputEditing
                            ]}
                            value={textInput}
                            onChangeText={onTextChange}
                            placeholder={placeholderText}
                            placeholderTextColor={Colors.textLight}
                            multiline
                            maxLength={500}
                        />
                        {textInput.trim() ? (
                            <Pressable onPress={handleSendWrapper} disabled={sending} style={ChatStyles.sendButton}>
                                <Send size={24} color="#fff" />
                            </Pressable>
                        ) : (
                            <>
                                <Pressable onPress={handlePickImage} style={ChatStyles.micButton}>
                                    <ImageIcon size={24} color={Colors.primary} />
                                </Pressable>
                                <Pressable onPress={onStartRecording} style={ChatStyles.micButton}>
                                    <Mic size={26} color={Colors.primary} />
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </View>

            <ImagePreview
                visible={!!imagePreview}
                imageUri={imagePreview}
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
