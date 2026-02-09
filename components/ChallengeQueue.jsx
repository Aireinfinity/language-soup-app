import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert, SafeAreaView, Image } from 'react-native';
import { ChallengeQueueCard } from './ChallengeQueueCard';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Check } from 'lucide-react-native';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    dark: '#2A2A2A',
};

const SOUP_PHRASES = [
    "Good Soup 🥣",
    "Get Soupy 🌊",
    "Soupers 🦸", // Corrected per user feedback
    "Mmm... Soup 🍲",
    "Soup's On! 🔔",
    "Hot Soup 🍜",
    "Soup-er Star ⭐",
    "Just Soup It 🥄"
];

const getRandomPhrase = () => SOUP_PHRASES[Math.floor(Math.random() * SOUP_PHRASES.length)];

const getGroupColor = (groupName) => {
    if (!groupName) return '#00ADEF';
    const name = groupName.toLowerCase();

    // High Contrast Colors for White Text
    if (name.includes('spanish')) return '#FF6B6B'; // Soft Red
    if (name.includes('french')) return '#4DA6FF'; // Soft Blue
    if (name.includes('hungarian')) return '#2ECC71'; // Emerald Green
    if (name.includes('german')) return '#F39C12'; // Orange
    if (name.includes('japanese')) return '#E91E63'; // Darker Pink (Magical) instead of light pink
    if (name.includes('italian')) return '#00B894'; // Teal
    if (name.includes('portuguese')) return '#E17055'; // Terracotta

    return '#00ADEF'; // Default Turquoise
};

export function ChallengeQueue({ visible, challenges, onComplete, userId }) {
    const [currentIndex, setCurrentIndex] = useState(-1); // -1 = Start Screen
    const [loading, setLoading] = useState(false);
    const [buttonPhrase] = useState(getRandomPhrase()); // Stable phrase per session

    if (!visible) return null;

    const handleStart = () => {
        setCurrentIndex(0);
    };

    const handleSend = async (audioResult) => {
        const currentChallenge = challenges[currentIndex];
        if (!currentChallenge || !audioResult?.uri) return;

        setLoading(true);
        try {


            const { uri, duration } = audioResult;

            // 1. Upload Logic
            const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

            const fileName = `language-chat/${userId}/voice_challenge_${currentChallenge.id}_${Date.now()}.m4a`;

            const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);

            // 2. Insert Message
            const { error: insertError } = await supabase.from('app_messages').insert({
                sender_id: userId,
                group_id: currentChallenge.group_id,
                challenge_id: currentChallenge.id,
                message_type: 'voice',
                media_url: publicUrl,
                duration_seconds: Math.max(1, Math.floor(duration / 1000)), // Ensure at least 1s to prevent "0s" glitch
                content: ''
            });

            if (insertError) throw insertError;

            // 3. Next Card
            if (currentIndex < challenges.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCurrentIndex(challenges.length); // Completed State
            }

        } catch (error) {
            console.error('Queue Send Error:', error);
            Alert.alert('Error', 'Failed to send soup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Optional: Mark as skipped? For now, just move on
        if (currentIndex < challenges.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setCurrentIndex(challenges.length);
        }
    };

    // RENDER START SCREEN
    if (currentIndex === -1) {
        return (
            <Modal visible={visible} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.centerContent}>
                        <Image
                            source={require('../assets/ls-icon-bowl.png')}
                            style={styles.startImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.startTitle}>mmm good soup 🥣</Text>
                        <Text style={styles.startSubtitle}>New challenges dropped</Text>

                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>{challenges.length} Pending</Text>
                        </View>

                        <Pressable onPress={handleStart} style={styles.whiteButton}>
                            <Text style={styles.whiteButtonText}>Start</Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    // RENDER COMPLETION SCREEN
    if (currentIndex >= challenges.length) {
        return (
            <Modal visible={visible} animationType="fade" transparent={false}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.centerContent}>
                        <View style={styles.successIcon}>
                            <Check size={60} color="white" />
                        </View>
                        <Text style={styles.startTitle}>All caught up!</Text>
                        <Text style={styles.startSubtitle}>Good Soup.</Text>

                        <Pressable onPress={onComplete} style={styles.whiteButton}>
                            <Text style={styles.whiteButtonText}>{buttonPhrase}</Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    // RENDER ACTIVE CARD
    const currentChallenge = challenges[currentIndex];

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={[styles.container, { backgroundColor: getGroupColor(currentChallenge.group_name) }]}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    {challenges.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.progressDot,
                                idx === currentIndex && styles.progressActive,
                                idx < currentIndex && styles.progressDone
                            ]}
                        />
                    ))}
                </View>

                <ChallengeQueueCard
                    key={currentChallenge.id} // Forces reset when card changes
                    challenge={currentChallenge}
                    groupName={currentChallenge.group_name}
                    onSend={handleSend}
                    loading={loading}
                />

                {/* Skip Button (Optional, discreet) */}
                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#00ADEF', // Default Turquoise background for Immersive Mode
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    startImage: {
        width: 140,
        height: 140,
        marginBottom: 24,
    },
    startTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: SOUP_COLORS.dark,
        marginBottom: 8,
        textAlign: 'center',
    },
    startSubtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    pendingBadge: {
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 40,
    },
    pendingText: {
        color: '#FF3B30',
        fontWeight: '700',
    },
    startButton: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: SOUP_COLORS.turquoise,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    whiteButton: {
        backgroundColor: 'white',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 32,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    whiteButtonText: {
        color: SOUP_COLORS.turquoise, // Or dynamic? Keep it turquoise for brand
        fontSize: 20,
        fontWeight: '800',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DDD',
    },
    progressActive: {
        backgroundColor: SOUP_COLORS.turquoise,
        width: 20,
    },
    progressDone: {
        backgroundColor: SOUP_COLORS.pink,
    },
    skipButton: {
        alignSelf: 'center',
        padding: 16,
    },
    skipText: {
        color: 'rgba(255, 255, 255, 0.6)', // Lighter for immersive
        fontSize: 14,
        fontWeight: '600',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    }
});
