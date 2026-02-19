import React, { createContext, useContext, useState, useMemo } from 'react';

const LANGUAGE_SOUP_GROUP_ID = '00000000-0000-0000-0000-000000000000';
/** Special id: show DMs list in feed instead of a group chat */
const DM_LIST_ID = 'dms';

const FeedContext = createContext({
    selectedGroupId: null,
    setSelectedGroupId: () => {},
    LANGUAGE_SOUP_GROUP_ID,
    DM_LIST_ID,
});

export function FeedProvider({ children }) {
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const value = useMemo(
        () => ({ selectedGroupId, setSelectedGroupId, LANGUAGE_SOUP_GROUP_ID, DM_LIST_ID }),
        [selectedGroupId]
    );
    return (
        <FeedContext.Provider value={value}>
            {children}
        </FeedContext.Provider>
    );
}

export function useFeed() {
    const ctx = useContext(FeedContext);
    if (!ctx) throw new Error('useFeed must be used within FeedProvider');
    return ctx;
}

export { LANGUAGE_SOUP_GROUP_ID, DM_LIST_ID };
