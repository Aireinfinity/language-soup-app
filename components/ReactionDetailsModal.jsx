import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ScrollView } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * ReactionDetailsModal - Shows who reacted with what emoji
 * Clean design with just avatars grouped by emoji
 */
export function ReactionDetailsModal({ visible, onClose, reactions, userMap = {} }) {
    if (!reactions || reactions.length === 0) return null;

    // Group reactions by emoji
    const grouped = {};
    reactions.forEach(reaction => {
        const emoji = reaction.emoji;
        if (!grouped[emoji]) {
            grouped[emoji] = [];
        }
        grouped[emoji].push(reaction);
    });

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
                    <View style={styles.header}>
                        <Text style={styles.title}>Reactions</Text>
                        <Pressable onPress={handleClose} hitSlop={10}>
                            <X size={20} color="#666" strokeWidth={2.5} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {Object.entries(grouped).map(([emoji, emojiReactions]) => (
                            <View key={emoji} style={styles.emojiGroup}>
                                <Text style={styles.emoji}>{emoji}</Text>
                                <View style={styles.avatarRow}>
                                    {emojiReactions.map((reaction, index) => {
                                        const user = userMap[reaction.user_id];
                                        const avatarUrl = user?.avatar_url;
                                        const userName = user?.display_name || 'User';

                                        return (
                                            <View key={reaction.id || index} style={styles.avatarContainer}>
                                                {avatarUrl ? (
                                                    <Image
                                                        source={{ uri: avatarUrl }}
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
                                </View>
                            </View>
                        ))}
                    </ScrollView>
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
        maxHeight: '50%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    emojiGroup: {
        marginBottom: 16,
    },
    emoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    avatarRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    avatarContainer: {
        marginBottom: 4,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
