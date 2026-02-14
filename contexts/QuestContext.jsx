import React, { createContext, useContext } from 'react';

const QuestContext = createContext();

export const QUESTS = [];

export const QuestProvider = ({ children }) => {
    const value = {
        questProgress: {},
        totalCompleted: 0,
        totalQuests: 0,
        loading: false,
        completeQuest: async () => false,
        isQuestCompleted: () => false,
        getQuestCompletionDate: () => null,
        QUESTS: [],
    };
    return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
};

export const useQuests = () => {
    const context = useContext(QuestContext);
    if (!context) throw new Error('useQuests must be used within QuestProvider');
    return context;
};
