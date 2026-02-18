import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';

const SOUP_COLORS = {
    pink: '#ec008b',
    blue: '#00adef',
    cream: '#FDF5E6',
    text: '#2d3436',
};

export function InspirationInline({ metadata: initialMetadata, language, prompt, challengeId }) {


    // Use initial metadata OR localized generated metadata
    const [metadata, setMetadata] = useState(initialMetadata);
    const [expanded, setExpanded] = useState(false);

    // Audio State
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);

    // Unload sound on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Fun loading messages
    const LOADING_MESSAGES = [
        "Going to Trader Joe's...",
        "Going to Erewhon...",
        "Foraging in the garden...",
        "Haggling at the farmer's market...",
        "Checking the pantry...",
        "Simmering the broth...",
        "Chopping fresh ingredients...",
        "Asking grandma for the recipe...",
        "Waiting for the soup to cool..."
    ];
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

    // User ID State (for personalized translations)
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.id) setUserId(data.user.id);
        });
    }, []);

    // Feedback State
    const [feedbackStatus, setFeedbackStatus] = useState(null); // 'positive', 'negative', 'submitted'

    // Reset feedback when generating new hints
    useEffect(() => {
        if (isGenerating) {
            setFeedbackStatus(null);
        }
    }, [isGenerating]);

    const submitFeedback = async (isPositive) => {
        setFeedbackStatus(isPositive ? 'positive' : 'negative');
        try {
            const { error } = await supabase.from('app_feature_feedback').insert({
                // user_id: userId, // Wait, I don't have userId prop here? I need to check props.
                // If userId is missing, maybe just omit it or rely on RLS/Auth context if available?
                // Actually, InspirationInline might not receive userId. 
                // Let me check props: { metadata, language, prompt, challengeId }
                // Use a simplified logging if no User ID, or ignore it.
                // Actually, usually Supabase client in React Native might not auth automatically if not authenticated?
                // I'll skip user_id if not present, but use feature_name.
                feature_name: 'soup_hints',
                rating: isPositive ? 5 : 1,
                feedback_text: isPositive ? 'Helpful hint' : 'Unhelpful hint',
                metadata: { prompt, language }
            });

            if (error) throw error;

            setTimeout(() => {
                setFeedbackStatus('submitted');
            }, 800);
        } catch (err) {
            console.error('Feedback error:', err);
        }
    };

    const handleExpand = async () => {
        try {
            // If we already have VALID data, just toggle
            if (metadata && metadata.starter_phrase) {
                setExpanded(!expanded);
                return;
            }

            // If no data (or empty data), we need to GENERATE it!
            if (!isGenerating) {
                // Pick a new random message
                setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
                setExpanded(true);
                await generateHints();
            }
        } catch (error) {
            console.error('🥣 [InspirationInline] Expand Error:', error);
        }
    };
    // ... (skip down to loading text)
    // actually I'll use multi_replace if needed, but here I can target the component chunks.
    // Wait, I can't target multiple disjoint blocks with replace_file_content.
    // I will use multi_replace_file_content.

    const generateHints = async () => {
        if (!prompt) {
            console.warn('Cannot generate hints without a prompt');
            return;
        }

        setIsGenerating(true);
        try {
            const payload = {
                task: 'generate_hints',
                prompt: prompt,
                language: language || 'Target Language',
                challengeId: challengeId,
                userId: userId // Pass confirmed User ID
            };


            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: payload
            });

            if (error) {
                console.error('🥣 [InspirationInline] Supabase Function Error:', error);
                throw error;
            }



            if (data && data.starter_phrase) {
                setMetadata(data);
            } else {
                console.warn('🥣 [InspirationInline] Data missing starter_phrase');
            }
        } catch (err) {
            console.error('🥣 [InspirationInline] GENERATION EXCEPTION:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlay = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.replayAsync();
                    setIsPlaying(true);
                }
                return;
            }

            // Fetch audio if we don't have it
            if (!audioUrl) {
                setIsLoadingAudio(true);
                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: {
                        text: metadata.starter_phrase,
                        task: 'pronunciation',
                        language: language // Let backend handle default (Multilingual)
                    }
                });

                if (error || !data?.pronunciationUrl) {
                    throw new Error('Failed to generate audio');
                }
                setAudioUrl(data.pronunciationUrl);
                await playSound(data.pronunciationUrl);
            } else {
                await playSound(audioUrl);
            }
        } catch (error) {
            console.error('Audio playback error (ElevenLabs):', error);
            setIsLoadingAudio(false);

            // FALLBACK: Use Native Device Text-to-Speech (free, infinite lang support)
            // This rescues Farsi, Thai, etc. 
            try {
                // If ElevenLabs fails, we don't want to alert "Error", we want to just play SOMETHING.


                // SAFE IMPORT: Only load if module exists (prevents crash on old dev clients)
                let Speech;
                try {
                    Speech = require('expo-speech');
                } catch (e) {
                    console.warn('Expo Speech module not found (Native Rebuild Required)');
                }

                if (Speech && Speech.speak) {
                    Speech.speak(metadata.starter_phrase, {
                        language: language === 'Farsi' ? 'fa' : undefined, // Farsi code
                        // Basic undefined lets the phone Auto-Detect based on text usually, 
                        // or allows us to pass locale if we have it map (e.g. 'es', 'fr').
                    });
                } else {
                    console.warn('Speech fallback unavailable');
                    Alert.alert("Audio Error", "Could not generate audio (Native module missing).");
                }
            } catch (speechError) {
                console.error('Native Speech failed too:', speechError);
                Alert.alert("Audio Error", "Could not generate audio. Please check your connection.");
            }
        }
    };

    const playSound = async (uri) => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false, // Force speaker output
                playsInSilentModeIOS: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                (status) => {
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                    }
                }
            );
            setSound(newSound);
            setIsPlaying(true);
            setIsLoadingAudio(false);
        } catch (error) {
            console.error('Sound creation error:', error);
            setIsLoadingAudio(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Pink Trigger Button / Header */}
            <Pressable
                style={[styles.headerButton, expanded && styles.headerButtonExpanded]}
                onPress={handleExpand}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerEmoji}>🥣</Text>
                    <Text style={styles.headerText}>Need some ingredients?</Text>
                </View>
                {expanded ? <ChevronUp size={16} color={SOUP_COLORS.text} /> : <ChevronDown size={16} color={SOUP_COLORS.text} />}
            </Pressable>

            {/* Expanded Content */}
            {expanded && (
                <View style={styles.contentPanel}>
                    {isGenerating ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={SOUP_COLORS.pink} />
                            <Text style={styles.loadingText}>{loadingMessage}</Text>
                        </View>
                    ) : (metadata && metadata.starter_phrase) ? (
                        <>
                            {/* Starter Phrase Section */}
                            <View style={styles.phraseContainer}>
                                <View style={styles.phraseTextContainer}>
                                    <Text style={styles.label}>TRY SAYING:</Text>
                                    <Text style={styles.phraseText}>"{metadata.starter_phrase}"</Text>
                                </View>
                                <Pressable
                                    style={styles.playButton}
                                    onPress={handlePlay}
                                    disabled={isLoadingAudio}
                                >
                                    {isLoadingAudio ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : isPlaying ? (
                                        <Pause size={20} color="#fff" fill="#fff" />
                                    ) : (
                                        <Play size={20} color="#fff" fill="#fff" />
                                    )}
                                </Pressable>
                            </View>

                            <View style={styles.divider} />

                            {/* Vocab List */}
                            <View style={styles.vocabContainer}>
                                <Text style={styles.label}>USEFUL WORDS:</Text>
                                {metadata.vocab_bank && metadata.vocab_bank.map((item, index) => (
                                    <View key={index} style={styles.vocabItem}>
                                        <Text style={styles.vocabWord}>{item.word}</Text>
                                        <Text style={styles.vocabTranslation}>({item.translation})</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>No hints available for this challenge.</Text>
                        </View>
                    )}

                    {/* Feedback Section (Only show if we have content) */}
                    {metadata && metadata.starter_phrase && !isGenerating && (
                        <View style={styles.feedbackContainer}>
                            {feedbackStatus === 'submitted' ? (
                                <Text style={styles.feedbackCheck}>✓ Thanks!</Text>
                            ) : (
                                <>
                                    <Text style={styles.feedbackLabel}>Helpful?</Text>
                                    <View style={styles.feedbackButtons}>
                                        <Pressable
                                            onPress={() => submitFeedback(false)}
                                            style={[styles.feedbackBtn, feedbackStatus === 'negative' && styles.feedbackBtnActive]}
                                        >
                                            <ThumbsDown size={14} color={feedbackStatus === 'negative' ? '#fff' : '#999'} />
                                        </Pressable>
                                        <Pressable
                                            onPress={() => submitFeedback(true)}
                                            style={[styles.feedbackBtn, feedbackStatus === 'positive' && styles.feedbackBtnActive]}
                                        >
                                            <ThumbsUp size={14} color={feedbackStatus === 'positive' ? '#fff' : '#999'} />
                                        </Pressable>
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        overflow: 'hidden',
    },
    headerButton: {
        backgroundColor: SOUP_COLORS.cream,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        minWidth: 100,
    },
    headerButtonExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        width: '100%', // Expand to full width of bubble when open
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerEmoji: {
        fontSize: 14,
    },
    headerText: {
        color: SOUP_COLORS.text,
        fontSize: 12,
        fontWeight: '600',
    },
    contentPanel: {
        backgroundColor: '#FFF0F5', // Light pink background
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.1)',
        borderTopWidth: 0,
    },
    phraseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    phraseTextContainer: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        opacity: 0.7,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    phraseText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontStyle: 'italic',
    },
    playButton: {
        backgroundColor: SOUP_COLORS.pink,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: 12,
    },
    vocabContainer: {
        gap: 6,
    },
    vocabItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    vocabWord: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    vocabTranslation: {
        fontSize: 13,
        color: '#666',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 8,
        color: SOUP_COLORS.pink,
        fontSize: 12,
        fontWeight: '600',
    },
    feedbackContainer: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    feedbackLabel: {
        fontSize: 10,
        color: '#999',
    },
    feedbackButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    feedbackBtn: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    feedbackBtnActive: {
        backgroundColor: SOUP_COLORS.pink,
    },
    feedbackCheck: {
        fontSize: 10,
        color: SOUP_COLORS.pink,
        fontWeight: 'bold',
    }
});
