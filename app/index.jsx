import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import SoupBowlAnimation from '../components/SoupBowlAnimation';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Animated, {
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

export default function BootScreen() {
    const router = useRouter();
    const { setBootScreenShown, user } = useAuth();
    const insets = useSafeAreaInsets();
    const [ready, setReady] = useState(true);

    // Button Pulse Animation
    const scale = useSharedValue(1);

    useEffect(() => {
        // Initial pulse setup
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1, // Infinite
            true // Reverse
        );

        // FAST PASS: If user is already logged in, auto-advance
        if (user) {
            console.log('[Boot] User found, showing minimalist splash and auto-advancing in 500ms...');
            const timer = setTimeout(() => {
                handleSkip();
            }, 500); // super snappy 500ms splash for existing users
            return () => clearTimeout(timer);
        }
    }, [user]);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handleSkip = async () => {
        setBootScreenShown(true);

        // Check if user has a real profile in app_users (not just an auth session)
        if (!user) {
            router.replace('/how-it-works');
        } else {
            // User has auth session, but do they have an app_users profile?
            const { data: userProfile } = await supabase
                .from('app_users')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!userProfile) {
                // Auth session exists but no profile = ghost user
                // Send to onboarding
                router.replace('/how-it-works');
                return;
            }

            // Check if user has joined groups
            const { data: groups } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id)
                .limit(1);

            if (groups && groups.length > 0) {
                router.replace('/(tabs)');
            } else {
                router.replace('/group-selection'); // New users go here
            }
        }
    };

    if (!ready) return <View style={styles.container} />;

    return (
        <TouchableOpacity
            style={[styles.container, { paddingTop: insets.top }]}
            activeOpacity={1}
            onPress={handleSkip}
        >
            {/* Conditional Content: Logo only for existing users, full definition for new ones */}
            <View style={styles.contentWrapper}>
                {!user ? (
                    <View style={styles.textBlock}>
                        {/* Title - Fast Entry */}
                        <Animated.View entering={FadeInUp.delay(200).springify()}>
                            <ThemedText style={styles.headword}>language soup</ThemedText>
                        </Animated.View>

                        {/* Phonetic - Slight Delay */}
                        <Animated.View entering={FadeInUp.delay(600).springify()}>
                            <ThemedText style={styles.phonetic}>/ˈlæŋɡwɪdʒ suːp/</ThemedText>
                        </Animated.View>

                        {/* Noun */}
                        <Animated.View entering={FadeInUp.delay(1000).springify()}>
                            <ThemedText style={styles.partOfSpeech}>noun</ThemedText>
                        </Animated.View>

                        {/* Definition - The Punchline */}
                        <Animated.View style={styles.definitionBlock} entering={FadeInUp.delay(1500).duration(800)}>
                            <ThemedText style={styles.definitionText}>
                                <ThemedText style={{ fontWeight: 'bold' }}>Definition: </ThemedText>
                                that thing that happens in your head when u mix up multiple languages
                            </ThemedText>
                        </Animated.View>

                        {/* Example - The Lore */}
                        <Animated.View style={{ marginTop: 24 }} entering={FadeInUp.delay(2500).duration(800)}>
                            <ThemedText style={styles.exampleText}>
                                <ThemedText style={styles.exampleLabel}>Example: </ThemedText>
                                "my head feels like language soup right now 😭"
                            </ThemedText>
                        </Animated.View>
                    </View>
                ) : (
                    /* Minimal splash for existing users - showing only animated bowl */
                    <View style={styles.minimalSplash} />
                )}

                {/* Button - The Call to Action / Animation */}
                <View style={[styles.buttonContainer, user && styles.buttonContainerMinimal]}>
                    <SoupBowlAnimation onPress={handleSkip} />
                    {!user && (
                        <Animated.View entering={FadeIn.delay(4000)}>
                            <ThemedText style={styles.tapHint}>tap to continue</ThemedText>
                        </Animated.View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
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
        fontWeight: 'normal',
        color: '#000000',
        fontFamily: 'System',
        marginBottom: 4,
        lineHeight: 42,
    },
    phonetic: {
        fontSize: 20,
        color: '#000000',
        fontFamily: 'System',
        marginBottom: 4,
    },
    partOfSpeech: {
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: '500',
        color: '#000000',
        marginBottom: 16,
    },
    definitionBlock: {
        marginBottom: 8,
    },
    definitionText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#000000',
        textAlign: 'left',
    },
    exampleText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#000000',
        textAlign: 'left',
    },
    exampleLabel: {
        fontStyle: 'normal',
        fontWeight: 'bold',
        color: '#000000',
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
        fontSize: 14,
        color: Colors.textLight,
        marginTop: 12,
        textAlign: 'center',
    },
});
