import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Play, Pause, FastForward, Rewind, X, SkipBack, SkipForward, Headphones } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    SlideInDown,
    SlideOutDown,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Helper for interactive progress bar
function ProgressBar({ progress, onSeek }) {
    const [barWidth, setBarWidth] = useState(0);
    const animatedWidth = useSharedValue(0);

    useEffect(() => {
        animatedWidth.value = withTiming(progress, { duration: 100 });
    }, [progress]);

    const style = useAnimatedStyle(() => ({
        width: `${Math.max(0, Math.min(100, animatedWidth.value * 100))}%`
    }));

    const handlePress = (e) => {
        if (barWidth > 0 && onSeek) {
            const x = e.nativeEvent.locationX;
            const percentage = Math.max(0, Math.min(1, x / barWidth));
            onSeek(percentage);
        }
    };

    return (
        <Pressable
            style={styles.progresBarContainer}
            onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
            onPress={handlePress}
            hitSlop={{ top: 10, bottom: 10 }} // Easier to grab
        >
            <Reanimated.View style={[styles.progressBarFill, style]} />
        </Pressable>
    );
}

export function PodcastPlayer({
    visible,
    onClose,
    playlist = [],
    initialIndex = 0,
    autoPlay = false
}) {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState(null);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    const currentTrack = playlist[currentIndex];
    const mounted = useRef(true);

    // Initial Load
    useEffect(() => {
        mounted.current = true;
        if (visible && playlist.length > 0) {
            loadAndPlay(initialIndex, autoPlay);
        }
        return () => {
            mounted.current = false;
            stopAndUnload();
        };
    }, [visible]);

    const stopAndUnload = async () => {
        if (sound) {
            try {
                // Remove status update callback before unloading to prevent weird state updates
                sound.setOnPlaybackStatusUpdate(null);
                await sound.unloadAsync();
            } catch (e) {
                console.warn('Error unloading sound:', e);
            }
            if (mounted.current) setSound(null);
        }
    };

    const loadAndPlay = async (index, shouldPlay = true) => {
        try {
            if (!mounted.current) return;
            setIsLoading(true);

            await stopAndUnload();

            const track = playlist[index];
            if (!track || !track.media_url) return;

            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri: track.media_url },
                { shouldPlay: shouldPlay, rate: playbackSpeed },
                onPlaybackStatusUpdate
            );

            if (mounted.current) {
                setSound(newSound);
                setDuration(status.durationMillis);
                setCurrentIndex(index);
                setIsPlaying(shouldPlay);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error playing podcast track:', error);
            if (mounted.current) setIsLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (!mounted.current) return;

        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);

            // Only update IS_PLAYING if not scrubbing (if we add dragging later)
            // Ideally we check if state matches
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish && !status.isLooping) {
                playNext();
            }
        }
    };

    const playNext = async () => {
        if (currentIndex < playlist.length - 1) {
            await loadAndPlay(currentIndex + 1, true); // Always auto-play next
        } else {
            onClose(); // End of playlist
        }
    };

    const playPrevious = async () => {
        if (currentIndex > 0) {
            await loadAndPlay(currentIndex - 1, true);
        } else {
            if (sound) await sound.replayAsync();
        }
    };

    const togglePlayback = async () => {
        if (!sound) return;
        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
    };

    // Updated to 15 seconds
    const skipForward = async () => {
        if (!sound) return;
        const newPos = position + 15000;
        await sound.setPositionAsync(Math.min(newPos, duration));
    };

    const skipBackward = async () => {
        if (!sound) return;
        const newPos = position - 15000;
        await sound.setPositionAsync(Math.max(0, newPos));
    };

    const seekTo = async (percentage) => {
        if (!sound || duration === 0) return;
        const newPos = percentage * duration;
        await sound.setPositionAsync(newPos);
    };

    const changeSpeed = async () => {
        const speeds = [1.0, 1.5, 2.0, 0.5];
        const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
        if (sound) {
            await sound.setRateAsync(nextSpeed, true);
        }
    };

    if (!visible || !currentTrack) return null;

    const progress = duration > 0 ? position / duration : 0;

    // Calculate total remaining
    const remainingTracks = playlist.slice(currentIndex + 1);
    const remainingTracksDuration = remainingTracks.reduce((sum, t) => sum + (t.duration_seconds || 0), 0);
    const currentRemaining = (duration - position) / 1000;
    const totalTimeRemaining = Math.max(0, currentRemaining + remainingTracksDuration);

    const minutes = Math.floor(totalTimeRemaining / 60);
    const seconds = Math.floor(totalTimeRemaining % 60);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
                    <Reanimated.View
                        entering={SlideInDown.springify()}
                        exiting={SlideOutDown}
                        style={[styles.playerContainer, { paddingBottom: insets.bottom + 20 }]}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerBadge}>
                                <Headphones size={12} color="#fff" />
                                <Text style={styles.headerText}>PODCAST MODE</Text>
                            </View>
                            <Pressable onPress={onClose} style={styles.closeButton}>
                                <X size={24} color="#fff" />
                            </Pressable>
                        </View>

                        <View style={styles.infoContainer}>
                            <Reanimated.View
                                key={currentTrack.id}
                                entering={FadeIn.duration(400)}
                                style={styles.trackInfo}
                            >
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>
                                        {currentTrack.sender?.display_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                                <Text style={styles.senderName}>
                                    {currentTrack.sender?.display_name || 'Unknown'}
                                </Text>
                                <Text style={styles.trackProgress}>
                                    Speaking ({currentIndex + 1} of {playlist.length})
                                </Text>
                            </Reanimated.View>
                        </View>

                        <View style={styles.progressSection}>
                            {/* Interactive Progress Bar */}
                            <ProgressBar progress={progress} onSeek={seekTo} />

                            <View style={styles.timeRow}>
                                <Text style={styles.timeText}>
                                    {new Date(position).toISOString().substr(14, 5)}
                                </Text>
                                <Text style={styles.totalTimeText}>
                                    -{minutes}:{seconds.toString().padStart(2, '0')} remaining
                                </Text>
                            </View>
                        </View>

                        <View style={styles.controls}>
                            <Pressable onPress={changeSpeed} style={styles.speedButton}>
                                <Text style={styles.speedText}>{playbackSpeed}×</Text>
                            </Pressable>

                            <View style={styles.mainControls}>
                                <Pressable onPress={playPrevious} style={styles.skipButton}>
                                    <SkipBack size={28} color="#fff" />
                                </Pressable>
                                <Pressable onPress={skipBackward} style={styles.seekButton}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Rewind size={24} color="rgba(255,255,255,0.7)" />
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, position: 'absolute', bottom: -12 }}>15s</Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    onPress={togglePlayback}
                                    style={styles.playButton}
                                >
                                    {isPlaying ? (
                                        <Pause size={32} color="#000" fill="#000" />
                                    ) : (
                                        <Play size={32} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                                    )}
                                </Pressable>

                                <Pressable onPress={skipForward} style={styles.seekButton}>
                                    <View style={{ alignItems: 'center' }}>
                                        <FastForward size={24} color="rgba(255,255,255,0.7)" />
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, position: 'absolute', bottom: -12 }}>15s</Text>
                                    </View>
                                </Pressable>
                                <Pressable onPress={playNext} style={styles.skipButton}>
                                    <SkipForward size={28} color="#fff" />
                                </Pressable>
                            </View>

                            <View style={{ width: 40 }} />
                        </View>
                    </Reanimated.View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    blurContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    playerContainer: {
        backgroundColor: 'rgba(0,0,0,0.85)', // Slightly darker for better contrast
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingTop: 12,
        minHeight: 380, // Taller for labels
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 8,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 6,
    },
    headerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 100,
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 32,
        height: 120, // Check height
        justifyContent: 'center',
    },
    trackInfo: {
        alignItems: 'center',
        width: '100%',
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    senderName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    trackProgress: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
    progressSection: {
        marginBottom: 32,
    },
    progresBarContainer: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    totalTimeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    speedButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    speedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        padding: 12,
    },
    seekButton: {
        padding: 8,
    }
});
