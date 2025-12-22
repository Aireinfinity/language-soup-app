import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '🎉'];

/**
 * InlineReactionBar - WhatsApp-style quick reaction picker
 * Appears directly above/below message on long press
 */
export function InlineReactionBar({ onReact, onMore, style }) {
    const handleReact = (emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReact(emoji);
    };

    const handleMore = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onMore) onMore();
    };

    return (
        <BlurView intensity={95} tint="light" style={[styles.container, style]}>
            <View style={styles.reactionsRow}>
                {QUICK_REACTIONS.map((emoji) => (
                    <Pressable
                        key={emoji}
                        style={styles.emojiButton}
                        onPress={() => handleReact(emoji)}
                    >
                        <Text style={styles.emoji}>{emoji}</Text>
                    </Pressable>
                ))}
                <Pressable style={styles.moreButton} onPress={handleMore}>
                    <Text style={styles.moreIcon}>+</Text>
                </Pressable>
            </View>
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    reactionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 4,
    },
    emojiButton: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    emoji: {
        fontSize: 26,
    },
    moreButton: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 21,
        backgroundColor: 'rgba(0,173,239,0.1)',
    },
    moreIcon: {
        fontSize: 24,
        fontWeight: '600',
        color: '#00adef',
    },
});
