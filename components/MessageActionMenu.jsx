import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableWithoutFeedback, Modal, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MessageCircle, Copy, Share2, Trash2, Edit2 } from 'lucide-react-native';

// Removed circular import of MessageBubble. It will be required lazily inside the component.


const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '➕'];

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
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const emojiAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

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

                    {/* Duplicate message bubble - rendered above dark overlay */}
                    {messageLayout && message && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                top: messageLayout.y - 2, // Slight adjustment for modal skew
                                left: isMe ? messageLayout.x : messageLayout.x - 40, // Shift left if avatar is present
                                width: isMe ? messageLayout.width : messageLayout.width + 40, // Allow space for avatar only for others
                                zIndex: 50,
                            }}
                        >
                            {(() => {
                                const { MessageBubble: LazyMessageBubble } = require('./MessageBubble');
                                return (
                                    <LazyMessageBubble
                                        message={message}
                                        isMe={isMe}
                                        showLanguageFlags={showLanguageFlags}
                                        senderKey={senderKey}
                                        reactions={reactions || []}
                                        onReact={() => { }}
                                        onReactionPress={onReactionPress}
                                        onReply={() => { }}
                                        onEdit={() => { }}
                                        onDelete={() => { }}
                                        groupName={groupName}
                                        isSpotlight={true}
                                    />
                                );
                            })()}
                        </View>
                    )}

                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            {messageLayout && (() => {
                                const screenHeight = Dimensions.get('window').height;
                                const showReactionsBelow = messageLayout.y < 80;
                                const estimatedMenuHeight = isMe ? 240 : 180;
                                const showMenuAbove = (screenHeight - (messageLayout.y + messageLayout.height)) < estimatedMenuHeight + 20;

                                // Base positions
                                let reactionsTop = messageLayout.y - 46;
                                let actionsTop = messageLayout.y + messageLayout.height + 8;

                                // Flip logic
                                if (showReactionsBelow) {
                                    reactionsTop = messageLayout.y + messageLayout.height + 8;
                                    actionsTop = reactionsTop + 54; // Below reactions
                                } else if (showMenuAbove) {
                                    actionsTop = messageLayout.y - estimatedMenuHeight - 8;
                                    reactionsTop = actionsTop - 54; // Above menu
                                }

                                return (
                                    <>
                                        {/* Reactions Row */}
                                        <Animated.View
                                            style={[
                                                styles.reactionsRowPositioned,
                                                {
                                                    top: reactionsTop,
                                                    left: messageLayout.x,
                                                    width: messageLayout.width,
                                                    alignItems: 'center',
                                                    transform: [{ scale: scaleAnim }],
                                                    opacity: fadeAnim
                                                }
                                            ]}
                                        >
                                            <BlurView intensity={95} tint="light" style={styles.reactionsRow}>
                                                {REACTIONS.map((emoji, index) => (
                                                    <Animated.View
                                                        key={index}
                                                        style={{
                                                            opacity: emojiAnims[index],
                                                            transform: [{
                                                                scale: emojiAnims[index].interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [0.3, 1]
                                                                })
                                                            }]
                                                        }}
                                                    >
                                                        <Pressable
                                                            onPress={() => {
                                                                if (emoji === '➕') {
                                                                    const { haptics } = require('../utils/haptics');
                                                                    haptics.light();
                                                                    onClose();
                                                                    if (onShowMoreReactions) {
                                                                        onShowMoreReactions();
                                                                    }
                                                                } else {
                                                                    const { haptics } = require('../utils/haptics');
                                                                    haptics.light();
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
                                            </BlurView>
                                        </Animated.View>

                                        {/* Actions Row */}
                                        <Animated.View
                                            style={[
                                                styles.actionsRowPositioned,
                                                {
                                                    top: actionsTop,
                                                    left: isMe ? undefined : (messageLayout.x - 20 < 10 ? 10 : messageLayout.x - 20),
                                                    right: isMe ? (Dimensions.get('window').width - (messageLayout.x + messageLayout.width) - 20 < 10 ? 10 : Dimensions.get('window').width - (messageLayout.x + messageLayout.width) - 20) : undefined,
                                                    transform: [{ scale: scaleAnim }],
                                                    opacity: fadeAnim
                                                }
                                            ]}
                                        >
                                            <BlurView intensity={100} tint="light" style={styles.actionsRow}>
                                                <Pressable
                                                    onPress={() => {
                                                        const { haptics } = require('../utils/haptics');
                                                        haptics.light();
                                                        onReply();
                                                        onClose();
                                                    }}
                                                    style={styles.actionButton}
                                                >
                                                    <Text style={styles.actionText}>Reply</Text>
                                                    <MessageCircle size={20} color="#333" />
                                                </Pressable>

                                                <View style={styles.separator} />

                                                <Pressable
                                                    onPress={() => {
                                                        const { haptics } = require('../utils/haptics');
                                                        haptics.light();
                                                        onCopy();
                                                        onClose();
                                                    }}
                                                    style={styles.actionButton}
                                                >
                                                    <Text style={styles.actionText}>Copy</Text>
                                                    <Copy size={20} color="#333" />
                                                </Pressable>

                                                <View style={styles.separator} />

                                                <Pressable
                                                    onPress={() => {
                                                        const { Alert } = require('react-native');
                                                        const { haptics } = require('../utils/haptics');
                                                        haptics.light();
                                                        Alert.alert('Coming Soon', 'Translate feature is coming soon!');
                                                        onClose();
                                                    }}
                                                    style={styles.actionButton}
                                                >
                                                    <Text style={styles.actionText}>Translate</Text>
                                                    <Share2 size={20} color="#333" />
                                                </Pressable>

                                                {isMe && (
                                                    <>
                                                        <View style={styles.separator} />
                                                        <Pressable
                                                            onPress={() => {
                                                                const { haptics } = require('../utils/haptics');
                                                                haptics.light();
                                                                onEdit();
                                                                onClose();
                                                            }}
                                                            style={styles.actionButton}
                                                        >
                                                            <Text style={styles.actionText}>Edit</Text>
                                                            <Edit2 size={20} color="#333" />
                                                        </Pressable>

                                                        <View style={styles.separator} />
                                                        <Pressable
                                                            onPress={() => {
                                                                const { haptics } = require('../utils/haptics');
                                                                haptics.light();
                                                                onDelete();
                                                                onClose();
                                                            }}
                                                            style={styles.actionButton}
                                                        >
                                                            <Text style={[styles.actionText, { color: '#ff3b30' }]}>Delete</Text>
                                                            <Trash2 size={20} color="#ff3b30" />
                                                        </Pressable>
                                                    </>
                                                )}
                                            </BlurView>
                                        </Animated.View>
                                    </>
                                );
                            })()}
                        </View>
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
    menuContainer: {
        // No centering - use absolute positioning for children
    },
    reactionsRow: {
        flexDirection: 'row',
        borderRadius: 20,
        paddingHorizontal: 6,
        paddingVertical: 4,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Bright white background
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, // Stronger shadow
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    reactionButton: {
        paddingHorizontal: 4, // Very tight
        paddingVertical: 1,
    },
    reactionEmoji: {
        fontSize: 20, // Much smaller
    },

    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly lighter to let blur feel more "natural"
    },
    reactionsRowPositioned: {
        position: 'absolute',
        zIndex: 1000,
    },
    actionsRowPositioned: {
        position: 'absolute',
        zIndex: 1000,
        paddingHorizontal: 12, // Minimal gutter
    },
    actionsRow: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#f8f8f8', // Solid light grey/white for that WhatsApp menu look
        width: 180, // Fixed width for vertical list
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Translucent to let blur work
    },
    actionText: {
        fontSize: 16, // Larger for vertical list
        color: '#333',
        fontWeight: '400',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#ddd',
        marginHorizontal: 0,
    },
});

