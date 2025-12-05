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
            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri: localUri },
                {
                    shouldPlay: true,
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
                    style={[styles.playButton, isMe && styles.playButtonMe]}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={isMe ? Colors.primary : '#fff'} />
                    ) : isPlaying ? (
                        <Pause size={20} color={isMe ? Colors.primary : '#fff'} fill={isMe ? Colors.primary : '#fff'} />
                    ) : (
                        <Play size={20} color={isMe ? Colors.primary : '#fff'} fill={isMe ? Colors.primary : '#fff'} />
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
                            {formatDuration(fileDuration)}
                        </Text>
                    </View>
                </GestureDetector>

                <Pressable onPress={togglePlaybackSpeed} style={[styles.speedButton, isMe && styles.speedButtonMe]}>
                    <Text style={[styles.speedText, isMe && styles.speedTextMe]}>
                        {playbackSpeed}x
                    </Text>
                </Pressable>
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
                ? (isPlayed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)')
                : (isPlayed ? Colors.primary : 'rgba(0, 173, 239, 0.3)'),
            height: 24 * height, // Static height based on random seed
            transform: [{ scaleY: isPlayed ? withSpring(1.2) : withSpring(1) }] // Subtle pop effect when played
        };
    });

    return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 240,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    containerMe: {
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 4,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonMe: {
        backgroundColor: '#fff',
    },
    waveformContainer: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
        width: '100%',
        marginBottom: 4,
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
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    speedButtonMe: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    speedText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    speedTextMe: {
        color: '#fff',
    },
});
