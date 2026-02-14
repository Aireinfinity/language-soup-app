import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useQuests } from '../contexts/QuestContext';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

const TAB_BAR_HEIGHT = 90;
const STRIP_HEIGHT = 44;

export { TAB_BAR_HEIGHT, STRIP_HEIGHT };

export default function QuestStrip() {
    const { QUESTS, totalCompleted, totalQuests, isQuestCompleted } = useQuests();
    const [expanded, setExpanded] = useState(false);

    const progressPercentage = totalQuests > 0 ? (totalCompleted / totalQuests) * 100 : 0;

    return (
        <>
            <View style={[styles.strip, { bottom: TAB_BAR_HEIGHT }]}>
                <Pressable
                    style={styles.stripPressable}
                    onPress={() => setExpanded(true)}
                >
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                    </View>
                    <View style={styles.textRow}>
                        <Text style={styles.progressText}>
                            {totalCompleted}/{totalQuests} quests
                        </Text>
                        {totalCompleted === totalQuests && (
                            <Text style={styles.completeBadge}>COMPLETE</Text>
                        )}
                        <ChevronUp size={14} color="rgba(255,255,255,0.9)" />
                    </View>
                </Pressable>
            </View>

            <Modal
                visible={expanded}
                transparent
                animationType="slide"
                onRequestClose={() => setExpanded(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setExpanded(false)}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Quests</Text>
                            <Pressable onPress={() => setExpanded(false)} hitSlop={12}>
                                <ChevronDown size={24} color={SOUP_COLORS.blue} />
                            </Pressable>
                        </View>
                        <View style={styles.questList}>
                            {QUESTS.map((quest) => {
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
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    strip: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: STRIP_HEIGHT,
        backgroundColor: '#19b091',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    stripPressable: {
        flex: 1,
        justifyContent: 'center',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    textRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    completeBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.cream,
        letterSpacing: 0.5,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 34,
        paddingHorizontal: 20,
    },
    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
    },
    questList: {
        gap: 4,
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    questEmoji: {
        fontSize: 18,
    },
    questTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#1C1C1E',
    },
    questTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#8E8E93',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
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
});
