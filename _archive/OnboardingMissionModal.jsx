import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert, Dimensions, Image, SafeAreaView, TextInput } from 'react-native';
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
import { getAvatarSource } from '../utils/soupUtils';
import { ChallengeQueueCard } from './ChallengeQueueCard';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    text: '#2d3436',
    subtext: '#636e72',
};

const { width, height } = Dimensions.get('window');

const getGroupColor = (groupName) => {
    if (!groupName) return '#00ADEF';
    const name = String(groupName).toLowerCase();
    if (name.includes('spanish')) return '#FF6B6B';
    if (name.includes('french')) return '#4DA6FF';
    if (name.includes('hungarian')) return '#2ECC71';
    if (name.includes('german')) return '#F39C12';
    if (name.includes('japanese')) return '#E91E63';
    if (name.includes('italian')) return '#00B894';
    if (name.includes('portuguese')) return '#E17055';
    return '#00ADEF';
};

const ONBOARDING_PROMPT = "what's ur favorite word in this language? curse words count 😏 this isn't a classroom.";

// Fun, lowercase options for users who don't want to send a voice memo yet
const ONBOARDING_TEXT_OPTIONS = [
    'hey everyone 👋🏿',
    'hi from the lurking corner 😅',
    'first voice memo coming soon… for now: hi! 🍜',
    'just saying hi before i get brave',
];

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
    const [welcomePool, setWelcomePool] = useState([]); // up to 3 played from this pool
    const [welcomeIndex, setWelcomeIndex] = useState(0);
    const [welcomeMsg, setWelcomeMsg] = useState(null);
    const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);
    const [welcomeSound, setWelcomeSound] = useState(null);
    const [isSendingText, setIsSendingText] = useState(false);
    const [customHiText, setCustomHiText] = useState('');

    // 1. Fetch "Welcome" Message from Group
    useEffect(() => {
        if (visible && groups.length > 0 && step === 'loading') {
            fetchWelcomeMessage();
        }
    }, [visible, groups]);

    const fetchWelcomeMessage = async () => {
        try {
            // Play "most recent challenge" voice memos from the group(s) — not "say hi" welcomes, just recent activity
            const groupIds = groups.map(g => g.id);
            const { data: recentVoices, error } = await supabase
                .from('app_messages')
                .select('*, sender:app_users(display_name, avatar_url)')
                .in('group_id', groupIds)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentVoices && recentVoices.length > 0) {
                setWelcomePool(recentVoices);
                setWelcomeMsg(recentVoices[0]);
                setWelcomeIndex(0);
                setStep('listening');
                return;
            }

            // No voice messages in user's groups yet, skip straight to first challenge
            setStep('recording');
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
                        // Don't auto-advance; user taps "more" or "skip"
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
                        content: `ur first word 🎙️`,
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

    // Same flow as daily challenge: card calls onSend with { uri, duration }
    const handleOnboardingSend = async (audioResult) => {
        if (!audioResult?.uri) return;
        const { uri, duration } = audioResult;
        setIsUploading(true);
        try {
            const { data: fileData, error: uploadError } = await uploadAudio(uri);
            if (uploadError) throw uploadError;
            const path = fileData?.path;
            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(path);
            const durationSec = Math.max(1, Math.floor((duration || 2000) / 1000));
            const messagePromises = groups.map(group =>
                supabase.from('app_messages').insert({
                    sender_id: user.id,
                    group_id: group.id,
                    message_type: 'voice',
                    content: 'ur first word 🎙️',
                    media_url: publicUrl,
                    metadata: {
                        type: 'voice',
                        duration: durationSec,
                        path,
                        challenge_id: 'onboarding-icebreaker',
                        is_first_word: true
                    }
                })
            );
            await Promise.all(messagePromises);
            await sendWelcomeAlert();
            setShowConfetti(true);
            haptics.success();
            setTimeout(() => onComplete(), 2500);
        } catch (err) {
            console.error('Onboarding send failed', err);
            Alert.alert('Error', 'Failed to upload. Please try again!');
        } finally {
            setIsUploading(false);
        }
    };

    // Text fallback: send a fun "hi" to all groups and complete onboarding
    const handleOnboardingTextSend = async (text) => {
        const msg = (text || customHiText || '').trim();
        if (!msg || groups.length === 0) return;
        setIsSendingText(true);
        try {
            const messagePromises = groups.map(group =>
                supabase.from('app_messages').insert({
                    sender_id: user.id,
                    group_id: group.id,
                    message_type: 'text',
                    content: msg,
                    metadata: { onboarding_hi: true }
                })
            );
            await Promise.all(messagePromises);
            await sendWelcomeAlert();
            setShowConfetti(true);
            haptics.success();
            setTimeout(() => onComplete(), 2500);
        } catch (err) {
            console.error('Onboarding text send failed', err);
            Alert.alert('Error', 'Couldn\'t send. Try again or send a voice note!');
        } finally {
            setIsSendingText(false);
        }
    };

    const onboardingChallenge = useMemo(() => ({
        id: 'onboarding-icebreaker',
        prompt_text: ONBOARDING_PROMPT,
        group_id: groups[0]?.id,
        group_name: groups[0]?.name || 'Soup',
        metadata: null
    }), [groups]);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={step !== 'recording'}>
            <View style={[styles.container, step === 'recording' && styles.containerRecording]}>
                <View style={[styles.content, step === 'recording' && styles.contentRecording]}>
                    {step !== 'recording' && (
                        <>
                            <Text style={styles.emoji}>🍲</Text>
                            <Text style={styles.title}>welcome to the soup!</Text>
                            <Text style={styles.subtitle}>
                                everyone here sends voice memos. add <Text style={styles.highlight}>one ingredient</Text> and ur in 🍜
                            </Text>
                        </>
                    )}

                    {step === 'loading' && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                            <Text style={styles.loadingText}>preparing ur soup...</Text>
                        </View>
                    )}

                    {step === 'listening' && (
                        <View style={styles.listeningContainer}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.missionLabel}>hear from the group 🎧</Text>
                            </View>

                            <View style={styles.avatarPulsingContainer}>
                                <Image
                                    source={getAvatarSource(welcomeMsg?.sender?.avatar_url)}
                                    style={styles.welcomeAvatar}
                                />
                                {isPlayingWelcome && <View style={styles.pulseDisk} />}
                            </View>

                            <Text style={styles.welcomeTitle}>
                                this is someone from the group
                            </Text>
                            <Text style={styles.welcomeSubtitle}>
                                their most recent challenge 👋🏿 listen to a few, then it's ur turn
                            </Text>

                            <View style={styles.welcomeActions}>
                                {!isPlayingWelcome && welcomeIndex < 2 && welcomeIndex + 1 < welcomePool.length && (
                                    <Pressable
                                        style={styles.moreButton}
                                        onPress={() => {
                                            const next = welcomeIndex + 1;
                                            setWelcomeMsg(welcomePool[next]);
                                            setWelcomeIndex(next);
                                            playWelcome(welcomePool[next].media_url);
                                        }}
                                    >
                                        <Text style={styles.moreButtonText}>more 👋🏿</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    style={styles.skipButton}
                                    onPress={() => {
                                        if (welcomeSound) welcomeSound.stopAsync();
                                        setStep('recording');
                                    }}
                                >
                                    <Text style={styles.skipText}>skip to challenge ➡️</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {step === 'recording' && (
                        <View style={[styles.recordingStepContainer, { backgroundColor: getGroupColor(groups[0]?.name) }]}>
                            <SafeAreaView style={styles.recordingStepSafe}>
                                <Text style={styles.transitionCopyOverCard}>
                                    that's the community 👋🏿 daily challenge, u send a voice reply. here's ur first one 🥣
                                </Text>
                                <ChallengeQueueCard
                                    key="onboarding-icebreaker"
                                    challenge={onboardingChallenge}
                                    groupName={groups[0]?.name || 'Soup'}
                                    onSend={handleOnboardingSend}
                                    loading={isUploading}
                                />
                                <Pressable onPress={() => onComplete()} style={styles.skipForNowButton}>
                                    <Text style={styles.skipForNowText}>skip for now</Text>
                                </Pressable>
                                <View style={styles.textFallbackBlock}>
                                    <Text style={styles.textFallbackLabel}>still scared? just say something in the chat 👋🏿</Text>
                                    <View style={styles.textFallbackOptions}>
                                        {ONBOARDING_TEXT_OPTIONS.map((option, idx) => (
                                            <Pressable
                                                key={idx}
                                                style={({ pressed }) => [styles.textFallbackOption, pressed && { opacity: 0.8 }]}
                                                onPress={() => handleOnboardingTextSend(option)}
                                                disabled={isSendingText}
                                            >
                                                <Text style={styles.textFallbackOptionText}>{option}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                    <View style={styles.textFallbackCustomRow}>
                                        <TextInput
                                            style={styles.textFallbackInput}
                                            placeholder="or type your own…"
                                            placeholderTextColor="rgba(255,255,255,0.5)"
                                            value={customHiText}
                                            onChangeText={setCustomHiText}
                                            editable={!isSendingText}
                                        />
                                        <Pressable
                                            style={[styles.textFallbackSendBtn, (!customHiText.trim() || isSendingText) && styles.textFallbackSendBtnDisabled]}
                                            onPress={() => handleOnboardingTextSend(customHiText)}
                                            disabled={!customHiText.trim() || isSendingText}
                                        >
                                            {isSendingText ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.textFallbackSendBtnText}>send</Text>}
                                        </Pressable>
                                    </View>
                                </View>
                            </SafeAreaView>
                        </View>
                    )}
                </View>

                {showConfetti && <ConfettiCannon count={200} origin={{ x: width / 2, y: 0 }} />}

                {step !== 'recording' && (
                    <InspirationModal
                        visible={showInspiration}
                        onClose={() => setShowInspiration(false)}
                        prompt="what's ur favorite word in this language? curse words count 😏"
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
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ec008b',
        justifyContent: 'center',
        padding: 24,
    },
    containerRecording: {
        justifyContent: 'flex-start',
        padding: 0,
        backgroundColor: 'transparent',
    },
    content: {
        alignItems: 'center',
        gap: 24,
    },
    contentRecording: {
        flex: 1,
        width: '100%',
        gap: 0,
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
    welcomeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    moreButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 173, 239, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 173, 239, 0.3)',
    },
    moreButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#00adef',
    },
    transitionCopy: {
        fontSize: 14,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    recordingStepContainer: {
        flex: 1,
        width: '100%',
    },
    recordingStepSafe: {
        flex: 1,
    },
    transitionCopyOverCard: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    skipForNowButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignSelf: 'center',
        marginBottom: 24,
    },
    skipForNowText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    textFallbackBlock: {
        marginTop: 8,
        marginBottom: 24,
        paddingHorizontal: 16,
        width: '100%',
    },
    textFallbackLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 10,
        textAlign: 'center',
    },
    textFallbackOptions: {
        gap: 8,
        marginBottom: 12,
    },
    textFallbackOption: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    textFallbackOptionText: {
        fontSize: 15,
        color: '#fff',
        textAlign: 'center',
    },
    textFallbackCustomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    textFallbackInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        fontSize: 15,
        color: '#fff',
    },
    textFallbackSendBtn: {
        backgroundColor: 'rgba(255,255,255,0.35)',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 12,
        justifyContent: 'center',
        minWidth: 56,
    },
    textFallbackSendBtnDisabled: {
        opacity: 0.5,
    },
    textFallbackSendBtnText: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '700',
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
