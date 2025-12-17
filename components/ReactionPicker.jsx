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
export function ReactionPicker({ visible, onClose, onReact }) {
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customEmoji, setCustomEmoji] = useState('');

    const handleReaction = (emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReact(emoji);
        onClose();
        setShowCustomInput(false);
        setCustomEmoji('');
    };

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

                    {/* Custom emoji input */}
                    {showCustomInput && (
                        <Animated.View entering={FadeIn.duration(150)} style={styles.customInputContainer}>
                            <TextInput
                                style={styles.customInput}
                                placeholder="Type any emoji..."
                                placeholderTextColor="#999"
                                value={customEmoji}
                                onChangeText={setCustomEmoji}
                                maxLength={4}
                                autoFocus
                            />
                            <Pressable
                                style={[
                                    styles.sendCustomButton,
                                    !customEmoji.trim() && styles.sendCustomButtonDisabled
                                ]}
                                onPress={handleCustomEmoji}
                                disabled={!customEmoji.trim()}
                            >
                                <Text style={styles.sendCustomText}>
                                    Add
                                </Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Close button - minimal like mini-player */}
                    <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={10}>
                        <X size={20} color="#666" strokeWidth={2.5} />
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    reactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 4,
    },
    reactionButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cream,
    },
    reactionEmoji: {
        fontSize: 30,
    },
    customButton: {
        backgroundColor: SOUP_COLORS.blue,
    },
    customButtonText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#fff',
    },
    customInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    customInput: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        borderWidth: 0,
    },
    sendCustomButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12,
    },
    sendCustomButtonDisabled: {
        opacity: 0.4,
    },
    sendCustomText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 6,
    },
});
