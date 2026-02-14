import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

/**
 * Redirects to the merged onboarding your-groups page.
 * Kept so links (AuthContext, community, etc.) that pointed here still work.
 */
export default function GroupSelectionScreen() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/onboarding/your-groups');
    }, [router]);

    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});
