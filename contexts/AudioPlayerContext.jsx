import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';

const AudioPlayerContext = createContext(null);

export function AudioPlayerProvider({ children }) {
    const [currentAudio, setCurrentAudio] = useState(null); // { url, duration, messageId, senderName, senderAvatar, senderStatus, groupName }
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0); // milliseconds
    const [duration, setDuration] = useState(0); // milliseconds
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 0.5, 1.0, 2.0
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
            }
        }
    };

    const playAudio = async (url, audioDuration, messageId, senderName, senderAvatar = null, senderStatus = null, groupName = null) => {
        try {
            console.log('[AudioPlayer] playAudio called:', { url, messageId, currentAudio: currentAudio?.messageId });

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
                console.log('[AudioPlayer] Stopping previous audio');
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Set up audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true, // Keep playing in background
                shouldDuckAndroid: true,
            });

            console.log('[AudioPlayer] Creating new sound from:', url);

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
                groupName
            });
            setIsPlaying(true);

            if (status.durationMillis) {
                setDuration(status.durationMillis);
            }

            console.log('[AudioPlayer] Audio playing successfully');
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
    };

    const seekTo = async (positionMs) => {
        if (soundRef.current) {
            await soundRef.current.setPositionAsync(positionMs);
            setPosition(positionMs);
        }
    };

    const changeSpeed = async () => {
        // Cycle through speeds: 0.5 → 1.0 → 2.0 → 0.5
        const speeds = [0.5, 1.0, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        setPlaybackSpeed(nextSpeed);

        if (soundRef.current) {
            await soundRef.current.setRateAsync(nextSpeed, true);
        }
    };

    return (
        <AudioPlayerContext.Provider
            value={{
                currentAudio,
                isPlaying,
                position,
                duration,
                playbackSpeed,
                playAudio,
                pauseAudio,
                resumeAudio,
                stopAudio,
                seekTo,
                changeSpeed
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
