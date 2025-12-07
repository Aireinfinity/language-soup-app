import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const BAR_COUNT = 300; // Lots of bars for smooth continuous scroll
const BAR_INTERVAL = 17; // 300 bars * 17ms = 5100ms ≈ 5 seconds

export function LiveAudioWaveform({ metering, recordingDuration }) {
    const [barHeights, setBarHeights] = useState([]);
    const lastBarTime = useRef(0);
    const animationFrame = useRef(null);
    const meteringRef = useRef(metering);

    // Keep metering in a ref to avoid recreating the animation loop
    useEffect(() => {
        meteringRef.current = metering;
    }, [metering]);

    useEffect(() => {
        // Continuous time-based updates like WhatsApp
        const updateBars = () => {
            const currentTime = Date.now();

            if (currentTime - lastBarTime.current >= BAR_INTERVAL) {
                // Height based on actual audio level
                const normalized = Math.max(0, Math.min(1, (meteringRef.current + 60) / 60));
                const height = Math.max(0.15, normalized);

                setBarHeights(prev => {
                    const newHeights = [height, ...prev];
                    return newHeights.slice(0, BAR_COUNT);
                });

                lastBarTime.current = currentTime;
            }

            animationFrame.current = requestAnimationFrame(updateBars);
        };

        if (recordingDuration > 0) {
            animationFrame.current = requestAnimationFrame(updateBars);
        }

        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, [recordingDuration]); // Only depend on recordingDuration, not metering

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
                    key={index}
                    height={height}
                />
            ))}
        </View>
    );
}

const SilkyBar = ({ height }) => {
    const animatedHeight = useSharedValue(3);

    const barPersonality = useRef({
        damping: 15,
        stiffness: 120,
        mass: 0.7,
    }).current;

    useEffect(() => {
        const targetHeight = Math.max(3, height * 22);

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
