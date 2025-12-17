import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { ChatStyles } from '../constants/ChatStyles';
import { AudioMessage } from './AudioMessage';
import { FloatingReactionPicker } from './FloatingReactionPicker';

import { getLanguageFlag } from '../utils/languageFlags';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * MessageBubble - Renders a single chat message with iMessage-style reactions
 */
export function MessageBubble({
    message,
    isMe,
    showLanguageFlags = false,
    senderKey = 'sender',
    reactions = [],
    onReact,
    onReactionPress,
    groupName = null
}) {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showReactionDetails, setShowReactionDetails] = useState(null); // Which emoji is expanded
    const isSending = message.status === 'sending' || message.status === 'uploading';
    const sender = message[senderKey];

    // Build language flag string
    let languageString = '';
    if (showLanguageFlags && sender?.fluent_languages && sender.fluent_languages.length > 0) {
        const flags = sender.fluent_languages
            .map(lang => getLanguageFlag(lang))
            .filter(Boolean);
        if (flags.length > 0) {
            const parts = [];
            flags.forEach((flag, i) => {
                parts.push(flag);
                if (i < flags.length - 1) parts.push(' ');
            });
            languageString = parts.join('');
        }
    }

    // Group reactions by emoji
    const reactionSummary = {};
    reactions.forEach((reaction) => {
        const emoji = reaction.emoji;
        if (!reactionSummary[emoji]) {
            reactionSummary[emoji] = { count: 0, users: [] };
        }
        reactionSummary[emoji].count += 1;
        reactionSummary[emoji].users.push(reaction.user_id);
    });

    const handleReact = (emoji) => {
        if (onReact) {
            onReact(message.id, emoji);
        }
    };

    const avatarElement = sender && !isMe && sender.avatar_url ? (
        <Image source={{ uri: sender.avatar_url }} style={ChatStyles.avatar} />
    ) : null;

    return (
        <View style={[ChatStyles.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem]}>
            {isMe ? (
                <>
                    <Pressable
                        style={[
                            ChatStyles.bubble,
                            message.message_type === 'voice' && ChatStyles.bubbleVoice,
                            isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
                            isSending && ChatStyles.bubbleSending
                        ]}
                        onLongPress={() => setShowReactionPicker(true)}
                        delayLongPress={300}
                    >
                        {message.message_type === 'voice' ? (
                            <AudioMessage
                                audioUrl={message.media_url || message.content}
                                duration={message.duration_seconds}
                                senderName={sender?.display_name}
                                isMe={isMe}
                                messageId={message.id}
                                senderAvatar={sender?.avatar_url}
                                senderStatus={sender?.status_text}
                                groupName={groupName}
                            />
                        ) : message.message_type === 'image' ? (
                            <Image
                                source={{ uri: message.media_url || message.content }}
                                style={ChatStyles.messageImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={[ChatStyles.messageText, isMe && ChatStyles.messageTextMe]}>
                                {message.content}
                            </Text>
                        )}

                        {/* Reactions Display - Inline Expansion */}
                        {Object.keys(reactionSummary).length > 0 && (
                            <View style={[styles.reactionsContainer, styles.reactionsContainerMe]}>
                                {Object.entries(reactionSummary).map(([emoji, data]) => (
                                    <Pressable
                                        key={emoji}
                                        style={styles.reactionGroup}
                                        onPress={() => {
                                            // Toggle expansion for this emoji
                                            setShowReactionDetails(prev =>
                                                prev === emoji ? null : emoji
                                            );
                                        }}
                                    >
                                        {/* Emoji + count or avatars */}
                                        {showReactionDetails === emoji ? (
                                            <>
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                <View style={styles.avatarsRow}>
                                                    {data.users && data.users.slice(0, 3).map((userId, idx) => (
                                                        <View
                                                            key={userId}
                                                            style={[
                                                                styles.miniAvatar,
                                                                idx > 0 && { marginLeft: -8 }
                                                            ]}
                                                        >
                                                            <Text style={styles.avatarInitial}>
                                                                {String(userId).charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                    {data.count > 3 && (
                                                        <Text style={styles.moreCount}>+{data.count - 3}</Text>
                                                    )}
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.reactionBadge}>
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                {data.count > 1 && (
                                                    <Text style={styles.reactionCount}>{data.count}</Text>
                                                )}
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {/* Floating Reaction Picker */}
                        <FloatingReactionPicker
                            visible={showReactionPicker}
                            onReact={handleReact}
                            onClose={() => setShowReactionPicker(false)}
                            isMe={isMe}
                        />


                    </Pressable>
                    {avatarElement}
                </>
            ) : (
                <>
                    {avatarElement}
                    <Pressable
                        style={[
                            ChatStyles.bubble,
                            message.message_type === 'voice' && ChatStyles.bubbleVoice,
                            isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
                            isSending && ChatStyles.bubbleSending
                        ]}
                        onLongPress={() => setShowReactionPicker(true)}
                        delayLongPress={300}
                    >
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
                                messageId={message.id}
                                senderAvatar={sender?.avatar_url}
                                senderStatus={sender?.status_text}
                                groupName={groupName}
                            />
                        ) : message.message_type === 'image' ? (
                            <Image
                                source={{ uri: message.media_url || message.content }}
                                style={ChatStyles.messageImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={[ChatStyles.messageText, isMe && ChatStyles.messageTextMe]}>
                                {message.content}
                            </Text>
                        )}

                        {/* Reactions Display - Inline Expansion */}
                        {Object.keys(reactionSummary).length > 0 && (
                            <View style={[styles.reactionsContainer, styles.reactionsContainerThem]}>
                                {Object.entries(reactionSummary).map(([emoji, data]) => (
                                    <Pressable
                                        key={emoji}
                                        style={styles.reactionGroup}
                                        onPress={() => {
                                            setShowReactionDetails(prev =>
                                                prev === emoji ? null : emoji
                                            );
                                        }}
                                    >
                                        {showReactionDetails === emoji ? (
                                            <>
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                <View style={styles.avatarsRow}>
                                                    {data.users && data.users.slice(0, 3).map((userId, idx) => (
                                                        <View
                                                            key={userId}
                                                            style={[
                                                                styles.miniAvatar,
                                                                idx > 0 && { marginLeft: -8 }
                                                            ]}
                                                        >
                                                            <Text style={styles.avatarInitial}>
                                                                {String(userId).charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                    {data.count > 3 && (
                                                        <Text style={styles.moreCount}>+{data.count - 3}</Text>
                                                    )}
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.reactionBadge}>
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                                {data.count > 1 && (
                                                    <Text style={styles.reactionCount}>{data.count}</Text>
                                                )}
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {/* Floating Reaction Picker */}
                        <FloatingReactionPicker
                            visible={showReactionPicker}
                            onReact={handleReact}
                            onClose={() => setShowReactionPicker(false)}
                            isMe={isMe}
                        />

                    </Pressable>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    reactionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    reactionsContainerMe: {
        justifyContent: 'flex-end',
    },
    reactionsContainerThem: {
        justifyContent: 'flex-start',
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 3,
        gap: 3,
    },
    reactionEmoji: {
        fontSize: 13,
    },
    reactionCount: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
    },
    reactionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    avatarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    miniAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    avatarInitial: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    moreCount: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
        marginLeft: 4,
    },
});
