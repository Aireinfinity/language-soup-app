import React from 'react';
import { View, Text, Image } from 'react-native';
import { AudioMessage } from './AudioMessage';
import { ChatStyles } from '../constants/ChatStyles';
import { getLanguageFlag } from '../utils/languageFlags';

const SOUP_COLORS = {
    pink: '#ec008b',
};

/**
 * Shared MessageBubble component used across all chat types
 * 
 * @param {object} message - Message data
 * @param {boolean} isMe - Is this message from the current user?
 * @param {boolean} showLanguageFlags - Show language flag emojis (language/community chats only)
 * @param {string} senderKey - Key to access sender data ('sender' or 'user')
 */
export function MessageBubble({ message, isMe, showLanguageFlags = false, senderKey = 'sender' }) {
    const isSending = message.status === 'sending' || message.status === 'uploading';
    const sender = message[senderKey];

    // Build language emoji string if enabled
    let languageString = '';
    if (showLanguageFlags && sender) {
        const speaksFlags = sender.fluent_languages?.slice(0, 3) || [];
        const learningFlags = sender.learning_languages?.slice(0, 3) || [];

        const parts = [
            speaksFlags.length > 0 && `🔥 ${speaksFlags.map(lang => getLanguageFlag(lang)).filter(Boolean).join('')}`,
            learningFlags.length > 0 && `🌱 ${learningFlags.map(lang => getLanguageFlag(lang)).filter(Boolean).join('')}`
        ].filter(Boolean);

        languageString = parts.join(' ');
    }

    const avatarElement = (
        <View style={ChatStyles.avatarContainer}>
            {sender?.avatar_url ? (
                <Image source={{ uri: sender.avatar_url }} style={ChatStyles.avatar} />
            ) : (
                <View style={[ChatStyles.avatar, ChatStyles.avatarPlaceholder]}>
                    <Text style={ChatStyles.avatarText}>
                        {sender?.display_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>
            )}
        </View>
    );

    const bubbleElement = (
        <View style={[
            ChatStyles.bubble,
            message.message_type === 'voice' && ChatStyles.bubbleVoice,
            isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
            isSending && ChatStyles.bubbleSending
        ]}>
            {!isMe && sender && (
                <Text style={ChatStyles.senderName}>
                    {sender.display_name}
                    {languageString ? ` ${languageString}` : ''}
                </Text>
            )}
            {message.message_type === 'voice' ? (
                <AudioMessage
                    audioUrl={message.media_url || message.content}
                    duration={message.duration_seconds}
                    senderName={sender?.display_name}
                    isMe={isMe}
                />
            ) : (
                <Text style={[ChatStyles.messageText, isMe && ChatStyles.messageTextMe]}>
                    {message.content}
                </Text>
            )}
        </View>
    );

    return (
        <View style={[ChatStyles.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem]}>
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
