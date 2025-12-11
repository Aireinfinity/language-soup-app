import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const STEPS = [
    {
        id: 0,
        title: 'how to make language soup',
        subtitle: '(a recipe)',
        animationType: 'recipe',
    },
    {
        id: 1,
        text: '1. select your language(s) and level group',
        subtext: '(messing up pronunciation is part of the flavor)',
        animationType: 'select',
    },
    {
        id: 2,
        text: '2. wait for the daily challenge',
        subtext: '(native speakers speaking too fast? just nod and smile)',
        animationType: 'notification',
    },
    {
        id: 3,
        text: '3. send your voice memo and listen to others!',
        subtext: '(confused? good. we all are.)',
        animationType: 'waveform',
    },
    {
        id: 4,
        text: 'turn on notifications so you don\'t miss the soup!',
        subtext: '(time to get your sh*t together)',
        animationType: 'permission',
        isPermission: true,
    },
];

const ALL_LANGS_DISPLAY = [
    '🇪🇸 Spanish', '🇫🇷 French', '🇩🇪 German', '🇮🇹 Italian', '🇵🇹 Portuguese',
    '🇭🇺 Hungarian', '🇵🇭 Tagalog', '🇳🇱 Dutch', '🇮🇷 Farsi', '🇨🇳 Mandarin',
    '🇩🇰 Danish', '🇸🇪 Swedish', '🇳🇬 Yoruba', 'Beginner', 'Intermediate', 'Advanced'
];

