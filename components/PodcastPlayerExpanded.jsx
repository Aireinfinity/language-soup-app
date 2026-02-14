import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { Play, Pause, SkipBack, SkipForward, X, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { getAvatarSource } from '../utils/soupUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export function PodcastPlayerExpanded() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {
        currentAudio,
        isPlaying,
        position,
        duration,
        playbackSpeed,
        fullQueue,
        currentIndex,
        isPlayerExpanded,
        setIsPlayerExpanded,
        pauseAudio,
        resumeAudio,
        stopAudio,
        seekTo,
        changeSpeed,
        skipNext,
        skipPrevious
    } = useAudioPlayer();

    const [seekBarWidth, setSeekBarWidth] = useState(0);
    if (!currentAudio || !isPlayerExpanded) return null;

    const formatTime = (ms) => {
        if (!ms) return '0:00';
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, '0')}`;
    };

    const progress = duration > 0 ? Math.min(1, position / duration) : 0;
    const canGoNext = fullQueue.length > 0 && currentIndex < fullQueue.length - 1;
    const canGoPrev = fullQueue.length > 0 && currentIndex > 0;

    const handleSeek = (e) => {
        if (seekBarWidth <= 0) return;
        const x = e.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(1, x / seekBarWidth));
        seekTo(pct * duration);
    };

    const speedLabel = playbackSpeed === 0.75 ? '0.75×' : playbackSpeed === 1.5 ? '1.5×' : playbackSpeed === 2 ? '2×' : '1×';

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setIsPlayerExpanded(false)}
        >
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            >
                <View style={styles.backdropInner} />
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsPlayerExpanded(false);
                            }}
                            style={styles.closeBtn}
                            hitSlop={12}
                        >
                            <X size={28} color={SOUP_COLORS.text} strokeWidth={2} />
                        </Pressable>
                        <Text style={styles.headerTitle}>Podcast mode</Text>
                        <View style={styles.headerRight} />
                    </View>

                    {/* Art / Avatar */}
                    <Animated.View entering={SlideInDown.duration(280)} style={styles.artWrap}>
                        <View style={styles.artShadow}>
                            {currentAudio.senderAvatar ? (
                                <Image source={getAvatarSource(currentAudio.senderAvatar)} style={styles.art} />
                            ) : (
                                <View style={[styles.art, styles.artPlaceholder]}>
                                    <Text style={styles.artLetter}>{currentAudio.senderName?.[0]?.toUpperCase() || '?'}</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                    {/* Track info */}
                    <View style={styles.infoWrap}>
                        <Text style={styles.trackName} numberOfLines={1}>{currentAudio.senderName || 'Voice'}</Text>
                        {currentAudio.senderStatus ? (
                            <Text style={styles.trackTagline} numberOfLines={1}>"{currentAudio.senderStatus}"</Text>
                        ) : null}
                        <Text style={styles.groupName} numberOfLines={1}>{currentAudio.groupName || ''}</Text>
                        {fullQueue.length > 0 && (() => {
                            const totalSec = fullQueue.reduce((s, i) => s + (i.durationSeconds ?? 0), 0);
                            const totalMin = Math.round(totalSec / 60) || 1;
                            return (
                                <Text style={styles.queueCount}>
                                    {currentIndex + 1} of {fullQueue.length} · about {totalMin} min
                                </Text>
                            );
                        })()}
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressWrap}>
                        <Pressable
                            style={styles.seekBarWrap}
                            onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                            onPress={handleSeek}
                        >
                            <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
                        </Pressable>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                changeSpeed();
                            }}
                            style={styles.speedBtn}
                        >
                            <Text style={styles.speedBtnText}>{speedLabel}</Text>
                        </Pressable>

                        <View style={styles.mainControls}>
                            <Pressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipPrevious(); }}
                                style={[styles.skipBtn, !canGoPrev && styles.skipBtnDisabled]}
                                disabled={!canGoPrev && fullQueue.length > 0}
                            >
                                <SkipBack size={36} color={canGoPrev ? SOUP_COLORS.blue : SOUP_COLORS.subtext} fill={canGoPrev ? SOUP_COLORS.blue : 'transparent'} />
                            </Pressable>

                            <Pressable
                                onPress={async () => {
                                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (isPlaying) pauseAudio();
                                    else resumeAudio();
                                }}
                                style={styles.playPauseBtn}
                            >
                                {isPlaying ? (
                                    <Pause size={40} color="#fff" fill="#fff" />
                                ) : (
                                    <Play size={40} color="#fff" fill="#fff" />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipNext(); }}
                                style={[styles.skipBtn, !canGoNext && styles.skipBtnDisabled]}
                                disabled={!canGoNext}
                            >
                                <SkipForward size={36} color={canGoNext ? SOUP_COLORS.blue : SOUP_COLORS.subtext} fill={canGoNext ? SOUP_COLORS.blue : 'transparent'} />
                            </Pressable>
                        </View>

                        {currentAudio.groupId ? (
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsPlayerExpanded(false);
                                    router.push(`/chat/${currentAudio.groupId}${currentAudio.messageId ? `?messageId=${currentAudio.messageId}` : ''}`);
                                }}
                                style={styles.reactBtn}
                            >
                                <MessageCircle size={20} color={SOUP_COLORS.blue} />
                                <Text style={styles.reactBtnText}>React in chat</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
    },
    backdropInner: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: SOUP_COLORS.cream,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    closeBtn: { padding: 8 },
    headerTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    headerRight: { width: 44 },
    artWrap: {
        alignItems: 'center',
        marginVertical: 16,
    },
    artShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    art: {
        width: SCREEN_WIDTH * 0.55,
        height: SCREEN_WIDTH * 0.55,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
    },
    artPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.blue,
    },
    artLetter: {
        fontSize: 72,
        fontWeight: '800',
        color: '#fff',
    },
    infoWrap: {
        alignItems: 'center',
        marginBottom: 24,
    },
    trackName: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    trackTagline: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        marginBottom: 4,
    },
    groupName: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    queueCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 8,
    },
    progressWrap: {
        marginBottom: 28,
    },
    seekBarWrap: {
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    seekBarFill: {
        height: '100%',
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 3,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    controls: {
        alignItems: 'center',
    },
    speedBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 20,
        marginBottom: 24,
    },
    speedBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 24,
    },
    skipBtn: {
        padding: 8,
    },
    skipBtnDisabled: { opacity: 0.6 },
    playPauseBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SOUP_COLORS.green,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0, 173, 239, 0.2)',
        borderRadius: 24,
    },
    reactBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
});
