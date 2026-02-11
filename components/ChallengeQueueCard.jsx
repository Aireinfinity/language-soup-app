import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Image } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Play, Pause, Trash2, Send, Volume2 } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    dark: '#2A2A2A',
};

const WAVEFORM_BARS = 30;



export function ChallengeQueueCard({ challenge, onSend, loading, groupName }) {
    const {
        isRecording,
        recordingDuration,
        metering,
        startRecording,
        stopRecording,
    } = useVoiceRecorder();

    const [recordedUri, setRecordedUri] = useState(null);
    const [finalDuration, setFinalDuration] = useState(0);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const ttsSoundRef = useRef(null); // Ref to track TTS sound for cleanup

    // Audio Cache for TTS (Vocab & Phrases)
    const [audioCache, setAudioCache] = useState({});

    // Inline ingredients state
    const [hints, setHints] = useState(challenge?.metadata || null);
    const [hintsLoading, setHintsLoading] = useState(false);

    // Prefetch Helper (Speeds up loading)
    const prefetchAudio = async (text) => {
        if (!text || audioCache[text]) return;
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text, task: 'pronunciation', language: groupName || 'Multilingual' }
            });
            if (data?.pronunciationUrl) {
                setAudioCache(prev => ({ ...prev, [text]: data.pronunciationUrl }));
            }
        } catch (e) {
            // Silent fail on prefetch is fine
        }
    };

    // Auto-generate hints on mount & Save to DB
    useEffect(() => {
        // If we already have hints, prefetch their audio immediately
        if (hints?.starter_phrase) {
            prefetchAudio(hints.starter_phrase);
            hints.vocab_bank?.forEach(v => prefetchAudio(v.word));
            return;
        }

        const generate = async () => {
            setHintsLoading(true);
            try {
                const promptText = challenge?.prompt_text;
                if (!promptText) return;

                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: { task: 'generate_hints', prompt: promptText, language: groupName || 'Target Language', challengeId: challenge?.id }
                });

                if (error) throw error;

                if (data?.starter_phrase) {
                    setHints(data);

                    // SAVE TO SUPABASE (Persistence)
                    // This prevents "reloading" next time
                    await supabase.from('challenges')
                        .update({ metadata: data })
                        .eq('id', challenge.id);

                    // PREFETCH AUDIO (Speed)
                    prefetchAudio(data.starter_phrase);
                    data.vocab_bank?.forEach(v => prefetchAudio(v.word));
                }
            } catch (e) {
                console.error('Hint generation error:', e);
            } finally {
                setHintsLoading(false);
            }
        };
        generate();
    }, [challenge?.id]);

    // TTS pronunciation via OpenAI (Phrases only)
    const [speakingWord, setSpeakingWord] = useState(null);

    // Unified TTS Handler (OpenAI with Cache)
    const playTts = async (text) => {
        if (!text) return;

        // Stop any previous audio
        if (ttsSoundRef.current) {
            await ttsSoundRef.current.unloadAsync();
            ttsSoundRef.current = null;
        }

        setSpeakingWord(text);

        try {
            let audioUrl = audioCache[text];

            // If not cached, fetch from OpenAI
            if (!audioUrl) {
                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: { text, task: 'pronunciation', language: groupName || 'Multilingual' }
                });

                if (error || !data?.pronunciationUrl) throw new Error('No audio generated');

                audioUrl = data.pronunciationUrl;
                setAudioCache(prev => ({ ...prev, [text]: audioUrl }));
            }

            // Critical: switch directly to playback mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            const { sound: ttsSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true, volume: 1.0 }
            );
            ttsSoundRef.current = ttsSound;

            ttsSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    ttsSound.unloadAsync();
                    if (ttsSoundRef.current === ttsSound) ttsSoundRef.current = null;
                    setSpeakingWord(null);
                }
            });

        } catch (e) {
            console.error('TTS error:', e);
            setSpeakingWord(null);
        }
    };

    // 2. High-Quality OpenAI TTS for Phrase (Phenomenal)


    // Playback Progress
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    // Waveform Heights (Static random for now)
    const [barHeights] = useState(() => Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3));

    // Cleanup sound on unmount/change
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Community Bubbles Logic
    const [communityBubbles, setCommunityBubbles] = useState([]);
    useEffect(() => {
        const fetchCommunity = async () => {
            // Fetch recent active users with avatars
            const { data } = await supabase
                .from('app_users')
                .select('avatar_url')
                .not('avatar_url', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data && data.length > 0) {
                // 1. STRICTLY Real Photos (Filter like community tab: jpg, jpeg, google, fab)
                const realPhotos = data.filter(u => {
                    const url = u.avatar_url?.toLowerCase();
                    return url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('googleusercontent') || url.includes('fbsbx.com'));
                });

                // Pick 7 random photos for a neat row
                const shuffled = realPhotos.sort(() => 0.5 - Math.random()).slice(0, 7);
                setCommunityBubbles(shuffled); // Just store user objects
            }
        };
        fetchCommunity();
    }, []);

    const handleRecordPress = async () => {
        // STOP ALL AUDIO before recording to prevent "Retry failed" errors
        if (ttsSoundRef.current) {
            await ttsSoundRef.current.unloadAsync();
            ttsSoundRef.current = null;
        }
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
            setIsPlaying(false);
        }

        if (isRecording) {
            // Capture current duration as fallback before stopping (which resets it)
            const fallbackDuration = recordingDuration;
            const result = await stopRecording();

            if (result?.uri) {
                setRecordedUri(result.uri);
                // Fix: Use fallback if reported duration is 0
                const actualDurationMs = result.duration > 0 ? result.duration : (fallbackDuration * 1000);

                setFinalDuration(actualDurationMs / 1000);
                setPlaybackDuration(actualDurationMs);
            }
        } else {
            await startRecording();
        }
    };

    const handlePlayPause = async () => {
        if (!recordedUri) return;

        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    if (playbackPosition >= playbackDuration && playbackDuration > 0) {
                        await sound.setPositionAsync(0);
                    }
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                // Use speaker and full volume so playback is audible (like normal phone volume)
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: false,
                });
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: recordedUri },
                    { shouldPlay: true, volume: 1.0 }
                );

                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(status.positionMillis);
                        setPlaybackDuration(status.durationMillis);
                        setIsPlaying(status.isPlaying);

                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            newSound.setPositionAsync(0);
                            setPlaybackPosition(0);
                        }
                    }
                });

                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
        }
    };

    const handleSeek = async (evt) => {
        if (!sound || !playbackDuration) return;

        // Calculate seek position
        const width = waveformLayout.current?.width || 1;
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / width));
        const seekPos = percent * playbackDuration;

        await sound.setPositionAsync(seekPos);
        setPlaybackPosition(seekPos);
    };

    const handleDelete = () => {
        setRecordedUri(null);
        setFinalDuration(0);
        setPlaybackPosition(0);
        if (sound) {
            sound.unloadAsync();
            setSound(null);
        }
        setIsPlaying(false);
    };

    const handleSendPress = () => {
        if (!recordedUri) return;
        // Clean up sound before sending to avoid leaks
        if (sound) {
            sound.stopAsync();
            sound.unloadAsync();
        }
        onSend({ uri: recordedUri, duration: finalDuration * 1000 }); // Pass ms
    };

    // Track layout for seeking
    const waveformLayout = useRef({ width: 0 });
    const onWaveformLayout = (event) => {
        waveformLayout.current = event.nativeEvent.layout;
    };

    return (
        <View style={styles.card}>
            {/* Challenge Prompt */}
            <View style={styles.promptContainer}>
                <Text style={styles.groupName}>{groupName || 'Soup Group'}</Text>

                <View style={{ alignItems: 'center' }}>
                    {(() => {
                        const rawText = challenge?.prompt_text || "Ready to Soup?";
                        // Split by newline to separate multiple languages if present
                        const parts = rawText.split(/\n+/).filter(p => p.trim());

                        if (parts.length > 1) {
                            return (
                                <>
                                    <Text style={styles.promptText}>
                                        {parts[0]}
                                    </Text>
                                    <Text style={[styles.promptText, styles.secondaryPrompt]}>
                                        {parts.slice(1).join('\n')}
                                    </Text>
                                </>
                            );
                        }

                        // Single line case
                        return (
                            <Text style={styles.promptText}>
                                {rawText}
                            </Text>
                        );
                    })()}
                </View>

                {/* Inline Ingredients */}
                {hintsLoading && (
                    <View style={styles.hintsLoading}>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                        <Text style={styles.hintsLoadingText}>Grabbing ingredients...</Text>
                    </View>
                )}
                {!hintsLoading && hints?.starter_phrase && (
                    <View style={styles.hintsContainer}>
                        <Text style={styles.hintsLabel}>BEGINNER PHRASE:</Text>
                        <Pressable
                            style={[styles.starterPhraseCard, speakingWord === hints.starter_phrase && styles.speakingActive]}
                            onPress={() => playTts(hints.starter_phrase)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.starterPhrase}>"{hints.starter_phrase}"</Text>
                                <Text style={styles.starterTranslation}>
                                    {hints.starter_phrase_translation || 'Tap to hear it'}
                                </Text>
                            </View>
                            <View style={styles.playCircle}>
                                {speakingWord === hints.starter_phrase ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Volume2 size={20} color="#fff" />
                                )}
                            </View>
                        </Pressable>
                        {hints.vocab_bank?.length > 0 && (
                            <>
                                <Text style={[styles.hintsLabel, { marginTop: 10 }]}>ADVANCED VOCAB:</Text>
                                <View style={styles.vocabRow}>
                                    {hints.vocab_bank.map((item, i) => (
                                        <Pressable
                                            key={i}
                                            style={[styles.vocabPill, speakingWord === item.word && styles.speakingActive]}
                                            onPress={() => playTts(item.word)}
                                        >
                                            <View style={styles.vocabIconContainer}>
                                                {speakingWord === item.word ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Volume2 size={14} color="rgba(255,255,255,0.6)" />
                                                )}
                                            </View>
                                            <Text style={styles.vocabWord}>{item.word}</Text>
                                            <Text style={styles.vocabTranslation}>{item.translation}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                )}
            </View>

            {/* Interaction Area */}
            <View style={styles.actionContainer}>
                {recordedUri ? (
                    // REVIEW MODE
                    <View style={styles.reviewContainer}>
                        {/* Playback Visualization (Scrubbable) */}
                        <Pressable
                            style={styles.scrubberContainer}
                            onPress={handleSeek}
                            onLayout={onWaveformLayout}
                        >
                            <View style={styles.staticWaveform}>
                                {barHeights.map((height, i) => {
                                    const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;
                                    const barPos = i / WAVEFORM_BARS;
                                    const isPlayed = progress > barPos;

                                    return (
                                        <View
                                            key={i}
                                            style={[
                                                styles.waveBar,
                                                {
                                                    height: 16 + (height * 32), // Dynamic height based on random mock
                                                    backgroundColor: isPlayed ? 'white' : 'rgba(255, 255, 255, 0.4)', // White waveforms
                                                    opacity: 1
                                                }
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                            <Text style={styles.timerText}>
                                {loadTime(playbackPosition / 1000)} / {loadTime(finalDuration)}
                            </Text>
                        </Pressable>

                        <View style={styles.playbackControls}>
                            <Pressable
                                onPress={handleDelete}
                                style={[styles.controlButton, styles.deleteButton]}
                            >
                                <Trash2 size={24} color="#FF3B30" />
                            </Pressable>

                            <Pressable
                                onPress={handlePlayPause}
                                style={[styles.controlButton, styles.playButton]}
                            >
                                {isPlaying ? (
                                    <Pause size={32} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} />
                                ) : (
                                    <Play size={32} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} style={{ marginLeft: 4 }} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleSendPress}
                                disabled={loading}
                                style={[styles.controlButton, styles.sendButton]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Send size={28} color="white" />
                                )}
                            </Pressable>
                        </View>
                        <Text style={styles.reviewText}>
                            Ready to send?
                        </Text>
                    </View>
                ) : (
                    // RECORD MODE
                    <View style={styles.recordContainer}>
                        {/* Peeking Community Row */}
                        {!isRecording && communityBubbles.length > 0 && (
                            <View style={styles.peekingRow} pointerEvents="none">
                                {communityBubbles.map((user, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: user.avatar_url }}
                                        style={[styles.peekingAvatar, { zIndex: i }]}
                                    />
                                ))}
                            </View>
                        )}

                        {isRecording && (
                            <View style={styles.waveformContainer}>
                                <LiveAudioWaveform
                                    metering={metering}
                                    recordingDuration={recordingDuration}
                                    isRecording={isRecording}
                                    color="white" // Pass white color prop if supported, or handled via styles
                                />
                                <Text style={styles.timerText}>{loadTime(recordingDuration)}</Text>
                            </View>
                        )}

                        <Pressable
                            onPress={handleRecordPress}
                            style={[
                                styles.recordButton,
                                isRecording && styles.recordingActive
                            ]}
                        >
                            {isRecording ? (
                                <View style={[styles.stopIcon, { backgroundColor: SOUP_COLORS.turquoise }]} />
                            ) : (
                                <Mic size={40} color={SOUP_COLORS.turquoise} />
                            )}
                        </Pressable>
                        <Text style={styles.hintText}>
                            {isRecording ? "Tap to finish" : "Tap to record"}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function loadTime(seconds) {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 16, // Reduced from 24
        paddingBottom: 40, // Reduced from 60
        width: Dimensions.get('window').width,
        backgroundColor: 'transparent',
    },
    promptContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupName: {
        fontSize: 14, // Reduced from 16
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16, // Reduced from 32
    },
    inspirationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        marginBottom: 20,
    },
    inspirationText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    promptText: {
        fontSize: 28, // Reduced from 34
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 34, // Reduced from 42
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    secondaryPrompt: {
        fontSize: 20, // Reduced from 22
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 12, // Reduced from 16
        lineHeight: 26,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    actionContainer: {
        minHeight: 140, // Reduced from 180
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordContainer: {
        alignItems: 'center',
        gap: 12, // Reduced from 16
        width: '100%',
    },
    recordButton: {
        width: 80, // Reduced from 96
        height: 80, // Reduced from 96
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    recordingActive: {
        backgroundColor: SOUP_COLORS.pink,
        transform: [{ scale: 1.1 }],
    },
    stopIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    hintText: {
        fontSize: 14, // Reduced from 16
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        marginTop: 4,
    },
    waveformContainer: {
        height: 32, // Reduced from 40
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrubberContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    staticWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 40,
        width: '100%',
    },
    waveBar: {
        width: 4,
        borderRadius: 2,
    },
    timerText: {
        fontSize: 13,
        color: 'white',
        fontWeight: '700',
        marginTop: 4,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    reviewContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    controlButton: {
        width: 48, // Reduced
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    playButton: {
        width: 64, // Reduced
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E6F7FD',
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
    },
    sendButton: {
        backgroundColor: SOUP_COLORS.turquoise,
    },
    deleteButton: {
        backgroundColor: '#FFF0F0',
    },
    reviewText: {
        fontSize: 13,
        color: '#999',
        fontWeight: '600',
    },
    // Inline Ingredients
    hintsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 8,
    },
    hintsLoadingText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    hintsContainer: {
        marginTop: 12, // Reduced
        marginBottom: 8,
        gap: 6,
        width: '100%',
        alignItems: 'center',
    },
    starterPhraseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        width: '100%',
    },
    playCircle: {
        width: 36, // Reduced from 44
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    speakingActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    hintsLabel: {
        fontSize: 10, // Reduced
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginBottom: 2,
        alignSelf: 'flex-start',
    },
    starterPhrase: {
        fontSize: 16, // Reduced
        fontWeight: '700',
        color: '#fff',
        lineHeight: 22,
    },
    starterTranslation: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        fontStyle: 'italic',
    },
    vocabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
    },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingRight: 12,
        paddingLeft: 4, // Reduce left padding since container has width
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    vocabIconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vocabWord: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    vocabTranslation: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
    },
    // Peeking Row
    peekingRow: {
        position: 'absolute',
        bottom: -60, // Moved down further
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: '100%',
        height: 60,
    },
    peekingAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        marginLeft: -10, // Overlap
    },
});
