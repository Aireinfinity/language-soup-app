import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { useQuests } from '../contexts/QuestContext';
import { Colors } from '../constants/Colors';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDDEN_KEY = 'quest_progress_hidden';

export default function QuestProgress() {
    const { QUESTS, totalCompleted, totalQuests, isQuestCompleted } = useQuests();
    const [expanded, setExpanded] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
        checkHiddenStatus();
    }, []);

    useEffect(() => {
        Animated.spring(animation, {
            toValue: expanded ? 1 : 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
        }).start();
    }, [expanded]);

    const checkHiddenStatus = async () => {
        try {
            const isHidden = await AsyncStorage.getItem(HIDDEN_KEY);
            setHidden(isHidden === 'true');
        } catch (error) {
            console.error('Error checking hidden status:', error);
        }
    };

    const handleHide = async () => {
        try {
            await AsyncStorage.setItem(HIDDEN_KEY, 'true');
            setHidden(true);
        } catch (error) {
            console.error('Error hiding quest progress:', error);
        }
    };

    if (hidden || totalCompleted === totalQuests) {
        return null;
    }

    const maxHeight = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 400],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={styles.container}>
            {/* Collapsed Pill Button */}
            <Pressable
                style={styles.pill}
                onPress={() => setExpanded(!expanded)}
            >
                <Text style={styles.pillEmoji}>🎯</Text>
                <Text style={styles.pillText}>
                    {totalCompleted}/{totalQuests} quests
                </Text>
                {expanded ? (
                    <ChevronDown size={16} color={Colors.primary} />
                ) : (
                    <ChevronUp size={16} color={Colors.primary} />
                )}
            </Pressable>

            {/* Expanded Quest List */}
            <Animated.View
                style={[
                    styles.expandedContainer,
                    {
                        maxHeight,
                        opacity,
                    },
                ]}
                pointerEvents={expanded ? 'auto' : 'none'}
            >
                <View style={styles.expandedHeader}>
                    <Text style={styles.expandedTitle}>Your Quests</Text>
                    <Pressable onPress={handleHide} hitSlop={10}>
                        <X size={20} color={Colors.textLight} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.questList}
                    showsVerticalScrollIndicator={false}
                >
                    {QUESTS.map((quest, index) => {
                        const completed = isQuestCompleted(quest.id);
                        return (
                            <View
                                key={quest.id}
                                style={[
                                    styles.questItem,
                                    completed && styles.questItemCompleted,
                                ]}
                            >
                                <View style={styles.questLeft}>
                                    <Text style={styles.questEmoji}>{quest.emoji}</Text>
                                    <View style={styles.questTextContainer}>
                                        <Text
                                            style={[
                                                styles.questTitle,
                                                completed && styles.questTitleCompleted,
                                            ]}
                                        >
                                            {quest.title}
                                        </Text>
                                        <Text style={styles.questDescription}>
                                            {quest.description}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    style={[
                                        styles.checkbox,
                                        completed && styles.checkboxCompleted,
                                    ]}
                                >
                                    {completed && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                <Text style={styles.footerText}>
                    Complete all quests to unlock your soup master badge! 🏆
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        zIndex: 100,
    },
    pill: {
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        alignSelf: 'center',
    },
    pillEmoji: {
        fontSize: 18,
    },
    pillText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    expandedContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginTop: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    expandedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    expandedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    questList: {
        maxHeight: 280,
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    questItemCompleted: {
        opacity: 0.6,
    },
    questLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    questEmoji: {
        fontSize: 24,
    },
    questTextContainer: {
        flex: 1,
    },
    questTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    questTitleCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.textLight,
    },
    questDescription: {
        fontSize: 13,
        color: Colors.textLight,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.textLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCompleted: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    footerText: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        padding: 12,
        fontStyle: 'italic',
    },
});
