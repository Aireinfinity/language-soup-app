import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useQuests } from '../contexts/QuestContext';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

export default function WaveformQuestBar() {
    const { QUESTS, totalCompleted, totalQuests, isQuestCompleted } = useQuests();
    const [expanded, setExpanded] = useState(false);

    const progressPercentage = (totalCompleted / totalQuests) * 100;

    return (
        <View style={styles.container}>
            {/* Collapsed Progress Bar */}
            <Pressable
                style={styles.barContainer}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.progressBarBackground}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${progressPercentage}%` }
                        ]}
                    />
                </View>

                <View style={styles.textRow}>
                    <Text style={styles.progressText}>
                        {totalCompleted}/{totalQuests} quests
                    </Text>
                    {totalCompleted === totalQuests && (
                        <Text style={styles.completeBadge}>🎉 COMPLETE!</Text>
                    )}
                    {expanded ? (
                        <ChevronUp size={14} color="#8E8E93" />
                    ) : (
                        <ChevronDown size={14} color="#8E8E93" />
                    )}
                </View>
            </Pressable>

            {/* Expanded Quest List */}
            {expanded && (
                <View style={styles.questList}>
                    {QUESTS.map((quest, index) => {
                        const completed = isQuestCompleted(quest.id);
                        return (
                            <View key={quest.id} style={styles.questItem}>
                                <Text style={styles.questEmoji}>{quest.emoji}</Text>
                                <Text
                                    style={[
                                        styles.questTitle,
                                        completed && styles.questTitleCompleted
                                    ]}
                                >
                                    {quest.title}
                                </Text>
                                <View style={[
                                    styles.checkbox,
                                    completed && styles.checkboxCompleted
                                ]}>
                                    {completed && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    barContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: 'rgba(0, 173, 239, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 2,
    },
    textRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8E8E93',
    },
    questList: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    questEmoji: {
        fontSize: 18,
    },
    questTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1C1C1E',
    },
    questTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#8E8E93',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#D1D1D6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCompleted: {
        backgroundColor: SOUP_COLORS.blue,
        borderColor: SOUP_COLORS.blue,
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    completeBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        letterSpacing: 0.5,
    },
});
