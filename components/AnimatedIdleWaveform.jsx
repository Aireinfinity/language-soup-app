import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

const BAR_COUNT = 24;
const TICK_MS = 80;

// One bar: height follows a traveling wave (phase offset per bar)
function IdleBar({ index, color, barWidth, maxHeight, totalBars }) {
    const phase = (index / Math.max(1, totalBars)) * Math.PI * 2;
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 1800, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const wave = (Math.sin(progress.value + phase) + 1) * 0.5; // 0..1
        const h = Math.max(6, maxHeight * (0.3 + wave * 0.7));
        return { height: h };
    });

    return (
        <Animated.View
            style={[
                styles.bar,
                { width: barWidth, borderRadius: barWidth / 2, backgroundColor: color },
                animatedStyle,
            ]}
        />
    );
}

// Dots variant: circles that scale up/down in a wave (clearly different from bars)
function IdleDot({ index, color, barWidth, maxHeight, totalBars }) {
    const phase = (index / Math.max(1, totalBars)) * Math.PI * 2;
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 1600, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const wave = (Math.sin(progress.value + phase) + 1) * 0.5;
        const scale = 0.4 + wave * 0.6;
        return {
            transform: [{ scale }],
            opacity: 0.7 + wave * 0.3,
        };
    });

    const size = Math.min(barWidth, maxHeight);
    return (
        <Animated.View
            style={[
                styles.dot,
                { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
                animatedStyle,
            ]}
        />
    );
}

// Silky variant: very smooth, slow wave, rounded bars (feels silky)
function IdleBarSilky({ index, color, barWidth, maxHeight, totalBars }) {
    const phase = (index / Math.max(1, totalBars)) * Math.PI * 2;
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const wave = (Math.sin(progress.value + phase) + 1) * 0.5;
        const h = Math.max(8, maxHeight * (0.4 + wave * 0.6));
        return { height: h };
    });

    const radius = Math.max(barWidth, 8);
    return (
        <Animated.View
            style={[
                styles.barSilky,
                { width: barWidth, borderRadius: radius, backgroundColor: color },
                animatedStyle,
            ]}
        />
    );
}

// Pill variant: fatter, rounder bars (softer look)
function IdleBarPill({ index, color, barWidth, maxHeight, totalBars }) {
    const phase = (index / Math.max(1, totalBars)) * Math.PI * 2;
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(Math.PI * 2, { duration: 2200, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const wave = (Math.sin(progress.value + phase) + 1) * 0.5;
        const h = Math.max(8, maxHeight * (0.35 + wave * 0.65));
        return { height: h };
    });

    return (
        <Animated.View
            style={[
                styles.barPill,
                { width: barWidth, borderRadius: barWidth, backgroundColor: color },
                animatedStyle,
            ]}
        />
    );
}

export function AnimatedIdleWaveform({
    color = '#fff',
    barCount = BAR_COUNT,
    barWidth = 4,
    maxHeight = 28,
    style,
    variant = 'bars', // 'bars' | 'pill' | 'dots' | 'silky'
}) {
    const isDots = variant === 'dots';
    const isPill = variant === 'pill';
    const isSilky = variant === 'silky';
    const BarComponent = isDots ? IdleDot : (isPill ? IdleBarPill : (isSilky ? IdleBarSilky : IdleBar));
    return (
        <View style={[styles.container, { height: maxHeight }, style]} pointerEvents="none">
            {Array.from({ length: barCount }).map((_, i) => (
                <BarComponent
                    key={i}
                    index={i}
                    color={color}
                    barWidth={barWidth}
                    maxHeight={maxHeight}
                    totalBars={barCount}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    bar: {
        minHeight: 6,
    },
    barPill: {
        minHeight: 8,
    },
    barSilky: {
        minHeight: 8,
    },
    dot: {},
});
