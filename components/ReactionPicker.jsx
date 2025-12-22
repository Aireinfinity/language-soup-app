import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, FadeIn } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

// Default reaction emojis
const DEFAULT_REACTIONS = ['❤️', '😂', '😮', '😭', '🥳', '🙀'];

/**
 * ReactionPicker - Bottom sheet modal for selecting reactions
 * Clean design matching mini-player aesthetic
 */
export function ReactionPicker({ visible, onClose, onReact, defaultShowCustom = false }) {
    const [showCustomInput, setShowCustomInput] = React.useState(defaultShowCustom);
    const [customEmoji, setCustomEmoji] = React.useState('');

    const handleReaction = React.useCallback((emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReact(emoji);
        onClose();
        setShowCustomInput(false);
        setCustomEmoji('');
    }, [onReact, onClose]);

    // Update showCustomInput when visible changes if defaultShowCustom is true
    React.useEffect(() => {
        if (visible && defaultShowCustom) {
            setShowCustomInput(true);
        } else if (!visible) {
            // Reset when closing
            setShowCustomInput(false);
            setCustomEmoji('');
        }
    }, [visible, defaultShowCustom]);

    // Auto-submit when an emoji is picked from the native keyboard
    React.useEffect(() => {
        if (showCustomInput && customEmoji.length > 0) {
            // Check if it's likely a single emoji (emojis can be multichat surrogate pairs)
            // A simple heuristic for "just picked one thing"
            if (customEmoji.length >= 2 || (customEmoji.length === 1 && !customEmoji.match(/[a-zA-Z0-9]/))) {
                const timer = setTimeout(() => {
                    handleReaction(customEmoji);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [customEmoji, showCustomInput, handleReaction]);

    const handleCustomEmoji = () => {
        if (customEmoji.trim()) {
            handleReaction(customEmoji.trim());
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Animated.View
                    entering={SlideInDown.duration(200)}
                    exiting={SlideOutDown.duration(180)}
                    style={styles.container}
                >
                    {/* Main reactions */}
                    <View style={styles.reactionsRow}>
                        {DEFAULT_REACTIONS.map((emoji, index) => (
                            <Pressable
                                key={index}
                                style={styles.reactionButton}
                                onPress={() => handleReaction(emoji)}
                            >
                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                            </Pressable>
                        ))}

                        {/* Custom emoji button */}
                        <Pressable
                            style={[styles.reactionButton, styles.customButton]}
                            onPress={() => setShowCustomInput(!showCustomInput)}
                        >
                            <Text style={styles.customButtonText}>+</Text>
                        </Pressable>
                    </View>

                    {/* Hidden Custom emoji input - Visually hidden but auto-focused */}
                    {showCustomInput && (
                        <View style={styles.hiddenInputContainer}>
                            <TextInput
                                style={styles.hiddenInput}
                                value={customEmoji}
                                onChangeText={setCustomEmoji}
                                autoFocus={true}
                                blurOnSubmit={true}
                            />
                        </View>
                    )}
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 10,
    },
    reactionButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactionEmoji: {
        fontSize: 28,
    },
    customButton: {
        backgroundColor: '#f0f0f0',
    },
    customButtonText: {
        fontSize: 24,
        color: '#666',
        fontWeight: '300',
    },
    hiddenInputContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        bottom: -100, // Move off-screen
    },
    hiddenInput: {
        width: 1,
        height: 1,
    }
});
