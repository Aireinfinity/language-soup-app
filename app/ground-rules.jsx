/**
 * First-time only: how to soup. Fun, light, silly vibe (not serious rules).
 * No dashes in copy (product rule). One tap to continue into the app.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUND_RULES_SEEN_KEY = 'ground_rules_seen';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
};
const BOOT_GRADIENT = [SOUP_COLORS.cream, '#F5FBF8'];

export default function GroundRulesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleContinue = async () => {
        await AsyncStorage.setItem(GROUND_RULES_SEEN_KEY, '1');
        router.replace('/profile-modal?onboarding=1');
    };

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    return (
        <Pressable style={[styles.container, { paddingTop: insets.top }]} onPress={handleContinue}>
            <LinearGradient colors={BOOT_GRADIENT} style={StyleSheet.absoluteFill} />
            <View style={styles.content}>
                <Text style={styles.title}>how to soup 🍜</Text>
                <Text style={styles.subtitle}>in noah's voice 🥣</Text>
                <View style={styles.rules}>
                    <Text style={[styles.rule, { color: SOUP_COLORS.turquoise }]}>this is a community not a classroom silly! go speak enjoy and make mistakes and learn from each other.</Text>
                    <Text style={[styles.rule, { color: SOUP_COLORS.pink }]}>being a community means we need YOU to SPEAK. lurking is soooo out in 2026 sorry!</Text>
                    <Text style={[styles.rule, { color: SOUP_COLORS.green }]}>because we are the first language social media the app will be buggy! noah is our 23 year old amazing founder and you can chat with him anytime to work out any and all bugs!</Text>
                </View>
                <Text style={styles.tapHint}>tap anywhere to dive in</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: SOUP_COLORS.turquoise,
        marginBottom: 40,
        fontStyle: 'italic',
    },
    rules: {
        gap: 28,
    },
    rule: {
        fontSize: 18,
        lineHeight: 27,
        fontWeight: '600',
    },
    tapHint: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        fontSize: 15,
        color: SOUP_COLORS.pink,
        fontWeight: '700',
        textAlign: 'center',
    },
});
