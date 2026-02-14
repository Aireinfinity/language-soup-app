import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LISTENING_TOTAL_KEY = 'listening_total_seconds';
const LISTENING_TODAY_KEY = 'listening_today_seconds';
const LISTENING_TODAY_DATE_KEY = 'listening_today_date';

async function recordListeningSeconds(seconds) {
    try {
        const today = new Date().toDateString();
        const [totalRaw, todayRaw, dateRaw] = await Promise.all([
            AsyncStorage.getItem(LISTENING_TOTAL_KEY),
            AsyncStorage.getItem(LISTENING_TODAY_KEY),
            AsyncStorage.getItem(LISTENING_TODAY_DATE_KEY),
        ]);
        let total = parseInt(totalRaw || '0', 10) || 0;
        let todaySec = parseInt(todayRaw || '0', 10) || 0;
        if (dateRaw !== today) {
            todaySec = 0;
            await AsyncStorage.setItem(LISTENING_TODAY_DATE_KEY, today);
        }
        total += seconds;
        todaySec += seconds;
        await Promise.all([
            AsyncStorage.setItem(LISTENING_TOTAL_KEY, String(total)),
            AsyncStorage.setItem(LISTENING_TODAY_KEY, String(todaySec)),
        ]);
    } catch (_) {}
}

const AudioPlayerContext = createContext(null);

