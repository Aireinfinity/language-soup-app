import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '../constants/Colors';

const CARD_COLORS = [
    '#00adef', // Blue
    '#ec008b', // Pink
    '#19b091', // Teal
];

export function ChallengeCard({ title, description, timeLeft, style }) {
    // Pick a random color based on title length to be deterministic but varied
    const colorIndex = title.length % CARD_COLORS.length;
    const backgroundColor = CARD_COLORS[colorIndex];

    return (
        <View style={[styles.card, { backgroundColor }, style]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <ThemedText style={styles.title}>{title}</ThemedText>
                    <View style={styles.timeContainer}>
                        <ThemedText style={styles.timeText}>{timeLeft}</ThemedText>
                    </View>
                </View>
                <ThemedText style={styles.description}>{description}</ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    content: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 12,
    },
    timeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    timeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 24,
    },
});
