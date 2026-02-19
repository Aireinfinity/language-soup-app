/**
 * Challenge Reply Sheet: tap challenge prompt → phrases/vocab + record + send.
 * Optional: "Also send to all my groups" (broadcast).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { X, Mic, Send, Volume2, Check } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { supabase } from '../lib/supabase';
import { uploadChallengeVoiceReply, uploadChallengeVoiceToGroups } from '../lib/uploadChallengeVoice';
import { haptics } from '../utils/haptics';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

const LANGUAGE_SOUP_GROUP_ID = '00000000-0000-0000-0000-000000000000';

export function ChallengeReplySheet({
    visible,
    onClose,
    challenge,
    currentGroupName = 'Language Soup',
    groupLanguage = 'English',
    userId,
}) {
    const insets = useSafeAreaInsets();
    const { height: winHeight } = useWindowDimensions();
    const [hints, setHints] = useState(null);
    const [hintsLoading, setHintsLoading] = useState(false);
    const [sendAlsoToAll, setSendAlsoToAll] = useState(false);
    const [sending, setSending] = useState(false);
    const [userGroups, setUserGroups] = useState([]); // { id, name, language } for "send to all"
    const [previewUri, setPreviewUri] = useState(null);
    const [previewDuration, setPreviewDuration] = useState(0);

    const {
        isRecording,
        recordingDuration,
        metering,
        startRecording,
        stopRecording,
    } = useVoiceRecorder();

    const promptText = (challenge?.prompt_text || '').replace(/^#challenge\s*\n?/i, '').trim() || 'Ready to Soup?';

    // Load hints from metadata or generate
    useEffect(() => {
        if (!visible || !challenge?.id) return;
        const meta = challenge.metadata;
        if (meta?.starter_phrase || meta?.starter_phrases?.length > 0 || meta?.vocab_bank?.length > 0) {
            setHints(meta);
            return;
        }
        setHintsLoading(true);
        supabase.functions
            .invoke('voice-feedback', {
                body: {
                    task: 'generate_hints',
                    prompt: promptText,
                    language: groupLanguage || 'English',
                    challengeId: challenge.id,
                    userId,
                },
            })
            .then(({ data, error }) => {
                if (error) throw error;
                if (data?.starter_phrase || data?.starter_phrases || data?.vocab_bank) setHints(data);
            })
            .catch((e) => console.warn('ChallengeReplySheet generate_hints:', e))
            .finally(() => setHintsLoading(false));
    }, [visible, challenge?.id, promptText, groupLanguage, userId]);

    // Load user's language groups for "also send to all"
    useEffect(() => {
        if (!visible || !userId) return;
        supabase
            .from('app_group_members')
            .select('group_id, app_groups(id, name, language)')
            .eq('user_id', userId)
            .then(({ data }) => {
                const list = (data || [])
                    .map((m) => m.app_groups)
                    .filter(Boolean)
                    .filter((g) => g.id && g.name !== 'DM' && !g.name?.toLowerCase().includes('support'));
                setUserGroups(list);
            });
    }, [visible, userId]);

    const playTts = useCallback(async (text) => {
        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { task: 'pronunciation', text, language: groupLanguage || 'English' },
            });
            if (error || !data?.pronunciationUrl) return;
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const { sound } = await Audio.Sound.createAsync({ uri: data.pronunciationUrl }, { shouldPlay: true });
            sound.setOnPlaybackStatusUpdate((s) => s.didJustFinish && sound.unloadAsync());
        } catch (e) {
            console.warn('TTS:', e);
        }
    }, [groupLanguage]);

    const handleStopRecording = useCallback(async () => {
        const result = await stopRecording();
        if (result?.uri) {
            setPreviewUri(result.uri);
            setPreviewDuration(result.duration ?? 0);
        }
    }, [stopRecording]);

    const handleSend = useCallback(async () => {
        if (!userId || !challenge?.id || !challenge?.group_id) return;
        const uri = previewUri || (isRecording ? null : undefined);
        if (!uri && isRecording) {
            const result = await stopRecording();
            if (!result?.uri) return;
            setPreviewUri(result.uri);
            setPreviewDuration(result.duration ?? 0);
            return;
        }
        if (!uri) return;
        const duration = previewDuration || 0;
        setSending(true);
        try {
            try { haptics.success(); } catch (_) {}
            await uploadChallengeVoiceReply({ uri, duration }, challenge, userId);
            if (sendAlsoToAll && userGroups.length > 0) {
                const others = userGroups.filter((g) => g.id !== challenge.group_id);
                if (others.length > 0) {
                    await uploadChallengeVoiceToGroups(
                        { uri, duration },
                        others.map((g) => ({ group_id: g.id, challenge_id: challenge.id })),
                        userId
                    );
                }
            }
            setPreviewUri(null);
            setPreviewDuration(0);
            onClose();
        } catch (e) {
            console.error('ChallengeReplySheet send:', e);
        } finally {
            setSending(false);
        }
    }, [userId, challenge, previewUri, previewDuration, sendAlsoToAll, userGroups, isRecording, stopRecording, onClose]);

    const discardPreview = useCallback(() => {
        setPreviewUri(null);
        setPreviewDuration(0);
        try { haptics.light(); } catch (_) {}
    }, []);

    if (!challenge) return null;

    const phrases = hints?.starter_phrases?.length
        ? hints.starter_phrases.map((p) => ({ text: p.phrase, translation: p.translation }))
        : hints?.starter_phrase
          ? [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }]
          : [];
    const vocab = hints?.vocab_bank || [];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
                <View style={[styles.sheet, { maxHeight: winHeight * 0.85 }]}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>challenge reply</Text>
                        <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}>
                            <X size={24} color={SOUP_COLORS.text} />
                        </Pressable>
                    </View>
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.promptBlock}>
                            <Text style={styles.promptText}>{promptText}</Text>
                            <Text style={styles.promptHint}>tap phrases or vocab to hear pronunciation</Text>
                        </View>
                        {hintsLoading ? (
                            <View style={styles.hintsLoading}>
                                <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                                <Text style={styles.hintsLoadingText}>loading phrases…</Text>
                            </View>
                        ) : (
                            <>
                                {phrases.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionLabel}>phrases</Text>
                                        {phrases.map((item, i) => (
                                            <Pressable
                                                key={i}
                                                style={({ pressed }) => [styles.phraseRow, pressed && { opacity: 0.9 }]}
                                                onPress={() => playTts(item.text)}
                                            >
                                                <Text style={styles.phraseText}>"{item.text}"</Text>
                                                {item.translation ? <Text style={styles.phraseTranslation}>{item.translation}</Text> : null}
                                                <Volume2 size={20} color={SOUP_COLORS.turquoise} />
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                {vocab.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionLabel}>vocab</Text>
                                        <View style={styles.vocabRow}>
                                            {vocab.map((item, i) => {
                                                const word = item.target_term || item.word || '';
                                                const trans = item.english || item.translation || '';
                                                return (
                                                    <Pressable
                                                        key={i}
                                                        style={({ pressed }) => [styles.vocabPill, pressed && { opacity: 0.9 }]}
                                                        onPress={() => word && playTts(word)}
                                                    >
                                                        <Text style={styles.vocabWord}>{word}</Text>
                                                        {trans ? <Text style={styles.vocabTranslation}> · {trans}</Text> : null}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Record / Preview / Send */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                        {isRecording && (
                            <View style={styles.recordRow}>
                                <LiveAudioWaveform metering={metering} barCount={24} />
                                <Text style={styles.recordTime}>{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</Text>
                                <Pressable style={styles.stopBtn} onPress={handleStopRecording}>
                                    <Text style={styles.stopBtnText}>done</Text>
                                </Pressable>
                            </View>
                        )}
                        {!isRecording && !previewUri && (
                            <Pressable
                                style={({ pressed }) => [styles.recordBtn, pressed && { opacity: 0.9 }]}
                                onPress={() => { try { haptics.light(); } catch (_) {} startRecording(); }}
                            >
                                <Mic size={24} color="#fff" />
                                <Text style={styles.recordBtnText}>tap to record</Text>
                            </Pressable>
                        )}
                        {!isRecording && previewUri && (
                            <>
                                <View style={styles.previewRow}>
                                    <Text style={styles.previewLabel}>ready to send</Text>
                                    <Pressable onPress={discardPreview} style={({ pressed }) => [styles.discardBtn, pressed && { opacity: 0.8 }]}>
                                        <Text style={styles.discardBtnText}>discard</Text>
                                    </Pressable>
                                </View>
                                <Pressable
                                    style={({ pressed }) => [styles.sendBtn, sending && styles.sendBtnDisabled, pressed && !sending && { opacity: 0.9 }]}
                                    onPress={handleSend}
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Send size={20} color="#fff" />
                                            <Text style={styles.sendBtnText}>send to {currentGroupName}</Text>
                                        </>
                                    )}
                                </Pressable>
                                {userGroups.length > 1 && (
                                    <Pressable
                                        style={({ pressed }) => [styles.alsoSendRow, pressed && { opacity: 0.9 }]}
                                        onPress={() => { try { haptics.light(); } catch (_) {} setSendAlsoToAll((v) => !v); }}
                                    >
                                        <View style={[styles.checkbox, sendAlsoToAll && styles.checkboxChecked]}>
                                            {sendAlsoToAll && <Check size={14} color="#fff" strokeWidth={3} />}
                                        </View>
                                        <Text style={styles.alsoSendText}>also send to all my groups</Text>
                                    </Pressable>
                                )}
                            </>
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
        paddingHorizontal: 16,
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
    closeBtn: {
        padding: 8,
    },
    scroll: {
        maxHeight: 320,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    promptBlock: {
        marginBottom: 16,
        padding: 14,
        backgroundColor: '#fff',
        borderRadius: 14,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.turquoise,
    },
    promptText: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        lineHeight: 22,
    },
    promptHint: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 6,
    },
    hintsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    hintsLoadingText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    phraseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 6,
    },
    phraseText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    phraseTranslation: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    vocabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    vocabWord: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    vocabTranslation: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    footer: {
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0,0,0,0.08)',
    },
    recordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    recordTime: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    stopBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12,
    },
    stopBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    recordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        backgroundColor: SOUP_COLORS.turquoise,
        borderRadius: 14,
    },
    recordBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    previewLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    discardBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    discardBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
    },
    sendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: SOUP_COLORS.green,
        borderRadius: 14,
    },
    sendBtnDisabled: {
        opacity: 0.7,
    },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    alsoSendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: SOUP_COLORS.subtext,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: SOUP_COLORS.turquoise,
        borderColor: SOUP_COLORS.turquoise,
    },
    alsoSendText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
});
