import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

const QuestContext = createContext();

// Quest definitions with metadata
export const QUESTS = [
    { id: 'join_group', title: 'Join a Group', emoji: '🍜', description: 'Join your first language group' },
    { id: 'first_text', title: 'Send a Text', emoji: '💬', description: 'Send your first text message' },
    { id: 'first_audio', title: 'Send Audio', emoji: '🎙️', description: 'Send your first voice memo' },
    { id: 'reply_challenge', title: 'Reply to Challenge', emoji: '🎯', description: 'Respond to a daily challenge' },
    { id: 'community_chat', title: 'Say Hi in Community', emoji: '👋', description: 'Send a message in the community chat' },
    { id: 'view_profile', title: 'Check Your Profile', emoji: '👤', description: 'Visit your profile page' },
    { id: 'peek_active_groups', title: 'Peek at Active Groups', emoji: '👀', description: 'Check out the most active groups' },
    { id: 'send_bug', title: 'Report a Bug', emoji: '🐛', description: 'Send a message to Noah in support' },
    { id: 'request_language', title: 'Request a Language', emoji: '🌍', description: 'Request a new language to be added' },
];

export const QuestProvider = ({ children }) => {
    const { user } = useAuth();
    const [questProgress, setQuestProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [totalCompleted, setTotalCompleted] = useState(0);

    useEffect(() => {
        if (user) {
            loadQuestProgress();
            subscribeToQuestUpdates();
        }
    }, [user]);

    const loadQuestProgress = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_user_quest_progress', { uid: user.id });

            if (error) throw error;

            // Convert array to object for easy lookup
            const progressMap = {};
            data?.forEach(quest => {
                progressMap[quest.quest_id] = {
                    completed: quest.completed,
                    completedAt: quest.completed_at,
                    seenCelebration: quest.seen_celebration,
                };
            });

            setQuestProgress(progressMap);
            setTotalCompleted(data?.length || 0);
        } catch (error) {
            console.error('Error loading quest progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToQuestUpdates = () => {
        const subscription = supabase
            .channel('quest_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'app_user_quests',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Quest update received:', payload);
                    loadQuestProgress();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const completeQuest = async (questId) => {
        if (!user) return false;

        // Check if already completed
        if (questProgress[questId]?.completed) {
            console.log(`Quest ${questId} already completed`);
            return false;
        }

        try {
            const { data, error } = await supabase
                .rpc('complete_quest', { uid: user.id, qid: questId });

            if (error) throw error;

            // If quest was newly completed (data = true)
            if (data) {
                // Haptic feedback
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Immediately reload progress to update UI
                await loadQuestProgress();

                // Show celebration after reload
                const quest = QUESTS.find(q => q.id === questId);
                showCelebration(quest);

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error completing quest:', error);
            return false;
        }
    };

    const showCelebration = (quest) => {
        if (!quest) return;

        // Check if this was the last quest
        const allCompleted = Object.keys(questProgress).length + 1 === QUESTS.length;

        if (allCompleted) {
            Alert.alert(
                `🎉 ALL QUESTS COMPLETE! 🎉`,
                `You've completed every quest!\n\nYou're officially a Language Soup master! 🥣✨`,
                [
                    {
                        text: 'Amazing! 🔥',
                        onPress: async () => {
                            await supabase.rpc('mark_celebration_seen', {
                                uid: user.id,
                                qid: quest.id,
                            });
                        },
                    },
                ]
            );
        } else {
            Alert.alert(
                `${quest.emoji} Quest Complete!`,
                `${quest.title}\n\n${quest.description}`,
                [
                    {
                        text: 'Nice! 🎉',
                        onPress: async () => {
                            await supabase.rpc('mark_celebration_seen', {
                                uid: user.id,
                                qid: quest.id,
                            });
                        },
                    },
                ]
            );
        }
    };

    const isQuestCompleted = (questId) => {
        return questProgress[questId]?.completed || false;
    };

    const getQuestCompletionDate = (questId) => {
        return questProgress[questId]?.completedAt || null;
    };

    return (
        <QuestContext.Provider
            value={{
                questProgress,
                totalCompleted,
                totalQuests: QUESTS.length,
                loading,
                completeQuest,
                isQuestCompleted,
                getQuestCompletionDate,
                QUESTS,
            }}
        >
            {children}
        </QuestContext.Provider>
    );
};

export const useQuests = () => {
    const context = useContext(QuestContext);
    if (!context) {
        throw new Error('useQuests must be used within QuestProvider');
    }
    return context;
};
