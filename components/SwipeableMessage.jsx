import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet, Platform } from 'react-native';
import { Reply } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const SWIPE_THRESHOLD = 70; // Pixels to swipe before triggering reply
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
};

/**
 * SwipeableMessage Component
 * Wraps a message bubble with swipe-to-reply gesture
 * Swipe right to trigger reply action
 */
export function SwipeableMessage({ children, onReply, disabled = false }) {
    const translateX = useRef(new Animated.Value(0)).current;
    const hasTriggeredHaptic = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only respond to horizontal swipes (right direction)
                return !disabled && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderGrant: () => {
                hasTriggeredHaptic.current = false;
            },
            onPanResponderMove: (evt, gestureState) => {
                // Only allow swiping to the right, cap at threshold
                const newValue = Math.min(Math.max(0, gestureState.dx), SWIPE_THRESHOLD + 20);
                translateX.setValue(newValue);

                // Trigger haptic feedback when reaching threshold
                if (gestureState.dx >= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
                    if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    hasTriggeredHaptic.current = true;
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // If swiped past threshold, trigger reply
                if (gestureState.dx >= SWIPE_THRESHOLD) {
                    onReply && onReply();
                }

                // Animate back to original position
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    speed: 20,
                    bounciness: 8,
                }).start();
            },
        })
    ).current;

    // Calculate icon opacity based on swipe progress
    const iconOpacity = translateX.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // Calculate icon scale for bounce effect
    const iconScale = translateX.interpolate({
        inputRange: [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
        outputRange: [0.5, 0.8, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Reply icon that appears behind the message */}
            <Animated.View
                style={[
                    styles.replyIconContainer,
                    {
                        opacity: iconOpacity,
                        transform: [{ scale: iconScale }],
                    },
                ]}
            >
                <Reply size={24} color={SOUP_COLORS.blue} />
            </Animated.View>

            {/* The actual message content - wrapped in animated view */}
            <Animated.View
                style={{
                    transform: [{ translateX }],
                }}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    replyIconContainer: {
        position: 'absolute',
        left: 16,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
});
