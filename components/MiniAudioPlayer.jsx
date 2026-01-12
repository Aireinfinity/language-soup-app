import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Play, Pause, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
// import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * MiniAudioPlayer - Spotify-style persistent audio playback controls
 * Refined Gen Z design with clean hierarchy
 */
export function MiniAudioPlayer() {
    const insets = useSafeAreaInsets();
    const {
        currentAudio,
        isPlaying,
        position,
        duration,
        playbackSpeed,
        pauseAudio,
        resumeAudio,
        stopAudio,
        seekTo,
        changeSpeed
    } = useAudioPlayer();

    const [isScrubbing, setIsScrubbing] = useState(false);

    if (!currentAudio) return null;

    const formatTime = (ms) => {
        if (!ms) return '0:00';
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTogglePlay = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isPlaying) {
            pauseAudio();
        } else {
            resumeAudio();
        }
    };

    const handleSpeedChange = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await changeSpeed();
    };

    const handleClose = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        stopAudio();
    };

    const handleSlidingStart = () => {
        setIsScrubbing(true);
    };

    const handleSlidingComplete = (value) => {
        setIsScrubbing(false);
        seekTo(value);
    };

    const speedLabel = playbackSpeed === 0.5 ? '0.5x' : playbackSpeed === 2.0 ? '2x' : '1x';

    return (
        <Animated.View
            entering={SlideInDown.duration(200)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.container, { bottom: insets.bottom + 48 }]} // Above tab bar
        >
            <View style={styles.card}>
                <View style={styles.content}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {currentAudio.senderAvatar ? (
                            <Image source={{ uri: currentAudio.senderAvatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {currentAudio.senderName?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoContainer}>
                        {/* Username + Tagline */}
                        <View style={styles.nameRow}>
                            <Text style={styles.senderName} numberOfLines={1}>
                                {currentAudio.senderName || 'Voice Message'}
                            </Text>
                            {currentAudio.senderStatus && (
                                <Text style={styles.senderStatus} numberOfLines={1}>
                                    {' '}{currentAudio.senderStatus}
                                </Text>
                            )}
                        </View>

                        {/* Group Name */}
                        {currentAudio.groupName && (
                            <Text style={styles.groupName} numberOfLines={1}>
                                {currentAudio.groupName}
                            </Text>
                        )}

                        {/* Time Display (shows when scrubbing) */}
                        {isScrubbing && (
                            <Text style={styles.timeDisplay}>
                                {formatTime(position)} / {formatTime(duration)}
                            </Text>
                        )}
                    </View>

                    {/* Controls */}
                    <View style={styles.controlsContainer}>
                        {/* Speed Button */}
                        <Pressable
                            onPress={handleSpeedChange}
                            style={styles.speedButton}
                            hitSlop={8}
                        >
                            <Animated.Text
                                key={playbackSpeed}
                                entering={FadeIn.duration(100)}
                                style={styles.speedText}
                            >
                                {speedLabel}
                            </Animated.Text>
                        </Pressable>

                        {/* Play/Pause Button */}
                        <Pressable onPress={handleTogglePlay} style={styles.playButton} hitSlop={8}>
                            {isPlaying ? (
                                <Pause size={22} color="#fff" fill="#fff" />
                            ) : (
                                <Play size={22} color="#fff" fill="#fff" />
                            )}
                        </Pressable>

                        {/* Close Button - No background, just icon */}
                        <Pressable onPress={handleClose} style={styles.iconButton} hitSlop={10}>
                            <X size={20} color="#666" strokeWidth={2.5} />
                        </Pressable>
                    </View>
                </View>

                {/* Progress Bar - Bottom Edge */}
                {/* <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={position}
                    onSlidingStart={handleSlidingStart}
                    onSlidingComplete={handleSlidingComplete}
                    minimumTrackTintColor={SOUP_COLORS.pink}
                    maximumTrackTintColor="rgba(0,0,0,0.08)"
                    thumbTintColor="transparent" // Invisible thumb
                /> */}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden', // For progress bar at bottom edge
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 12,
    },
    avatarContainer: {
        flexShrink: 0,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.blue,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 2,
    },
    senderName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        flexShrink: 1,
    },
    senderStatus: {
        fontSize: 13,
        fontWeight: '400',
        color: '#888',
        flexShrink: 1,
    },
    groupName: {
        fontSize: 11,
        fontWeight: '500',
        color: '#999',
        marginTop: 1,
    },
    timeDisplay: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
        marginTop: 2,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
    },
    speedButton: {
        paddingHorizontal: 6,
        paddingVertical: 4,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 6,
        minWidth: 36,
        alignItems: 'center',
    },
    speedText: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButton: {
        padding: 4,
    },
    slider: {
        width: '100%',
        height: 6,
        marginTop: -2,
        marginBottom: -3,
    },
});
