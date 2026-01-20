import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
};

// Feature flag - Remove this check to roll out to everyone
const BETA_USERS = [
    '29864936-719c-483b-ac6a-4d06084a48fe', // Noah
    '074f2e2f-2a8a-4b09-afb5-fd60ce9e20c7', // Michelle
];

export function VoiceFeedbackButton({ audioUrl, language, userId, groupLanguage }) {
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(''); // 'transcribing', 'analyzing', 'generating'
    const [feedback, setFeedback] = useState(null);
    const [transcription, setTranscription] = useState(null); // Show immediately
    const [correction, setCorrection] = useState(null); // Show after analysis
    const [showDetails, setShowDetails] = useState(false); // Toggle for full transcription
    const [showOptIn, setShowOptIn] = useState(false);
    const [hasOptedIn, setHasOptedIn] = useState(null);

    // Feature flag check
    if (!BETA_USERS.includes(userId)) {
        return null;
    }

    const checkOptInStatus = async () => {
        const { data } = await supabase
            .from('app_users')
            .select('share_voice_feedback')
            .eq('id', userId)
            .single();

        setHasOptedIn(data?.share_voice_feedback);
        return data?.share_voice_feedback;
    };

    const handleOptIn = async (optIn) => {
        await supabase
            .from('app_users')
            .update({ share_voice_feedback: optIn })
            .eq('id', userId);

        setHasOptedIn(optIn);
        setShowOptIn(false);

        if (optIn) {
            handleCorrectMe();
        }
    };

    const handleCorrectMe = async () => {
        // Check opt-in status on first use
        if (hasOptedIn === null) {
            const status = await checkOptInStatus();
            if (status === false || status === null) {
                setShowOptIn(true);
                return;
            }
        }

        setLoading(true);
        setLoadingStep('transcribing');
        setTranscription(null);
        setCorrection(null);
        setFeedback(null);

        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { audioUrl, language: groupLanguage || language, userId },
            });

            if (error) throw error;

            // Show results progressively
            setTranscription(data.transcription);
            setLoadingStep('analyzing');

            setTimeout(() => {
                setCorrection(data.correction);
                setLoadingStep('generating');

                setTimeout(() => {
                    setFeedback(data);
                    setLoadingStep('');
                }, 300);
            }, 300);

        } catch (error) {
            console.error('Voice feedback error:', error);
            alert('Could not process audio. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const playPronunciation = async () => {
        if (!feedback?.pronunciationUrl) return;

        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: feedback.pronunciationUrl },
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (error) {
            console.error('Playback error:', error);
        }
    };

    const rateFeedback = async (helpful) => {
        if (!feedback || hasOptedIn === false) return;

        await supabase
            .from('app_voice_feedback_data')
            .update({ user_rating: helpful ? 'helpful' : 'not_helpful' })
            .eq('user_id', userId)
            .eq('transcription', feedback.transcription)
            .order('created_at', { ascending: false })
            .limit(1);
    };

    if (showOptIn) {
        return (
            <View style={styles.optInCard}>
                <Text style={styles.optInTitle}>Help Improve Language Soup?</Text>
                <Text style={styles.optInText}>
                    Share your transcriptions and corrections to help improve the AI for everyone.
                </Text>
                <Text style={styles.optInNote}>✓ We never store your voice</Text>
                <Text style={styles.optInNote}>✓ Data is anonymized</Text>
                <Text style={styles.optInNote}>✓ You can opt out anytime</Text>

                <View style={styles.optInButtons}>
                    <Pressable style={styles.optInYes} onPress={() => handleOptIn(true)}>
                        <Text style={styles.optInYesText}>Yes, help improve</Text>
                    </Pressable>
                    <Pressable style={styles.optInNo} onPress={() => handleOptIn(false)}>
                        <Text style={styles.optInNoText}>No thanks</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // Show progressive loading states
    if (loading || transcription || correction) {
        return (
            <View style={styles.feedbackCard}>
                {/* Step 1: Transcription (Hidden by default, shown while loading) */}
                {loadingStep === 'transcribing' && (
                    <View style={styles.loadingStep}>
                        <ActivityIndicator color="#6366f1" size="small" />
                        <Text style={styles.loadingText}>Transcribing your voice...</Text>
                    </View>
                )}

                {/* Step 2: Corrections */}
                {loadingStep === 'analyzing' && (
                    <View style={[styles.loadingStep, { marginTop: 12 }]}>
                        <ActivityIndicator color="#6366f1" size="small" />
                        <Text style={styles.loadingText}>Analyzing for errors...</Text>
                    </View>
                )}

                {correction && (
                    <>
                        {correction.hasErrors ? (
                            <>
                                <View style={styles.correctionHeader}>
                                    <View style={styles.errorBadge}>
                                        <Text style={styles.errorBadgeText}>⚠️ Correction Found</Text>
                                    </View>
                                </View>
                                <Text style={styles.feedbackCorrected}>{correction.corrected}</Text>
                            </>
                        ) : (
                            <View style={styles.perfectContainer}>
                                <Text style={styles.feedbackPerfect}>🎉 Perfect! No errors.</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Step 3: Pronunciation */}
                {loadingStep === 'generating' && correction && (
                    <View style={[styles.loadingStep, { marginTop: 12 }]}>
                        <ActivityIndicator color="#6366f1" size="small" />
                        <Text style={styles.loadingText}>Checking pronunciation...</Text>
                    </View>
                )}

                {feedback && (
                    <>
                        <View style={styles.actionsRow}>
                            {feedback.pronunciationUrl && (
                                <Pressable style={styles.actionButton} onPress={playPronunciation}>
                                    <Text style={styles.actionButtonText}>🔊 Listen</Text>
                                </Pressable>
                            )}

                            <Pressable
                                style={styles.textButton}
                                onPress={() => setShowDetails(!showDetails)}
                            >
                                <Text style={styles.textButtonText}>
                                    {showDetails ? 'Hide Details' : 'Show Details'}
                                </Text>
                            </Pressable>
                        </View>

                        {showDetails && (
                            <View style={styles.detailsContainer}>
                                <Text style={styles.detailLabel}>You said:</Text>
                                <Text style={styles.detailText}>"{transcription}"</Text>

                                {correction?.explanation && (
                                    <>
                                        <Text style={[styles.detailLabel, { marginTop: 12 }]}>Why:</Text>
                                        <Text style={styles.detailText}>{correction.explanation}</Text>
                                    </>
                                )}
                            </View>
                        )}

                        {hasOptedIn && (
                            <View style={styles.ratingButtons}>
                                <Text style={styles.ratingLabel}>Helpful?</Text>
                                <View style={styles.ratingRow}>
                                    <Pressable style={styles.ratingButton} onPress={() => rateFeedback(true)}>
                                        <Text style={styles.ratingEmoji}>👍</Text>
                                    </Pressable>
                                    <Pressable style={styles.ratingButton} onPress={() => rateFeedback(false)}>
                                        <Text style={styles.ratingEmoji}>👎</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    }

    return (
        <Pressable style={styles.correctMeButton} onPress={handleCorrectMe} disabled={loading}>
            <Text style={styles.correctMeText}>✨ Correct Me</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    correctMeButton: {
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    correctMeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    loadingStep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    loadingText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '600',
    },
    feedbackCard: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    correctionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    errorBadge: {
        backgroundColor: '#FEE2E2', // Light red
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    errorBadgeText: {
        color: '#EF4444', // Red 500
        fontSize: 12,
        fontWeight: '700',
    },
    perfectContainer: {
        paddingVertical: 8,
    },
    feedbackLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        marginBottom: 4,
    },
    feedbackText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    feedbackCorrected: {
        fontSize: 16,
        color: SOUP_COLORS.green,
        fontWeight: '700',
        lineHeight: 24,
    },
    feedbackTip: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 6,
    },
    feedbackPerfect: {
        fontSize: 14,
        color: SOUP_COLORS.green,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 12,
    },
    actionButton: {
        backgroundColor: SOUP_COLORS.pink,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    textButton: {
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    textButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    detailsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#999',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    ratingButtons: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    ratingLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 12,
    },
    ratingButton: {
        padding: 8,
    },
    ratingEmoji: {
        fontSize: 24,
    },
    optInCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
    },
    optInTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    optInText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        lineHeight: 20,
    },
    optInNote: {
        fontSize: 12,
        color: SOUP_COLORS.green,
        marginBottom: 4,
    },
    optInButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    optInYes: {
        flex: 1,
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    optInYesText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    optInNo: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    optInNoText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
});
