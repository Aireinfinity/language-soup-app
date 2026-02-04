import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { X, Play, Pause } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
} from 'react-native-reanimated';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    red: '#ff4d4f',
};

const BETA_USERS = [
    '29864936-719c-483b-ac6a-4d06084a48fe',
    'NOAH_ANDROID_USER_ID',
];

const WAVEFORM_BARS = 30;

// Cache for voice feedback results
const feedbackCache = {};

const LOADING_MESSAGES = [
    "Tasting your pronunciation...",
    "Checking the recipe...",
    "Consulting the chef...",
    "Simmering your words...",
    "Adding a pinch of grammar...",
    "Stirring the correction pot...",
    "Seasoning with feedback...",
    "Letting it marinate...",
    "Plating your sentence...",
    "Garnishing with tips..."
];

export function VoiceFeedbackButton({ audioUrl, language, userId, groupLanguage, challengeContext }) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [correction, setCorrection] = useState(null);
    const [pronunciationUrl, setPronunciationUrl] = useState(null);
    const [showCorrections, setShowCorrections] = useState(false);
    const [confidence, setConfidence] = useState(1.0);
    const [feedbackStatus, setFeedbackStatus] = useState(null); // 'positive', 'negative', 'submitted'
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

    // Reset feedback when modal opens/closes
    useEffect(() => {
        if (showModal) {
            setFeedbackStatus(null);
        }
    }, [showModal]);

    // Cycle loading messages every 3 seconds while loading
    useEffect(() => {
        let interval;
        if (loading && !transcription) {
            interval = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = LOADING_MESSAGES.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
                    return LOADING_MESSAGES[nextIndex];
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [loading, transcription]);

    const submitFeedback = async (isPositive) => {
        setFeedbackStatus(isPositive ? 'positive' : 'negative');

        try {
            await supabase.from('app_feature_feedback').insert({
                user_id: userId,
                feature_name: 'voice_correct_me',
                rating: isPositive ? 5 : 1,
                feedback_text: isPositive ? 'Good correction' : 'Bad correction'
            });

            // Show "Thanks" after delay
            setTimeout(() => {
                setFeedbackStatus('submitted');
            }, 1000);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    };

    // Memoize Diff and Score for clean rendering
    const diff = useMemo(() => {
        if (!transcription || !correction?.corrected) return [];
        return computeDiff(transcription, correction.corrected);
    }, [transcription, correction]);

    const accuracyScore = useMemo(() => {
        if (diff.length === 0) return 100;

        let common = 0, added = 0, removed = 0;
        diff.forEach(part => {
            const val = part.value || part.text || '';
            const count = val.trim() ? val.trim().split(/\s+/).length : 0;
            if (count === 0) return;

            if (part.type === 'unchanged' || part.type === 'common') common += count;
            else if (part.type === 'removed') removed += count;
            else if (part.type === 'added') added += count;
        });

        const totalOriginal = common + removed;
        const totalCorrected = common + added;
        const denominator = Math.max(totalOriginal, totalCorrected);

        return denominator > 0 ? Math.round((common / denominator) * 100) : 100;
    }, [diff]);

    const isPerfect = useMemo(() => {
        return correction?.is_correct === true;
    }, [correction]);

    const handlePress = async () => {
        setShowModal(true);

        // Check cache first (Support partial cache?)
        if (feedbackCache[audioUrl] && feedbackCache[audioUrl].transcription) {
            const cached = feedbackCache[audioUrl];
            setTranscription(cached.transcription);
            setCorrection(cached.correction);
            setConfidence(cached.confidence);
            if (cached.audioBase64) {
                setPronunciationUrl(`data:audio/mp3;base64,${cached.audioBase64}`);
            } else {
                setPronunciationUrl(null);
            }
            setShowCorrections(true);
            setLoading(false);

            // If cached but missing audio, fetch it?
            if (!cached.pronunciationUrl && cached.correction && cached.correction.corrected) {
                // Background fetch audio
                supabase.functions.invoke('voice-feedback', {
                    body: {
                        text: cached.correction.corrected,
                        task: 'pronunciation',
                        language: groupLanguage || language,
                    },
                }).then(({ data, error }) => {
                    if (data?.pronunciationUrl) {
                        setPronunciationUrl(data.pronunciationUrl);
                        feedbackCache[audioUrl].pronunciationUrl = data.pronunciationUrl;
                    }
                });
            }
            return;
        }

        setLoading(true);
        setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
        setTranscription('');
        setCorrection(null);
        setPronunciationUrl(null);
        setShowCorrections(false);

        try {
            // STEP 1: ANALYZE (Transcription + Correction)
            // Pass the Challenge Context to the backend so it knows what to expect!
            const bodyPayload = {
                audioUrl,
                language: groupLanguage || language,
                userId,
                task: 'analyze',
                context: challengeContext // { prompt, starter_phrase }
            };

            // console.log('🥣 [VoiceButton] Requesting Analysis:', JSON.stringify(bodyPayload, null, 2));

            const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('voice-feedback', {
                body: bodyPayload,
            });

            if (analyzeError) throw analyzeError;

            // console.log('=== FRONTEND RECEIVED ===');
            setTranscription(analyzeData.transcription);
            setCorrection(analyzeData.correction);
            setConfidence(analyzeData.confidence || 0.95);
            setLoading(false); // Optimistic UI: Show text immediately
            setShowCorrections(true);

            // Update cache with partial data
            feedbackCache[audioUrl] = {
                transcription: analyzeData.transcription,
                correction: analyzeData.correction,
                confidence: analyzeData.confidence,
                pronunciationUrl: null
            };

            // STEP 2: AUDIO (Pronunciation) - Background
            if (analyzeData.correction?.corrected) {
                const { data: audioData, error: audioError } = await supabase.functions.invoke('voice-feedback', {
                    body: {
                        text: analyzeData.correction.corrected,
                        task: 'pronunciation',
                        language: groupLanguage || language,
                    },
                });

                if (audioData?.pronunciationUrl) {
                    setPronunciationUrl(audioData.pronunciationUrl);
                    // Update cache with full data
                    feedbackCache[audioUrl].pronunciationUrl = audioData.pronunciationUrl;
                }
            }

        } catch (error) {
            console.error('Voice feedback error:', error);
            // Alert the user if it's a real failure
            // Alert.alert("Error", "Could not analyze voice. Please try again.");
            setLoading(false);
        }
    };

    return (
        <>
            <Pressable onPress={handlePress} style={styles.button}>
                <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>✨ Correct Me</Text>
                    <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                </View>
            </Pressable>

            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.backdrop} onPress={() => setShowModal(false)} />
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <Text style={styles.title}>✨ Voice Corrections</Text>
                                <View style={styles.betaBadge}>
                                    <Text style={styles.betaText}>BETA</Text>
                                </View>
                            </View>
                            <Pressable onPress={() => setShowModal(false)} style={styles.closeButton}>
                                <X size={24} color="#666" />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                            {loading && !transcription ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                                    <Text style={styles.loadingText}>{loadingMessage}</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Original Audio Playback */}
                                    <View style={styles.originalAudioBox}>
                                        <Text style={styles.label}>🎤 YOUR VOICE MEMO:</Text>
                                        <CorrectionAudioPlayer url={audioUrl} duration={10} isOriginal={true} />
                                    </View>

                                    {/* Low Confidence Warning */}
                                    {confidence < 0.8 && (
                                        <View style={styles.confidenceWarning}>
                                            <Text style={styles.warningIcon}>⚠️</Text>
                                            <Text style={styles.warningText}>
                                                Audio quality was unclear. Transcription may not be accurate.
                                            </Text>
                                        </View>
                                    )}

                                    {/* Transcription with corrections */}
                                    <View style={styles.transcriptionBox}>
                                        <View style={styles.transcriptionHeader}>
                                            <Text style={styles.label}>YOU SAID:</Text>
                                        </View>
                                        <View style={styles.transcriptionTextContainer}>
                                            {showCorrections && correction ? (
                                                isPerfect ? (
                                                    <View style={styles.perfectMatch}>
                                                        <Text style={styles.perfectMatchText}>✨ No corrections needed!</Text>
                                                        <Text style={styles.originalText}>{transcription}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.transcriptionText}>
                                                        {diff.map((part, index) => (
                                                            part.type === 'added' ? null : (
                                                                <AnimatedWord
                                                                    key={index}
                                                                    part={part}
                                                                    index={index}
                                                                />
                                                            )
                                                        ))}
                                                    </Text>
                                                )
                                            ) : (
                                                <Text style={styles.transcriptionText}>
                                                    {transcription}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Explanation / Summary (Translanguaging) - ALWAYS SHOW */}
                                    {correction?.explanation && !isPerfect && (
                                        <View style={styles.explanationBox}>
                                            <View style={styles.correctionRow}>
                                                <Text style={styles.correctionLabel}>✅ BETTER:</Text>
                                                <Text style={styles.correctionText}>
                                                    {diff.map((part, index) => (
                                                        part.type === 'removed' ? null : (
                                                            <Text
                                                                key={index}
                                                                style={part.type === 'added' ? { color: SOUP_COLORS.green, fontWeight: 'bold' } : {}}
                                                            >
                                                                {part.text}{' '}
                                                            </Text>
                                                        )
                                                    ))}
                                                </Text>
                                            </View>
                                            <View style={styles.divider} />
                                            <Text style={styles.explanationLabel}>💡 FEEDBACK</Text>
                                            <Text style={styles.explanationText}>
                                                {correction.explanation}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Positive feedback for perfect sentences */}
                                    {correction?.explanation && isPerfect && (
                                        <View style={styles.explanationBox}>
                                            <Text style={styles.explanationLabel}>💡 FEEDBACK</Text>
                                            <Text style={styles.explanationText}>
                                                {correction.explanation}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Audio Player */}
                                    {pronunciationUrl ? (
                                        <CorrectionAudioPlayer
                                            url={pronunciationUrl}
                                            duration={10}
                                        />
                                    ) : (
                                        <View style={styles.audioLoading}>
                                            <ActivityIndicator size="small" color={SOUP_COLORS.blue} />
                                            <Text style={styles.audioLoadingText}>Generating pronunciation...</Text>
                                        </View>
                                    )}

                                    {/* Feedback Section */}
                                    {showCorrections && (
                                        <View style={styles.feedbackContainer}>
                                            {feedbackStatus === 'submitted' ? (
                                                <Text style={styles.feedbackCheck}>✓ Thanks for feedback!</Text>
                                            ) : (
                                                <>
                                                    <Text style={styles.feedbackLabel}>How was this correction?</Text>
                                                    <View style={styles.feedbackButtons}>
                                                        <Pressable
                                                            onPress={() => submitFeedback(false)}
                                                            style={[styles.feedbackBtn, styles.feedbackBtnBlue, feedbackStatus === 'negative' && styles.feedbackBtnActive]}
                                                        >
                                                            <Text style={styles.feedbackEmoji}>👎</Text>
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => submitFeedback(true)}
                                                            style={[styles.feedbackBtn, styles.feedbackBtnGreen, feedbackStatus === 'positive' && styles.feedbackBtnActive]}
                                                        >
                                                            <Text style={styles.feedbackEmoji}>👍</Text>
                                                        </Pressable>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal >
        </>
    );
}

// Logic for computing differences between strings
// Logic for computing differences between strings
const computeDiff = (original, corrected) => {
    if (!original || !corrected) return [];

    // Helper to strip punctuation for comparison
    const clean = (w) => w ? w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") : "";

    const originalWords = original.trim().split(/\s+/);
    const correctedWords = corrected.trim().split(/\s+/);
    const diff = [];
    let i = 0;
    let j = 0;

    while (i < originalWords.length || j < correctedWords.length) {
        if (i >= originalWords.length) {
            // Added
            diff.push({ type: 'added', text: correctedWords[j] });
            j++;
        } else if (j >= correctedWords.length) {
            // Removed
            diff.push({ type: 'removed', text: originalWords[i] });
            i++;
        } else if (clean(originalWords[i]) === clean(correctedWords[j])) {
            // Unchanged (Use original text to keep casing/punctuation)
            diff.push({ type: 'unchanged', text: originalWords[i] });
            i++;
            j++;
        } else {
            // Difference found - Simple lookahead (1 word) to regain sync
            // Check if matches next word in original (Deletion)
            if (i + 1 < originalWords.length && clean(originalWords[i + 1]) === clean(correctedWords[j])) {
                diff.push({ type: 'removed', text: originalWords[i] });
                i++;
            }
            // Check if matches next word in corrected (Addition)
            else if (j + 1 < correctedWords.length && clean(originalWords[i]) === clean(correctedWords[j + 1])) {
                diff.push({ type: 'added', text: correctedWords[j] });
                j++;
            }
            // Substitution (Remove + Add)
            else {
                diff.push({ type: 'removed', text: originalWords[i] });
                diff.push({ type: 'added', text: correctedWords[j] });
                i++;
                j++;
            }
        }
    }
    return diff;
};

// Animated word component for smooth red/green appearance
const AnimatedWord = ({ part, index }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        opacity.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
        scale.value = withDelay(index * 50, withSpring(1, { damping: 12 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.Text
            style={[
                styles.word,
                part.type === 'removed' && styles.strikeRed,
                part.type === 'added' && styles.textGreen,
                animatedStyle,
            ]}
        >
            {part.text}{' '}
        </Animated.Text>
    );
};

// Reusable audio player with waveform
const CorrectionAudioPlayer = ({ url, duration, isOriginal = false }) => {
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState(null);
    const soundRef = useRef(null); // Ref to hold sound object to avoid stale closures
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);

    useEffect(() => {
        // ... (existing audio setup)
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            allowsRecordingIOS: true, // Ensure we don't disable recording globally
        }).catch(err => console.log('Audio setup error:', err));
    }, []);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playAudio = async () => {
        try {
            if (soundRef.current) {
                if (isPlaying) {
                    await soundRef.current.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await soundRef.current.playAsync();
                    setIsPlaying(true);
                }
                return;
            }

            setLoading(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            soundRef.current = newSound;
            setSound(newSound);
            setIsPlaying(true);
            setLoading(false);
        } catch (error) {
            console.error('Error playing:', error);
            setLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDurationMillis(status.durationMillis);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                // Reset the sound object's position so it's ready to play again immediately
                soundRef.current?.setPositionAsync(0);
            }
        }
    };

    const handleWaveformPress = async (event) => {
        if (!soundRef.current || !durationMillis) return;

        const { locationX } = event.nativeEvent;
        const containerWidth = 300; // Simplified placeholder
        const newProgress = locationX / containerWidth;
        const newPosition = newProgress * durationMillis;

        await sound.setPositionAsync(newPosition);
    };

    const progress = durationMillis > 0 ? position / durationMillis : 0;

    const waveformHeights = useMemo(() => {
        return Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3);
    }, []);

    return (
        <View style={[styles.audioPlayer, isOriginal && { backgroundColor: 'transparent', padding: 0 }]}>
            {!isOriginal && <Text style={styles.label}>CORRECT PRONUNCIATION:</Text>}
            <View style={styles.playerControls}>
                <Pressable onPress={playAudio} style={styles.playButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color={SOUP_COLORS.pink} />
                    ) : isPlaying ? (
                        <Pause size={20} color={SOUP_COLORS.pink} fill={SOUP_COLORS.pink} />
                    ) : (
                        <Play size={20} color={SOUP_COLORS.pink} fill={SOUP_COLORS.pink} />
                    )}
                </Pressable>

                <Pressable
                    style={styles.waveformContainer}
                    onPress={handleWaveformPress}
                    disabled={!sound}
                >
                    {waveformHeights.map((height, index) => (
                        <WaveformBar
                            key={index}
                            index={index}
                            totalBars={WAVEFORM_BARS}
                            height={height}
                            progress={progress}
                        />
                    ))}
                </Pressable>
            </View>
        </View>
    );
};


const WaveformBar = ({ index, totalBars, height, progress }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const barPos = index / totalBars;
        const isPlayed = progress > barPos;

        return {
            backgroundColor: isPlayed ? SOUP_COLORS.pink : 'rgba(236, 0, 139, 0.2)',
            height: 24 * height,
            transform: [{
                scaleY: isPlayed
                    ? withSpring(1.08, { damping: 12, stiffness: 110 })
                    : withSpring(1, { damping: 12, stiffness: 110 })
            }]
        };
    });

    return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const styles = StyleSheet.create({
    button: {
        alignSelf: 'flex-start',
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 8,
        shadowColor: '#ec008b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    newBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 4,
    },
    newBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 0, // Let ScrollView handle bottom padding
        height: '90%',
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    betaBadge: {
        backgroundColor: '#FFE6F4', // Light pink
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#ec008b', // Pink border
    },
    betaText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ec008b', // Pink text
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 16,
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    originalAudioBox: {
        backgroundColor: '#FFF0F7',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.pink,
        marginBottom: 12,
    },
    transcriptionBox: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
        borderLeftColor: SOUP_COLORS.blue,
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 8,
        letterSpacing: 1,
    },
    transcriptionText: {
        fontSize: 16, // Reduced from 18
        lineHeight: 24,
        color: '#333',
        flexWrap: 'wrap',
    },
    transcriptionTextContainer: {
        flexDirection: 'column',
    },
    perfectMatch: {
        marginTop: 4,
    },
    perfectMatchText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: SOUP_COLORS.green,
        marginBottom: 4,
    },
    originalText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#333',
    },
    word: {
        fontSize: 18,
    },
    strikeRed: {
        textDecorationLine: 'line-through',
        color: '#FF4D4F',
        opacity: 0.6,
    },
    textGreen: {
        color: '#19b091', // Green
        fontWeight: '600',
    },
    confidenceWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FFB800',
    },
    warningIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    warningText: {
        flex: 1,
        fontSize: 13,
        color: '#8B7000',
        lineHeight: 18,
    },
    audioPlayer: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
    },
    playerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
    },
    transcriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreBadge: {
        backgroundColor: '#E6FFFA', // Light green
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: SOUP_COLORS.green,
    },
    scoreText: {
        fontSize: 11,
        fontWeight: '800',
        color: SOUP_COLORS.green,
    },
    audioLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        gap: 10,
    },
    audioLoadingText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    explanationBox: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#EBF8FF', // Light Blue
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
    },
    explanationLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: SOUP_COLORS.blue,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    explanationText: {
        fontSize: 14, // Reduced from 15
        lineHeight: 20,
        color: '#2c3e50',
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    feedbackContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    feedbackLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    feedbackButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    feedbackBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    feedbackBtnBlue: {
        backgroundColor: SOUP_COLORS.blue,
    },
    feedbackBtnGreen: {
        backgroundColor: SOUP_COLORS.green,
    },
    feedbackBtnActive: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    feedbackEmoji: {
        fontSize: 28,
        color: '#fff',
    },
    feedbackCheck: {
        fontSize: 16,
        fontWeight: 'bold',
        color: SOUP_COLORS.green,
        textAlign: 'center',
        paddingVertical: 10,
    },
    correctionRow: {
        marginBottom: 12,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: SOUP_COLORS.green,
    },
    correctionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: SOUP_COLORS.green,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    correctionText: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,173,239,0.2)',
        marginVertical: 12,
    },
});
