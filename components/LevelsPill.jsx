/**
 * Gamified levels pill for header: speak + listen with progress bars. Tap to open LevelsInfoSheet.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    cream: '#FDF5E6',
};

const MAX_LEVEL = 6;

function ProgressBar({ level, emoji, label }) {
    const progress = Math.min(1, (level || 1) / MAX_LEVEL);
    return (
        <View style={styles.barWrap}>
            <View style={styles.barRow}>
                <Text style={styles.barEmoji}>{emoji}</Text>
                <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.barLevel}>Lv.{level || 1}</Text>
            </View>
        </View>
    );
}

export function LevelsPill({ speakLevel = 1, listenLevel = 1, onPress }) {
    return (
        <Pressable
            style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}
            onPress={onPress}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>levels</Text>
                <ProgressBar level={speakLevel} emoji="🎤" />
                <ProgressBar level={listenLevel} emoji="👂" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    inner: {
        minWidth: 88,
    },
    title: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    barWrap: {
        marginBottom: 4,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    barEmoji: {
        fontSize: 12,
    },
    track: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.green,
    },
    barLevel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
        minWidth: 24,
    },
});
