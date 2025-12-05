import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
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
            Animated.spring(anim1, { toValue: 1, friction: 8, useNativeDriver: true }).start();
        } else if (step.animationType === 'select') {
            // Just show them all
            Animated.timing(anim1, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        } else if (step.animationType === 'notification') {
            Animated.stagger(800, [
                Animated.spring(anim1, { toValue: 1, friction: 6, useNativeDriver: true }),
                Animated.spring(anim2, { toValue: 1, friction: 6, useNativeDriver: true }),
                Animated.spring(anim3, { toValue: 1, friction: 6, useNativeDriver: true }),
            ]).start();
        } else if (step.animationType === 'waveform') {
            // 1. My message (Right, Blue)
            Animated.timing(anim1, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }).start();

            // 2. Others (Left) - Staggered
            Animated.sequence([
                Animated.delay(800),
                Animated.stagger(400, [
                    Animated.spring(anim2, { toValue: 1, friction: 6, useNativeDriver: true }),
                    Animated.spring(anim3, { toValue: 1, friction: 6, useNativeDriver: true }),
                ])
            ]).start();
        } else if (step.animationType === 'permission') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim1, { toValue: 1, duration: 100, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: -1, duration: 100, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: 1, duration: 100, useNativeDriver: true }),
                    Animated.timing(anim1, { toValue: 0, duration: 100, useNativeDriver: true }),
                    Animated.delay(1000),
                ])
            ).start();
        }
    };

    const handlePress = (evt) => {
        const locationX = evt.nativeEvent.locationX;
        if (locationX > width / 2) {
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
                    <Animated.Text style={{ fontSize: 100, transform: [{ scale: anim1 }] }}>👩🏽‍🍳</Animated.Text>
                </View>
            );
        } else if (step.animationType === 'select') {
            return (
                <Animated.View style={[styles.animBox, { opacity: anim1, flexWrap: 'wrap', flexDirection: 'row', width: width - 48, height: 300, alignContent: 'center', justifyContent: 'center' }]}>
                    {ALL_LANGS_DISPLAY.map((lang, i) => (
                        <ThemedText key={i} style={{
                            fontSize: Math.random() * 10 + 14,
                            margin: 4,
                            color: [Colors.primary, Colors.accent, Colors.highlight, Colors.text][i % 4],
                            fontWeight: 'bold',
                            transform: [{ rotate: `${Math.random() * 20 - 10}deg` }]
                        }}>
                            {lang}
                        </ThemedText>
                    ))}
                </Animated.View>
            );
        } else if (step.animationType === 'notification') {
            return (
                <View style={styles.animBox}>
                    <Animated.View style={[styles.notification, { opacity: anim1, transform: [{ translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                        <ThemedText style={styles.notifText}>🔔 new challenge just dropped</ThemedText>
                    </Animated.View>
                    <Animated.View style={[styles.notification, { opacity: anim2, transform: [{ translateY: anim2.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                        <ThemedText style={styles.notifText}>🥣 time to stir your soup</ThemedText>
                    </Animated.View>
                    <Animated.View style={[styles.notification, { opacity: anim3, transform: [{ translateY: anim3.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                        <ThemedText style={styles.notifText}>🔥 new language soup</ThemedText>
                    </Animated.View>
                </View>
            );
        } else if (step.animationType === 'waveform') {
            return (
                <View style={[styles.animBox, { width: 280 }]}>
                    {/* My Message (Right, Blue) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            styles.bubbleRight,
                            {
                                backgroundColor: Colors.primary,
                                opacity: anim1,
                                transform: [{ translateX: anim1.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }]
                            }
                        ]}
                    >
                        <View style={[styles.waveform, { width: 80 }]} />
                        <ThemedText style={{ fontSize: 24 }}>🎙️</ThemedText>
                    </Animated.View>

                    {/* Others (Left) */}
                    <Animated.View
                        style={[
                            styles.bubble,
                            styles.bubbleLeft,
                            {
                                backgroundColor: Colors.accent,
                                marginTop: 16,
                                opacity: anim2,
                                transform: [{ translateX: anim2.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }]
                            }
                        ]}
                    >
                        <ThemedText style={{ fontSize: 20 }}>🎙️</ThemedText>
                        <View style={[styles.waveform, { width: 60 }]} />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.bubble,
                            styles.bubbleLeft,
                            {
                                backgroundColor: Colors.highlight,
                                marginTop: 8,
                                opacity: anim3,
                                transform: [{ translateX: anim3.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }]
                            }
                        ]}
                    >
                        <ThemedText style={{ fontSize: 20 }}>🎙️</ThemedText>
                        <View style={[styles.waveform, { width: 50 }]} />
                    </Animated.View>
                </View>
            );
        } else if (step.animationType === 'permission') {
            return (
                <View style={styles.animBox}>
                    <Animated.View style={{ transform: [{ rotate: anim1.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] }) }] }}>
                        <Bell size={80} color={Colors.primary} />
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
});
