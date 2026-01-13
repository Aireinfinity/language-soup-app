import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * SoupBowlPopup - Shows who reacted in soup bowl shape
 */
export function SoupBowlPopup({ visible, reactions, userMap = {}, isMe, onClose }) {
    const [shouldFlipUp, setShouldFlipUp] = useState(false);

    if (!visible || !reactions || reactions.length === 0) return null;

    // Group reactions by emoji
    const grouped = {};
    reactions.forEach(reaction => {
        const emoji = reaction.emoji;
        if (!grouped[emoji]) {
            grouped[emoji] = [];
        }
        grouped[emoji].push(reaction);
    });

    const handleLayout = (event) => {
        // Check if popup would be cut off at bottom
        const { height } = event.nativeEvent.layout;
        // Simple heuristic - if we're in bottom 30% of screen, flip up
        setShouldFlipUp(height > 150);
    };

    return (
        <>
            <Pressable style={styles.backdrop} onPress={onClose} />

            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={[
                    styles.bowl,
                    isMe ? styles.bowlMe : styles.bowlThem,
                    shouldFlipUp && styles.bowlFlipped
                ]}
                onLayout={handleLayout}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.entries(grouped).map(([emoji, emojiReactions]) => (
                        <View key={emoji} style={styles.emojiSection}>
                            <Text style={styles.emojiHeader}>{emoji}</Text>
                            {emojiReactions.map((reaction, index) => {
                                const user = userMap[reaction.user_id];
                                const userName = user?.display_name || 'User';
                                const avatarUrl = user?.avatar_url;

                                return (
                                    <View key={reaction.id || index} style={styles.userRow}>
                                        {avatarUrl ? (
                                            <Image
                                                source={getAvatarSource(avatarUrl)}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                                <Text style={styles.avatarText}>
                                                    {userName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.userName}>{userName}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: -10000,
        left: -10000,
        right: -10000,
        bottom: -10000,
        zIndex: 4999,
    },
    bowl: {
        position: 'absolute',
        top: '100%',
        marginTop: 8,
        minWidth: 160,
        maxWidth: 220,
        maxHeight: 200,
        backgroundColor: '#fff',
        // Soup bowl shape
        borderRadius: 20,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingTop: 14,
        paddingBottom: 10,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        zIndex: 5000,
    },
    bowlMe: {
        right: 0,
    },
    bowlThem: {
        left: 0,
    },
    bowlFlipped: {
        bottom: '100%',
        top: 'auto',
        marginTop: 0,
        marginBottom: 8,
    },
    content: {
        flex: 1,
    },
    emojiSection: {
        marginBottom: 12,
    },
    emojiHeader: {
        fontSize: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    userName: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
});
