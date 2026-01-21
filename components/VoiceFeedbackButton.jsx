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

export function VoiceFeedbackButton({ audioUrl, language, userId, groupLanguage }) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [correction, setCorrection] = useState(null);
    const [pronunciationUrl, setPronunciationUrl] = useState(null);
    const [showCorrections, setShowCorrections] = useState(false);
    const [confidence, setConfidence] = useState(1.0);
    const [feedbackStatus, setFeedbackStatus] = useState(null); // 'positive', 'negative', 'submitted'

    // Reset feedback when modal opens/closes
    useEffect(() => {
        if (showModal) {
            setFeedbackStatus(null);
        }
    }, [showModal]);

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

    const handlePress = async () => {
        setShowModal(true);

        // Check cache first
        if (feedbackCache[audioUrl]) {
            const cached = feedbackCache[audioUrl];
            setTranscription(cached.transcription);
            setCorrection(cached.correction);
            setPronunciationUrl(cached.pronunciationUrl);
            setConfidence(cached.confidence);
            setShowCorrections(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        setTranscription('');
        setCorrection(null);
        setPronunciationUrl(null);
        setShowCorrections(false);

        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { audioUrl, language: groupLanguage || language, userId },
            });

            if (error) throw error;

            // Cache the results
            feedbackCache[audioUrl] = {
                transcription: data.transcription,
                correction: data.correction,
                pronunciationUrl: data.pronunciationUrl,
                confidence: data.confidence || 1.0,
            };

            // Show everything at once (no typewriter effect)
            setTranscription(data.transcription);
            setCorrection(data.correction);
            setPronunciationUrl(data.pronunciationUrl);
            setConfidence(data.confidence || 1.0);
            setShowCorrections(true);
            setLoading(false);

        } catch (error) {
            console.error('Voice feedback error:', error);
            alert('Could not process audio. Please try again.');
            setShowModal(false);
        } finally {
            setLoading(false);
        }
    };

    const computeDiff = (original, corrected) => {
        if (!original || !corrected) return [];

        const originalWords = original.trim().split(/\s+/);
        const correctedWords = corrected.trim().split(/\s+/);
        const diff = [];
        let i = 0;
        let j = 0;

        while (i < originalWords.length || j < correctedWords.length) {
            if (i >= originalWords.length) {
                // Collect all remaining added words into a phrase
                const addedPhrase = [];
                while (j < correctedWords.length) {
                    addedPhrase.push(correctedWords[j]);
                    j++;
                }
                diff.push({ type: 'added', text: addedPhrase.join(' ') });
            } else if (j >= correctedWords.length) {
                // Collect all remaining removed words into a phrase
                const removedPhrase = [];
                while (i < originalWords.length) {
                    removedPhrase.push(originalWords[i]);
                    i++;
                }
                diff.push({ type: 'removed', text: removedPhrase.join(' ') });
            } else if (originalWords[i].toLowerCase() === correctedWords[j].toLowerCase()) {
                // Words match - add as unchanged
                diff.push({ type: 'unchanged', text: originalWords[i] });
                i++;
                j++;
            } else {
                // Words differ - collect consecutive changes into phrases (max 5 words)
                const MAX_CHUNK_SIZE = 5;
                const removedPhrase = [];
                const addedPhrase = [];

                // Collect consecutive removed words
                const startI = i;
                while (i < originalWords.length &&
                    removedPhrase.length < MAX_CHUNK_SIZE &&
                    (j >= correctedWords.length ||
                        originalWords[i].toLowerCase() !== correctedWords[j].toLowerCase())) {
                    removedPhrase.push(originalWords[i]);
                    i++;

                    // Look ahead to see if we're about to match
                    if (i < originalWords.length && j < correctedWords.length) {
                        // Check if next word matches - if so, stop collecting
                        if (originalWords[i].toLowerCase() === correctedWords[j].toLowerCase()) {
                            break;
                        }
                    }
                }

                // Collect consecutive added words
                const startJ = j;
                while (j < correctedWords.length &&
                    addedPhrase.length < MAX_CHUNK_SIZE &&
                    (i >= originalWords.length ||
                        originalWords[i].toLowerCase() !== correctedWords[j].toLowerCase())) {
                    addedPhrase.push(correctedWords[j]);
                    j++;

                    // Look ahead to see if we're about to match
                    if (i < originalWords.length && j < correctedWords.length) {
                        // Check if next word matches - if so, stop collecting
                        if (originalWords[i].toLowerCase() === correctedWords[j].toLowerCase()) {
                            break;
                        }
                    }
                }

                // Add the phrases as a single change
                if (removedPhrase.length > 0) {
                    diff.push({ type: 'removed', text: removedPhrase.join(' ') });
                }
                if (addedPhrase.length > 0) {
                    diff.push({ type: 'added', text: addedPhrase.join(' ') });
                }
            }
        }
        return diff;
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
                <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
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
                                    <Text style={styles.loadingText}>Analyzing your voice...</Text>
                                </View>
                            ) : (
                                <>
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
                                        <Text style={styles.label}>YOU SAID:</Text>
                                        <View style={styles.transcriptionTextContainer}>
                                            {showCorrections && correction ? (
                                                (() => {
                                                    const diff = computeDiff(transcription, correction.corrected);
                                                    const isPerfect = diff.every(part => part.type === 'common');

                                                    if (isPerfect) {
                                                        return (
                                                            <View style={styles.perfectMatch}>
                                                                <Text style={styles.perfectMatchText}>✨ No corrections needed!</Text>
                                                                <Text style={styles.originalText}>{transcription}</Text>
                                                            </View>
                                                        );
                                                    }

                                                    return (
                                                        <Text style={styles.transcriptionText}>
                                                            {diff.map((part, index) => (
                                                                <AnimatedWord
                                                                    key={index}
                                                                    part={part}
                                                                    index={index}
                                                                />
                                                            ))}
                                                        </Text>
                                                    );
                                                })()
                                            ) : (
                                                <Text style={styles.transcriptionText}>
                                                    {transcription}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Audio Player */}
                                    {pronunciationUrl && (
                                        <CorrectionAudioPlayer
                                            url={pronunciationUrl}
                                            duration={10} // We don't have exact duration, estimate
                                        />
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
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

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
const CorrectionAudioPlayer = ({ url, duration }) => {
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);

    useEffect(() => {
        // Enable playback in silent mode
        Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
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
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
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
            }
        }
    };

    const handleWaveformPress = async (event) => {
        if (!sound || !durationMillis) return;

        const { locationX } = event.nativeEvent;
        // event.nativeEvent.target.offsetWidth is not reliable in React Native,
        // typically you'd use onLayout to get the width of the container.
        // For simplicity, assuming a fixed width or getting it from a ref.
        // For this fix, I'll assume it's a placeholder and keep the original logic.
        const containerWidth = event.nativeEvent.target.offsetWidth || 300;
        const newProgress = locationX / containerWidth;
        const newPosition = newProgress * durationMillis;

        await sound.setPositionAsync(newPosition);
    };

    const progress = durationMillis > 0 ? position / durationMillis : 0;

    const waveformHeights = useMemo(() => {
        return Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3);
    }, []);

    return (
        <View style={styles.audioPlayer}>
            <Text style={styles.label}>CORRECT PRONUNCIATION:</Text>
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
        // marginTop removed to align with parent
        alignSelf: 'flex-start',
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12, // Reduced from 16
        paddingVertical: 5, // Reduced from 6
        paddingHorizontal: 8, // Reduced from 10
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
        fontSize: 11, // Reduced from 12
        fontWeight: '700',
    },
    newBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 4, // Reduced gap
    },
    newBadgeText: {
        fontSize: 8, // Reduced from 9
        fontWeight: '800',
        color: SOUP_COLORS.pink,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '70%',
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
    transcriptionBox: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 8,
        letterSpacing: 1,
    },
    transcriptionText: {
        fontSize: 18,
        lineHeight: 28,
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
});
