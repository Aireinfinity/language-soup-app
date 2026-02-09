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

// Expanded curated list of popular reactions
const DEFAULT_REACTIONS = [
    '❤️', '😂', '🔥', '😮', '😢', '😍',
    '👍', '👎', '🎉', '👏', '🙏', '👀',
    '💯', '🤔', '😡', '🤢', '🤮', '🤯',
    '👋', '🤝', '💪', '🧠', '💩', '👻'
];

/**
 * ReactionPicker - Bottom sheet modal for selecting reactions
 * Clean design matching mini-player aesthetic
 */
export function ReactionPicker({ visible, onClose, onReact }) {

    const handleReaction = (emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReact(emoji);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    entering={SlideInDown.duration(200)}
                    exiting={SlideOutDown.duration(180)}
                    style={styles.container}
                >
                    <Text style={styles.headerText}>React</Text>

                    {/* Main reactions grid */}
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
                    </View>
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
    headerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
    }
});
