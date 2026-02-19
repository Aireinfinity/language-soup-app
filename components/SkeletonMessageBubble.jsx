import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { ChatStyles } from '../constants/ChatStyles';

export function SkeletonMessageBubble({ isMe }) {
    const opacity = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);

    return (
        <View style={[ChatStyles.messageRow, isMe ? ChatStyles.rowMe : ChatStyles.rowThem]}>
            {!isMe && (
                <View style={[ChatStyles.avatar, ChatStyles.avatarPlaceholder, styles.skeletonAvatar]} />
            )}
            <Animated.View
                style={[
                    ChatStyles.bubble,
                    isMe ? ChatStyles.bubbleMe : ChatStyles.bubbleThem,
                    { opacity },
                    styles.skeletonBubble,
                ]}
            >
                <View style={[styles.skeletonLine, { width: '80%' }]} />
                <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
            </Animated.View>
            {isMe && (
                <View style={[ChatStyles.avatar, ChatStyles.avatarPlaceholder, styles.skeletonAvatar]} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    skeletonAvatar: {
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    skeletonBubble: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
});

export const SKELETON_IDS = ['skeleton-0', 'skeleton-1', 'skeleton-2'];
