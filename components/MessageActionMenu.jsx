import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableWithoutFeedback, Modal, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { MessageCircle, Copy, Share2, Trash2, Edit2 } from 'lucide-react-native';
import { MessageBubble } from './MessageBubble';

const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '➕'];

export function MessageActionMenu({
    visible,
    onReact,
    onReply,
    onCopy,
    onForward,
    onEdit,
    onDelete,
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
                                width: isMe ? messageLayout.width + 40 : messageLayout.width + 40, // Allow space for avatar
                                zIndex: 50,
                            }}
                        >
                            <MessageBubble
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
                        </View>
                    )}

                    <TouchableWithoutFeedback>
                        <View style={styles.menuContainer}>
                            {messageLayout && (
                                <>
                                    {/* Reactions Row - centered above message */}
                                    <Animated.View
                                        style={[
                                            styles.reactionsRowPositioned,
                                            {
                                                top: messageLayout.y - 46, // ~8px above the bubble
                                                left: messageLayout.x,
                                                width: messageLayout.width,
                                                alignItems: 'center', // Center over the bubble
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
                                                                // TODO: Show more reactions
                                                            } else {
                                                                onReact(emoji);
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

                                    {/* Actions Row - Vertical for WhatsApp parity */}
                                    <Animated.View
                                        style={[
                                            styles.actionsRowPositioned,
                                            {
                                                top: messageLayout.y + messageLayout.height + 8, // Exact 8px gap
                                                left: messageLayout.x,
                                                width: messageLayout.width,
                                                alignItems: isMe ? 'flex-end' : 'flex-start', // Align to bubble edge
                                                transform: [{ scale: scaleAnim }],
                                                opacity: fadeAnim
                                            }
                                        ]}
                                    >
                                        <BlurView intensity={100} tint="light" style={styles.actionsRow}>
                                            <Pressable onPress={onReply} style={styles.actionButton}>
                                                <Text style={styles.actionText}>Reply</Text>
                                                <MessageCircle size={20} color="#333" />
                                            </Pressable>

                                            <View style={styles.separator} />

                                            <Pressable onPress={onCopy} style={styles.actionButton}>
                                                <Text style={styles.actionText}>Copy</Text>
                                                <Copy size={20} color="#333" />
                                            </Pressable>

                                            <View style={styles.separator} />

                                            <Pressable
                                                onPress={() => {
                                                    const { Alert } = require('react-native');
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
                                                    <Pressable onPress={onEdit} style={styles.actionButton}>
                                                        <Text style={styles.actionText}>Edit</Text>
                                                        <Edit2 size={20} color="#333" />
                                                    </Pressable>

                                                    <View style={styles.separator} />
                                                    <Pressable onPress={onDelete} style={styles.actionButton}>
                                                        <Text style={[styles.actionText, { color: '#ff3b30' }]}>Delete</Text>
                                                        <Trash2 size={20} color="#ff3b30" />
                                                    </Pressable>
                                                </>
                                            )}
                                        </BlurView>
                                    </Animated.View>
                                </>
                            )}
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

