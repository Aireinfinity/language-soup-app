import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '../components/ThemedText';
import SoupBowlAnimation from '../components/SoupBowlAnimation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const GROUND_RULES_SEEN_KEY = 'ground_rules_seen';

const { height } = Dimensions.get('window');

const SOUP_COLORS = {
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
};
// Soft tint for boot gradient (cream → light brand so it doesn’t feel like manila)
const BOOT_GRADIENT = [SOUP_COLORS.cream, '#F5FBF8'];

export default function BootScreen() {
    const router = useRouter();
    const { setBootScreenShown, user } = useAuth();
    const insets = useSafeAreaInsets();
    const [ready, setReady] = useState(true);
    const [groundRulesSeen, setGroundRulesSeen] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => sub.remove();
    }, []);

    useEffect(() => {
        if (!user) return;
        AsyncStorage.getItem(GROUND_RULES_SEEN_KEY).then((v) => {
            if (isMounted.current) setGroundRulesSeen(v === '1');
        });
    }, [user]);

    const handleSkip = useCallback(async () => {
        if (!isMounted.current) return;
        setBootScreenShown(true);
        try {
            if (!user) {
                router.replace('/login');
            } else {
                if (groundRulesSeen === false) {
                    router.replace('/ground-rules');
                } else {
                    router.replace('/(tabs)/feed');
                }
            }
        } catch (err) {
            console.error('[Boot] Critical navigation error:', err);
            if (isMounted.current) router.replace('/');
        }
    }, [user, groundRulesSeen, router]);

    useEffect(() => {
        if (user && groundRulesSeen === true) {
            const t = setTimeout(handleSkip, 500);
            return () => clearTimeout(t);
        }
    }, [user, groundRulesSeen, handleSkip]);

    if (!ready) return <View style={styles.container} />;

    return (
        <TouchableOpacity
            style={[styles.container, { paddingTop: insets.top }]}
            activeOpacity={1}
            onPress={handleSkip}
        >
            <LinearGradient colors={BOOT_GRADIENT} style={StyleSheet.absoluteFill} />
            <View style={styles.contentWrapper}>
                {(!user || groundRulesSeen === false) ? (
                    <View style={styles.textBlock}>
                        <ThemedText style={styles.headword}>language soup</ThemedText>
                        <ThemedText style={styles.phonetic}>/ˈlæŋɡwɪdʒ suːp/</ThemedText>
                        <ThemedText style={styles.partOfSpeech}>noun</ThemedText>
                        <View style={styles.definitionBlock}>
                            <ThemedText style={styles.definitionText}>
                                <ThemedText style={styles.definitionLabel}>Definition: </ThemedText>
                                that thing that happens in your head when u mix up multiple languages
                            </ThemedText>
                        </View>
                        <View style={styles.exampleBlock}>
                            <ThemedText style={styles.exampleText}>
                                <ThemedText style={styles.exampleLabel}>Example: </ThemedText>
                                "my head feels like language soup right now 😭"
                            </ThemedText>
                        </View>
                    </View>
                ) : (
                    <View style={styles.minimalSplash} />
                )}

                <View style={[styles.buttonContainer, user && groundRulesSeen === true && styles.buttonContainerMinimal]}>
                    <SoupBowlAnimation onPress={handleSkip} />
                    {(!user || groundRulesSeen === false) && <ThemedText style={styles.tapHint}>tap to continue</ThemedText>}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
    },
    minimalSplash: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -40, // offset for visual balance with bowl
    },
    logoSplash: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    textBlock: {
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        alignItems: 'flex-start',
        marginTop: 120,
        paddingHorizontal: 24,
        zIndex: 1,
    },
    headword: {
        fontSize: 36,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        fontFamily: 'System',
        marginBottom: 4,
        lineHeight: 42,
        letterSpacing: -0.5,
    },
    phonetic: {
        fontSize: 18,
        color: SOUP_COLORS.subtext,
        fontFamily: 'System',
        marginBottom: 4,
    },
    partOfSpeech: {
        fontSize: 16,
        fontStyle: 'italic',
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 16,
    },
    definitionBlock: {
        marginBottom: 8,
    },
    definitionLabel: {
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    definitionText: {
        fontSize: 17,
        lineHeight: 26,
        color: SOUP_COLORS.text,
        textAlign: 'left',
    },
    exampleBlock: {
        marginTop: 24,
    },
    exampleText: {
        fontSize: 15,
        lineHeight: 22,
        color: SOUP_COLORS.subtext,
        textAlign: 'left',
    },
    exampleLabel: {
        fontStyle: 'normal',
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    buttonContainerMinimal: {
        bottom: height / 2 - 120, // Center it more for minimal view
    },
    tapHint: {
        fontSize: 15,
        color: SOUP_COLORS.turquoise,
        fontWeight: '700',
        marginTop: 12,
        textAlign: 'center',
    },
});
