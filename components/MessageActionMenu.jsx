import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableWithoutFeedback, Modal, Animated, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MessageCircle, Copy, Share2, Trash2, Edit2 } from 'lucide-react-native';
import { getAvatarSource } from '../utils/soupUtils';
import { ChatStyles } from '../constants/ChatStyles';

const REACTIONS = ['\u2764\uFE0F', '😂', '😮', '😢', '🙏🏿', '👍🏿', '➕'];
const MENU_PADDING = 20;

export function MessageActionMenu({
    visible,
    onReact,
    onReply,
    onCopy,
    onEdit,
    onDelete,
    onShowMoreReactions,
    onClose,
    message,
    isMe,
    messageLayout, // { x, y, width, height } of the message bubble
    // Props for rendering duplicate message
    showLanguageFlags,
    senderKey,
    reactions,
    onReactionPress,
    groupName
}) {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const emojiAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - MENU_PADDING * 2;
    const CARD_HEIGHT_EST = 280;
    const hasMessageLayout = messageLayout && typeof messageLayout.y === 'number' && messageLayout.y > 0;
    const floatingTop = hasMessageLayout ? Math.max(insets.top + 8, messageLayout.y - CARD_HEIGHT_EST - 8) : null;
    const floatingLeft = hasMessageLayout && messageLayout.x != null
        ? (isMe
            ? Math.max(MENU_PADDING, Math.min(messageLayout.x + messageLayout.width - cardWidth, screenWidth - cardWidth - MENU_PADDING))
            : Math.max(MENU_PADDING, Math.min(messageLayout.x, screenWidth - cardWidth - MENU_PADDING)))
        : MENU_PADDING;

    useEffect(() => {
        if (visible) {
            // Background fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            // Menu spring/pop animation
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }).start();

            // Staggered emoji animations (fast sequential pop-in)
            const emojiAnimations = emojiAnims.map((anim, index) =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 100,
                    delay: index * 30, // 30ms delay between each emoji
                    useNativeDriver: true,
                })
            );
            Animated.parallel(emojiAnimations).start();
        } else {
            // Exit animations - scale down + fade out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start();

            // Reset emoji animations
            emojiAnims.forEach(anim => anim.setValue(0));
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    {/* Blurred backdrop - replaces solid dark overlay */}
                    <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill}>
                        <View style={styles.darkOverlay} />
                    </BlurView>

                    {/* Card floats above message (like reactions) when messageLayout is set */}
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.bottomCard,
                                {
                                    ...(floatingTop != null ? { top: floatingTop, left: floatingLeft } : { bottom: insets.bottom + 100, left: MENU_PADDING }),
                                    width: cardWidth,
                                    opacity: fadeAnim,
                                    transform: [{ scale: scaleAnim }],
                                },
                            ]}
                        >
                            <BlurView intensity={95} tint="light" style={styles.cardInner}>
                                {/* Preview: avatar + bubble as in chat (bigger/isolated) */}
                                {message && (() => {
                                    const sender = message[senderKey];
                                    const displayName = sender?.display_name?.trim() || '?';
                                    const avatarUrl = sender?.avatar_url;
                                    const previewContent = message.message_type === 'voice' ? 'Voice message' : message.message_type === 'image' ? 'Photo' : (message.content || 'Message').trim() || 'Message';
                                    return (
                                        <View style={[styles.messagePreview, isMe ? styles.previewRowMe : styles.previewRowThem]}>
                                            {!isMe && (
                                                <View style={styles.previewAvatarWrap}>
                                                    {avatarUrl ? (
                                                        <Image source={getAvatarSource(avatarUrl)} style={styles.previewAvatar} />
                                                    ) : (
                                                        <View style={[styles.previewAvatar, styles.previewAvatarPlaceholder]}>
                                                            <Text style={styles.previewAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                            <View style={[styles.previewBubble, isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem]}>
                                                <Text style={[styles.previewBubbleText, isMe && styles.previewBubbleTextMe]} numberOfLines={3}>
                                                    {previewContent}
                                                </Text>
                                            </View>
                                            {isMe && (
                                                <View style={styles.previewAvatarWrap}>
                                                    {avatarUrl ? (
                                                        <Image source={getAvatarSource(avatarUrl)} style={styles.previewAvatar} />
                                                    ) : (
                                                        <View style={[styles.previewAvatar, styles.previewAvatarPlaceholder]}>
                                                            <Text style={styles.previewAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}
                                {/* Reactions row */}
                                <View style={styles.reactionsRow}>
                                    {REACTIONS.map((emoji, index) => (
                                        <Animated.View key={index} style={{ opacity: emojiAnims[index] }}>
                                            <Pressable
                                                onPress={() => {
                                                    const { haptics } = require('../utils/haptics');
                                                    haptics.light();
                                                    if (emoji === '➕') {
                                                        onClose();
                                                        if (onShowMoreReactions) onShowMoreReactions();
                                                    } else {
                                                        onReact(emoji);
                                                        onClose();
                                                    }
                                                }}
                                                style={styles.reactionButton}
                                            >
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                            </Pressable>
                                        </Animated.View>
                                    ))}
                                </View>
                                {/* Actions row: Reply, Copy, Translate, Edit (me), Delete (me) */}
                                <View style={styles.actionsRowVertical}>
                                    <Pressable onPress={() => { const { haptics } = require('../utils/haptics'); haptics.light(); onReply(); onClose(); }} style={styles.actionButton}>
                                        <MessageCircle size={20} color="#333" /><Text style={styles.actionText}>Reply</Text>
                                    </Pressable>
                                    <View style={styles.separator} />
                                    <Pressable onPress={() => { const { haptics } = require('../utils/haptics'); haptics.light(); onCopy(); onClose(); }} style={styles.actionButton}>
                                        <Copy size={20} color="#333" /><Text style={styles.actionText}>Copy</Text>
                                    </Pressable>
                                    <View style={styles.separator} />
                                    <Pressable onPress={() => { const { Alert } = require('react-native'); const { haptics } = require('../utils/haptics'); haptics.light(); Alert.alert('Coming soon', 'Translate is coming soon!'); onClose(); }} style={styles.actionButton}>
                                        <Share2 size={20} color="#333" /><Text style={styles.actionText}>Translate</Text>
                                    </Pressable>
                                    {isMe && (
                                        <>
                                            <View style={styles.separator} />
                                            <Pressable onPress={() => { const { haptics } = require('../utils/haptics'); haptics.light(); onEdit(); onClose(); }} style={styles.actionButton}>
                                                <Edit2 size={20} color="#333" /><Text style={styles.actionText}>Edit</Text>
                                            </Pressable>
                                            <View style={styles.separator} />
                                            <Pressable onPress={() => { const { haptics } = require('../utils/haptics'); haptics.light(); onDelete(); onClose(); }} style={styles.actionButton}>
                                                <Trash2 size={20} color="#ff3b30" /><Text style={[styles.actionText, { color: '#ff3b30' }]}>Delete</Text>
                                            </Pressable>
                                        </>
                                    )}
                                </View>
                            </BlurView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    bottomCard: {
        position: 'absolute',
        zIndex: 1000,
    },
    cardInner: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
        gap: 10,
    },
    previewRowMe: {
        justifyContent: 'flex-end',
    },
    previewRowThem: {
        justifyContent: 'flex-start',
    },
    previewAvatarWrap: {
        marginBottom: 2,
    },
    previewAvatar: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    previewAvatarPlaceholder: {
        backgroundColor: '#00adef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewAvatarLetter: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    previewBubble: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: '70%',
        borderRadius: 18,
        borderBottomRightRadius: 6,
        borderBottomLeftRadius: 6,
    },
    previewBubbleText: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 20,
    },
    previewBubbleTextMe: {
        color: '#fff',
    },
    reactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    reactionButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    reactionEmoji: {
        fontSize: 22,
    },
    actionsRowVertical: {
        paddingVertical: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    actionText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#eee',
        marginHorizontal: 20,
    },
});

