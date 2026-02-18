import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { cacheDirectory } from 'expo-file-system';

const WAVEFORM_BARS = 30;

// Cache directory for voice memos
const CACHE_DIR = `${LegacyFileSystem.cacheDirectory}voice_memos/`;

// Ensure cache directory exists (deferred to avoid top-level async and frozen-ref issues)
function ensureCacheDir() {
    LegacyFileSystem.getInfoAsync(CACHE_DIR)
        .then((info) => {
            if (!info.exists) return LegacyFileSystem.makeDirectoryAsync(CACHE_DIR);
        })
        .catch((error) => {
            console.warn('[AudioMessage] Failed to initialize cache dir:', error);
        });
}

const TRANSCRIPT_PREVIEW_LINES = 2;

export function AudioMessage({ audioUrl, duration, senderName, isMe, messageId, senderAvatar, senderStatus, groupName, groupId = null, transcript = null, onGetTranscript = null, showTranscript = true }) {
    const [loading, setLoading] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [localUri, setLocalUri] = useState(null);
    const { currentAudio, isPlaying, position, duration: contextDuration, playAudio } = useAudioPlayer();

    useEffect(() => {
        ensureCacheDir();
    }, []);

    // Check if this message is currently playing
    const isThisPlaying = currentAudio?.messageId === messageId && isPlaying;
    const isThisAudio = currentAudio?.messageId === messageId;

    // Calculate progress for waveform (0 to 1)
    const progress = isThisAudio && contextDuration > 0 ? position / contextDuration : 0;

    // Generate random waveform bars once
    const waveformHeights = useMemo(() => {
        return Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3);
    }, []);

    // Caching Logic
    useEffect(() => {
        let isMounted = true;

        const cacheAudio = async () => {
            try {
                if (!audioUrl) return;

                // If it's already a local file (optimistic update), use it directly
                if (audioUrl.startsWith('file://')) {
                    setLocalUri(audioUrl);
                    return;
                }

                // Generate a filename from the URL
                const filename = audioUrl.split('/').pop();
                const path = `${CACHE_DIR}${filename}`;

                const info = await LegacyFileSystem.getInfoAsync(path);

                if (info.exists) {
                    if (isMounted) setLocalUri(path);
                } else {
                    // Download in background
                    const { uri } = await LegacyFileSystem.downloadAsync(audioUrl, path);
                    if (isMounted) setLocalUri(uri);
                }
            } catch (error) {
                console.log('[AudioMessage] Error caching audio:', error);
                // Fallback to remote URL if caching fails
                if (isMounted) setLocalUri(audioUrl);
            }
        };

        cacheAudio();

        return () => {
            isMounted = false;
        };
    }, [audioUrl]);

    const handlePlayPress = async () => {
        if (!localUri) return;

        setLoading(true);
        try {
            await playAudio(localUri, duration, messageId, senderName, senderAvatar, senderStatus, groupName, groupId);
        } catch (error) {
            console.error('[AudioMessage] Error playing:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const transcriptTrimmed = transcript?.trim();
    const hasTranscript = !!transcriptTrimmed;

    // When parent injects transcript after fetch, stop loading
    useEffect(() => {
        if (transcriptTrimmed) setTranscriptLoading(false);
    }, [transcriptTrimmed]);

    const handleTranscriptPress = async () => {
        if (hasTranscript) {
            setTranscriptExpanded(!transcriptExpanded);
            return;
        }
        if (!onGetTranscript || transcriptLoading) return;
        setTranscriptLoading(true);
        try {
            await onGetTranscript(messageId);
        } catch (e) {
            console.warn('[AudioMessage] Get transcript failed:', e);
            setTranscriptLoading(false);
        }
    };

    return (
        <View style={[
            styles.outerWrap,
            isMe && styles.outerWrapMe,
        ]}>
            <View style={[
                styles.container,
                isMe && styles.containerMe,
            ]}>
                <Pressable
                    onPress={handlePlayPress}
                    style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.9 }]}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : isThisPlaying ? (
                        <Pause size={24} color="#fff" fill="#fff" />
                    ) : (
                        <Play size={24} color="#fff" fill="#fff" />
                    )}
                </Pressable>

                <View style={styles.waveformContainer}>
                    <View style={styles.waveform}>
                        {waveformHeights.map((height, index) => (
                            <WaveformBar
                                key={index}
                                index={index}
                                totalBars={WAVEFORM_BARS}
                                height={height}
                                progress={progress}
                                isMe={isMe}
                            />
                        ))}
                    </View>
                    <Text style={[styles.duration, styles.durationMe]}>
                        {formatDuration(duration)}
                    </Text>
                </View>
            </View>

            {/* Transcript: hidden when showTranscript=false so only play shows under bubbles */}
            {showTranscript && (hasTranscript || onGetTranscript) ? (
                <Pressable
                    style={({ pressed }) => [styles.transcriptWrap, styles.transcriptButton, isMe && styles.transcriptWrapMe, pressed && { opacity: 0.9 }]}
                    onPress={handleTranscriptPress}
                    disabled={!hasTranscript && transcriptLoading}
                >
                    {transcriptLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
                    ) : null}
                    <Text
                        style={[styles.transcriptText, styles.transcriptButtonText]}
                        numberOfLines={transcriptExpanded ? undefined : TRANSCRIPT_PREVIEW_LINES}
                    >
                        {hasTranscript ? transcriptTrimmed : 'Tap for transcript'}
                    </Text>
                    {hasTranscript ? (
                        transcriptExpanded ? (
                            <ChevronUp size={16} color={Colors.textLight} style={styles.transcriptChevron} />
                        ) : (
                            <ChevronDown size={16} color={Colors.textLight} style={styles.transcriptChevron} />
                        )
                    ) : (
                        <ChevronDown size={16} color={Colors.textLight} style={styles.transcriptChevron} />
                    )}
                </Pressable>
            ) : null}
        </View>
    );
}

// Separate component for individual bars (plain View to avoid Reanimated frozen-ref issues)
const WaveformBar = ({ index, totalBars, height, progress, isMe }) => {
    const barPos = index / totalBars;
    const isPlayed = progress > barPos;
    // Same visible style for both: white bars on green or blue bubble
    const backgroundColor = isPlayed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)';
    return (
        <View style={[styles.waveBar, { backgroundColor, height: 24 * height }]} />
    );
};

const styles = StyleSheet.create({
    outerWrap: {
        width: '100%',
    },
    outerWrapMe: {},
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 4,
        paddingRight: 8,
        minWidth: 240,
        maxWidth: 280,
        gap: 12,
    },
    containerMe: {
        // Parent bubble handles background
    },
    transcriptWrap: {
        marginTop: 12,
        paddingTop: 12,
        paddingBottom: 6,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    transcriptWrapMe: {
        borderTopColor: 'rgba(255,255,255,0.25)',
    },
    transcriptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#FDF5E6',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        minHeight: 44,
    },
    transcriptText: {
        fontSize: 13,
        color: Colors.text,
        lineHeight: 18,
        marginBottom: 2,
    },
    transcriptTextMe: {
        color: 'rgba(255,255,255,0.95)',
    },
    transcriptButtonText: {
        color: '#2d3436',
    },
    transcriptChevron: {
        alignSelf: 'flex-start',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 28,
        flex: 1,
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    duration: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '500',
    },
    durationMe: {
        color: 'rgba(255,255,255,0.9)',
    },
});