export default function HowItWorksScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);

    // Animations
    const anim1 = useRef(new Animated.Value(0)).current;
    const anim2 = useRef(new Animated.Value(0)).current;
    const anim3 = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startStepAnimation();
    }, [currentStep]);

    const startStepAnimation = () => {
        // Reset values
        anim1.setValue(0);
        anim2.setValue(0);
        anim3.setValue(0);
        textOpacity.setValue(0);

        // Fade in text
        Animated.timing(textOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        const step = STEPS[currentStep];

        if (step.animationType === 'recipe') {
            // Bouncy chef entrance
            Animated.spring(anim1, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else if (step.animationType === 'select') {
            // Cascade in with bounce
            Animated.stagger(50,
                ALL_LANGS_DISPLAY.map((_, i) =>
                    Animated.spring(anim1, {
                        toValue: 1,
                        friction: 7,
                        useNativeDriver: true
                    })
                )
            ).start();
        } else if (step.animationType === 'notification') {
            // Bouncy notifications dropping in
            Animated.stagger(400, [
                Animated.spring(anim1, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
                Animated.spring(anim2, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
                Animated.spring(anim3, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
            ]).start();
        } else if (step.animationType === 'waveform') {
            // Bouncy microphone button appears
            Animated.spring(anim1, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true
            }).start();

            // Voice messages bounce in
            Animated.sequence([
                Animated.delay(600),
                Animated.stagger(300, [
                    Animated.spring(anim2, { toValue: 1, friction: 6, useNativeDriver: true }),
                    Animated.spring(anim3, { toValue: 1, friction: 6, useNativeDriver: true }),
                ])
            ]).start();
        } else if (step.animationType === 'permission') {
            // Continuous bell shake
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim1, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: -1, duration: 80, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: 1, duration: 80, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: 0, duration: 80, useNativeDriver: true }),
                    Animated.delay(1200),
                ])
            ).start();
        }
    };

    const handlePress = async (evt) => {
        const locationX = evt.nativeEvent.locationX;
        if (locationX > width / 2) {
            // Permission check
            if (STEPS[currentStep].isPermission) {
                try {
                    await Notifications.requestPermissionsAsync();
                } catch (error) {
                    console.log('Error requesting notifications:', error);
                }
            }

            if (currentStep < STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                router.replace('/login');
            }
        } else {
            if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            } else {
                router.replace('/');
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        } else {
            router.replace('/');
        }
    };

    const renderAnimation = () => {
        const step = STEPS[currentStep];

        if (step.animationType === 'recipe') {
            return (
                <View style={styles.animBox}>
                    <Animated.Text style={{ fontSize: 120, transform: [{ scale: anim1 }] }}>👩🏽‍🍳</Animated.Text>
                </View>
            );
        } else if (step.animationType === 'select') {
            return (
                <Animated.View style={[styles.animBox, { opacity: anim1, flexWrap: 'wrap', flexDirection: 'row', width: width - 48, height: 300, alignContent: 'center', justifyContent: 'center' }]}>
                    {ALL_LANGS_DISPLAY.map((lang, i) => (
                        <Animated.Text key={i} style={{
                            fontSize: Math.random() * 12 + 16,
                            margin: 6,
                            color: [Colors.primary, Colors.accent, Colors.highlight, Colors.text][i % 4],
                            fontWeight: 'bold',
                            transform: [
                                { rotate: `${Math.random() * 30 - 15}deg` },
                                { scale: anim1 }
                            ]
                        }}>
                            {lang}
                        </Animated.Text>
                    ))}
                </Animated.View>
            );
        } else if (step.animationType === 'notification') {
            return (
                <View style={styles.animBox}>
                    <Animated.View style={[styles.notification, { opacity: anim1, transform: [{ translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { scale: anim1 }] }]}>
                        <ThemedText style={styles.notifText}>🔔 new challenge just dropped</ThemedText>
                    </Animated.View>
                    <Animated.View style={[styles.notification, { opacity: anim2, transform: [{ translateY: anim2.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { scale: anim2 }] }]}>
                        <ThemedText style={styles.notifText}>🥣 time to stir your soup</ThemedText>
                    </Animated.View>
                    <Animated.View style={[styles.notification, { opacity: anim3, transform: [{ translateY: anim3.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { scale: anim3 }] }]}>
                        <ThemedText style={styles.notifText}>🔥 new language soup</ThemedText>
                    </Animated.View>
                </View>
            );
        } else if (step.animationType === 'waveform') {
            return (
                <View style={[styles.animBox, { width: 280 }]}>
                    {/* Big Microphone Button - Center stage */}
                    <Animated.View
                        style={[
                            styles.bigMicButton,
                            {
                                opacity: anim1,
                                transform: [{ scale: anim1 }]
                            }
                        ]}
                    >
                        <Animated.Text style={{ fontSize: 64 }}>🎙️</Animated.Text>
                    </Animated.View>

                    <Animated.Text
                        style={[
                            styles.micInstruction,
                            {
                                opacity: anim1,
                                transform: [{ translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                            }
                        ]}
                    >
                        Tap to record
                    </Animated.Text>

                    {/* Voice bubbles sliding in from sides */}
                    <View style={{ marginTop: 32, width: '100%', gap: 12 }}>
                        <Animated.View
                            style={[
                                styles.voiceBubble,
                                {
                                    backgroundColor: Colors.accent,
                                    opacity: anim2,
                                    transform: [{ translateX: anim2.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }]
                                }
                            ]}
                        >
                            <Animated.Text style={{ fontSize: 20 }}>🎙️</Animated.Text>
                            <View style={styles.waveformBar} />
                            <Animated.Text style={styles.duration}>0:05</Animated.Text>
                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.voiceBubble,
                                {
                                    backgroundColor: Colors.secondary,
                                    alignSelf: 'flex-end',
                                    opacity: anim3,
                                    transform: [{ translateX: anim3.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }]
                                }
                            ]}
                        >
                            <Animated.Text style={{ fontSize: 20 }}>🎙️</Animated.Text>
                            <View style={styles.waveformBar} />
                            <Animated.Text style={styles.duration}>0:03</Animated.Text>
                        </Animated.View>
                    </View>
                </View>
            );
        } else if (step.animationType === 'permission') {
            return (
                <View style={styles.animBox}>
                    <Animated.View style={{ transform: [{ rotate: anim1.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] }) }] }}>
                        <Bell size={100} color={Colors.primary} />
                    </Animated.View>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={1}>

                {STEPS[currentStep].id === 0 ? (
                    <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
                        <ThemedText type="title" style={styles.recipeTitle}>{STEPS[currentStep].title}</ThemedText>
                        <ThemedText style={styles.recipeSubtitle}>{STEPS[currentStep].subtitle}</ThemedText>
                        <View style={{ marginTop: 40 }}>{renderAnimation()}</View>
                    </Animated.View>
                ) : (
                    <>
                        <View style={styles.animationContainer}>
                            {renderAnimation()}
                        </View>

                        <Animated.View style={{ opacity: textOpacity, alignItems: 'center', paddingHorizontal: 32 }}>
                            <ThemedText type="title" style={styles.stepText}>{STEPS[currentStep].text}</ThemedText>
                            {STEPS[currentStep].subtext && (
                                <ThemedText style={styles.subText}>{STEPS[currentStep].subtext}</ThemedText>
                            )}
                        </Animated.View>
                    </>
                )}

                <View style={styles.progressContainer}>
                    {STEPS.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentStep ? styles.activeDot : styles.inactiveDot
                            ]}
                        />
                    ))}
                </View>

                <ThemedText style={styles.tapHint}>
                    (tap right to next, left to back)
                </ThemedText>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 24,
        zIndex: 10,
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    animationContainer: {
        height: 300,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    animBox: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    recipeTitle: {
        fontSize: 36,
        textAlign: 'center',
        marginBottom: 16,
    },
    recipeSubtitle: {
        fontSize: 24,
        fontStyle: 'italic',
        color: Colors.textLight,
    },
    stepText: {
        fontSize: 24,
        textAlign: 'center',
        color: Colors.text,
        marginBottom: 8,
    },
    subText: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 12,
        position: 'absolute',
        bottom: 80,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    activeDot: {
        backgroundColor: Colors.primary,
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    inactiveDot: {
        backgroundColor: Colors.textLight,
        opacity: 0.3,
    },
    tapHint: {
        fontSize: 14,
        color: Colors.textLight,
        fontStyle: 'italic',
        position: 'absolute',
        bottom: 48,
    },
    // Animation specific styles
    notification: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        width: 260,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    notifText: {
        fontSize: 14,
        fontWeight: '500',
    },
    bubble: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    bubbleLeft: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        marginLeft: 20,
    },
    bubbleRight: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
        marginRight: 20,
    },
    waveform: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 2,
        marginHorizontal: 8,
    },
    micButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        width: 100,
        height: 100,
        borderRadius: 50,
        alignSelf: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    micLabel: {
        fontSize: 11,
        color: '#fff',
        marginTop: 4,
        fontWeight: '600',
    },
    bubbleTime: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        marginLeft: 4,
    },
    bigMicButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    micInstruction: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
        textAlign: 'center',
    },
    voiceBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        gap: 8,
        width: '75%',
    },
    waveformBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 2,
    },
    duration: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
});
