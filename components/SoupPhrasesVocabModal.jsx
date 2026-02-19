/**
 * Language Soup tab: phrases and vocab for all of the user's languages.
 * Design matches ChallengeQueueCard: animated fill bar, rotating funny loading messages,
 * question block + phrase cards with play circle + vocab pills.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Volume2, Mic, Send, Play, Pause, Trash2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#6B7280',
    dark: '#2A2A2A',
};

// Same vibe as ChallengeQueueCard TTS loading
const TTS_LOADING_MESSAGES = [
    'how do u pronounce that again…',
    'wait what was the word',
    'one sec, finding the right accent',
    'loading the correct pronunciation (we hope)',
];

const HINTS_LOADING_MESSAGES = [
    'cooking up phrases…',
    'getting ingredients…',
    'one sec, mixing languages…',
    'stirring the soup…',
    'asking grandma for the recipe…',
    'haggling at the farmer\'s market…',
];

function loadTime(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function LoadingFillBar({ complete }) {
    const widthAnim = useRef(new Animated.Value(0)).current;
    const steadyAnimRef = useRef(null);

    useEffect(() => {
        if (complete) {
            if (steadyAnimRef.current) steadyAnimRef.current.stop();
            Animated.timing(widthAnim, { toValue: 1, useNativeDriver: false, duration: 200 }).start();
            return;
        }
        widthAnim.setValue(0);
        const anim = Animated.timing(widthAnim, {
            toValue: 1,
            useNativeDriver: false,
            duration: 3000,
        });
        steadyAnimRef.current = anim;
        anim.start();
        return () => {
            anim.stop();
            steadyAnimRef.current = null;
        };
    }, [complete]);

    const widthInterp = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={styles.fillBarTrack}>
            <Animated.View style={[styles.fillBarFill, { width: widthInterp }]} />
        </View>
    );
}

function RotatingMessage({ messages }) {
    const [index, setIndex] = useState(() => Math.floor(Math.random() * (messages?.length || 1)));
    useEffect(() => {
        if (!messages?.length) return;
        const id = setInterval(() => {
            setIndex(Math.floor(Math.random() * messages.length));
        }, 1800);
        return () => clearInterval(id);
    }, [messages?.length]);
    return (
        <Text style={styles.rotatingMessage} numberOfLines={1}>
            {messages?.[index] ?? messages?.[0] ?? 'loading…'}
        </Text>
    );
}

export function SoupPhrasesVocabModal({
    visible,
    onClose,
    prompt,
    challengeId,
    userId,
    languages = [],
    onSendRecording,
}) {
    const insets = useSafeAreaInsets();
    const { height: winHeight } = useWindowDimensions();
    const [hintsByLang, setHintsByLang] = useState({});
    const [loading, setLoading] = useState(false);
    const [ttsLoadingId, setTtsLoadingId] = useState(null);
    const [ttsLoadComplete, setTtsLoadComplete] = useState(false);
    const [recordedUri, setRecordedUri] = useState(null);
    const [recordedDuration, setRecordedDuration] = useState(0);
    const [sending, setSending] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [isPlayingPlayback, setIsPlayingPlayback] = useState(false);
    const soundRef = useRef(null);
    const playbackSoundRef = useRef(null);
    const { isRecording, recordingDuration, metering, stopRecording, startRecording } = useVoiceRecorder();

    const promptText = (prompt || '').replace(/^#challenge\s*\n?/i, '').trim() || 'Ready to Soup?';

    useEffect(() => {
        if (!visible || !promptText || !userId || !languages?.length) {
            if (!visible) setHintsByLang({});
            return;
        }
        setLoading(true);
        const langList = [...new Set(languages)].filter(Boolean);
        Promise.all(
            langList.map((lang) =>
                supabase.functions
                    .invoke('voice-feedback', {
                        body: {
                            task: 'generate_hints',
                            prompt: promptText,
                            language: lang,
                            challengeId,
                            userId,
                        },
                    })
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return { lang, data };
                    })
            )
        )
            .then((results) => {
                const next = {};
                results.forEach(({ lang, data }) => {
                    if (data?.starter_phrase || data?.starter_phrases?.length > 0 || data?.vocab_bank?.length > 0) {
                        next[lang] = data;
                    }
                });
                setHintsByLang(next);
            })
            .catch((e) => console.warn('SoupPhrasesVocabModal generate_hints:', e))
            .finally(() => setLoading(false));
    }, [visible, promptText, challengeId, userId, JSON.stringify(languages)]);

    useEffect(() => {
        if (!visible) {
            setTtsLoadingId(null);
            setTtsLoadComplete(false);
            setRecordedUri(null);
            setRecordedDuration(0);
            setPlaybackPosition(0);
            setPlaybackDuration(0);
            setIsPlayingPlayback(false);
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }
            if (playbackSoundRef.current) {
                playbackSoundRef.current.unloadAsync().catch(() => {});
                playbackSoundRef.current = null;
            }
        }
    }, [visible]);

    const handleRecordPress = useCallback(async () => {
        if (soundRef.current) {
            try { await soundRef.current.unloadAsync(); } catch (_) {}
            soundRef.current = null;
        }
        if (isRecording) {
            const result = await stopRecording();
            if (result?.uri) {
                setRecordedUri(result.uri);
                setRecordedDuration(result.duration ? Math.floor(result.duration / 1000) : Math.floor(recordingDuration));
            }
        } else {
            await startRecording();
        }
    }, [isRecording, stopRecording, startRecording, recordingDuration]);

    const handlePlayPausePlayback = useCallback(async () => {
        if (!recordedUri) return;
        try {
            if (playbackSoundRef.current) {
                if (isPlayingPlayback) {
                    await playbackSoundRef.current.pauseAsync();
                    setIsPlayingPlayback(false);
                } else {
                    if (playbackPosition >= playbackDuration && playbackDuration > 0) {
                        await playbackSoundRef.current.setPositionAsync(0);
                        setPlaybackPosition(0);
                    }
                    await playbackSoundRef.current.playAsync();
                    setIsPlayingPlayback(true);
                }
            } else {
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
                const { sound } = await Audio.Sound.createAsync(
                    { uri: recordedUri },
                    { shouldPlay: true, volume: 1.0 }
                );
                playbackSoundRef.current = sound;
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(status.positionMillis);
                        setPlaybackDuration(status.durationMillis);
                        setIsPlayingPlayback(status.isPlaying);
                        if (status.didJustFinish) {
                            setIsPlayingPlayback(false);
                            sound.setPositionAsync(0);
                            setPlaybackPosition(0);
                        }
                    }
                });
                setIsPlayingPlayback(true);
            }
        } catch (e) {
            console.warn('Playback:', e);
        }
    }, [recordedUri, isPlayingPlayback, playbackPosition, playbackDuration]);

    const handleDiscardRecording = useCallback(() => {
        setRecordedUri(null);
        setRecordedDuration(0);
        setPlaybackPosition(0);
        setPlaybackDuration(0);
        setIsPlayingPlayback(false);
        if (playbackSoundRef.current) {
            playbackSoundRef.current.unloadAsync().catch(() => {});
            playbackSoundRef.current = null;
        }
    }, []);

    const handleSendRecording = useCallback(async () => {
        if (!recordedUri || !onSendRecording) return;
        if (playbackSoundRef.current) {
            playbackSoundRef.current.unloadAsync().catch(() => {});
            playbackSoundRef.current = null;
        }
        setSending(true);
        try {
            await onSendRecording(recordedUri, recordedDuration);
            setRecordedUri(null);
            setRecordedDuration(0);
            setPlaybackPosition(0);
            setPlaybackDuration(0);
            onClose();
        } catch (e) {
            console.warn('Send recording:', e);
        } finally {
            setSending(false);
        }
    }, [recordedUri, recordedDuration, onSendRecording, onClose]);

    const playTts = useCallback(async (text, language, loadingId) => {
        if (!text?.trim()) return;
        const id = loadingId ?? 'tts';
        setTtsLoadingId(id);
        setTtsLoadComplete(false);
        try {
            if (soundRef.current) {
                try { await soundRef.current.unloadAsync(); } catch (_) {}
                soundRef.current = null;
            }
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { task: 'pronunciation', text: text.trim(), language: language || 'English' },
            });
            if (error || !data?.pronunciationUrl) {
                setTtsLoadingId(null);
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync({ uri: data.pronunciationUrl }, { shouldPlay: false });
            soundRef.current = sound;
            try { await sound.setRateAsync(0.65, true); } catch (_) {}
            setTtsLoadComplete(true);
            setTimeout(() => {
                if (soundRef.current === sound) sound.playAsync().catch(() => {});
            }, 300);
            sound.setOnPlaybackStatusUpdate((s) => {
                if (s.didJustFinish) {
                    setTtsLoadingId(null);
                    try { sound.unloadAsync(); } catch (_) {}
                    if (soundRef.current === sound) soundRef.current = null;
                }
            });
        } catch (e) {
            console.warn('TTS:', e);
            setTtsLoadingId(null);
        }
    }, []);

    const langEntries = Object.entries(hintsByLang);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
                <View style={[styles.sheet, { maxHeight: winHeight * 0.85 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>phrases & vocab</Text>
                        <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}>
                            <X size={24} color={SOUP_COLORS.text} />
                        </Pressable>
                    </View>

                    {/* Question block – same style as ChallengeQueueCard */}
                    <View style={styles.questionBlock}>
                        <Text style={styles.questionText} numberOfLines={3}>{promptText}</Text>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {loading ? (
                            <View style={styles.hintsLoadingBlock}>
                                <View style={styles.hintsLoadingRow}>
                                    <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                                    <Text style={styles.hintsLoadingText}>loading…</Text>
                                </View>
                                <RotatingMessage messages={HINTS_LOADING_MESSAGES} />
                                <LoadingFillBar complete={!loading} />
                            </View>
                        ) : langEntries.length === 0 ? (
                            <Text style={styles.emptyText}>no phrases for your languages right now. add more groups and try again.</Text>
                        ) : (
                            <>
                                {langEntries.map(([lang, hints], langIdx) => {
                                    const phrases = hints?.starter_phrases?.length
                                        ? hints.starter_phrases.map((p) => ({ text: p.phrase, translation: p.translation }))
                                        : hints?.starter_phrase
                                          ? [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }]
                                          : [];
                                    const vocab = hints?.vocab_bank || [];
                                    return (
                                        <View key={lang} style={styles.section}>
                                            <Text style={styles.sectionLabel}>{lang}</Text>
                                            {phrases.length > 0 && (
                                                <View style={styles.phraseBlock}>
                                                    {phrases.map((item, i) => {
                                                        const phraseId = `${lang}-${langIdx}-phrase-${i}`;
                                                        const isLoading = ttsLoadingId === phraseId;
                                                        return (
                                                            <Pressable
                                                                key={i}
                                                                style={[
                                                                    styles.phraseCard,
                                                                    isLoading && styles.phraseCardActive,
                                                                ]}
                                                                onPress={() => !isLoading && playTts(item.text, lang, phraseId)}
                                                                disabled={isLoading}
                                                            >
                                                                <View style={styles.phraseContent}>
                                                                    <Text style={styles.phraseText}>"{item.text}"</Text>
                                                                    {item.translation ? (
                                                                        <Text style={styles.phraseTranslation}>{item.translation}</Text>
                                                                    ) : null}
                                                                </View>
                                                                <View style={styles.playCircle}>
                                                                    {isLoading ? (
                                                                        <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                                                                    ) : (
                                                                        <Volume2 size={24} color={SOUP_COLORS.turquoise} />
                                                                    )}
                                                                </View>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                            {vocab.length > 0 && (
                                                <View style={styles.vocabRow}>
                                                    {vocab.map((item, i) => {
                                                        const word = item.target_term || item.word || '';
                                                        const trans = item.english || item.translation || '';
                                                        const vocabId = `${lang}-${langIdx}-vocab-${i}`;
                                                        const isLoading = ttsLoadingId === vocabId;
                                                        return (
                                                            <Pressable
                                                                key={i}
                                                                style={[styles.vocabPill, isLoading && styles.vocabPillActive]}
                                                                onPress={() => !isLoading && word && playTts(word, lang, vocabId)}
                                                                disabled={isLoading}
                                                            >
                                                                <Text style={styles.vocabWord}>{word}</Text>
                                                                {trans ? <Text style={styles.vocabTranslation}> · {trans}</Text> : null}
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>

                    {/* Sticky TTS loading: every time they tap a phrase/vocab */}
                    {ttsLoadingId && (
                        <View style={[styles.ttsLoadingSticky, { paddingBottom: insets.bottom + 8 }]}>
                            <RotatingMessage messages={TTS_LOADING_MESSAGES} />
                            <LoadingFillBar complete={ttsLoadComplete} />
                        </View>
                    )}

                    {/* Record bar: ChallengeQueueCard-style mic + waveform, then listen back + send/discard */}
                    <View style={[styles.recordBar, { paddingBottom: insets.bottom + 12 }]}>
                        {!recordedUri ? (
                            <View style={styles.recordZone}>
                                {isRecording && (
                                    <View style={styles.waveformWrap}>
                                        <LiveAudioWaveform
                                            metering={metering}
                                            recordingDuration={recordingDuration}
                                            isRecording={isRecording}
                                            color={SOUP_COLORS.turquoise}
                                        />
                                        <Text style={styles.timerText}>{loadTime(recordingDuration)}</Text>
                                    </View>
                                )}
                                <Pressable
                                    style={({ pressed }) => [styles.micButton, isRecording && styles.micButtonRecording, pressed && { opacity: 0.9 }]}
                                    onPress={handleRecordPress}
                                >
                                    {isRecording ? (
                                        <View style={styles.stopIcon} />
                                    ) : (
                                        <Mic size={32} color={SOUP_COLORS.turquoise} />
                                    )}
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.listenBackRow}>
                                <View style={styles.playbackRow}>
                                    <Pressable onPress={handlePlayPausePlayback} style={styles.playPauseBtn}>
                                        {isPlayingPlayback ? (
                                            <Pause size={26} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} />
                                        ) : (
                                            <Play size={26} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} style={{ marginLeft: 2 }} />
                                        )}
                                    </Pressable>
                                    <View style={styles.playbackProgress}>
                                        <View style={[styles.playbackFill, { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` }]} />
                                    </View>
                                    <Text style={styles.playbackTime}>
                                        {loadTime(playbackDuration ? playbackPosition / 1000 : 0)} / {loadTime(recordedDuration)}
                                    </Text>
                                </View>
                                <Text style={styles.sendLabel}>listen back, then send to Language Soup</Text>
                                <View style={styles.sendDiscardRow}>
                                    <Pressable
                                        style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                                        onPress={handleSendRecording}
                                        disabled={sending}
                                    >
                                        {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                                        <Text style={styles.sendBtnText}>send</Text>
                                    </Pressable>
                                    <Pressable onPress={handleDiscardRecording} style={styles.discardBtn}>
                                        <Trash2 size={20} color={SOUP_COLORS.pink} />
                                        <Text style={styles.discardBtnText}>discard</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 14,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    closeBtn: { padding: 8 },
    questionBlock: {
        alignSelf: 'stretch',
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        marginBottom: 14,
    },
    questionText: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
        color: SOUP_COLORS.dark,
        letterSpacing: -0.2,
    },
    scroll: { maxHeight: 420 },
    scrollContent: { paddingBottom: 24 },
    hintsLoadingBlock: {
        paddingVertical: 16,
    },
    hintsLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    hintsLoadingText: {
        color: SOUP_COLORS.subtext,
        fontSize: 12,
        fontWeight: '600',
    },
    rotatingMessage: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        marginBottom: 6,
    },
    fillBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.12)',
    },
    fillBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.turquoise,
    },
    ttsLoadingBlock: {
        marginTop: 16,
        marginBottom: 8,
    },
    ttsLoadingSticky: {
        paddingTop: 10,
        paddingHorizontal: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.08)',
        backgroundColor: SOUP_COLORS.cream,
    },
    recordBar: {
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.08)',
        backgroundColor: SOUP_COLORS.cream,
    },
    recordZone: {
        alignItems: 'center',
        gap: 12,
    },
    waveformWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 10,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.dark,
    },
    micButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0,173,239,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButtonRecording: {
        backgroundColor: SOUP_COLORS.pink,
    },
    stopIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    listenBackRow: {
        gap: 10,
    },
    playbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    playPauseBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,173,239,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playbackProgress: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.12)',
        overflow: 'hidden',
    },
    playbackFill: {
        height: '100%',
        backgroundColor: SOUP_COLORS.turquoise,
        borderRadius: 3,
    },
    playbackTime: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        minWidth: 72,
        textAlign: 'right',
    },
    sendDiscardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sendLabel: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginBottom: 4,
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: SOUP_COLORS.turquoise,
        borderRadius: 14,
    },
    sendBtnDisabled: { opacity: 0.7 },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    discardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    discardBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
    },
    emptyText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        paddingVertical: 24,
    },
    section: { marginBottom: 18 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: SOUP_COLORS.turquoise,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    phraseBlock: { marginBottom: 10 },
    phraseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 6,
        gap: 10,
    },
    phraseCardActive: {
        backgroundColor: 'rgba(0,173,239,0.12)',
    },
    phraseContent: { flex: 1, minWidth: 0 },
    phraseText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.dark,
    },
    phraseTranslation: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    playCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,173,239,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vocabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    vocabPillActive: {
        backgroundColor: 'rgba(0,173,239,0.12)',
    },
    vocabWord: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.dark,
    },
    vocabTranslation: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
    },
});