// Queue item: { url, duration, messageId, senderName, senderAvatar, senderStatus, groupName, groupId }
export function AudioPlayerProvider({ children }) {
    const [currentAudio, setCurrentAudio] = useState(null); // same shape + groupId for "React"
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0); // milliseconds
    const [duration, setDuration] = useState(0); // milliseconds
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 0.75, 1, 1.5, 2
    const [queue, setQueue] = useState([]); // remaining items (for UI: queue.length = "up next" count)
    const [fullQueue, setFullQueue] = useState([]); // full list for skip prev/next
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
    const [showEndSummary, setShowEndSummary] = useState(false);
    const [endSummaryStats, setEndSummaryStats] = useState(null); // { todaySeconds, totalSeconds }
    const queueRef = useRef([]);
    const fullQueueRef = useRef([]);
    const currentIndexRef = useRef(0);
    const soundRef = useRef(null);
    const appState = useRef(AppState.currentState);

    // Cleanup on unmount or app background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/active/) && nextAppState === 'background') {
                // App going to background - pause audio
                if (soundRef.current && isPlaying) {
                    soundRef.current.pauseAsync();
                    setIsPlaying(false);
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                const listenedSec = status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0;
                if (listenedSec > 0) recordListeningSeconds(listenedSec);
                const nextIdx = currentIndexRef.current + 1;
                const full = fullQueueRef.current;
                if (full.length > 0 && nextIdx < full.length) {
                    setCurrentIndex(nextIdx);
                    currentIndexRef.current = nextIdx;
                    const remaining = full.slice(nextIdx + 1);
                    setQueue(remaining);
                    queueRef.current = remaining;
                    setNextInQueue(full[nextIdx]);
                } else {
                    setCurrentAudio(null);
                    setQueue([]);
                    setFullQueue([]);
                    setCurrentIndex(0);
                    queueRef.current = [];
                    fullQueueRef.current = [];
                    currentIndexRef.current = 0;
                    (async () => {
                        if (listenedSec > 0) await recordListeningSeconds(listenedSec);
                        const [t, tot] = await Promise.all([
                            AsyncStorage.getItem(LISTENING_TODAY_KEY),
                            AsyncStorage.getItem(LISTENING_TOTAL_KEY),
                        ]);
                        setEndSummaryStats({
                            todaySeconds: parseInt(t || '0', 10),
                            totalSeconds: parseInt(tot || '0', 10),
                        });
                        setShowEndSummary(true);
                    })();
                }
            }
        }
    };

    const [nextInQueue, setNextInQueue] = useState(null);

    const playAudio = async (url, audioDuration, messageId, senderName, senderAvatar = null, senderStatus = null, groupName = null, groupId = null) => {
        try {
            // If clicking the same audio that's playing, toggle pause/play
            if (currentAudio?.messageId === messageId && soundRef.current) {
                const status = await soundRef.current.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await soundRef.current.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        await soundRef.current.playAsync();
                        setIsPlaying(true);
                    }
                    return;
                }
            }

            // Stop and unload previous audio
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            // Single playback: clear queue so we don't show "up next" from a previous session
            setQueue([]);
            setFullQueue([]);
            setCurrentIndex(0);
            queueRef.current = [];
            fullQueueRef.current = [];
            currentIndexRef.current = 0;

            // Set up audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false, // Force speaker output (Playback category), recording will re-enable this if needed
                playsInSilentModeIOS: true,
                staysActiveInBackground: true, // Keep playing in background
                shouldDuckAndroid: true,
            });

            // Create and play new audio
            const { sound, status } = await Audio.Sound.createAsync(
                { uri: url },
                {
                    shouldPlay: true,
                    volume: 1.0,
                    rate: playbackSpeed,
                    progressUpdateIntervalMillis: 100
                },
                onPlaybackStatusUpdate
            );

            soundRef.current = sound;
            setCurrentAudio({
                url,
                duration: audioDuration * 1000, // convert to ms
                messageId,
                senderName,
                senderAvatar,
                senderStatus,
                groupName,
                groupId
            });
            setIsPlaying(true);

            if (status.durationMillis) {
                setDuration(status.durationMillis);
            }
        } catch (error) {
            console.error('[AudioPlayer] Error playing audio:', error);
        }
    };

    const pauseAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
        }
    };

    const resumeAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.playAsync();
            setIsPlaying(true);
        }
    };

    const stopAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        setCurrentAudio(null);
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
        setQueue([]);
        setFullQueue([]);
        setCurrentIndex(0);
        queueRef.current = [];
        fullQueueRef.current = [];
        currentIndexRef.current = 0;
    };

    // Podcast mode: play a list of voice messages; supports skip next/prev.
    const startQueue = (items) => {
        if (!items || items.length === 0) return;
        const valid = items.filter(i => i?.url != null && String(i.url).trim() !== '');
        if (valid.length === 0) return;
        // Stop any current playback so we never overlap (e.g. double-tap with lag)
        if (soundRef.current) {
            soundRef.current.unloadAsync().catch(() => {});
            soundRef.current = null;
        }
        setCurrentAudio(null);
        setIsPlaying(false);
        setQueue([]);
        setFullQueue([]);
        setCurrentIndex(0);
        queueRef.current = [];
        fullQueueRef.current = [];
        currentIndexRef.current = 0;
        const rest = valid.slice(1);
        queueRef.current = rest;
        fullQueueRef.current = valid;
        currentIndexRef.current = 0;
        setFullQueue(valid);
        setCurrentIndex(0);
        setQueue(rest);
        const first = valid[0];
        const durationSec = first.durationSeconds ?? (first.duration ? first.duration / 1000 : 30);
        playAudio(
            first.url,
            durationSec,
            first.messageId,
            first.senderName,
            first.senderAvatar,
            first.senderStatus,
            first.groupName,
            first.groupId
        );
    };

    const skipNext = async () => {
        const full = fullQueueRef.current;
        const idx = currentIndexRef.current + 1;
        if (full.length === 0 || idx >= full.length) return;
        const item = full[idx];
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        currentIndexRef.current = idx;
        setCurrentIndex(idx);
        setQueue(full.slice(idx + 1));
        queueRef.current = full.slice(idx + 1);
        const dur = item.durationSeconds ?? (item.duration ? item.duration / 1000 : 30);
        playAudio(item.url, dur, item.messageId, item.senderName, item.senderAvatar, item.senderStatus, item.groupName, item.groupId);
    };

    const skipPrevious = async () => {
        const full = fullQueueRef.current;
        const idx = currentIndexRef.current;
        if (full.length === 0) return;
        if (idx > 0) {
            const prevIdx = idx - 1;
            const item = full[prevIdx];
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            currentIndexRef.current = prevIdx;
            setCurrentIndex(prevIdx);
            setQueue(full.slice(prevIdx + 1));
            queueRef.current = full.slice(prevIdx + 1);
            const dur = item.durationSeconds ?? (item.duration ? item.duration / 1000 : 30);
            playAudio(item.url, dur, item.messageId, item.senderName, item.senderAvatar, item.senderStatus, item.groupName, item.groupId);
        } else {
            seekTo(0);
        }
    };

    const seekTo = async (positionMs) => {
        if (soundRef.current) {
            await soundRef.current.setPositionAsync(positionMs);
            setPosition(positionMs);
        }
    };

    const changeSpeed = async () => {
        // Cycle: 0.75 → 1 → 1.5 → 2 → 0.75
        const speeds = [0.75, 1.0, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        setPlaybackSpeed(nextSpeed);

        if (soundRef.current) {
            await soundRef.current.setRateAsync(nextSpeed, true);
        }
    };

    // When a track ends, play next in queue (podcast mode)
    const playAudioRef = useRef(playAudio);
    playAudioRef.current = playAudio;
    useEffect(() => {
        if (!nextInQueue) return;
        const item = nextInQueue;
        setNextInQueue(null);
        const dur = item.durationSeconds ?? (item.duration ? item.duration / 1000 : 30);
        playAudioRef.current(
            item.url,
            dur,
            item.messageId,
            item.senderName,
            item.senderAvatar,
            item.senderStatus,
            item.groupName,
            item.groupId
        );
    }, [nextInQueue]);

    return (
        <AudioPlayerContext.Provider
            value={{
                currentAudio,
                isPlaying,
                position,
                duration,
                playbackSpeed,
                queue,
                fullQueue,
                currentIndex,
                isPlayerExpanded,
                setIsPlayerExpanded,
                showEndSummary,
                setShowEndSummary,
                endSummaryStats,
                setEndSummaryStats,
                playAudio,
                pauseAudio,
                resumeAudio,
                stopAudio,
                seekTo,
                changeSpeed,
                startQueue,
                skipNext,
                skipPrevious
            }}
        >
            {children}
        </AudioPlayerContext.Provider>
    );
}

export function useAudioPlayer() {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
    }
    return context;
}
