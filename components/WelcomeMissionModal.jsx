import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Text, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { Mic, Check, X, Globe } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/Colors';
import { haptics } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
};

export default function WelcomeMissionModal({ visible, onClose, groups }) {
    const { user } = useAuth();
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, [recording]);

    const startRecording = async () => {
        try {
            haptics.heavy();
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Microphone permission is required!');
                return;
            }

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

        } catch (err) {
            console.error('Failed to start recording', err);
            // If it failed with "Only one Recording object", try a global cleanup
            // though expo-av doesn't have a static "unloadAll" easy access.
            Alert.alert('Error', 'Could not start microphone. If this persists, please restart the app!');
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
            const ext = 'm4a';
            const fileName = `language-chat/${user.id}/welcome_${Date.now()}.${ext}`;
            const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

            const { error: uploadError } = await supabase.storage
                .from('voice-memos')
                .upload(fileName, decode(audioData), { contentType: 'audio/m4a' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);

            // 2. Save Message with 'global-welcome' tag
            // We'll save it for ALL groups the user is in to populate the pool
            const messagePromises = groups.map(group => {
                return supabase
                    .from('app_messages')
                    .insert({
                        sender_id: user.id,
                        group_id: group.id,
                        message_type: 'voice',
                        content: `Welcome to Language Soup! 👋`,
                        media_url: publicUrl,
                        challenge_id: 'global-welcome',
                        metadata: {
                            type: 'voice',
                            is_greeting: true
                        }
                    });
            });

            await Promise.all(messagePromises);

            // SUCCESS!
            setShowConfetti(true);
            haptics.success();

            setTimeout(() => {
                setShowConfetti(false);
                onClose();
            }, 2500);

        } catch (err) {
            console.error('Failed to send welcome message', err);
            Alert.alert('Error', 'Failed to upload. Please try again!');
            setIsUploading(false);
        } finally {
            setRecording(null);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <X size={24} color="#636e72" />
                    </Pressable>

                    <View style={styles.header}>
                        <Globe size={40} color={SOUP_COLORS.pink} />
                        <Text style={styles.title}>Welcome the World!</Text>
                        <Text style={styles.subtitle}>
                            Record a short "Welcome to Language Soup!" in your target or native language. 🌍
                        </Text>
                    </View>

                    <View style={styles.missionCard}>
                        <Text style={styles.missionText}>
                            "Hola, bienvenidos a Language Soup!" 🥣
                        </Text>
                        <Text style={styles.hintText}>
                            Your voice will be played to new users when they join!
                        </Text>
                    </View>

                    <View style={styles.controlContainer}>
                        {isUploading ? (
                            <ActivityIndicator size="large" color={SOUP_COLORS.pink} />
                        ) : (
                            <View style={styles.recordRow}>
                                <Pressable
                                    style={[
                                        styles.recordButton,
                                        isRecording && styles.recordingActive
                                    ]}
                                    onPressIn={startRecording}
                                    onPressOut={stopRecordingAndSend}
                                >
                                    <Mic size={40} color="#fff" />
                                </Pressable>
                                <Text style={styles.instruction}>
                                    {isRecording ? 'Release to Send' : 'Hold to Record'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {showConfetti && <ConfettiCannon count={100} origin={{ x: width / 2, y: 0 }} />}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#2d3436',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 22,
    },
    missionCard: {
        backgroundColor: 'rgba(236, 0, 139, 0.05)',
        padding: 24,
        borderRadius: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.1)',
        marginBottom: 32,
    },
    missionText: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 26,
    },
    hintText: {
        fontSize: 13,
        color: '#b2bec3',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '600',
    },
    controlContainer: {
        alignItems: 'center',
        gap: 16,
    },
    recordRow: {
        alignItems: 'center',
        gap: 12,
    },
    recordButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: SOUP_COLORS.pink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    recordingActive: {
        backgroundColor: '#ff4757',
        transform: [{ scale: 1.1 }],
    },
    instruction: {
        fontSize: 15,
        fontWeight: '700',
        color: '#636e72',
    }
});
