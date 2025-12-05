import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing
} from 'react-native-reanimated';

const BAR_COUNT = 20;

export function LiveAudioWaveform({ metering }) {
    return (
        <View style={styles.container}>
            {Array.from({ length: BAR_COUNT }).map((_, index) => (
                <LiveBar key={index} index={index} metering={metering} />
            ))}
        </View>
    );
}

const LiveBar = ({ index, metering }) => {
    const height = useSharedValue(4);

    useEffect(() => {
        // Convert metering (dB) to a normalized height (0 to 1)
        // Metering is usually -160 (silence) to 0 (loudest)
        const normalized = Math.max(0, (metering + 60) / 60);

        // Calculate target height with some randomness for "alive" feel
        const centerFactor = 1 - Math.abs(index - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const randomVariation = Math.random() * 0.4;
        const targetHeight = Math.max(0.1, Math.min(1, normalized * centerFactor + randomVariation)) * 24; // Max height 24

        height.value = withTiming(Math.max(4, targetHeight), {
            duration: 50, // Match update frequency
            easing: Easing.linear
        });
    }, [metering]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: interpolateOpacity(height.value)
    }));

    return <Animated.View style={[styles.bar, animatedStyle]} />;
};

// Helper to interpolate opacity based on height for extra visual flair
function interpolateOpacity(height) {
    'worklet';
    // Map height 4-24 to opacity 0.5-1
    return 0.5 + (height - 4) / 20 * 0.5;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 30,
        gap: 2,
    },
    bar: {
        width: 3,
        backgroundColor: Colors.primary,
        borderRadius: 1.5,
    },
});
