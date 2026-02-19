import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

// Global flag to prevent multiple recordings
let globalRecording = null;

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [metering, setMetering] = useState(-160); // Decibels, -160 is silence

    const lastStatusUpdateRef = useRef(0);
    const THROTTLE_MS = 60;

    // Cleanup on unmount to prevent zombie recordings
    useEffect(() => {
        return () => {
            if (globalRecording) {
                try {
                    globalRecording.stopAndUnloadAsync();
                    globalRecording = null;
                } catch (_) {}
            }
        };
    }, []);

    const startRecording = async () => {
        // Show recording UI immediately so it doesn't feel like tap-wait (premium: instant feedback)
        setIsRecording(true);
        setIsPaused(false);
        setRecordingDuration(0);
        setMetering(-160);

        try {
            if (globalRecording) {
                try {
                    await globalRecording.stopAndUnloadAsync();
                } catch (_) {}
                globalRecording = null;
            }

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                setIsRecording(false);
                Alert.alert(
                    'Microphone Access Required',
                    'Please enable microphone access in your device settings to record voice messages.',
                    [{ text: 'OK' }]
                );
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Minimal delay so recording starts quickly (session often already warm from prepareAudioSession)
            await new Promise(resolve => setTimeout(resolve, 80));

            const { recording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    isMeteringEnabled: true,
                },
                (status) => {
                    if (!status.isRecording) return;
                    const now = Date.now();
                    if (now - lastStatusUpdateRef.current < THROTTLE_MS) return;
                    lastStatusUpdateRef.current = now;
                    setRecordingDuration(status.durationMillis / 1000);
                    if (status.metering !== undefined) setMetering(status.metering);
                },
                80
            );

            globalRecording = recording;

        } catch (err) {
            console.error('Failed to start recording:', err);
            setIsRecording(false);
            try {
                if (globalRecording) {
                    await globalRecording.stopAndUnloadAsync();
                    globalRecording = null;
                }
                await new Promise(resolve => setTimeout(resolve, 80));
                const { recording } = await Audio.Recording.createAsync(
                    {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                        isMeteringEnabled: true,
                    },
                    (status) => {
                        if (!status.isRecording) return;
                        const now = Date.now();
                        if (now - lastStatusUpdateRef.current < THROTTLE_MS) return;
                        lastStatusUpdateRef.current = now;
                        setRecordingDuration(status.durationMillis / 1000);
                        if (status.metering !== undefined) setMetering(status.metering);
                    },
                    80
                );
                globalRecording = recording;
            } catch (retryErr) {
                console.error('Retry failed:', retryErr);
                Alert.alert(
                    'Recording Error',
                    'Could not start recording. Please try again.',
                    [{ text: 'OK' }]
                );
                setIsRecording(false);
            }
        }
    };

    // Call when chat mounts so first tap has session already in recording mode (avoids "cannot record audio")
    const prepareAudioSession = useCallback(async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
            await new Promise(resolve => setTimeout(resolve, 150));
        } catch (_) {}
    }, []);

    const pauseRecording = async () => {
        try {
            if (!globalRecording) return;
            await globalRecording.pauseAsync();
            setIsPaused(true);
        } catch (err) {
            console.error('Failed to pause recording:', err);
        }
    };

    const resumeRecording = async () => {
        try {
            if (!globalRecording) return;
            await globalRecording.startAsync();
            setIsPaused(false);
        } catch (err) {
            console.error('Failed to resume recording:', err);
        }
    };

    const stopRecording = async () => {
        try {
            if (!globalRecording) return null;

            const status = await globalRecording.stopAndUnloadAsync();
            const uri = globalRecording.getURI();
            const finalDuration = status.durationMillis;

            globalRecording = null;
            setIsRecording(false);
            setIsPaused(false);
            setRecordingDuration(0);
            setMetering(-160);

            return { uri, duration: finalDuration }; // milliseconds
        } catch (err) {
            console.error('Failed to stop recording:', err);
            Alert.alert(
                'Recording Error',
                'Could not save recording. Please try again.',
                [{ text: 'OK' }]
            );
            setIsRecording(false);
            return null;
        }
    };

    const cancelRecording = async () => {
        try {
            if (!globalRecording) return;

            await globalRecording.stopAndUnloadAsync();
            globalRecording = null;
            setIsRecording(false);
            setIsPaused(false);
            setRecordingDuration(0);
            setMetering(-160);
        } catch (err) {
            console.error('Failed to cancel recording:', err);
            setIsRecording(false);
        }
    };

    const getRecordingUri = () => {
        return globalRecording ? globalRecording.getURI() : null;
    };

    return {
        isRecording,
        isPaused,
        recordingDuration,
        metering,
        startRecording,
        prepareAudioSession,
        pauseRecording,
        resumeRecording,
        stopRecording,
        cancelRecording,
        getRecordingUri,
    };
};
