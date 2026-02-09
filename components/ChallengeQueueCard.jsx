import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, PanResponder } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Play, Pause, Trash2, Send } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';

import { Lightbulb } from 'lucide-react-native';
import { InspirationModal } from './InspirationModal';

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
    const [finalDuration, setFinalDuration] = useState(0); // in seconds
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showInspiration, setShowInspiration] = useState(false);

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

    const handleRecordPress = async () => {
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
                // Load sound
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: recordedUri },
                    { shouldPlay: true }
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

                {/* Inspiration Button (Always Visible) */}
                <Pressable
                    style={[styles.inspirationButton, { marginTop: 24, marginBottom: 0 }]}
                    onPress={() => setShowInspiration(true)}
                >
                    <Lightbulb size={18} color="#FFF" />
                    <Text style={styles.inspirationText}>Need some ingredients?</Text>
                </Pressable>
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
            <InspirationModal
                visible={showInspiration}
                onClose={() => setShowInspiration(false)}
                metadata={challenge?.metadata}
                language={groupName}
            />
        </View >
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
        padding: 24,
        paddingBottom: 60, // More bottom padding for immersive feel
        width: Dimensions.get('window').width, // Full width
        backgroundColor: 'transparent', // Transparent for immersive
        // Removed shadows and margins
    },
    promptContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)', // White-ish
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 32,
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
        fontSize: 34, // Larger
        fontWeight: '800',
        color: '#fff', // White
        textAlign: 'center',
        lineHeight: 42,
        // Stronger shadow for legibility on all colors
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    secondaryPrompt: {
        fontSize: 22,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 16,
        lineHeight: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    actionContainer: {
        minHeight: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordContainer: {
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    recordButton: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#fff', // White button for contrast
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
        width: 28,
        height: 28,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    hintText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)', // Lighter
        fontWeight: '600',
        marginTop: 8,
    },
    waveformContainer: {
        height: 40,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrubberContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    staticWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 48,
        width: '100%',
    },
    waveBar: {
        width: 4,
        borderRadius: 2,
    },
    timerText: {
        fontSize: 14,
        color: 'white', // White timer
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    reviewContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
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
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
});
