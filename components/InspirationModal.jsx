import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    teal: '#19b091',
    white: '#FFFFFF',
    dark: '#1a1a1a',
};

export function InspirationModal({ visible, onClose, metadata, language }) {
    const [activeTab, setActiveTab] = useState('phrase'); // 'phrase' | 'vocab'
    const [loading, setLoading] = useState(false);
    const [sound, setSound] = useState();

    const phrase = metadata?.starter_phrase;
    const vocabList = metadata?.vocab_bank || [];

    async function playAudio(text) {
        if (loading) return;
        setLoading(true);

        try {


            // 1. Get Audio URL
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: {
                    text: text,
                    task: 'pronunciation',
                    language: language || 'English',
                },
            });

            if (error) throw error;
            if (!data?.pronunciationUrl) throw new Error('No audio URL returned');



            // 1.5 Set Audio Mode (Force Speaker)
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            // 2. Play Sound
            const { sound } = await Audio.Sound.createAsync(
                { uri: data.pronunciationUrl },
                { shouldPlay: true }
            );
            setSound(sound);

            // Cleanup when done
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    sound.unloadAsync();
                }
            });

        } catch (err) {
            console.error('Audio playback error:', err);
            alert('Could not play audio. Try again.');
        } finally {
            setLoading(false);
        }
    }

    // Cleanup sound on unmount/close
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.modalView}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>💡 Inspiration Station</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={SOUP_COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'phrase' && styles.activeTab]}
                            onPress={() => setActiveTab('phrase')}
                        >
                            <Text style={[styles.tabText, activeTab === 'phrase' && styles.activeTabText]}>
                                Starter Phrase
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'vocab' && styles.activeTab]}
                            onPress={() => setActiveTab('vocab')}
                        >
                            <Text style={[styles.tabText, activeTab === 'vocab' && styles.activeTabText]}>
                                Vocab Bank
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.contentContainer}>
                        {activeTab === 'phrase' ? (
                            <View style={styles.phraseContainer}>
                                {phrase ? (
                                    <>
                                        <Text style={styles.phraseText}>"{phrase}"</Text>
                                        <TouchableOpacity
                                            style={styles.playButtonLarge}
                                            onPress={() => playAudio(phrase)}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="play" size={24} color="#FFF" />
                                                    <Text style={styles.playButtonText}>Listen</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <Text style={styles.emptyText}>No starter phrase available for this challenge.</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.vocabContainer}>
                                {vocabList.length > 0 ? (
                                    vocabList.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.vocabItem}
                                            onPress={() => playAudio(item.word)}
                                            disabled={loading}
                                        >
                                            <View>
                                                <Text style={styles.vocabWord}>{item.word}</Text>
                                                <Text style={styles.vocabTranslation}>{item.translation}</Text>
                                            </View>
                                            <Ionicons name="volume-medium" size={24} color={SOUP_COLORS.blue} />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>No vocabulary available.</Text>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalView: {
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        height: '50%', // Half-height sheet
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: SOUP_COLORS.white,
    },
    closeButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#333',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#444',
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
    },
    activeTabText: {
        color: SOUP_COLORS.white,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    phraseContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    phraseText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: SOUP_COLORS.white,
        textAlign: 'center',
        marginBottom: 24,
    },
    playButtonLarge: {
        flexDirection: 'row',
        backgroundColor: SOUP_COLORS.blue,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        gap: 8,
    },
    playButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    vocabContainer: {
        gap: 12,
    },
    vocabItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#333',
        padding: 16,
        borderRadius: 12,
    },
    vocabWord: {
        fontSize: 18,
        fontWeight: 'bold',
        color: SOUP_COLORS.white,
    },
    vocabTranslation: {
        fontSize: 14,
        color: '#AAA',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
});
