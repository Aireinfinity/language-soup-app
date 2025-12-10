import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
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
    const { setBootScreenShown } = useAuth();
    const insets = useSafeAreaInsets();
    const [ready, setReady] = useState(false);

    // Button Pulse Animation
    const scale = useSharedValue(1);

    useEffect(() => {
        // Start pulse after initial load
        setTimeout(() => {
            setReady(true);
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // Infinite
                true // Reverse
            );
        }, 100);
    }, []);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handleSkip = () => {
        setBootScreenShown(true);
        router.replace('/how-it-works');
    };

    if (!ready) return <View style={styles.container} />;

    return (
        <TouchableOpacity
            style={[styles.container, { paddingTop: insets.top }]}
            activeOpacity={1}
            onPress={handleSkip}
        >
            <View style={styles.textBlock}>
                {/* Title - Fast Enry */}
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                    <ThemedText style={styles.headword}>language soup</ThemedText>
                </Animated.View>

                {/* Phonetic - Slight Delay */}
                <Animated.View entering={FadeInUp.delay(600).springify()}>
                    <ThemedText style={styles.phonetic}>/ˈlæŋɡwɪdʒ suːp/</ThemedText>
                </Animated.View>

                {/* Verb */}
                <Animated.View entering={FadeInUp.delay(1000).springify()}>
                    <ThemedText style={styles.partOfSpeech}>verb</ThemedText>
                </Animated.View>

                {/* Definition - The Punchline */}
                <Animated.View style={styles.definitionBlock} entering={FadeInUp.delay(1500).duration(800)}>
                    <ThemedText style={styles.definitionText}>
                        <ThemedText style={{ fontWeight: 'bold' }}>Definition: </ThemedText>
                        The act of diving headfirst into chaotic, messy language practice...
                        and somehow making something shareable and delicious out of it.
                    </ThemedText>
                </Animated.View>

                {/* Example - The Lore */}
                <Animated.View style={{ marginTop: 24 }} entering={FadeInUp.delay(2500).duration(800)}>
                    <ThemedText style={styles.exampleText}>
                        <ThemedText style={styles.exampleLabel}>Example: </ThemedText>
                        "im language souping so hard right now my head hurts 😭"
                    </ThemedText>
                </Animated.View>
            </View>

            {/* Button - The Call to Action */}
            <View style={styles.buttonContainer}>
                <Animated.View
                    entering={FadeIn.delay(3500)} // Wait for reading to finish
                    style={[styles.soupButton, animatedButtonStyle]}
                >
                    <TouchableOpacity
                        onPress={handleSkip}
                        style={styles.buttonContent}
                    >
                        <ThemedText style={styles.buttonText}>mmm good soup 🥣</ThemedText>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(4000)}>
                    <ThemedText style={styles.tapHint}>tap anywhere to skip</ThemedText>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
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
    soupButton: {
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        backgroundColor: '#19b091', // Teal
        overflow: 'hidden',
    },
    buttonContent: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        backgroundColor: 'transparent',
        borderRadius: 30,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 1,
    },
    tapHint: {
        fontSize: 14,
        color: Colors.textLight,
        marginTop: 12,
        textAlign: 'center',
    },
});
