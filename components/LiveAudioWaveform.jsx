import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const BAR_COUNT = 90;
const BAR_INTERVAL = 55; // ~5 seconds to fill (90 bars * 55ms ≈ 5s)

export function LiveAudioWaveform({ metering, recordingDuration }) {
    const [barHeights, setBarHeights] = useState([]);
    const lastBarTime = useRef(0);

    useEffect(() => {
        const currentTime = recordingDuration * 1000;

        if (currentTime - lastBarTime.current >= BAR_INTERVAL) {
            // More sensitive to audio - lower threshold, wider range
            const normalized = Math.max(0, Math.min(1, (metering + 50) / 50));
            const height = Math.max(0.05, normalized); // Minimum height for silences

            setBarHeights(prev => {
                // Add new bar to BEGINNING so it appears on right with flex-end
                const newHeights = [height, ...prev];
                return newHeights.slice(0, BAR_COUNT); // Keep first BAR_COUNT items
            });

            lastBarTime.current = currentTime;
        }
    }, [metering, recordingDuration]);

    useEffect(() => {
        if (recordingDuration === 0) {
            setBarHeights([]);
            lastBarTime.current = 0;
        }
    }, [recordingDuration]);

    return (
        <View style={styles.container}>
            {/* Bars in natural order - newest on right (first in array), oldest on left */}
            {barHeights.map((height, index) => (
                <SilkyBar
                    key={`bar-${index}`}
                    height={height}
                />
            ))}
        </View>
    );
}

const SilkyBar = ({ height }) => {
    const animatedHeight = useSharedValue(3);

    const barPersonality = useRef({
        damping: 12 + Math.random() * 3,     // 12-15 (higher = honey smooth, no bounce)
        stiffness: 100 + Math.random() * 20, // 100-120 (moderate = smooth flow)
        mass: 0.5 + Math.random() * 0.2,     // 0.5-0.7 (balanced = honey viscosity)
        delay: 0,                             // No delay = smooth, not rippling
    }).current;

    useEffect(() => {
        const targetHeight = Math.max(3, height * 22); // Slightly taller bars

        animatedHeight.value = withSpring(targetHeight, {
            damping: barPersonality.damping,
            stiffness: barPersonality.stiffness,
            mass: barPersonality.mass,
        });
    }, [height]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: animatedHeight.value,
    }));

    return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse', // Reverse so right side is the start
        alignItems: 'center',
        justifyContent: 'flex-start', // Start from right edge
        height: 28,
        flex: 1,
        gap: 1,
        paddingHorizontal: 2,
    },
    bar: {
        width: 2,
        backgroundColor: Colors.primary,
        borderRadius: 1,
    },
});
