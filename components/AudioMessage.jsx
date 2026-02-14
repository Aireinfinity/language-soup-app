import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { cacheDirectory } from 'expo-file-system';
import { pickRandom, GET_TRANSCRIPT_LABELS, GETTING_TRANSCRIPT_LABELS } from '../constants/CopyPhilosophy';

const WAVEFORM_BARS = 30;

// Cache directory for voice memos
const CACHE_DIR = `${LegacyFileSystem.cacheDirectory}voice_memos/`;

// Ensure cache directory exists (Safely)
(async () => {
    try {
        const info = await LegacyFileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) {
            await LegacyFileSystem.makeDirectoryAsync(CACHE_DIR);
        }
    } catch (error) {
        console.warn('[AudioMessage] Failed to initialize cache dir:', error);
    }
})();

const TRANSCRIPT_PREVIEW_LINES = 2;

export function AudioMessage({ audioUrl, duration, senderName, isMe, messageId, senderAvatar, senderStatus, groupName, groupId = null, transcript = null, onGetTranscript = null }) {
    const [loading, setLoading] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [localUri, setLocalUri] = useState(null);
    const { currentAudio, isPlaying, position, duration: contextDuration, playAudio } = useAudioPlayer();

    // Check if this message is currently playing
    const isThisPlaying = currentAudio?.messageId === messageId && isPlaying;
    const isThisAudio = currentAudio?.messageId === messageId;

    // Calculate progress for waveform (0 to 1)
    const progress = isThisAudio && contextDuration > 0 ? position / contextDuration : 0;

    // Shared values for Reanimated
    const scale = useSharedValue(1);

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

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const transcriptTrimmed = transcript?.trim();
    const hasTranscript = !!transcriptTrimmed;

    const transcriptCopy = useMemo(
        () => ({
            idle: pickRandom(GET_TRANSCRIPT_LABELS),
            loading: pickRandom(GETTING_TRANSCRIPT_LABELS),
        }),
        [messageId]
    );

    const handleGetTranscript = async () => {
        if (!onGetTranscript || transcriptLoading) return;
        setTranscriptLoading(true);
        try {
            await onGetTranscript(messageId);
        } catch (e) {
            console.warn('[AudioMessage] Get transcript failed:', e);
        } finally {
            setTranscriptLoading(false);
        }
    };

    return (
        <Animated.View style={[
            styles.outerWrap,
            isMe && styles.outerWrapMe,
        ]}>
            <View style={[
                styles.container,
                isMe && styles.containerMe,
                animatedContainerStyle
            ]}>
                <Pressable
                    onPress={handlePlayPress}
                    style={styles.playButton}
                    disabled={loading}
                    onPressIn={() => { scale.value = withSpring(0.95); }}
                    onPressOut={() => { scale.value = withSpring(1); }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={isMe ? '#fff' : Colors.primary} />
                    ) : isThisPlaying ? (
                        <Pause size={22} color={isMe ? '#fff' : Colors.primary} fill={isMe ? '#fff' : Colors.primary} />
                    ) : (
                        <Play size={22} color={isMe ? '#fff' : Colors.primary} fill={isMe ? '#fff' : Colors.primary} />
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
                    <Text style={[styles.duration, isMe && styles.durationMe]}>
                        {formatDuration(duration)}
                    </Text>
                </View>
            </View>

            {hasTranscript && (
                <Pressable
                    style={({ pressed }) => [styles.transcriptWrap, isMe && styles.transcriptWrapMe, pressed && { opacity: 0.85 }]}
                    onPress={() => setTranscriptExpanded(!transcriptExpanded)}
                >
                    <Text
                        style={[styles.transcriptText, isMe && styles.transcriptTextMe]}
                        numberOfLines={transcriptExpanded ? undefined : TRANSCRIPT_PREVIEW_LINES}
                    >
                        {transcriptTrimmed}
                    </Text>
                    {transcriptExpanded ? (
                        <ChevronUp size={16} color={isMe ? 'rgba(255,255,255,0.8)' : Colors.textLight} style={styles.transcriptChevron} />
                    ) : (
                        <ChevronDown size={16} color={isMe ? 'rgba(255,255,255,0.8)' : Colors.textLight} style={styles.transcriptChevron} />
                    )}
                </Pressable>
            )}
            {!hasTranscript && onGetTranscript && (
                <Pressable
                    style={({ pressed }) => [styles.transcriptWrap, styles.getTranscriptWrap, isMe && styles.transcriptWrapMe, pressed && { opacity: 0.85 }]}
                    onPress={handleGetTranscript}
                    disabled={transcriptLoading}
                >
                    {transcriptLoading ? (
                        <ActivityIndicator size="small" color={isMe ? 'rgba(255,255,255,0.9)' : Colors.primary} style={{ marginRight: 6 }} />
                    ) : null}
                    <Text style={[styles.transcriptText, styles.getTranscriptText, isMe && styles.transcriptTextMe]}>
                        {transcriptLoading ? transcriptCopy.loading : transcriptCopy.idle}
                    </Text>
                </Pressable>
            )}
        </Animated.View>
    );
}

// Separate component for individual bars
const WaveformBar = ({ index, totalBars, height, progress, isMe }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const barPos = index / totalBars;
        const isPlayed = progress > barPos;

        return {
            backgroundColor: isMe
                ? (isPlayed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)')
                : (isPlayed ? Colors.primary : 'rgba(0, 173, 239, 0.18)'),
            height: 24 * height,
            transform: [{
                scaleY: isPlayed
                    ? withSpring(1.08, { damping: 12, stiffness: 110, mass: 0.6 })
                    : withSpring(1, { damping: 12, stiffness: 110, mass: 0.6 })
            }]
        };
    });

    return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const styles = StyleSheet.create({
    outerWrap: {
        width: '100%',
    },
    outerWrapMe: {},
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingLeft: 2,
        paddingRight: 4,
        minWidth: 240,
        maxWidth: 280,
        gap: 6,
    },
    containerMe: {
        // Parent bubble handles background
    },
    transcriptWrap: {
        marginTop: 6,
        paddingTop: 8,
        paddingBottom: 4,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    transcriptWrapMe: {
        borderTopColor: 'rgba(255,255,255,0.25)',
    },
    getTranscriptWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    getTranscriptText: {
        flex: 1,
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
    transcriptChevron: {
        alignSelf: 'flex-start',
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
        flex: 1,
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    duration: {
        fontSize: 11,
        color: Colors.textLight,
        fontWeight: '500',
    },
    durationMe: {
        color: 'rgba(255,255,255,0.9)',
    },
});
