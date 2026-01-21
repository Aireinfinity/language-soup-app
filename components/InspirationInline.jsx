import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    pink: '#ec008b',
    blue: '#00adef',
    cream: '#FDF5E6',
};

export function InspirationInline({ metadata, language }) {
    console.log('🥣 [InspirationInline] Mounting with language:', language, typeof language);
    const [expanded, setExpanded] = useState(false);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    // Unload sound on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const handlePlay = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.replayAsync();
                    setIsPlaying(true);
                }
                return;
            }

            // Fetch audio if we don't have it
            if (!audioUrl) {
                setIsLoadingAudio(true);
                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: {
                        text: metadata.starter_phrase,
                        task: 'pronunciation',
                        language: language || 'French' // Default fallback
                    }
                });

                if (error || !data?.pronunciationUrl) {
                    throw new Error('Failed to generate audio');
                }
                setAudioUrl(data.pronunciationUrl);
                await playSound(data.pronunciationUrl);
            } else {
                await playSound(audioUrl);
            }
        } catch (error) {
            console.error('Audio playback error:', error);
            setIsLoadingAudio(false);
        }
    };

    const playSound = async (uri) => {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                (status) => {
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                    }
                }
            );
            setSound(newSound);
            setIsPlaying(true);
            setIsLoadingAudio(false);
        } catch (error) {
            console.error('Sound creation error:', error);
            setIsLoadingAudio(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Pink Trigger Button / Header */}
            <Pressable
                style={[styles.headerButton, expanded && styles.headerButtonExpanded]}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerEmoji}>🥣</Text>
                    <Text style={styles.headerText}>Need some ingredients?</Text>
                </View>
                {expanded ? <ChevronUp size={16} color="#fff" /> : <ChevronDown size={16} color="#fff" />}
            </Pressable>

            {/* Expanded Content */}
            {expanded && (
                <View style={styles.contentPanel}>
                    {/* Starter Phrase Section */}
                    <View style={styles.phraseContainer}>
                        <View style={styles.phraseTextContainer}>
                            <Text style={styles.label}>TRY SAYING:</Text>
                            <Text style={styles.phraseText}>"{metadata.starter_phrase}"</Text>
                        </View>
                        <Pressable
                            style={styles.playButton}
                            onPress={handlePlay}
                            disabled={isLoadingAudio}
                        >
                            {isLoadingAudio ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : isPlaying ? (
                                <Pause size={20} color="#fff" fill="#fff" />
                            ) : (
                                <Play size={20} color="#fff" fill="#fff" />
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.divider} />

                    {/* Vocab List */}
                    <View style={styles.vocabContainer}>
                        <Text style={styles.label}>USEFUL WORDS:</Text>
                        {metadata.vocab_bank && metadata.vocab_bank.map((item, index) => (
                            <View key={index} style={styles.vocabItem}>
                                <Text style={styles.vocabWord}>{item.word}</Text>
                                <Text style={styles.vocabTranslation}>({item.translation})</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        overflow: 'hidden',
    },
    headerButton: {
        backgroundColor: SOUP_COLORS.pink,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignSelf: 'flex-start',
        shadowColor: '#ec008b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 120,
    },
    headerButtonExpanded: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        width: '100%', // Expand to full width of bubble when open
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerEmoji: {
        fontSize: 14,
    },
    headerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    contentPanel: {
        backgroundColor: '#FFF0F5', // Light pink background
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(236, 0, 139, 0.1)',
        borderTopWidth: 0,
    },
    phraseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    phraseTextContainer: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        opacity: 0.7,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    phraseText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontStyle: 'italic',
    },
    playButton: {
        backgroundColor: SOUP_COLORS.pink,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginBottom: 12,
    },
    vocabContainer: {
        gap: 6,
    },
    vocabItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    vocabWord: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    vocabTranslation: {
        fontSize: 13,
        color: '#666',
    },
});
