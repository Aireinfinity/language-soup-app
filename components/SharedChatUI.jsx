import React, { useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Mic, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { MessageBubble } from './MessageBubble';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { ImagePreview } from './ImagePreview';
import { ChatStyles } from '../constants/ChatStyles';
import { Colors } from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * SharedChatUI - Universal chat template for all chats
 * 
 * Edit this component once → all chats update automatically
 * 
 * @param {Array} messages - Array of message objects with date separators
 * @param {boolean} loading - Loading state
 * @param {Function} onSendText - Callback when sending text message (text) => void
 * @param {Function} onSendVoice - Callback when sending voice message (audioUri, duration) => void
 * @param {string} textInput - Current text input value
 * @param {Function} onTextChange - Callback when text changes
 * @param {boolean} sending - Is currently sending
 * @param {ReactNode} headerComponent - Custom header component
 * @param {ReactNode} bannerComponent - Custom banner component (challenge, announcement, etc)
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
 */
export function SharedChatUI({
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
    inverted = true, // Default to inverted (newest at bottom)
    reactions = {}, // { messageId: [{ user_id, reaction, created_at }] }
    onReact, // (messageId, emoji) => void
    onReactionPress, // (messageId, reactions) => void
    onEdit, // (message) => void
    onDelete, // (message) => void
    onAvatarPress, // (userId) => void
    groupName = null, // Name to show in mini-player
}) {
    const insets = useSafeAreaInsets();
    const internalFlatListRef = useRef(null);
    const listRef = flatListRef || internalFlatListRef;
    const [imagePreview, setImagePreview] = useState(null);

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
        const isMe = item.sender_id === userId || item.user_id === userId;
        const messageReactions = reactions[item.id] || [];
        return (
            <MessageBubble
                message={item}
                isMe={isMe}
                showLanguageFlags={showLanguageFlags}
                senderKey={senderKey}
                reactions={messageReactions}
                onReact={onReact}
                onReactionPress={onReactionPress}
                onEdit={onEdit}
                onDelete={onDelete}
                onAvatarPress={onAvatarPress}
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

            {/* Input Area */}
            <View style={[ChatStyles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                {isRecording ? (
                    <View style={ChatStyles.recordingBar}>
                        <Pressable onPress={onCancelRecording} style={ChatStyles.cancelButton}>
                            <Trash2 size={22} color="#FF3B30" />
                        </Pressable>
                        <View style={ChatStyles.recordingMain}>
                            <View style={ChatStyles.waveformWrapper}>
                                <LiveAudioWaveform metering={metering} recordingDuration={recordingDuration} />
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
                            style={ChatStyles.textInput}
                            value={textInput}
                            onChangeText={onTextChange}
                            placeholder={placeholderText}
                            placeholderTextColor={Colors.textLight}
                            multiline
                            maxLength={500}
                        />
                        {textInput.trim() ? (
                            <Pressable onPress={onSendText} disabled={sending} style={ChatStyles.sendButton}>
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
        </KeyboardAvoidingView>
    );
}
