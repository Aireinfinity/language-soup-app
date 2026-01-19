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
    const [feedback, setFeedback] = useState(null);
    const [showOptIn, setShowOptIn] = useState(false);
    const [hasOptedIn, setHasOptedIn] = useState(null);

    // Feature flag check - TEMPORARILY DISABLED FOR TESTING
    // if (!BETA_USERS.includes(userId)) {
    //     return null;
    // }

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
        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { audioUrl, language: groupLanguage || language, userId },
            });

            if (error) throw error;
            setFeedback(data);
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

    if (feedback) {
        return (
            <View style={styles.feedbackCard}>
                <Text style={styles.feedbackLabel}>📝 What you said:</Text>
                <Text style={styles.feedbackText}>{feedback.transcription}</Text>

                {feedback.hasErrors ? (
                    <>
                        <Text style={[styles.feedbackLabel, { marginTop: 12 }]}>✅ Suggestion:</Text>
                        <Text style={styles.feedbackCorrected}>{feedback.corrected}</Text>
                        {feedback.explanation && (
                            <Text style={styles.feedbackTip}>💡 {feedback.explanation}</Text>
                        )}
                    </>
                ) : (
                    <Text style={styles.feedbackPerfect}>🎉 Perfect! No errors detected</Text>
                )}

                <Pressable style={styles.pronunciationButton} onPress={playPronunciation}>
                    <Text style={styles.pronunciationText}>🔊 Hear Pronunciation</Text>
                </Pressable>

                {hasOptedIn && (
                    <View style={styles.ratingButtons}>
                        <Text style={styles.ratingLabel}>Was this helpful?</Text>
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
            </View>
        );
    }

    return (
        <Pressable style={styles.correctMeButton} onPress={handleCorrectMe} disabled={loading}>
            {loading ? (
                <ActivityIndicator color="#fff" size="small" />
            ) : (
                <Text style={styles.correctMeText}>✨ Correct Me</Text>
            )}
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
    feedbackCard: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
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
        fontSize: 14,
        color: SOUP_COLORS.green,
        fontWeight: '600',
        lineHeight: 20,
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
        marginTop: 8,
    },
    pronunciationButton: {
        backgroundColor: SOUP_COLORS.pink,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    pronunciationText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
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
