import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Dimensions } from 'react-native';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import * as LegacyFileSystem from 'expo-file-system/legacy';

const WAVEFORM_BARS = 40;
const VOICE_ROW_WIDTH = Math.min(280, Dimensions.get('window').width * 0.72);

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

export function AudioMessage({ audioUrl, duration, senderName, isMe, messageId, senderAvatar, senderStatus, groupName, groupId = null, transcript = null, onGetTranscript = null, showTranscript = true, queueFromThisMessage = null }) {
    const [loading, setLoading] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [localUri, setLocalUri] = useState(null);
    const { currentAudio, isPlaying, position, duration: contextDuration, playAudio, startQueue } = useAudioPlayer();

    useEffect(() => {
        ensureCacheDir();
    }, []);

    // Check if this message is currently playing
    const isThisPlaying = currentAudio?.messageId === messageId && isPlaying;
    const isThisAudio = currentAudio?.messageId === messageId;

    // Calculate progress for waveform (0 to 1). Clamp; when playback just finished, show full bar.
    const rawProgress = isThisAudio && contextDuration > 0 ? position / contextDuration : 0;
    const atEnd = isThisAudio && contextDuration > 0 && !isPlaying && position >= Math.max(0, contextDuration - 500);
    const progress = atEnd ? 1 : Math.min(1, Math.max(0, rawProgress));

    const waveformHeights = useMemo(() => {
        const seed = (messageId || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
            const t = (i / WAVEFORM_BARS + seed * 0.01) % 1;
            return 0.25 + 0.5 * (Math.sin(t * Math.PI * 4) * 0.5 + 0.5);
        });
    }, [messageId]);

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
        const uriToPlay = localUri || audioUrl;
        if (!uriToPlay) return;

        setLoading(true);
        try {
            if (queueFromThisMessage?.length > 0) {
                const items = queueFromThisMessage.map((item) => ({
                    ...item,
                    url: item.url,
                    durationSeconds: item.durationSeconds ?? (item.duration ? item.duration / 1000 : duration || 0),
                }));
                startQueue(items);
            } else {
                await playAudio(uriToPlay, duration || 0, messageId, senderName, senderAvatar, senderStatus, groupName, groupId);
            }
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
            <View style={[styles.container, isMe && styles.containerMe]}>
                <View style={styles.topRow}>
                    <Pressable
                        onPress={handlePlayPress}
                        style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.9 }]}
                        disabled={loading || (!localUri && !audioUrl)}
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
                                <View key={`bg-${index}`} style={[styles.waveBar, { height: Math.max(8, 22 * height), backgroundColor: 'rgba(255,255,255,0.4)' }]} />
                            ))}
                            <View style={[styles.waveformFill, { width: `${progress * 100}%` }]} pointerEvents="none">
                                {waveformHeights.map((height, index) => (
                                    <View key={`fg-${index}`} style={[styles.waveBar, { height: Math.max(8, 22 * height), backgroundColor: 'rgba(255,255,255,0.98)' }]} />
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.durationRow}>
                    <Text style={[styles.duration, isMe ? styles.durationMe : styles.durationThem]} numberOfLines={1}>
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

const styles = StyleSheet.create({
    outerWrap: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    outerWrapMe: {},
    container: {
        width: VOICE_ROW_WIDTH,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    containerMe: {},
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        minWidth: 0,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    waveformFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        overflow: 'hidden',
    },
    waveBar: {
        width: 3,
        borderRadius: 2,
    },
    durationRow: {
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    duration: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '600',
    },
    durationMe: {
        color: 'rgba(255,255,255,0.9)',
    },
    durationThem: {
        color: 'rgba(255,255,255,0.9)',
    },
});
