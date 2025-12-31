import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { Video } from 'expo-av';
import { ChatStyles } from '../constants/ChatStyles';
import { AudioMessage } from './AudioMessage';
import { MessageActionMenu } from './MessageActionMenu';
import { ReactionViewerModal } from "./ReactionViewerModal";
import { shareChallenge } from '../lib/shareChallenge';
import { Share2 } from 'lucide-react-native';

import { getLanguageFlag } from '../utils/languageFlags';
import { ReactionPicker } from './ReactionPicker';

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
    onReply,
    onEdit,
    onDelete,
    groupName = null,
    groupLanguage = null,
    isSpotlight = false
}) {
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showReactionDetails, setShowReactionDetails] = useState(null); // Which emoji is expanded
    const [reactionViewerData, setReactionViewerData] = useState(null);
    const [messageLayout, setMessageLayout] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [reactionUsers, setReactionUsers] = useState({});
    const bubbleRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const isSending = message.status === 'sending' || message.status === 'uploading';
    const isDeleted = !!message.deleted_at;
    const sender = message[senderKey];


    // Fetch user data for reactions
    useEffect(() => {
        const fetchReactionUsers = async () => {
            if (!reactions || reactions.length === 0) return;

            const { supabase } = require('../lib/supabase');
            const userIds = [...new Set(reactions.map(r => r.user_id))];

            const { data } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url')
                .in('id', userIds);

            if (data) {
                const usersMap = {};
                data.forEach(user => {
                    usersMap[user.id] = user;
                });
                setReactionUsers(usersMap);
            }
        };

        fetchReactionUsers();
    }, [reactions]);

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
        setShowActionMenu(false);
        setShowEmojiPicker(false);
    };

    const handleCopy = async () => {
        try {
            const Clipboard = require('expo-clipboard');
            if (message.content) {
                await Clipboard.setStringAsync(message.content);
                const { Alert } = require('react-native');
                Alert.alert('', 'saved to clipboard', [{ text: 'OK' }], { cancelable: true });
            }
        } catch (error) {
            console.error('[MessageBubble] Copy error:', error);
        }
        setShowActionMenu(false);
    };

    const handleReply = () => {
        if (onReply) {
            onReply(message);
        }
        setShowActionMenu(false);
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(message);
        }
        setShowActionMenu(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(message.id);
        }
        setShowActionMenu(false);
    };

    const avatarElement = sender && !isMe && sender.avatar_url ? (
        <Image source={{ uri: sender.avatar_url }} style={ChatStyles.avatar} />
    ) : null;

    const bubbleContent = (
        <>
            {/* Reply Indicator - Show quoted message */}
            {message.reply_to && (() => {
                const repliedMsg = Array.isArray(message.replied_message)
                    ? message.replied_message[0]
                    : message.replied_message;

                if (!repliedMsg) return null;

                const senderName = repliedMsg.sender?.display_name || 'User';
                const content = repliedMsg.content || 'Message';

                return (
                    <View style={styles.replyIndicator}>
                        <View style={styles.replyBar} />
                        <View style={styles.replyContent}>
                            <Text style={styles.replyAuthor} numberOfLines={1}>
                                {senderName}
                            </Text>
                            <Text style={styles.replyText} numberOfLines={2}>
                                {content}
                            </Text>
                        </View>
                    </View>
                );
            })()}

            {message.message_type === 'voice' ? (
                <View>
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
                    {isMe && (
                        <Pressable
                            style={styles.shareButton}
                            onPress={async () => {
                                const { haptics } = require('../utils/haptics');
                                haptics.light();
                                await shareChallenge(
                                    message.sender_id,
                                    message.group_id,
                                    message.id,
                                    groupLanguage || 'Language Soup'
                                );
                            }}
                        >
                            <Share2 size={14} color="#00aedf" />
                            <Text style={styles.shareButtonText}>Share Challenge</Text>
                        </Pressable>
                    )}
                </View>
            ) : message.message_type === 'image' || message.message_type === 'video' ? (
                <View>
                    {message.message_type === 'image' ? (
                        <Pressable onPress={() => setSelectedImage(message.media_url || message.content)}>
                            <Image
                                source={{ uri: message.media_url || message.content }}
                                style={ChatStyles.messageImage}
                                resizeMode="cover"
                                // Enable GIF animation
                                {...(Platform.OS === 'android' && { fadeDuration: 0 })}
                            />
                        </Pressable>
                    ) : (
                        <Video
                            source={{ uri: message.media_url }}
                            style={ChatStyles.messageImage}
                            useNativeControls
                            resizeMode="contain"
                            shouldPlay={false}
                        />
                    )}
                    {/* Caption below media */}
                    {message.content && message.content !== message.media_url && (
                        <Text style={[
                            ChatStyles.messageText,
                            isMe && ChatStyles.messageTextMe,
                            { marginTop: 8 }
                        ]}>
                            {message.content}
                        </Text>
                    )}
                </View>
            ) : message.message_type === 'system' ? (
                <Text style={[styles.systemMessageText, isMe && { color: '#fff' }]}>
                    {message.content}
                </Text>
            ) : (
                <Text style={[
                    ChatStyles.messageText,
                    isMe && ChatStyles.messageTextMe
                ]}>
                    {message.content}
                    {message.edited_at && (
                        <Text style={[styles.editedLabel, isMe && { color: '#fff' }]}> Edited</Text>
                    )}
                </Text>
            )}

            {/* Reactions summary */}
            {Object.keys(reactionSummary).length > 0 && (
                <View style={[styles.reactionsContainer, isMe ? styles.reactionsContainerMe : styles.reactionsContainerThem]}>
                    {Object.entries(reactionSummary).map(([emoji, data]) => (
                        <Pressable
                            key={emoji}
                            style={styles.reactionBadge}
                            onPress={() => onReactionPress && onReactionPress(message, emoji, data.users)}
                        >
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                            {data.count > 1 && <Text style={styles.reactionCount}>{data.count}</Text>}
                        </Pressable>
                    ))}
                </View>
            )}
        </>
    );

    if (isSpotlight) {
        return (
            <View style={[ChatStyles.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem, { marginBottom: 0 }]}>
                {!isMe && avatarElement}
                <View style={[
                    ChatStyles.bubble,
                    message.message_type === 'voice' && ChatStyles.bubbleVoice,
                    isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
                    { maxWidth: '100%' }
                ]}>
                    {!isMe && sender && (
                        <Text style={ChatStyles.senderName}>
                            {sender.display_name}
                            {languageString ? ` ${languageString}` : ''}
                        </Text>
                    )}
                    {bubbleContent}
                </View>
                {isMe && avatarElement}
            </View>
        );
    }

    return (
        <View style={[ChatStyles.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem]}>
            {isMe ? (
                <>
                    <Pressable
                        style={[
                            ChatStyles.bubble,
                            message.message_type === 'voice' && ChatStyles.bubbleVoice,
                            isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
                            isSending && ChatStyles.bubbleSending,
                            showActionMenu && styles.bubbleHighlight
                        ]}
                        onLongPress={() => {
                            const { Keyboard } = require('react-native');
                            Keyboard.dismiss();
                            const { haptics } = require('../utils/haptics');
                            haptics.medium();

                            if (bubbleRef.current) {
                                bubbleRef.current.measureInWindow((x, y, width, height) => {
                                    setMessageLayout({ x, y, width, height });
                                    setShowActionMenu(true);
                                });
                            } else {
                                setShowActionMenu(true);
                            }
                        }}
                        delayLongPress={500}
                        ref={bubbleRef}
                    >
                        {bubbleContent}

                        {/* WhatsApp-Style Action Menu */}
                        <MessageActionMenu
                            visible={showActionMenu}
                            onReact={handleReact}
                            onReply={handleReply}
                            onCopy={handleCopy}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onShowMoreReactions={() => setShowEmojiPicker(true)}
                            onClose={() => setShowActionMenu(false)}
                            message={message}
                            isMe={isMe}
                            messageLayout={messageLayout}
                            showLanguageFlags={showLanguageFlags}
                            senderKey={senderKey}
                            reactions={reactions}
                            onReactionPress={onReactionPress}
                            groupName={groupName}
                        />

                        <ReactionPicker
                            visible={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onReact={(emoji) => handleReact(emoji)}
                            defaultShowCustom={true}
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
                            isSending && ChatStyles.bubbleSending,
                            showActionMenu && styles.bubbleHighlight
                        ]}
                        onLongPress={() => {
                            const { Keyboard } = require('react-native');
                            Keyboard.dismiss();
                            const { haptics } = require('../utils/haptics');
                            haptics.medium();

                            if (bubbleRef.current) {
                                bubbleRef.current.measureInWindow((x, y, width, height) => {
                                    setMessageLayout({ x, y, width, height });
                                    setShowActionMenu(true);
                                });
                            } else {
                                setShowActionMenu(true);
                            }
                        }}
                        delayLongPress={500}
                        ref={bubbleRef}
                    >
                        {!isMe && sender && (
                            <Text style={ChatStyles.senderName}>
                                {sender.display_name}
                                {languageString ? ` ${languageString}` : ''}
                            </Text>
                        )}

                        {bubbleContent}

                        {/* WhatsApp-Style Action Menu */}
                        <MessageActionMenu
                            visible={showActionMenu}
                            onReact={handleReact}
                            onReply={handleReply}
                            onCopy={handleCopy}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onShowMoreReactions={() => setShowEmojiPicker(true)}
                            onClose={() => setShowActionMenu(false)}
                            message={message}
                            isMe={isMe}
                            messageLayout={messageLayout}
                            showLanguageFlags={showLanguageFlags}
                            senderKey={senderKey}
                            reactions={reactions}
                            onReactionPress={onReactionPress}
                            groupName={groupName}
                        />

                        <ReactionPicker
                            visible={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onReact={(emoji) => handleReact(emoji)}
                            defaultShowCustom={true}
                        />
                    </Pressable>
                </>
            )}

            {/* Fullscreen Image Viewer */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <Pressable
                    style={styles.fullscreenOverlay}
                    onPress={() => setSelectedImage(null)}
                >
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.fullscreenImage}
                        resizeMode="contain"
                    />
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    reactionsContainer: {
        position: 'absolute',
        bottom: -10,
        left: 8,
        flexDirection: 'row',
        gap: 4,
        zIndex: 10,
    },
    reactionsContainerMe: {
        left: 'auto',
        right: 8,
    },
    reactionsContainerThem: {
        left: 8,
        right: 'auto',
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 7,
        paddingVertical: 3,
        gap: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    reactionEmoji: {
        fontSize: 13,
    },
    reactionCount: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
    },

    replyIndicator: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.blue,
        borderRadius: 4,
        padding: 8,
        marginBottom: 8,
    },
    replyBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: SOUP_COLORS.blue,
    },
    replyContent: {
        paddingLeft: 8,
    },
    replyAuthor: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        marginBottom: 2,
    },
    replyText: {
        fontSize: 13,
        color: '#666',
    },
    editedLabel: {
        fontSize: 11,
        color: '#999',
        fontStyle: 'italic',
    },
    systemMessageContent: {
        fontSize: 11,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    systemMessageText: {
        fontSize: 11,
        color: '#666', // Dark enough for visibility on white
        fontStyle: 'italic',
        textAlign: 'center',
    },
    systemMessage: {
        fontSize: 13,
        color: '#fff',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    bubbleHighlight: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        backgroundColor: '#fff',
        borderColor: Platform.OS === 'android' ? '#eee' : 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
    },
    fullscreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
});
