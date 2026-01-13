import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * ReactionDetailsPopup - Contextual popup showing who reacted
 * Appears directly under the message bubble with horizontal avatar stacking
 */
export function ReactionDetailsPopup({ visible, reactions, userMap = {}, isMe }) {
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

    return (
        <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[styles.container, isMe ? styles.containerMe : styles.containerThem]}
        >
            {Object.entries(grouped).map(([emoji, emojiReactions]) => (
                <View key={emoji} style={styles.emojiRow}>
                    <Text style={styles.emoji}>{emoji}</Text>
                    <View style={styles.avatarStack}>
                        {emojiReactions.slice(0, 5).map((reaction, index) => {
                            const user = userMap[reaction.user_id];
                            const avatarUrl = user?.avatar_url;
                            const userName = user?.display_name || 'User';

                            return (
                                <View
                                    key={reaction.id || index}
                                    style={[
                                        styles.avatarWrapper,
                                        index > 0 && { marginLeft: -8 }
                                    ]}
                                >
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
                                </View>
                            );
                        })}
                        {emojiReactions.length > 5 && (
                            <View style={[styles.avatarWrapper, { marginLeft: -8 }]}>
                                <View style={[styles.avatar, styles.moreAvatar]}>
                                    <Text style={styles.moreText}>
                                        +{emojiReactions.length - 5}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            ))}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: '100%',
        marginTop: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        zIndex: 5000, // Above bubbles
        maxWidth: 250,
    },
    containerMe: {
        right: 0,
    },
    containerThem: {
        left: 0,
    },
    emojiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
        gap: 8,
    },
    emoji: {
        fontSize: 20,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#fff',
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
    moreAvatar: {
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
    },
});
