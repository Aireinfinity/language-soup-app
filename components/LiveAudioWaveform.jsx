import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

const BAR_COUNT = 28;
const UPDATE_INTERVAL_MS = 55;
const SMOOTHING = 0.25;
const BAR_WIDTH = 2.5;
const BAR_GAP = 1.5;

export function LiveAudioWaveform({ metering, recordingDuration, isRecording, color = Colors.primary }) {
    const [barHeights, setBarHeights] = useState([]);
    const lastUpdate = useRef(0);
    const smoothedLevel = useRef(0.15);
    const rafId = useRef(null);
    const meteringRef = useRef(metering);
    meteringRef.current = metering;

    useEffect(() => {
        if (!isRecording) return;

        const update = () => {
            const now = Date.now();
            if (now - lastUpdate.current >= UPDATE_INTERVAL_MS) {
                lastUpdate.current = now;
                const raw = Math.max(0, Math.min(1, (meteringRef.current + 60) / 60));
                smoothedLevel.current = smoothedLevel.current + (raw - smoothedLevel.current) * (1 - SMOOTHING);
                const height = Math.max(0.1, Math.min(1, smoothedLevel.current));

                setBarHeights((prev) => {
                    const next = [height, ...prev].slice(0, BAR_COUNT);
                    return next;
                });
            }
            rafId.current = requestAnimationFrame(update);
        };
        lastUpdate.current = 0;
        rafId.current = requestAnimationFrame(update);
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [isRecording]);

    useEffect(() => {
        if (recordingDuration === 0) {
            setBarHeights([]);
            smoothedLevel.current = 0.15;
        }
    }, [recordingDuration]);

    return (
        <View style={styles.container}>
            {barHeights.map((height, index) => (
                <View
                    key={index}
                    style={[
                        styles.bar,
                        { backgroundColor: color, height: 4 + height * 24 },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: 28,
        flex: 1,
        gap: BAR_GAP,
        paddingHorizontal: 2,
        minWidth: 0,
    },
    bar: {
        width: BAR_WIDTH,
        borderRadius: 1.5,
    },
});
