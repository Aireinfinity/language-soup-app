import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDecay
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const DEFAULT_REACTIONS = ['❤️', '😂', '😮', '😭', '🥳', '🙀'];

// Sub-component to safely use hooks per emoji without loop violations
const RotatingEmoji = ({ emoji, index, total, radius, rotation, onReact }) => {
    const angleStep = 360 / total;
    const angle = index * angleStep - 90;
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;

    const emojiStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x },
            { translateY: y },
            { rotate: `${-rotation.value}deg` }
        ]
    }));

    return (
        <Animated.View style={[styles.emojiButton, emojiStyle]}>
            <Pressable onPress={() => onReact(emoji)}>
                <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
        </Animated.View>
    );
};

export function FloatingReactionPicker({ visible, onReact, onClose, isMe }) {
    const rotation = useSharedValue(0);
    const lastAngle = useRef(0);

    const dialStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const centerX = 40;
                const centerY = 40;
                lastAngle.current = Math.atan2(locationY - centerY, locationX - centerX);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const centerX = 40;
                const centerY = 40;
                const angle = Math.atan2(locationY - centerY, locationX - centerX);
                const delta = (angle - lastAngle.current) * (180 / Math.PI);

                rotation.value = rotation.value + delta;
                lastAngle.current = angle;

                if (Math.abs(delta) > 2) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                const velocity = Math.sqrt(gestureState.vx ** 2 + gestureState.vy ** 2);
                if (velocity > 0.5) {
                    rotation.value = withDecay({
                        velocity: velocity * 100,
                        deceleration: 0.995,
                    });
                }
            },
        })
    ).current;

    if (!visible) return null;

    const handleReaction = (emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onReact(emoji);
        onClose();
    };

    return (
        <>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={[
                    styles.container,
                    isMe ? styles.containerMe : styles.containerThem
                ]}
                {...panResponder.panHandlers}
            >
                <Animated.View style={[styles.dial, dialStyle]}>
                    {DEFAULT_REACTIONS.map((emoji, index) => (
                        <RotatingEmoji
                            key={emoji}
                            emoji={emoji}
                            index={index}
                            total={DEFAULT_REACTIONS.length}
                            radius={35}
                            rotation={rotation}
                            onReact={handleReaction}
                        />
                    ))}
                </Animated.View>
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
        zIndex: 998,
    },
    container: {
        position: 'absolute',
        top: -20,
        zIndex: 999,
    },
    containerMe: {
        left: -20,
    },
    containerThem: {
        right: -20,
    },
    dial: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiButton: {
        position: 'absolute',
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 20,
    },
});
