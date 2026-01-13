import React, { useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Easing } from 'react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

export function FloatingAvatars({ users = [], onUserPress }) {
    if (!users || users.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {users.map((user, index) => (
                    <FloatingAvatar
                        key={user.id}
                        user={user}
                        index={index}
                        onPress={() => onUserPress(user)}
                    />
                ))}
            </View>
        </View>
    );
}

const FloatingAvatar = memo(function FloatingAvatar({ user, index, onPress }) {
    const bobAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Stagger animation start times
        const delay = index * 100;

        // Bob animation
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bobAnim, {
                        toValue: -5,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(bobAnim, {
                        toValue: 0,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }, delay);

        // Pulse animation
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }, delay);
    }, [index]);

    // Random offset and rotation for playful layout
    // Memoize these random values so they don't change on re-render unless index changes
    const randomOffset = useRef({
        marginLeft: (Math.random() - 0.5) * 10,
        marginTop: (Math.random() - 0.5) * 10,
    }).current;

    const randomRotation = useRef(`${(Math.random() - 0.5) * 10}deg`).current;

    // Get language flags
    const languages = user.fluent_languages || user.learning_languages || [];
    const flags = languages.slice(0, 3).map(lang => getLanguageFlag(lang));

    return (
        <Animated.View
            style={[
                styles.avatarContainer,
                randomOffset,
                {
                    transform: [
                        { translateY: bobAnim },
                        { scale: scaleAnim },
                        { rotate: randomRotation },
                    ],
                },
            ]}
        >
            <Pressable onPress={onPress} style={styles.avatarPressable}>
                {user.avatar_url ? (
                    <Image
                        source={getAvatarSource(user.avatar_url)}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                            {user.display_name?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                )}

                {/* Language flag badges */}
                {flags.length > 0 && (
                    <View style={styles.flagBadge}>
                        <Text style={styles.flagText}>
                            {flags.join('')}
                        </Text>
                    </View>
                )}
            </Pressable>

            {/* Name and Tagline */}
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {user.display_name}
                </Text>
                {user.status_text && (
                    <Text style={styles.userTagline} numberOfLines={1}>
                        {user.status_text}
                    </Text>
                )}
            </View>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 16,
        marginTop: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 16,
    },
    avatarContainer: {
        width: 80,
        height: 120, // Space for name + tagline
        marginBottom: 8,
    },
    avatarPressable: {
        width: 80,
        height: 80,
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: '#e1e1e1', // Placeholder color
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarInitial: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    flagBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    flagText: {
        fontSize: 12,
    },
    userInfo: {
        marginTop: 6,
        width: 80,
        alignItems: 'center',
    },
    userName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2d3436',
        textAlign: 'center',
    },
    userTagline: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#636e72',
        textAlign: 'center',
        marginTop: 2,
    },
});
