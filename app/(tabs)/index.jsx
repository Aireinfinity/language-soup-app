/**
 * Daily tab: no longer used. Right side is now the group chat (feed).
 * This redirects to feed so the old "do your challenges" / Today UI is never shown.
 * Old Daily content moved to a different spot later.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/(tabs)/feed');
    }, [router]);
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#00ADEF" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
