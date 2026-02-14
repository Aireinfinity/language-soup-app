/**
 * LEGACY: The daily challenge flow now lives inline on the Today tab (app/(tabs)/index.jsx).
 * This modal is unused; the same intro/recording/done vibe is built into the Today hero.
 * Kept for reference or potential reuse (e.g. onboarding); do not import in new code.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert, SafeAreaView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChallengeQueueCard } from './ChallengeQueueCard';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Check } from 'lucide-react-native';

const CHALLENGE_START_SEEN_KEY = 'challenge_start_seen';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    dark: '#2A2A2A',
};

// Bowl accents — same layout as challenge cards: 4 bowls with shadow/glow so they're visible on all backgrounds.
const BOWL_ICON = require('../assets/ls-icon-bowl.png');
const BOWL_ACCENTS = [
    { key: 'tl', top: '8%', left: '5%', size: 72, opacity: 0.58 },
    { key: 'tr', top: '22%', right: '4%', size: 72, opacity: 0.54 },
    { key: 'bl', bottom: '26%', left: '8%', size: 72, opacity: 0.56 },
    { key: 'br', bottom: '10%', right: '10%', size: 72, opacity: 0.6 },
];

// Background colors for challenge cards — only brand colors, one per challenge (cycles).
const BRAND_BG_COLORS = [
    SOUP_COLORS.cream,
    SOUP_COLORS.green,
    SOUP_COLORS.pink,
    SOUP_COLORS.turquoise,
];

// Completion — "i drank my soup", random brand color, fun rotating button
const COMPLETION_TITLE = "i drank my soup";
const COMPLETION_SUBTITLES = [
    "you did it. come back tomorrow or explore groups below.",
    "slay. see you tomorrow, or explore the app if u want more.",
];
// Things to do next — mix of vibes + real app features (quests, AI, DMs, groups, etc.)
const COMPLETION_BUTTONS = [
    "go see who replied",
    "open the group chat",
    "listen to everyone's voice memos",
    "check tomorrow's challenge",
    "take a breath, you're done",
    "go bother your group",
    "see who else did the thing",
    "one less thing on the list",
    "treat yourself to a snack",
    "go say hi in the chat",
    "see your streak",
    "you're officially soupy today",
    "slide into someone's dms",
    "change ur profile pic for the 10th time",
    "actually make some soup",
    "finish ur quests",
    "challenge a friend",
    "get ai corrections",
    "get ai voice feedback",
    "stalk voice memos",
    "check ur stats",
    "look at everyone's pretty faces",
    "annoy noah in the support center",
    "find a bug",
    "get soupy",
    "check out the group chat",
    "see you tomorrow",
    "explore language soup",
    "crush a quest",
    "hear how u sound (ai edition)",
    "peek at the group",
    "send a voice note in the chat",
    "update ur learning language",
    "see who's in ur group",
    "reply to a voice memo",
    "plan tomorrow's soup",
];
const getRandomCompletion = (bgColor) => ({
    title: COMPLETION_TITLE,
    subtitle: COMPLETION_SUBTITLES[Math.floor(Math.random() * COMPLETION_SUBTITLES.length)],
    button: COMPLETION_BUTTONS[Math.floor(Math.random() * COMPLETION_BUTTONS.length)],
    bgColor: bgColor ?? BRAND_BG_COLORS[Math.floor(Math.random() * BRAND_BG_COLORS.length)],
});

// Start screen — first time: standard and clear. After that: cycle through fun/silly copy.
const START_CONTEXT_LINE = "new challenges just dropped";
const START_FIRST_TITLE = "record a voice reply";
const START_FIRST_SUBTITLE = "tap the button below, say your answer in your learning language, and send it to your group.";
const START_FIRST_BUTTON = "start";
// Rotating fun copy for returning users (add more from user interviews)
const START_TITLES = [
    "fail the subjunctive",
    "get scared and then quit",
    "sound like a toddler (it's fine)",
    "today's soup is ready",
    "your group is waiting (no pressure)",
    "voice memo o'clock",
    "nobody's judging (we promise)",
    "rip the bandaid off",
];
const START_SUBTITLES = [
    "tap below. say something. that's it.",
    "one quick voice note. you've got this.",
    "small steps. your group has your back.",
    "just hit the button. we'll do the rest.",
];
const START_BUTTONS = [
    "start souping",
    "let's go",
    "ok fine",
    "rip the bandaid",
    "send it",
    "do the thing",
];
const getRandomStartCopy = () => ({
    title: START_TITLES[Math.floor(Math.random() * START_TITLES.length)],
    subtitle: START_SUBTITLES[Math.floor(Math.random() * START_SUBTITLES.length)],
    button: START_BUTTONS[Math.floor(Math.random() * START_BUTTONS.length)],
    bgColor: BRAND_BG_COLORS[Math.floor(Math.random() * BRAND_BG_COLORS.length)],
});

export function ChallengeQueue({ visible, challenges, onComplete, userId, onLoadMoreForTest }) {
    const [currentIndex, setCurrentIndex] = useState(-1); // -1 = Start Screen
    const [loading, setLoading] = useState(false);
    const currentCardIdRef = useRef(null); // So card can skip playing TTS if user already went to next card
    const [completionCopy, setCompletionCopy] = useState(() => getRandomCompletion()); // Set when we hit completion
    const [startCopy, setStartCopy] = useState(() => getRandomStartCopy()); // Fresh random when start screen shows (returning users)
    const [isFirstTimeStart, setIsFirstTimeStart] = useState(true); // true until we've read AsyncStorage; then standard vs fun

    const challengesLength = challenges?.length ?? 0;

    // If something tries to open the queue but there are no pending challenges,
    // immediately close it so we don't show the \"All caught up\" screen over and over.
    useEffect(() => {
        if (visible && challengesLength === 0 && typeof onComplete === 'function') {
            onComplete();
        }
    }, [visible, challengesLength, onComplete]);

    // First time vs returning: read AsyncStorage when on start screen; refresh fun copy only for returning users
    useEffect(() => {
        if (!visible || currentIndex !== -1) return;
        let cancelled = false;
        (async () => {
            try {
                const seen = await AsyncStorage.getItem(CHALLENGE_START_SEEN_KEY);
                if (cancelled) return;
                const firstTime = seen !== 'true';
                setIsFirstTimeStart(firstTime);
                if (!firstTime) setStartCopy(getRandomStartCopy());
            } catch (_) {
                if (!cancelled) setIsFirstTimeStart(true);
            }
        })();
        return () => { cancelled = true; };
    }, [visible, currentIndex]);

    if (!visible || challengesLength === 0) return null;

    const handleStart = () => {
        AsyncStorage.setItem(CHALLENGE_START_SEEN_KEY, 'true'); // mark so next time we show fun copy
        setCurrentIndex(0);
    };

    const handleSend = async (audioResult) => {
        const currentChallenge = challenges[currentIndex];
        if (!currentChallenge || !audioResult?.uri) return;

        setLoading(true);
        try {


            const { uri, duration } = audioResult;

            // 1. Upload Logic
            const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

            const fileName = `language-chat/${userId}/voice_challenge_${currentChallenge.id}_${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);

            // 2. Insert Message
            const { error: insertError } = await supabase.from('app_messages').insert({
                sender_id: userId,
                group_id: currentChallenge.group_id,
                challenge_id: currentChallenge.id,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: Math.max(1, Math.floor(duration / 1000)), // Ensure at least 1s to prevent "0s" glitch
                content: ''
            });

            if (insertError) throw insertError;

            // Mark this group as read for the current user so it never shows as unread from their own send
            await supabase
                .from('app_group_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('group_id', currentChallenge.group_id);

            // 3. Next Card or Completion
            if (currentIndex < challenges.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCompletionCopy(getRandomCompletion()); // New random button + bg color
                setCurrentIndex(challenges.length); // Completed State
            }

        } catch (error) {
            console.error('Queue Send Error:', error);
            Alert.alert('Error', 'Failed to send soup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        if (currentIndex < challenges.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCompletionCopy(getRandomCompletion());
            setCurrentIndex(challenges.length);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            setCurrentIndex(-1); // back to start screen
        }
    };

    // RENDER START SCREEN — random color, rotating fun copy, no chore vibe, copy-led layout
    if (currentIndex === -1) {
        const startBg = startCopy.bgColor ?? SOUP_COLORS.turquoise;
        const isCreamStart = startBg === SOUP_COLORS.cream;
        const startTextColor = isCreamStart ? SOUP_COLORS.dark : '#fff';
        const startSubtitleColor = isCreamStart ? '#555' : 'rgba(255,255,255,0.9)';
        return (
            <Modal visible={visible} animationType="slide" transparent={false}>
                <SafeAreaView style={[styles.container, { backgroundColor: startBg }]}>
                    <Pressable onPress={onComplete} style={[styles.backToAppRow, isCreamStart && styles.backToAppRowOnLight]}>
                        <Text style={[styles.backToAppText, { color: isCreamStart ? SOUP_COLORS.dark : 'rgba(255,255,255,0.95)' }]}>← back to app</Text>
                    </Pressable>
                    <View style={styles.startBowlBg} pointerEvents="none">
                        {BOWL_ACCENTS.map(({ key, size, opacity, ...pos }) => (
                            <View
                                key={key}
                                style={[
                                    styles.bowlAccentWrap,
                                    { width: size, height: size, ...pos },
                                    isCreamStart ? styles.bowlAccentShadow : styles.bowlAccentShadowWithGlow
                                ]}
                            >
                                {!isCreamStart && (
                                    <Image source={BOWL_ICON} style={[StyleSheet.absoluteFill, { width: size, height: size, opacity: 0.22 }]} resizeMode="contain" />
                                )}
                                <Image source={BOWL_ICON} style={[StyleSheet.absoluteFill, { width: size, height: size, opacity }]} resizeMode="contain" />
                            </View>
                        ))}
                    </View>
                    <View style={styles.startContent}>
                        <Text style={[styles.startContextLine, { color: startSubtitleColor }]}>{START_CONTEXT_LINE}</Text>
                        <Text style={[styles.startTitle, { color: startTextColor }]}>
                            {isFirstTimeStart ? START_FIRST_TITLE : startCopy.title}
                        </Text>
                        <Text style={[styles.startSubtitle, { color: startSubtitleColor }]}>
                            {isFirstTimeStart ? START_FIRST_SUBTITLE : startCopy.subtitle}
                        </Text>
                        <Pressable onPress={handleStart} style={styles.startCtaButton}>
                            <Text style={[styles.startCtaText, { color: isCreamStart ? '#141414' : startBg }]} numberOfLines={2}>
                                {isFirstTimeStart ? START_FIRST_BUTTON : startCopy.button}
                            </Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    // RENDER COMPLETION SCREEN — random brand color, no bottom banner
    if (currentIndex >= challenges.length) {
        const completionBg = completionCopy.bgColor ?? SOUP_COLORS.turquoise;
        const isCreamCompletion = completionBg === SOUP_COLORS.cream;
        const textColor = isCreamCompletion ? SOUP_COLORS.dark : '#fff';
        const subtitleColor = isCreamCompletion ? '#555' : 'rgba(255,255,255,0.9)';
        return (
            <Modal visible={visible} animationType="fade" transparent={false}>
                <SafeAreaView style={[styles.container, { backgroundColor: completionBg }]}>
                    <Pressable onPress={onComplete} style={[styles.backToAppRow, isCreamCompletion && styles.backToAppRowOnLight]}>
                        <Text style={[styles.backToAppText, { color: isCreamCompletion ? SOUP_COLORS.dark : 'rgba(255,255,255,0.95)' }]}>← back to app</Text>
                    </Pressable>
                    <View style={styles.completionBowlBg} pointerEvents="none">
                        {BOWL_ACCENTS.map(({ key, size, opacity, ...pos }) => (
                            <View
                                key={key}
                                style={[
                                    styles.bowlAccentWrap,
                                    { width: size, height: size, ...pos },
                                    isCreamCompletion ? styles.bowlAccentShadow : styles.bowlAccentShadowWithGlow
                                ]}
                            >
                                {!isCreamCompletion && (
                                    <Image source={BOWL_ICON} style={[StyleSheet.absoluteFill, { width: size, height: size, opacity: 0.22 }]} resizeMode="contain" />
                                )}
                                <Image source={BOWL_ICON} style={[StyleSheet.absoluteFill, { width: size, height: size, opacity }]} resizeMode="contain" />
                            </View>
                        ))}
                    </View>
                    <View style={styles.centerContent}>
                        <View style={[styles.successIcon, { backgroundColor: isCreamCompletion ? SOUP_COLORS.dark : 'rgba(255,255,255,0.95)' }]}>
                            <Check size={56} color={isCreamCompletion ? '#fff' : completionBg} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.startTitle, { color: textColor }]}>{completionCopy.title}</Text>
                        <Text style={[styles.startSubtitle, { color: subtitleColor }]}>{completionCopy.subtitle}</Text>

                        <View style={styles.completionButtonRow}>
                            <Pressable onPress={onComplete} style={styles.whiteButton}>
                                <Text style={[styles.whiteButtonText, { color: isCreamCompletion ? '#141414' : completionBg }]} numberOfLines={2}>{completionCopy.button}</Text>
                            </Pressable>
                        </View>
                    </View>
                    <Pressable onPress={() => setCurrentIndex(Math.max(0, (challenges?.length ?? 1) - 1))} style={styles.completionBackButton}>
                        <Text style={[styles.navButtonText, { color: isCreamCompletion ? '#141414' : 'rgba(255,255,255,0.9)' }]}>← back to challenges</Text>
                    </Pressable>
                </SafeAreaView>
            </Modal>
        );
    }

    // RENDER ACTIVE CARD
    const currentChallenge = challenges[currentIndex];
    const isCreamBg = currentIndex % BRAND_BG_COLORS.length === 0;
    // Guard: if challenge is missing (e.g. race when list updates), advance to completion to avoid crash
    if (!currentChallenge) {
        setCurrentIndex(challenges.length);
        return null;
    }
    currentCardIdRef.current = currentChallenge.id;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: BRAND_BG_COLORS[currentIndex % BRAND_BG_COLORS.length] }]}>
                <Pressable onPress={onComplete} style={[styles.backToAppRow, isCreamBg && styles.backToAppRowOnLight]}>
                    <Text style={[styles.backToAppText, isCreamBg ? { color: SOUP_COLORS.dark } : {}]}>← back to app</Text>
                </Pressable>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    {challenges.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.progressDot,
                                isCreamBg && styles.progressDotOnLight,
                                idx === currentIndex && styles.progressActive,
                                idx === currentIndex && isCreamBg && styles.progressActiveOnLight,
                                idx < currentIndex && styles.progressDone
                            ]}
                        />
                    ))}
                </View>

                <ChallengeQueueCard
                    key={currentChallenge.id} // Forces reset when card changes
                    challenge={currentChallenge}
                    groupName={currentChallenge.group_name}
                    onSend={handleSend}
                    loading={loading}
                    isLightBackground={isCreamBg}
                    currentCardIdRef={currentCardIdRef}
                />

                {/* Back + Skip */}
                <View style={styles.navRow}>
                    <Pressable onPress={handleBack} style={styles.navButton}>
                        <Text style={[styles.navButtonText, isCreamBg && styles.navButtonTextOnLight]}>← back</Text>
                    </Pressable>
                    <Pressable onPress={handleSkip} style={styles.navButton}>
                        <Text style={[styles.navButtonText, isCreamBg && styles.navButtonTextOnLight]}>skip for now →</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#00ADEF',
    },
    backToAppRow: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        alignSelf: 'flex-start',
        zIndex: 10,
    },
    backToAppRowOnLight: {},
    backToAppText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.95)',
    },
    completionBowlBg: {
        ...StyleSheet.absoluteFillObject,
    },
    bowlAccentWrap: {
        position: 'absolute',
    },
    bowlAccentShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
    },
    bowlAccentShadowWithGlow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    completionButtonRow: {
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
    },
    completionBackButton: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        paddingVertical: 12,
        alignItems: 'center',
    },
    startBowlBg: {
        ...StyleSheet.absoluteFillObject,
    },
    startContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    startContextLine: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'lowercase',
    },
    startTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 34,
    },
    startSubtitle: {
        fontSize: 17,
        marginBottom: 36,
        textAlign: 'center',
        lineHeight: 24,
    },
    startCtaButton: {
        backgroundColor: 'white',
        paddingHorizontal: 32,
        paddingVertical: 18,
        borderRadius: 32,
        width: '100%',
        maxWidth: 320,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    startCtaText: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    startButton: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: SOUP_COLORS.turquoise,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    whiteButton: {
        backgroundColor: 'white',
        paddingHorizontal: 32,
        paddingVertical: 18,
        borderRadius: 32,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    loadMoreTestButton: {
        marginTop: 12,
        opacity: 0.95,
    },
    whiteButtonText: {
        color: SOUP_COLORS.turquoise,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    progressDotOnLight: {
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    progressActive: {
        backgroundColor: SOUP_COLORS.turquoise,
        width: 20,
    },
    progressActiveOnLight: {
        backgroundColor: '#141414',
    },
    progressDone: {
        backgroundColor: SOUP_COLORS.pink,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        width: '100%',
    },
    navButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    navButtonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 15,
        fontWeight: '600',
    },
    navButtonTextOnLight: {
        color: '#141414',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    }
});
