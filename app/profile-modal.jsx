/**
 * Profile as a modal (e.g. from feed header tap). Group chat stays in place; close returns to feed.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import ProfileScreen from './(tabs)/profile';
import { Colors } from '../constants/Colors';

export default function ProfileModalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [styles.closeBtn, { top: insets.top + 8 }, pressed && { opacity: 0.8 }]}
                onPress={() => router.back()}
            >
                <X size={24} color={Colors.primary} />
            </Pressable>
            <View style={styles.content}>
                <ProfileScreen />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background || '#FDF5E6',
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
        padding: 8,
    },
    content: {
        flex: 1,
    },
});
