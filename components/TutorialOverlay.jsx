import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';
import { ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const TUTORIAL_STEPS = [
    {
        id: 'your-soup',
        title: 'Your Soup 🥣',
        description: 'Tap here to see your active groups and daily challenges',
        targetPosition: { bottom: 20, left: 20 }, // Tab bar position
        pointerDirection: 'bottom'
    },
    {
        id: 'community',
        title: 'Find Groups 🌍',
        description: 'Browse all language groups here',
        targetPosition: { bottom: 20, left: width / 2 - 40 },
        pointerDirection: 'bottom'
    },
    {
        id: 'profile',
        title: 'Your Profile 👨‍🍳',
        description: 'Track stats, customize your Soup Flavor, and more',
        targetPosition: { bottom: 20, right: 20 },
        pointerDirection: 'bottom'
    }
];

export default function TutorialOverlay({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const step = TUTORIAL_STEPS[currentStep];

    return (
        <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
        >
            {/* Dark overlay */}
            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill}>
                <View style={styles.overlay} />
            </BlurView>

            {/* Spotlight/cutout would go here in a more advanced version */}

            {/* Tooltip Card */}
            <View style={styles.tooltipContainer}>
                <View style={styles.card}>
                    <Text style={styles.stepCounter}>
                        {currentStep + 1} of {TUTORIAL_STEPS.length}
                    </Text>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.description}>{step.description}</Text>

                    <View style={styles.buttonRow}>
                        <Pressable onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>Skip</Text>
                        </Pressable>

                        <Pressable onPress={handleNext} style={styles.nextButton}>
                            <Text style={styles.nextText}>
                                {currentStep === TUTORIAL_STEPS.length - 1 ? 'Got it!' : 'Next'}
                            </Text>
                            <ChevronRight size={18} color="#fff" />
                        </Pressable>
                    </View>
                </View>

                {/* Animated pointer arrow */}
                <Animated.View
                    entering={FadeIn.delay(200)}
                    style={[styles.pointer, step.targetPosition]}
                >
                    <Text style={{ fontSize: 40 }}>👇</Text>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    tooltipContainer: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: width - 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    stepCounter: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        padding: 8,
    },
    skipText: {
        fontSize: 16,
        color: Colors.textLight,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        gap: 4,
    },
    nextText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pointer: {
        position: 'absolute',
        zIndex: 1001,
    }
});
