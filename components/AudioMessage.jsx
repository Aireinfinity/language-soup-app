import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system/legacy';

const WAVEFORM_BARS = 30;

// Cache directory for voice memos
const CACHE_DIR = `${FileSystem.cacheDirectory}voice_memos/`;

// Ensure cache directory exists
(async () => {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR);
    }
})();

export function AudioMessage({ audioUrl, duration, senderName, isMe }) {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [loading, setLoading] = useState(false);
    const [localUri, setLocalUri] = useState(null);
    const [fileDuration, setFileDuration] = useState(duration * 1000); // ms

    // Shared values for Reanimated
    const progress = useSharedValue(0); // 0 to 1
    const scale = useSharedValue(1);
    const isScrubbing = useSharedValue(false);

    // Generate random waveform bars once
    const waveformHeights = useMemo(() => {
        return Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3);
    }, []);

    // 1. Caching / Preloading Logic
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

                const info = await FileSystem.getInfoAsync(path);

                if (info.exists) {
                    if (isMounted) setLocalUri(path);
                } else {
                    // Download in background
                    const { uri } = await FileSystem.downloadAsync(audioUrl, path);
                    if (isMounted) setLocalUri(uri);
                }
            } catch (error) {
                console.log('Error caching audio:', error);
                // Fallback to remote URL if caching fails
                if (isMounted) setLocalUri(audioUrl);
            }
        };

        cacheAudio();

        return () => {
            isMounted = false;
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [audioUrl]);

    // 2. Playback Logic
    const loadAndPlaySound = async () => {
        try {
            if (!localUri) return;

            setLoading(true);

            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        // If finished or near end, replay from start
                        if (status.positionMillis >= status.durationMillis - 50) {
                            await sound.replayAsync();
                        } else {
                            await sound.playAsync();
                        }
                        setIsPlaying(true);
                    }
                    setLoading(false);
                    return;
                }
            }

            // Create sound from local URI (instant)
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri: localUri },
                {
                    shouldPlay: true,
                    volume: 1.0,  // Max volume for louder playback
                    rate: playbackSpeed,
                    progressUpdateIntervalMillis: 16 // ~60fps updates
                },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setIsPlaying(true);
            if (status.durationMillis) {
                setFileDuration(status.durationMillis);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        } finally {
            setLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            // Only update progress if not scrubbing
            if (!isScrubbing.value) {
                progress.value = status.positionMillis / status.durationMillis;
            }

            if (status.didJustFinish) {
                runOnJS(setIsPlaying)(false);
                runOnJS(handlePlaybackFinish)();
            }
        }
    };

    const handlePlaybackFinish = () => {
        progress.value = withTiming(0, { duration: 200 });
    };

    const togglePlaybackSpeed = async () => {
        const speeds = [1.0, 1.5, 2.0, 0.5];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        setPlaybackSpeed(nextSpeed);

        if (sound) {
            await sound.setRateAsync(nextSpeed, true);
        }
    };

    // 3. Gestures & Animations
    const tapGesture = Gesture.Tap()
        .onBegin(() => {
            scale.value = withSpring(0.95);
        })
        .onFinalize(() => {
            scale.value = withSpring(1);
        });

    const scrubGesture = Gesture.Pan()
        .onBegin(() => {
            isScrubbing.value = true;
            scale.value = withSpring(0.98);
        })
        .onUpdate((e) => {
            // Approximate width of waveform container is ~160px
            // We should ideally measure it, but for now we estimate
            const width = 160;
            const newProgress = Math.max(0, Math.min(1, e.x / width));
            progress.value = newProgress;
        })
        .onEnd(async () => {
            isScrubbing.value = false;
            scale.value = withSpring(1);

            if (sound && fileDuration) {
                const seekPos = progress.value * fileDuration;
                await runOnJS(sound.setPositionAsync)(seekPos);
            }
        });

    const composedGesture = Gesture.Simultaneous(tapGesture, scrubGesture);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const formatDuration = (ms) => {
        if (!ms) return '0:00';
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <GestureHandlerRootView>
            <Animated.View style={[
                styles.container,
                isMe && styles.containerMe,
                animatedContainerStyle
            ]}>
                <Pressable
                    onPress={loadAndPlaySound}
                    style={styles.playButton}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={isMe ? '#fff' : Colors.primary} />
                    ) : isPlaying ? (
                        <Pause size={22} color={isMe ? '#fff' : Colors.primary} fill={isMe ? '#fff' : Colors.primary} />
                    ) : (
                        <Play size={22} color={isMe ? '#fff' : Colors.primary} fill={isMe ? '#fff' : Colors.primary} />
                    )}
                </Pressable>

                <GestureDetector gesture={scrubGesture}>
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
                        {/* We use a Reanimated Text or just update this less frequently? 
                            For 60fps timer we need Reanimated Text, but standard React state is fine for seconds */}
                        <Text style={[styles.duration, isMe && styles.durationMe]}>
                            {formatDuration(currentPosition || 0)}
                        </Text>
                    </View>
                </GestureDetector>
            </Animated.View>
        </GestureHandlerRootView>
    );
}

// Separate component for individual bars to optimize rendering
const WaveformBar = ({ index, totalBars, height, progress, isMe }) => {
    const animatedStyle = useAnimatedStyle(() => {
        const barPos = index / totalBars;
        // If progress > barPos, it's "played"
        const isPlayed = progress.value > barPos;

        return {
            backgroundColor: isMe
                ? (isPlayed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)')
                : (isPlayed ? Colors.primary : 'rgba(0, 173, 239, 0.18)'),
            height: 24 * height,
            transform: [{
                scaleY: isPlayed
                    ? withSpring(1.08, {
                        damping: 12,       // Honey smooth
                        stiffness: 110,    // Balanced
                        mass: 0.6          // Weighted
                    })
                    : withSpring(1, {
                        damping: 12,
                        stiffness: 110,
                        mass: 0.6
                    })
            }]
        };
    });

    return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        paddingHorizontal: 4,
        minWidth: 240,
        maxWidth: 280,
        gap: 8,
    },
    containerMe: {
        // Parent bubble handles background
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    playButtonMe: {
        // No background needed
    },
    waveformContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    }, waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
        width: '100%',
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
    speedButton: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginLeft: 4,
    },
    speedText: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '600',
    },
});
