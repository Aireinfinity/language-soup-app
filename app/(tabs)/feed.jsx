/**
 * Main area: group chat, or DMs list when user picks "DMs" from the picker.
 * Language Soup = one challenge of the day, all responses with language tags.
 * No navigation: switching group/DMs happens in place via FeedContext.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { GroupChatView } from '../chat/[id]';
import { DMsListInFeed } from '../../components/DMsListInFeed';
import { useFeed } from '../../contexts/FeedContext';
import { track, AnalyticsEvents } from '../../lib/analytics';

export default function FeedScreen() {
    const router = useRouter();
    const { selectedGroupId, setSelectedGroupId, LANGUAGE_SOUP_GROUP_ID, DM_LIST_ID } = useFeed();
    const isDMs = selectedGroupId === DM_LIST_ID;
    const groupId = selectedGroupId ?? LANGUAGE_SOUP_GROUP_ID;
    const isLanguageSoup = !isDMs && (groupId === LANGUAGE_SOUP_GROUP_ID || selectedGroupId === null);

    useFocusEffect(
        React.useCallback(() => {
            track(AnalyticsEvents.FEED_VIEW, {});
        }, [])
    );

    if (isDMs) {
        return (
            <View style={styles.container}>
                <DMsListInFeed onSelectGroup={setSelectedGroupId} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GroupChatView
                groupId={groupId}
                embedded
                merged={isLanguageSoup}
                showLanguageTags={isLanguageSoup}
                oneChallengePerDayEnglish={isLanguageSoup}
                onOpenGroupInfo={() => router.push(`/group-info?id=${groupId}`)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 0,
    },
});
