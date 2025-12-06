import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const BAR_COUNT = 90; // Perfect length - slightly longer
const BAR_INTERVAL = 50; // Faster for more sensitivity

export function LiveAudioWaveform({ metering, recordingDuration }) {
    const [barHeights, setBarHeights] = useState([]);
    const lastBarTime = useRef(0);

    useEffect(() => {
        const currentTime = recordingDuration * 1000;

        if (currentTime - lastBarTime.current >= BAR_INTERVAL) {
            const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
            const height = Math.max(0, normalized);

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
        damping: 4 + Math.random() * 2,      // 4-6 (very low = ultra fluid, flowing like water)
        stiffness: 90 + Math.random() * 30,  // 90-120 (gentle, smooth waves)
        mass: 0.3 + Math.random() * 0.2,     // 0.3-0.5 (very light = responsive, flowing)
        delay: Math.random() * 25,           // Gentle cascade for wave effect
    }).current;

    useEffect(() => {
        const targetHeight = Math.max(3, height * 20); // Smaller max height (20px)

        // Stagger animation slightly for wave effect
        setTimeout(() => {
            animatedHeight.value = withSpring(targetHeight, {
                damping: barPersonality.damping,
                stiffness: barPersonality.stiffness,
                mass: barPersonality.mass,
            });
        }, barPersonality.delay);
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
