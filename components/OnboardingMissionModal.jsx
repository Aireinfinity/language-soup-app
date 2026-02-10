import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert, Dimensions, Image } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Check, X, Lightbulb } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { haptics } from '../utils/haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { InspirationModal } from './InspirationModal';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    text: '#2d3436',
    subtext: '#636e72',
};

const { width, height } = Dimensions.get('window');


// Mission: "Record Your First Word"
// Unlocks the Kitchen (Feed)
export default function OnboardingMissionModal({ visible, groups, onComplete }) {
    const { user } = useAuth();
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showInspiration, setShowInspiration] = useState(false);
    const [step, setStep] = useState('loading'); // 'loading' | 'listening' | 'recording'
    const [welcomeMsg, setWelcomeMsg] = useState(null);
    const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);
    const [welcomeSound, setWelcomeSound] = useState(null);

    // 1. Fetch "Welcome" Message from Group
    useEffect(() => {
        if (visible && groups.length > 0 && step === 'loading') {
            fetchWelcomeMessage();
        }
    }, [visible, groups]);

    const fetchWelcomeMessage = async () => {
        try {
            // 1. Try to fetch from the specific "Global Welcome" pool
            const { data: globalWelcomes, error: globalError } = await supabase
                .from('app_messages')
                .select('*, sender:app_users(display_name, avatar_url)')
                .eq('challenge_id', 'global-welcome')
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(5); // Fetch a few to randomize

            if (globalWelcomes && globalWelcomes.length > 0) {
                // Randomly pick one from the global pool
                const randomWelcome = globalWelcomes[Math.floor(Math.random() * globalWelcomes.length)];
                setWelcomeMsg(randomWelcome);
                setStep('listening');
                return;
            }

            // 2. Fallback: Fetch any recent voice message from the groups the user joined
            const groupIds = groups.map(g => g.id);
            const { data: fallbackMessages, error: fallbackError } = await supabase
                .from('app_messages')
                .select('*, sender:app_users(display_name, avatar_url)')
                .in('group_id', groupIds)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(1);

            if (fallbackMessages && fallbackMessages.length > 0) {
                setWelcomeMsg(fallbackMessages[0]);
                setStep('listening');
            } else {
                // 3. Last Resort Fallback: Any voice message in the entire app
                const { data: appWideMessages } = await supabase
                    .from('app_messages')
                    .select('*, sender:app_users(display_name, avatar_url)')
                    .eq('message_type', 'voice')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (appWideMessages && appWideMessages.length > 0) {
                    setWelcomeMsg(appWideMessages[0]);
                    setStep('listening');
                } else {
                    // No messages yet anywhere, skip to recording
                    setStep('recording');
                }
            }
        } catch (e) {
            console.error('Error fetching welcome message:', e);
            setStep('recording');
        }
    };

    // 2. Play Welcome Message
    useEffect(() => {
        if (step === 'listening' && welcomeMsg && !isPlayingWelcome) {
            playWelcome(welcomeMsg.media_url);
        }
    }, [step, welcomeMsg]);

    const playWelcome = async (uri) => {
        if (!uri) return;
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                (status) => {
                    if (status.didJustFinish) {
                        setIsPlayingWelcome(false);
                        // Optional: Small delay before transitioning
                        setTimeout(() => setStep('recording'), 1000);
                    }
                }
            );
            setWelcomeSound(sound);
            setIsPlayingWelcome(true);
        } catch (e) {
            console.error('Error playing welcome sound:', e);
            setStep('recording');
        }
    };

    // Cleanup sound
    useEffect(() => {
        return () => {
            if (welcomeSound) {
                welcomeSound.unloadAsync();
            }
        };
    }, [welcomeSound]);
    const [metering, setMetering] = useState(-160); // For simple visual feedback

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            haptics.heavy();
            const { status } = await Audio.requestPermissionsAsync();
            // Safety: Unload any existing recording if it got stuck
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    // Ignore already stopped/unloaded
                }
                setRecording(null);
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);

            // Simple metering simulation (since expo-av metering is tricky on some platforms)
            // In a real app we'd use setOnRecordingStatusUpdate
            recording.setOnRecordingStatusUpdate((status) => {
                if (status.metering) setMetering(status.metering);
            });

        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Could not start microphone.');
        }
    };

    const stopRecordingAndSend = async () => {
        if (!recording) return;

        setIsRecording(false);
        setIsUploading(true);
        haptics.success();

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            if (!uri) throw new Error('No recording URI');

            // 1. Upload Audio
            const { data: fileData, error: uploadError } = await uploadAudio(uri);
            if (uploadError) throw uploadError;

            const audioPath = fileData?.path;

            // 2. Send Message (First Word!) to ALL groups
            const messagePromises = groups.map(group => {
                return supabase
                    .from('app_messages')
                    .insert({
                        sender_id: user.id,
                        group_id: group.id,
                        message_type: 'voice',
                        content: `Your First Word! 🌍 (Challenge Complete)`,
                        metadata: {
                            type: 'voice',
                            duration: 2,
                            path: audioPath,
                            challenge_id: 'onboarding-icebreaker',
                            is_first_word: true
                        }
                    });
            });

            await Promise.all(messagePromises);

            // 3. Trigger Welcome Alert for Reactivation
            await sendWelcomeAlert();

            // SUCCESS!
            setShowConfetti(true);
            haptics.success();

            // Wait for confetti
            setTimeout(() => {
                onComplete();
            }, 2500);

        } catch (err) {
            console.error('Failed to send first word', err);
            Alert.alert('Error', 'Failed to upload. Please try again!');
            setIsUploading(false);
        } finally {
            setRecording(null);
        }
    };

    const uploadAudio = async (uri) => {
        const ext = 'm4a'; // Force m4a for consistency
        const fileName = `language-chat/${user.id}/voice_onboarding_${Date.now()}.${ext}`;

        // Read as base64 for upload
        const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const { decode } = require('base64-arraybuffer');

        return supabase.storage
            .from('voice-memos')
            .upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
    };

    const sendWelcomeAlert = async () => {
        // Trigger Edge Function to notify existing members
        try {
            await supabase.functions.invoke('send-welcome-alert', {
                body: {
                    userId: user.id,
                    display_name: user.user_metadata?.display_name || 'A new Chef',
                    groupIds: groups.map(g => g.id)
                }
            });
        } catch (e) {
            console.error('Welcome alert failed', e);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.emoji}>🍲</Text>
                    <Text style={styles.title}>Welcome to the Soup!</Text>
                    <Text style={styles.subtitle}>
                        This kitchen is for chefs only. To join, you must add <Text style={styles.highlight}>one ingredient</Text>.
                    </Text>

                    {step === 'loading' && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                            <Text style={styles.loadingText}>Preparing your soup...</Text>
                        </View>
                    )}

                    {step === 'listening' && (
                        <View style={styles.listeningContainer}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.missionLabel}>HEAR FROM THE GROUP 🎧</Text>
                            </View>

                            <View style={styles.avatarPulsingContainer}>
                                <Image
                                    source={getAvatarSource(welcomeMsg?.sender?.avatar_url)}
                                    style={styles.welcomeAvatar}
                                />
                                {isPlayingWelcome && <View style={styles.pulseDisk} />}
                            </View>

                            <Text style={styles.welcomeTitle}>
                                {welcomeMsg?.sender?.display_name || 'Someone'} is saying hello!
                            </Text>
                            <Text style={styles.welcomeSubtitle}>
                                This is a real message from your new community. Listen to their welcome, then it's your turn.
                            </Text>

                            <Pressable
                                style={styles.skipButton}
                                onPress={() => {
                                    if (welcomeSound) welcomeSound.stopAsync();
                                    setStep('recording');
                                }}
                            >
                                <Text style={styles.skipText}>Skip to Challenge ➡️</Text>
                            </Pressable>
                        </View>
                    )}

                    {step === 'recording' && (
                        <View style={styles.missionCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.missionLabel}>FIRST CHALLENGE 🥣</Text>
                                <View style={styles.timeBadge}>
                                    <Text style={styles.timeBadgeText}>ACTIVE</Text>
                                </View>
                            </View>
                            <Text style={styles.missionTitle}>
                                Your First Word 🎙️
                            </Text>
                            <Text style={styles.missionPrompt}>
                                What is your <Text style={styles.highlight}>favorite word</Text> in this language?
                            </Text>
                            <Text style={styles.missionSubPrompt}>
                                (Curse words count too, this isn't a classroom!)
                            </Text>

                            <Pressable
                                style={styles.inspirationButton}
                                onPress={() => setShowInspiration(true)}
                            >
                                <Lightbulb size={16} color="#ec008b" />
                                <Text style={styles.inspirationText}>Need ideas?</Text>
                            </Pressable>

                            <View style={styles.audioControls}>
                                {isUploading ? (
                                    <ActivityIndicator size="large" color={Colors.light.tint} />
                                ) : recording ? (
                                    <View style={styles.recordingRow}>
                                        <View style={styles.recordingIndicator}>
                                            <View style={styles.recordingDot} />
                                            <Text style={styles.recordingTime}>Recording...</Text>
                                        </View>
                                        <Pressable style={styles.stopButton} onPress={stopRecordingAndSend}>
                                            <Check size={28} color="white" />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Pressable style={styles.recordButton} onPress={startRecording}>
                                        <Mic size={32} color="white" />
                                    </Pressable>
                                )}

                                <Text style={styles.hint}>
                                    {recording ? 'Tap check to send' : 'Tap to start recording'}
                                </Text>
                            </View>
                            <Text style={styles.broadcastInfo}>
                                📢 Your message will be sent to all {groups.length} groups.
                            </Text>
                        </View>
                    )}
                </View>

                {showConfetti && <ConfettiCannon count={200} origin={{ x: width / 2, y: 0 }} />}

                <InspirationModal
                    visible={showInspiration}
                    onClose={() => setShowInspiration(false)}
                    prompt="What is your favorite word in this language?"
                    language={groups?.[0]?.language || 'Target Language'}
                    metadata={{
                        starter_phrase: "My favorite word is...",
                        vocab_bank: [
                            { word: "Laughter", translation: "La risa" },
                            { word: "Beautiful", translation: "Hermoso" },
                            { word: "Freedom", translation: "La libertad" }
                        ]
                    }}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primary, // #ec008b (Pink) or Blue? Let's use Pink for "Soup" brand.
        // Or maybe a translucent overlay?
        // User said "forced-focus", so opaque is better.
        backgroundColor: '#ec008b',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        gap: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 26,
    },
    highlight: {
        fontWeight: 'bold',
        color: '#fff',
        textDecorationLine: 'underline',
    },
    missionCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
        marginTop: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeBadge: {
        backgroundColor: 'rgba(236, 0, 139, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    timeBadgeText: {
        color: '#ec008b',
        fontSize: 10,
        fontWeight: '900',
    },
    missionLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#ec008b',
        letterSpacing: 1,
    },
    missionTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#2d3436',
        marginBottom: 8,
    },
    missionPrompt: {
        fontSize: 18,
        fontWeight: '800',
        color: '#2d3436',
        lineHeight: 24,
        marginBottom: 8,
    },
    missionSubPrompt: {
        fontSize: 15,
        fontWeight: '500',
        color: '#636e72',
        lineHeight: 22,
        marginBottom: 20,
    },
    inspirationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 0, 139, 0.05)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.1)',
        marginBottom: 16,
    },
    inspirationText: {
        color: '#ec008b',
        fontWeight: '700',
        fontSize: 14,
    },
    missionSubtext: {
        fontSize: 12,
        color: '#b2bec3',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    recordContainer: {
        alignItems: 'center',
        marginTop: 32,
        gap: 16,
    },
    recordButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#19b091', // Green for "Go"
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 6,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    recordingActive: {
        transform: [{ scale: 1.1 }],
        backgroundColor: '#ff4757', // Red for recording
    },
    instruction: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.8,
    },
    // New Styles for Welcome Loop
    loadingContainer: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 40,
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
    },
    listeningContainer: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    avatarPulsingContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    welcomeAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#ec008b',
        zIndex: 2,
    },
    pulseDisk: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(236, 0, 139, 0.2)',
        zIndex: 1,
    },
    welcomeTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#2d3436',
        textAlign: 'center',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    skipButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    skipText: {
        color: '#ec008b',
        fontWeight: '700',
        fontSize: 14,
    },
    audioControls: {
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
    },
    recordingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4757',
    },
    recordingTime: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ff4757',
    },
    stopButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#19b091',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 13,
        color: '#b2bec3',
        fontWeight: '600',
    },
    broadcastInfo: {
        fontSize: 11,
        color: '#b2bec3',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
});
