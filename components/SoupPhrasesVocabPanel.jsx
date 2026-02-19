/**
 * Inline phrases & vocab panel: same content as SoupPhrasesVocabModal but no modal, no record bar.
 * Renders above the chat input so the user can see phrases/vocab while using the main mic to record.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { X, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    text: '#2d3436',
    subtext: '#6B7280',
    dark: '#2A2A2A',
};

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
];

function LoadingFillBar({ complete }) {
    const widthAnim = useRef(new Animated.Value(0)).current;
    const ref = useRef(null);
    useEffect(() => {
        if (complete) {
            if (ref.current) ref.current.stop();
            Animated.timing(widthAnim, { toValue: 1, useNativeDriver: false, duration: 200 }).start();
            return;
        }
        widthAnim.setValue(0);
        const anim = Animated.timing(widthAnim, { toValue: 1, useNativeDriver: false, duration: 3000 });
        ref.current = anim;
        anim.start();
        return () => { anim.stop(); ref.current = null; };
    }, [complete]);
    const widthInterp = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={panelStyles.fillBarTrack}>
            <Animated.View style={[panelStyles.fillBarFill, { width: widthInterp }]} />
        </View>
    );
}

function RotatingMessage({ messages }) {
    const [index, setIndex] = useState(() => Math.floor(Math.random() * (messages?.length || 1)));
    useEffect(() => {
        if (!messages?.length) return;
        const id = setInterval(() => setIndex(Math.floor(Math.random() * messages.length)), 1800);
        return () => clearInterval(id);
    }, [messages?.length]);
    return <Text style={panelStyles.rotatingMessage} numberOfLines={1}>{messages?.[index] ?? messages?.[0] ?? 'loading…'}</Text>;
}

export function SoupPhrasesVocabPanel({
    visible,
    onClose,
    prompt,
    challengeId,
    userId,
    languages = [],
}) {
    const [hintsByLang, setHintsByLang] = useState({});
    const [loading, setLoading] = useState(false);
    const [ttsLoadingId, setTtsLoadingId] = useState(null);
    const [ttsLoadComplete, setTtsLoadComplete] = useState(false);
    const soundRef = useRef(null);

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
                supabase.functions.invoke('voice-feedback', {
                    body: { task: 'generate_hints', prompt: promptText, language: lang, challengeId, userId },
                }).then(({ data, error }) => {
                    if (error) throw error;
                    return { lang, data };
                })
            )
        )
            .then((results) => {
                const next = {};
                results.forEach(({ lang, data }) => {
                    if (data?.starter_phrase || data?.starter_phrases?.length > 0 || data?.vocab_bank?.length > 0) next[lang] = data;
                });
                setHintsByLang(next);
            })
            .catch((e) => console.warn('SoupPhrasesVocabPanel generate_hints:', e))
            .finally(() => setLoading(false));
    }, [visible, promptText, challengeId, userId, JSON.stringify(languages)]);

    useEffect(() => {
        if (!visible) {
            setTtsLoadingId(null);
            setTtsLoadComplete(false);
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }
        }
    }, [visible]);

    const playTts = useCallback(async (text, language, loadingId) => {
        if (!text?.trim()) return;
        setTtsLoadingId(loadingId ?? 'tts');
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
            setTimeout(() => { if (soundRef.current === sound) sound.playAsync().catch(() => {}); }, 300);
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

    if (!visible) return null;

    const langEntries = Object.entries(hintsByLang);

    return (
        <View style={panelStyles.wrap}>
            <View style={panelStyles.header}>
                <View style={panelStyles.headerRow}>
                    <Text style={panelStyles.headerTitle}>phrases & vocab</Text>
                    <Pressable onPress={onClose} style={({ pressed }) => [panelStyles.closeBtn, pressed && { opacity: 0.8 }]}>
                        <X size={22} color={SOUP_COLORS.text} />
                    </Pressable>
                </View>
                <Text style={panelStyles.hint}>tap phrases or vocab to hear pronunciation · use the mic below to record</Text>
            </View>
            <View style={panelStyles.questionBlock}>
                <Text style={panelStyles.questionText} numberOfLines={3}>{promptText}</Text>
            </View>
            <ScrollView style={panelStyles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={panelStyles.scrollContent}>
                {loading ? (
                    <View style={panelStyles.hintsLoadingBlock}>
                        <View style={panelStyles.hintsLoadingRow}>
                            <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                            <Text style={panelStyles.hintsLoadingText}>loading…</Text>
                        </View>
                        <RotatingMessage messages={HINTS_LOADING_MESSAGES} />
                        <LoadingFillBar complete={!loading} />
                    </View>
                ) : langEntries.length === 0 ? (
                    <Text style={panelStyles.emptyText}>no phrases for your languages right now. add more groups and try again.</Text>
                ) : (
                    langEntries.map(([lang, hints], langIdx) => {
                        const phrases = hints?.starter_phrases?.length
                            ? hints.starter_phrases.map((p) => ({ text: p.phrase, translation: p.translation }))
                            : hints?.starter_phrase ? [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }] : [];
                        const vocab = hints?.vocab_bank || [];
                        return (
                            <View key={lang} style={panelStyles.section}>
                                <Text style={panelStyles.sectionLabel}>{lang}</Text>
                                {phrases.length > 0 && (
                                    <View style={panelStyles.phraseBlock}>
                                        {phrases.map((item, i) => {
                                            const phraseId = `${lang}-${langIdx}-phrase-${i}`;
                                            const isLoading = ttsLoadingId === phraseId;
                                            return (
                                                <Pressable
                                                    key={i}
                                                    style={[panelStyles.phraseCard, isLoading && panelStyles.phraseCardActive]}
                                                    onPress={() => !isLoading && playTts(item.text, lang, phraseId)}
                                                    disabled={isLoading}
                                                >
                                                    <View style={panelStyles.phraseContent}>
                                                        <Text style={panelStyles.phraseText}>"{item.text}"</Text>
                                                        {item.translation ? <Text style={panelStyles.phraseTranslation}>{item.translation}</Text> : null}
                                                    </View>
                                                    <View style={panelStyles.playCircle}>
                                                        {isLoading ? <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} /> : <Volume2 size={22} color={SOUP_COLORS.turquoise} />}
                                                    </View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                                {vocab.length > 0 && (
                                    <View style={panelStyles.vocabRow}>
                                        {vocab.map((item, i) => {
                                            const word = item.target_term || item.word || '';
                                            const trans = item.english || item.translation || '';
                                            const vocabId = `${lang}-${langIdx}-vocab-${i}`;
                                            const isLoading = ttsLoadingId === vocabId;
                                            return (
                                                <Pressable
                                                    key={i}
                                                    style={[panelStyles.vocabPill, isLoading && panelStyles.vocabPillActive]}
                                                    onPress={() => !isLoading && word && playTts(word, lang, vocabId)}
                                                    disabled={isLoading}
                                                >
                                                    <Text style={panelStyles.vocabWord}>{word}</Text>
                                                    {trans ? <Text style={panelStyles.vocabTranslation}> · {trans}</Text> : null}
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
            {ttsLoadingId && (
                <View style={panelStyles.ttsLoadingSticky}>
                    <RotatingMessage messages={TTS_LOADING_MESSAGES} />
                    <LoadingFillBar complete={ttsLoadComplete} />
                </View>
            )}
        </View>
    );
}

const panelStyles = StyleSheet.create({
    wrap: {
        backgroundColor: SOUP_COLORS.cream,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        maxHeight: 320,
    },
    header: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    hint: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
    },
    closeBtn: { padding: 6 },
    questionBlock: {
        alignSelf: 'stretch',
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginHorizontal: 12,
        marginBottom: 10,
    },
    questionText: {
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 22,
        color: SOUP_COLORS.dark,
    },
    scroll: { maxHeight: 200 },
    scrollContent: { paddingBottom: 12, paddingHorizontal: 4 },
    hintsLoadingBlock: { paddingVertical: 12 },
    hintsLoadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 },
    hintsLoadingText: { color: SOUP_COLORS.subtext, fontSize: 12, fontWeight: '600' },
    rotatingMessage: { fontSize: 11, color: SOUP_COLORS.subtext, fontStyle: 'italic', marginBottom: 4 },
    fillBarTrack: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.12)' },
    fillBarFill: { height: '100%', borderRadius: 3, backgroundColor: SOUP_COLORS.turquoise },
    ttsLoadingSticky: { paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.08)' },
    emptyText: { fontSize: 13, color: SOUP_COLORS.subtext, textAlign: 'center', paddingVertical: 16 },
    section: { marginBottom: 12 },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: SOUP_COLORS.turquoise, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    phraseBlock: { marginBottom: 8 },
    phraseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 4,
        gap: 8,
    },
    phraseCardActive: { backgroundColor: 'rgba(0,173,239,0.12)' },
    phraseContent: { flex: 1, minWidth: 0 },
    phraseText: { fontSize: 13, fontWeight: '700', color: SOUP_COLORS.dark },
    phraseTranslation: { fontSize: 11, color: SOUP_COLORS.subtext, marginTop: 2 },
    playCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,173,239,0.15)', justifyContent: 'center', alignItems: 'center' },
    vocabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    vocabPillActive: { backgroundColor: 'rgba(0,173,239,0.12)' },
    vocabWord: { fontSize: 12, fontWeight: '700', color: SOUP_COLORS.dark },
    vocabTranslation: { fontSize: 10, color: SOUP_COLORS.subtext },
});
