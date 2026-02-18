/**
 * Main area: one group chat. "Language Soup" = one challenge of the day, all responses with language tags.
 * When you tap a group on the left, that group's chat loads here (same layout, no navigation).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GroupChatView } from '../chat/[id]';
import { useFeed } from '../../contexts/FeedContext';

export default function FeedScreen() {
    const router = useRouter();
    const { selectedGroupId, LANGUAGE_SOUP_GROUP_ID } = useFeed();
    const groupId = selectedGroupId ?? LANGUAGE_SOUP_GROUP_ID;
    const isLanguageSoup = groupId === LANGUAGE_SOUP_GROUP_ID;

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
