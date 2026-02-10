import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

// Global flag to prevent multiple recordings
let globalRecording = null;

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [metering, setMetering] = useState(-160); // Decibels, -160 is silence

    // Cleanup on unmount to prevent zombie recordings
    useEffect(() => {
        return () => {
            if (globalRecording) {
                try {
                    console.log('[useVoiceRecorder] Unmounting, cleaning up active recording');
                    globalRecording.stopAndUnloadAsync();
                    globalRecording = null;
                } catch (e) {
                    console.warn('[useVoiceRecorder] Cleanup error:', e);
                }
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            // Clean up any existing recording first
            if (globalRecording) {
                try {
                    await globalRecording.stopAndUnloadAsync();
                } catch (e) {
                    console.log('Error cleaning up previous recording:', e);
                }
                globalRecording = null;
            }

            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Microphone Access Required',
                    'Please enable microphone access in your device settings to record voice messages.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // IMPORTANT: Set audio mode BEFORE creating recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Small delay to let audio mode settle (fixes "prepare encountered an error")
            await new Promise(resolve => setTimeout(resolve, 100));

            const { recording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    isMeteringEnabled: true,
                },
                (status) => {
                    // Only update if actively recording (not paused)
                    if (status.isRecording) {
                        setRecordingDuration(status.durationMillis / 1000);
                        if (status.metering !== undefined) {
                            setMetering(status.metering);
                        }
                    }
                },
                50 // Update every 50ms for smoother waveform
            );

            globalRecording = recording;
            setIsRecording(true);
            setIsPaused(false);
            console.log('[Recorder] Started successfully');

        } catch (err) {
            console.error('Failed to start recording:', err);
            // Retry once if it fails (common on Android)
            try {
                if (globalRecording) {
                    await globalRecording.stopAndUnloadAsync();
                    globalRecording = null;
                }
                // Try one more time without the delay
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                globalRecording = recording;
                setIsRecording(true);
                console.log('[Recorder] Started on retry');
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
        pauseRecording,
        resumeRecording,
        stopRecording,
        cancelRecording,
        getRecordingUri,
    };
};
