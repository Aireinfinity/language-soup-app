import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, Animated } from 'react-native';
import { Colors } from '../constants/Colors';
import { ArrowDown, ArrowUp, ArrowRight, ArrowLeft, X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const TUTORIAL_STEPS = [
    {
        id: 'soup',
        title: 'your soup lives here 🍲',
        description: 'this is where all your language chats live. jump in and start slurping!',
        target: { top: 180, left: width / 2 },
        arrow: 'up',
        position: 'center',
    },
    {
        id: 'tabs',
        title: 'explore the kitchen 👨🏾‍🍳',
        description: 'use these tabs to switch between your chats, the community feed, and your profile.',
        target: { bottom: 85, left: width / 2 },
        arrow: 'down',
        position: 'bottom',
    },
    {
        id: 'help',
        title: 'still cooking... 🐛',
        description: 'we are still in beta! if you find a bug or something weird, tap here to tell noah.',
        target: { bottom: 160, right: 45 },
        arrow: 'down-right', // Custom handling
        position: 'bottom-right',
    },
    {
        id: 'final',
        title: 'have fun! 🎉',
        description: 'play around, keep notifications on, and respond to the daily challenges!',
        target: null,
        arrow: null,
        position: 'center',
    }
];

export default function HomeTutorial({ visible, onClose }) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (visible) {
            setCurrentStepIndex(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            setCurrentStepIndex(0);
        }
    }, [visible]);

    const handleNext = () => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true })
            ]).start();
            setTimeout(() => setCurrentStepIndex(prev => prev + 1), 150);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    if (!visible) return null;

    const step = TUTORIAL_STEPS[currentStepIndex];

    const renderArrow = () => {
        if (!step.target) return null;

        // Custom positioning based on the step
        if (step.id === 'soup') {
            return (
                <View style={{ position: 'absolute', top: step.target.top - 60, left: step.target.left - 24 }}>
                    <ArrowDown size={48} color="#fff" />
                </View>
            );
        }
        if (step.id === 'tabs') {
            return (
                <View style={{ position: 'absolute', bottom: step.target.bottom + 10, left: step.target.left - 24 }}>
                    <ArrowDown size={48} color="#fff" />
                </View>
            );
        }
        if (step.id === 'help') {
            return (
                <View style={{ position: 'absolute', bottom: step.target.bottom + 10, right: step.target.right - 20, transform: [{ rotate: '-30deg' }] }}>
                    <ArrowDown size={48} color="#fff" />
                </View>
            );
        }
        return null;
    };

    const getContentStyle = () => {
        const styles = {
            position: 'absolute',
            width: width - 64,
            left: 32,
            backgroundColor: '#fff',
            padding: 24,
            borderRadius: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
        };

        if (step.id === 'soup') {
            styles.top = step.target.top + 20;
        } else if (step.id === 'tabs') {
            styles.bottom = step.target.bottom + 100;
        } else if (step.id === 'help') {
            styles.bottom = step.target.bottom + 100;
        } else {
            styles.top = height / 2 - 100;
        }

        return styles;
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                {renderArrow()}

                <Animated.View style={[getContentStyle(), { opacity: fadeAnim }]}>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.description}>{step.description}</Text>

                    <Pressable style={styles.button} onPress={handleNext}>
                        <Text style={styles.buttonText}>
                            {currentStepIndex === TUTORIAL_STEPS.length - 1 ? "let's go!" : 'next'}
                        </Text>
                    </Pressable>

                    <View style={styles.dots}>
                        {TUTORIAL_STEPS.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === currentStepIndex && styles.activeDot
                                ]}
                            />
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: Colors.text,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    button: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E5E5',
    },
    activeDot: {
        backgroundColor: Colors.primary,
        width: 20,
    },
});
