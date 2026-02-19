import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { Video } from 'expo-av';
import { ChatStyles, CompactChatOverrides } from '../constants/ChatStyles';
import { AudioMessage } from './AudioMessage';
import { MessageActionMenu } from './MessageActionMenu';
import { ReactionViewerModal } from "./ReactionViewerModal";
import { shareChallenge } from '../lib/shareChallenge';
import { Share2, Check, Sparkles } from 'lucide-react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { VoiceFeedbackButton } from './VoiceFeedbackButton';
import { ReactionPicker } from './ReactionPicker';
import { LinkPreviewCard, getFirstUrl } from './LinkPreviewCard';

import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

function areEqual(prev, next) {
    if (prev.message?.id !== next.message?.id) return false;
    if (prev.message?.content !== next.message?.content) return false;
    if (prev.message?.status !== next.message?.status) return false;
    if (prev.isMe !== next.isMe || prev.compact !== next.compact || prev.seen !== next.seen) return false;
    if ((prev.reactions?.length ?? 0) !== (next.reactions?.length ?? 0)) return false;
    return true;
}

/**
 * MessageBubble - Renders a single chat message. Memoized for list performance.
 */
function MessageBubble({
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
    onAvatarPress,
    groupId = null,
    groupName = null,
    groupLanguage = null,
    isSpotlight = false,
    currentChallenge = null,
    currentUserId = null,
    onShowInspiration,
    onGetTranscript,
    compact = false,
    seen = false,
    voiceMessagesList = null,
}) {
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showSharePreview, setShowSharePreview] = useState(false);
    const menuMountedTime = useRef(0);
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
    const isFromLanguageSoup = (sender?.display_name || '').toLowerCase() === 'language soup';
    // Use display name and avatar directly
    const displayName = sender?.display_name || 'Unknown Souper';
    const avatarUrl = sender?.avatar_url;


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

    const avatarWrapStyle = [styles.avatarWrap];
    const avatarElement = sender && !isMe ? (
        <Pressable onPress={() => onAvatarPress && onAvatarPress(sender)} style={avatarWrapStyle}>
            {avatarUrl ? (
                <Image
                    source={getAvatarSource(avatarUrl)}
                    style={compact ? [ChatStyles.avatar, CompactChatOverrides.avatar] : ChatStyles.avatar}
                    cache="force-cache"
                />
            ) : (
                <View style={[
                    compact ? [ChatStyles.avatar, CompactChatOverrides.avatar] : ChatStyles.avatar,
                    ChatStyles.avatarPlaceholder,
                    isFromLanguageSoup && { backgroundColor: SOUP_COLORS.pink },
                ]}>
                    <Text style={ChatStyles.avatarText}>{displayName.charAt(0).toUpperCase() || '?'}</Text>
                </View>
            )}
        </Pressable>
    ) : null;

    const bubbleContent = (
        <>
            {/* Reply Indicator - Show quoted message */}
            {message.reply_to && (() => {
                const repliedMsg = Array.isArray(message.replied_message)
                    ? message.replied_message[0]
                    : message.replied_message;

                if (!repliedMsg) return null;

                const replySenderRaw = repliedMsg.sender;
                const senderName = (replySenderRaw?.display_name) || 'User';
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
                        duration={message.duration_seconds ?? message.duration}
                        senderName={sender?.display_name}
                        isMe={isMe}
                        messageId={message.id}
                        senderAvatar={sender?.avatar_url}
                        senderStatus={sender?.status_text}
                        groupName={groupName}
                        groupId={groupId}
                        transcript={message.transcript}
                        onGetTranscript={onGetTranscript}
                        showTranscript={false}
                        queueFromThisMessage={
                            (() => {
                                if (!voiceMessagesList?.length) return undefined;
                                const idx = voiceMessagesList.findIndex((v) => v.messageId === message.id);
                                return idx >= 0 ? voiceMessagesList.slice(idx) : undefined;
                            })()
                        }
                    />

                    {/* Share Preview Modal */}
                    <Modal
                        visible={showSharePreview}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setShowSharePreview(false)}
                    >
                        <Pressable
                            style={styles.modalOverlay}
                            onPress={() => setShowSharePreview(false)}
                        >
                            <Pressable style={styles.sharePreviewCard} onPress={(e) => e.stopPropagation()}>
                                <Text style={styles.previewTitle}>🔥 Challenge Your Friends!</Text>
                                <Text style={styles.previewSubtitle}>Share your voice message and dare them to respond</Text>

                                <View style={styles.previewExample}>
                                    <Text style={styles.previewLabel}>📱 Text they get:</Text>
                                    <View style={styles.previewBubble}>
                                        <Text style={styles.previewText}>"just did the {groupLanguage || 'Language'} daily challenge. wanna join or still scared to speak? 🤪"</Text>
                                    </View>
                                    <Text style={styles.previewExpiry}>⏰ Link expires in 24 hours</Text>
                                </View>

                                <View style={styles.previewExample}>
                                    <Text style={styles.previewLabel}>🌐 What they'll see:</Text>
                                    <View style={styles.websitePreview}>
                                        <View style={styles.websiteHeader}>
                                            <Text style={styles.websiteTitle}>🔥 {message.sender?.display_name || 'You'} challenged you!</Text>
                                        </View>
                                        <View style={styles.websiteAudio}>
                                            <Text style={styles.websiteAudioIcon}>🎵</Text>
                                            <Text style={styles.websiteAudioText}>Your voice message</Text>
                                        </View>
                                        <View style={styles.websiteDownload}>
                                            <Text style={styles.websiteDownloadText}>📲 Download app to respond</Text>
                                        </View>
                                    </View>
                                </View>

                                <Pressable
                                    style={styles.shareNowButton}
                                    onPress={async () => {
                                        const { haptics } = require('../utils/haptics');
                                        haptics.light();
                                        // Call share FIRST while modal is still open
                                        await shareChallenge(
                                            message.sender_id,
                                            message.group_id,
                                            message.id,
                                            groupLanguage || 'Language Soup'
                                        );
                                        // Then close modal after share sheet appears
                                        setShowSharePreview(false);
                                    }}
                                >
                                    <Text style={styles.shareNowText}>Share Challenge 🔥</Text>
                                </Pressable>

                                <Pressable
                                    style={styles.cancelButton}
                                    onPress={() => setShowSharePreview(false)}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </Pressable>
                            </Pressable>
                        </Pressable>
                    </Modal>
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
                            compact ? [ChatStyles.messageText, CompactChatOverrides.messageText] : ChatStyles.messageText,
                            isMe && ChatStyles.messageTextMe,
                            !isMe && !isFromLanguageSoup && ChatStyles.messageTextThem,
                            isFromLanguageSoup && ChatStyles.messageTextBot,
                            { marginTop: 8 }
                        ]}>
                            {message.content}
                        </Text>
                    )}
                </View>
            ) : message.message_type === 'system' ? (
                <View>
                    <Text style={[styles.systemMessageText, (isMe || isFromLanguageSoup) && { color: '#fff' }]}>
                        {message.content}
                    </Text>
                    {sender?.display_name?.toLowerCase() === 'language soup' &&
                        (message.challenge_metadata != null || (message.content && message.content.toLowerCase().includes('#challenge'))) &&
                        onShowInspiration && (
                            <Pressable
                                style={({ pressed }) => [styles.ingredientsButton, isFromLanguageSoup && styles.ingredientsButtonBot, pressed && { opacity: 0.85 }]}
                                onPress={() => onShowInspiration(message.challenge_metadata, {
                                    prompt: message.challenge_prompt ?? currentChallenge?.prompt_text,
                                    challengeId: message.challenge_id ?? currentChallenge?.id,
                                })}
                            >
                                <Text style={[styles.ingredientsButtonText, isFromLanguageSoup && styles.ingredientsButtonTextBot]}>need more ingredients</Text>
                            </Pressable>
                        )}
                </View>
            ) : (
                <View>
<Text style={[
                            compact ? [ChatStyles.messageText, CompactChatOverrides.messageText] : ChatStyles.messageText,
                            isMe && ChatStyles.messageTextMe,
                            !isMe && !isFromLanguageSoup && ChatStyles.messageTextThem,
                            isFromLanguageSoup && ChatStyles.messageTextBot
                        ]}>
                            {message.content}
                        {message.edited_at && (
                            <Text style={[styles.editedLabel, (isMe || isFromLanguageSoup) && { color: 'rgba(255,255,255,0.9)' }]}> Edited</Text>
                        )}
                    </Text>
                    {getFirstUrl(message.content) && (
                        <LinkPreviewCard url={getFirstUrl(message.content)} isMe={isMe} />
                    )}
                    {sender?.display_name?.toLowerCase() === 'language soup' &&
                        (message.challenge_metadata != null || (message.content && message.content.toLowerCase().includes('#challenge'))) &&
                        onShowInspiration && (
                            <Pressable
                                style={({ pressed }) => [styles.ingredientsButton, isFromLanguageSoup && styles.ingredientsButtonBot, pressed && { opacity: 0.85 }]}
                                onPress={() => onShowInspiration(message.challenge_metadata, {
                                    prompt: message.challenge_prompt ?? currentChallenge?.prompt_text,
                                    challengeId: message.challenge_id ?? currentChallenge?.id,
                                })}
                            >
                                <Text style={[styles.ingredientsButtonText, isFromLanguageSoup && styles.ingredientsButtonTextBot]}>need more ingredients</Text>
                            </Pressable>
                        )}
                </View>
            )}
        </>
    );

    const reactionsRow = Object.keys(reactionSummary).length > 0 ? (
        <View style={[styles.reactionsRowBelow, isMe ? styles.reactionsRowBelowMe : styles.reactionsRowBelowThem]}>
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
    ) : null;

    if (isSpotlight) {
        return (
            <View style={[ChatStyles.messageRow, compact && CompactChatOverrides.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem, { marginBottom: 0 }]}>
                {!isMe && avatarElement}
                <View style={[
                    ChatStyles.bubble,
                    compact && CompactChatOverrides.bubble,
                    message.message_type === 'voice' && ChatStyles.bubbleVoice,
                    message.message_type === 'voice' && compact && CompactChatOverrides.bubbleVoice,
                    isMe ? ChatStyles.bubbleMe : (isFromLanguageSoup ? ChatStyles.bubbleFromBot : ChatStyles.bubbleThem),
                    { maxWidth: '100%' }
                ]}>
                    {!isMe && sender && (
                        <Text style={[
                            compact ? [ChatStyles.senderName, CompactChatOverrides.senderName] : ChatStyles.senderName,
                            isFromLanguageSoup ? ChatStyles.senderNameBot : ChatStyles.senderNameThem
                        ]}>
                            {sender.display_name}
                            {languageString ? ` ${languageString}` : ''}
                            {groupName ? ` · ${groupName}` : ''}
                        </Text>
                    )}
                    {bubbleContent}
                </View>
                {isMe && avatarElement}
            </View>
        );
    }

    return (
        <View style={[ChatStyles.messageRow, message.message_type === 'voice' && ChatStyles.messageRowVoice, compact && CompactChatOverrides.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem]}>
            {isMe ? (
                <>
                    <View style={[styles.bubbleWithReactionsWrap, message.message_type === 'voice' && styles.bubbleWrapVoice]}>
                        <Pressable
                            style={({ pressed }) => [
                            ChatStyles.bubble,
                            compact && CompactChatOverrides.bubble,
                            message.message_type === 'voice' && ChatStyles.bubbleVoice,
                            message.message_type === 'voice' && compact && CompactChatOverrides.bubbleVoice,
                            message.message_type === 'voice' && (isMe ? styles.bubbleVoiceMe : styles.bubbleVoiceThem),
                            isMe ? ChatStyles.bubbleMe : (isFromLanguageSoup ? ChatStyles.bubbleFromBot : ChatStyles.bubbleThem),
                            isSending && ChatStyles.bubbleSending,
                            showActionMenu && styles.bubbleHighlight,
                            pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 }
                        ]}
                        onLongPress={() => {
                            const { Keyboard } = require('react-native');
                            Keyboard.dismiss();
                            const { haptics } = require('../utils/haptics');
                            haptics.light();

                            if (bubbleRef.current) {
                                bubbleRef.current.measureInWindow((x, y, width, height) => {
                                    setMessageLayout({ x, y, width, height });
                                    setShowActionMenu(true);
                                });
                            } else {
                                setShowActionMenu(true);
                            }
                        }}
                        delayLongPress={400}
                        ref={bubbleRef}
                    >
                        {bubbleContent}
                        {/* Sent (one check) / Seen (two checks) */}
                        {isMe && !isSending && !isDeleted && (
                            <View style={[styles.sentRow, message.message_type === 'voice' && styles.sentRowVoice]}>
                                <Check size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
                                {seen && <Check size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.5} style={{ marginLeft: -4 }} />}
                            </View>
                        )}

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
                        {reactionsRow}
                        {isMe && message.message_type === 'voice' && (
                            <View style={[styles.reactionsRowBelow, styles.reactionsRowBelowMe, styles.voiceActionsRowBelow]}>
                                <Pressable style={styles.voiceActionBadgeGreen} onPress={() => setShowSharePreview(true)}>
                                    <Text style={styles.voiceActionBadgeEmoji}>🔥</Text>
                                </Pressable>
                                <VoiceFeedbackButton
                                    audioUrl={message.media_url || message.content}
                                    language={groupLanguage}
                                    userId={currentUserId}
                                    groupLanguage={groupLanguage}
                                    challengeContext={{ prompt: message.challenge_prompt || currentChallenge?.prompt_text, starter_phrase: null }}
                                    iconOnly
                                    greenPill
                                />
                            </View>
                        )}
                    </View>
                    {avatarElement}
                </>
            ) : (
                <>
                    <View style={styles.avatarSpacerThem}>{avatarElement}</View>
                    <View style={[styles.bubbleWithReactionsWrap, styles.bubbleWithReactionsWrapThem, message.message_type === 'voice' && styles.bubbleWrapVoiceThem]}>
                        <Pressable
                        style={({ pressed }) => [
                            ChatStyles.bubble,
                            compact && CompactChatOverrides.bubble,
                            message.message_type === 'voice' && ChatStyles.bubbleVoice,
                            message.message_type === 'voice' && compact && CompactChatOverrides.bubbleVoice,
                            message.message_type === 'voice' && styles.bubbleVoiceThem,
                            isFromLanguageSoup ? ChatStyles.bubbleFromBot : ChatStyles.bubbleThem,
                            isSending && ChatStyles.bubbleSending,
                            showActionMenu && styles.bubbleHighlight,
                            pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 }
                        ]}
                        onLongPress={() => {
                            const { Keyboard } = require('react-native');
                            Keyboard.dismiss();
                            const { haptics } = require('../utils/haptics');
                            haptics.light();

                            if (bubbleRef.current) {
                                bubbleRef.current.measureInWindow((x, y, width, height) => {
                                    setMessageLayout({ x, y, width, height });
                                    setShowActionMenu(true);
                                });
                            } else {
                                setShowActionMenu(true);
                            }
                        }}
                        delayLongPress={400}
                        ref={bubbleRef}
                    >
                        {!isMe && sender && (
                            <Text style={[
                                compact ? [ChatStyles.senderName, CompactChatOverrides.senderName] : ChatStyles.senderName,
                                isFromLanguageSoup ? ChatStyles.senderNameBot : ChatStyles.senderNameThem
                            ]}>
                                {sender.display_name}
                                {languageString ? ` ${languageString}` : ''}
                                {groupName ? ` · ${groupName}` : ''}
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
                        {reactionsRow}
                    </View>
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

const MemoizedMessageBubble = React.memo(MessageBubble, areEqual);
export { MemoizedMessageBubble as MessageBubble };

const styles = StyleSheet.create({
    bubbleWithReactionsWrap: {
        maxWidth: '85%',
        alignItems: 'flex-end',
    },
    bubbleWrapVoice: {
        alignSelf: 'flex-end',
    },
    bubbleWrapVoiceThem: {
        alignSelf: 'flex-start',
    },
    bubbleVoiceMe: {
        alignSelf: 'flex-end',
    },
    bubbleVoiceThem: {
        alignSelf: 'flex-start',
    },
    bubbleWithReactionsWrapThem: {
        alignItems: 'flex-start',
    },
    reactionsRowBelow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
        marginBottom: 2,
    },
    reactionsRowBelowMe: {
        alignSelf: 'flex-end',
    },
    reactionsRowBelowThem: {
        alignSelf: 'flex-start',
    },
    avatarWrap: {
        alignSelf: 'flex-start',
    },
    avatarSpacerThem: {
        marginRight: 12,
    },
    voiceActionsRowBelow: {
        marginTop: 6,
    },
    voiceActionBadgeGreen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SOUP_COLORS.green,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
    },
    voiceActionBadgeEmoji: {
        fontSize: 16,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#FDF5E6',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    shareButtonEmoji: {
        fontSize: 12,
    },
    shareButtonText: {
        fontSize: 11,
        color: '#2d3436',
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sharePreviewCard: {
        backgroundColor: '#fef6e4',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    previewTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2c2c3e',
        textAlign: 'center',
        marginBottom: 8,
    },
    previewSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    previewExample: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewBubble: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    previewText: {
        fontSize: 14,
        color: '#2c2c3e',
        lineHeight: 20,
    },
    previewExpiry: {
        fontSize: 12,
        color: '#ec008b',
        fontWeight: '600',
    },
    websitePreview: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    websiteHeader: {
        backgroundColor: '#fef6e4',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    websiteTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2c3e',
        textAlign: 'center',
    },
    websiteAudio: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: '#f8f8f8',
    },
    websiteAudioIcon: {
        fontSize: 20,
    },
    websiteAudioText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },
    websiteDownload: {
        backgroundColor: '#00aedf',
        padding: 12,
    },
    websiteDownloadText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    shareNowButton: {
        backgroundColor: '#00aedf',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#00aedf',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    shareNowText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    copyButton: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#00aedf',
    },
    copyText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#00aedf',
        letterSpacing: 0.5,
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
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
        borderRadius: 6,
        padding: 10,
        marginBottom: 10,
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
    sentRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    sentRowVoice: {
        marginTop: 2,
    },
    fullscreenOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    inspirationBubbleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        marginTop: 8,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    inspirationBubbleEmoji: {
        fontSize: 16,
    },
    inspirationBubbleText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    ingredientsButton: {
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(0,173,239,0.15)',
    },
    ingredientsButtonBot: {
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    ingredientsButtonText: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    ingredientsButtonTextBot: {
        color: 'rgba(255,255,255,0.95)',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
});
