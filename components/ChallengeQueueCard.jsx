import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Mic, Play, Pause, Trash2, Send, Volume2, Shuffle } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    dark: '#2A2A2A',
    subtext: '#6B7280',
};

const WAVEFORM_BARS = 30;

const TTS_LOADING_MESSAGES = [
    'how do u pronounce that again…',
    'wait what was the word',
    'one sec, finding the right accent',
    'loading the correct pronunciation (we hope)',
];

function TtsLoadingFillBar({ isLightBackground, complete }) {
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
    const trackColor = isLightBackground ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.25)';
    const fillColor = isLightBackground ? '#141414' : '#fff';

    return (
        <View style={[styles.ttsFillBarTrack, { backgroundColor: trackColor }]}>
            <Animated.View style={[styles.ttsFillBarFill, { backgroundColor: fillColor, width: widthInterp }]} />
        </View>
    );
}

function TtsLoadingMessage({ isLightBackground }) {
    const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * TTS_LOADING_MESSAGES.length));
    useEffect(() => {
        const id = setInterval(() => {
            setMessageIndex(Math.floor(Math.random() * TTS_LOADING_MESSAGES.length));
        }, 1800);
        return () => clearInterval(id);
    }, []);
    return (
        <Text style={[styles.ttsLoadingMessage, isLightBackground && styles.textOnLight]} numberOfLines={1}>
            {TTS_LOADING_MESSAGES[messageIndex]}
        </Text>
    );
}

function loadTime(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function ChallengeQueueCard({
    challenge,
    onSend,
    loading,
    groupName,
    groupLanguage,
    isLightBackground = false,
    currentCardIdRef,
    onBack: onBackProp,
    onSkip: onSkipProp,
    navLabel: navLabelProp,
    navTextColor: navTextColorProp,
    embedOnBack,
    embedOnSkip,
    embedNavLabel,
    embedNavTextColor,
}) {
    const onBack = onBackProp ?? embedOnBack;
    const onSkip = onSkipProp ?? embedOnSkip;
    const navLabel = navLabelProp ?? embedNavLabel;
    const navTextColor = navTextColorProp ?? embedNavTextColor;
    const insets = useSafeAreaInsets();
    const { isRecording, recordingDuration, metering, startRecording, stopRecording } = useVoiceRecorder();

    const [recordedUri, setRecordedUri] = useState(null);
    const [finalDuration, setFinalDuration] = useState(0);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const ttsSoundRef = useRef(null);
    const playbackSoundRef = useRef(null);
    const lastTtsRequestRef = useRef(null);
    const currentChallengeIdRef = useRef(challenge?.id);
    currentChallengeIdRef.current = challenge?.id;

    const [audioCache, setAudioCache] = useState({});

    const initialHints = (() => {
        const meta = challenge?.metadata;
        if (!meta?.starter_phrase) return null;
        const wordCount = (meta.starter_phrase || '').trim().split(/\s+/).length;
        if (wordCount > 10) return null;
        return meta;
    })();
    const [hints, setHints] = useState(initialHints);
    const [hintsLoading, setHintsLoading] = useState(false);
    const [refreshingHints, setRefreshingHints] = useState(false);

    const normalizeTtsText = (t) => {
        if (t == null || typeof t !== 'string') return '';
        let s = t.trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
        return s.replace(/\u200B|\u200C|\u200D|\uFEFF/g, '').trim() || '';
    };

    const getTtsLanguageCode = (displayLang) => {
        if (!displayLang || typeof displayLang !== 'string') return undefined;
        const lang = displayLang.toLowerCase();
        if (lang.includes('farsi') || lang.includes('persian')) return 'fa';
        if (lang.includes('spanish')) return 'es';
        if (lang.includes('french')) return 'fr';
        if (lang.includes('portuguese')) return 'pt';
        if (lang.includes('italian')) return 'it';
        if (lang.includes('german')) return 'de';
        if (lang.includes('russian')) return 'ru';
        if (lang.includes('arabic')) return 'ar';
        if (lang.includes('japanese')) return 'ja';
        if (lang.includes('korean')) return 'ko';
        if (lang.includes('mandarin') || lang.includes('chinese')) return 'zh';
        if (lang.includes('hindi')) return 'hi';
        if (lang.includes('dutch')) return 'nl';
        if (lang.includes('turkish')) return 'tr';
        if (lang.includes('english') || lang === 'en') return 'en';
        if (lang.length === 2) return lang;
        return undefined;
    };

    const prefetchAudio = async (text) => {
        const normalized = normalizeTtsText(text);
        if (!normalized || audioCache[normalized]) return;
        const cardLang = groupLanguage || groupName || 'Multilingual';
        if (getTtsLanguageCode(cardLang) && getTtsLanguageCode(cardLang) !== 'en') return;
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text: normalized, task: 'pronunciation', language: cardLang },
            });
            if (data?.pronunciationUrl) {
                setAudioCache((prev) => ({ ...prev, [normalized]: data.pronunciationUrl }));
            }
        } catch (_) {}
    };

    useEffect(() => {
        const challengeId = challenge?.id;
        const meta = challenge?.metadata;
        const hasPhrases =
            meta?.starter_phrases?.length > 0 ||
            (meta?.starter_phrase && (meta.starter_phrase || '').trim().split(/\s+/).length <= 10);
        if (hasPhrases) {
            setHints(meta);
            setHintsLoading(false);
            if (meta.starter_phrases?.length) {
                meta.starter_phrases.forEach((p) => p?.phrase && prefetchAudio(p.phrase));
            } else if (meta.starter_phrase) {
                prefetchAudio(meta.starter_phrase);
            }
            return;
        }

        setHints(null);
        setHintsLoading(true);

        const generate = async () => {
            const promptText = challenge?.prompt_text;
            if (!promptText) {
                if (currentChallengeIdRef.current === challengeId) setHintsLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: {
                        task: 'generate_hints',
                        prompt: promptText,
                        language: groupName || 'Target Language',
                        challengeId,
                    },
                });
                if (error) throw error;
                if (currentChallengeIdRef.current !== challengeId) return;
                if (data?.starter_phrases?.length || data?.starter_phrase) {
                    setHints(data);
                    await supabase.from('app_challenges').update({ metadata: data }).eq('id', challengeId);
                    if (data.starter_phrases?.length) {
                        data.starter_phrases.forEach((p) => p?.phrase && prefetchAudio(p.phrase));
                    } else if (data.starter_phrase) {
                        prefetchAudio(data.starter_phrase);
                    }
                }
            } catch (e) {
                if (currentChallengeIdRef.current === challengeId) console.error('Hint generation error:', e);
            } finally {
                if (currentChallengeIdRef.current === challengeId) setHintsLoading(false);
            }
        };
        generate();
    }, [challenge?.id]);

    const refreshHintsForSession = async () => {
        const promptText = challenge?.prompt_text;
        if (!promptText || refreshingHints || hintsLoading) return;
        const challengeId = challenge?.id;
        setRefreshingHints(true);
        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: {
                    task: 'generate_hints',
                    prompt: promptText,
                    language: groupName || 'Target Language',
                    challengeId,
                    variation: true,
                },
            });
            if (error) throw error;
            if (currentChallengeIdRef?.current !== challengeId) return;
            if (data?.starter_phrases?.length || data?.starter_phrase) {
                setHints(data);
                if (data.starter_phrases?.length) {
                    data.starter_phrases.forEach((p) => p?.phrase && prefetchAudio(p.phrase));
                } else if (data.starter_phrase) {
                    prefetchAudio(data.starter_phrase);
                }
            }
        } catch (e) {
            if (currentChallengeIdRef?.current === challengeId) console.error('Refresh hints error:', e);
        } finally {
            if (currentChallengeIdRef?.current === challengeId) setRefreshingHints(false);
        }
    };

    const [speakingWord, setSpeakingWord] = useState(null);
    const [ttsLoadComplete, setTtsLoadComplete] = useState(false);

    const playTts = async (text) => {
        if (text == null || typeof text !== 'string') return;
        const normalized = normalizeTtsText(text);
        if (!normalized) return;

        if (ttsSoundRef.current) {
            try {
                await ttsSoundRef.current.unloadAsync();
            } catch (_) {}
            ttsSoundRef.current = null;
        }
        if (sound) {
            try {
                await sound.stopAsync();
                await sound.unloadAsync();
            } catch (_) {}
            playbackSoundRef.current = null;
            setSound(null);
            setIsPlaying(false);
        }
        Speech.stop();
        lastTtsRequestRef.current = normalized;
        setSpeakingWord(normalized);
        setTtsLoadComplete(false);

        const cardLanguage = groupLanguage || groupName || 'Multilingual';
        const isoCode = getTtsLanguageCode(cardLanguage);
        const useExpoForPronunciation = isoCode != null && isoCode !== 'en';

        const playUrl = async (url) => {
            if (lastTtsRequestRef.current !== normalized) return;
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
            });
            const { sound: s } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true, volume: 1.0 });
            if (lastTtsRequestRef.current !== normalized) {
                s.unloadAsync().catch(() => {});
                return;
            }
            try {
                await s.setRateAsync(0.85, true);
            } catch (_) {}
            ttsSoundRef.current = s;
            setTtsLoadComplete(true);
            s.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    if (lastTtsRequestRef.current === normalized) setSpeakingWord(null);
                    s.unloadAsync().catch(() => {});
                    ttsSoundRef.current = null;
                }
            });
        };

        const fallbackSpeech = () => {
            Speech.speak(normalized, {
                language: isoCode,
                rate: 0.85,
                onDone: () => {
                    if (lastTtsRequestRef.current === normalized) setSpeakingWord(null);
                },
                onStopped: () => setSpeakingWord(null),
                onError: () => setSpeakingWord(null),
            });
            setTtsLoadComplete(true);
        };

        if (useExpoForPronunciation) {
            fallbackSpeech();
            return;
        }

        const cachedUrl = audioCache[normalized];
        if (cachedUrl && lastTtsRequestRef.current === normalized) {
            playUrl(cachedUrl).catch(() => fallbackSpeech());
            return;
        }
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text: normalized, task: 'pronunciation', language: cardLanguage },
            });
            if (data?.pronunciationUrl) {
                setAudioCache((prev) => ({ ...prev, [normalized]: data.pronunciationUrl }));
                await playUrl(data.pronunciationUrl);
            } else {
                fallbackSpeech();
            }
        } catch (_) {
            fallbackSpeech();
        }
    };

    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [barHeights] = useState(() => Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3));

    const waveformLayout = useRef({ width: 0 });

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync().catch(() => {});
                playbackSoundRef.current = null;
            }
        };
    }, [sound]);

    useEffect(() => {
        return () => {
            const tts = ttsSoundRef.current;
            if (tts) {
                tts.unloadAsync().catch(() => {});
                ttsSoundRef.current = null;
            }
            const playback = playbackSoundRef.current;
            if (playback) {
                playback.unloadAsync().catch(() => {});
                playbackSoundRef.current = null;
            }
            Speech.stop();
            lastTtsRequestRef.current = null;
        };
    }, []);

    const handleRecordPress = async () => {
        if (ttsSoundRef.current) {
            await ttsSoundRef.current.unloadAsync();
            ttsSoundRef.current = null;
        }
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
            setIsPlaying(false);
        }

        if (isRecording) {
            const fallbackDuration = recordingDuration;
            const result = await stopRecording();
            if (result?.uri) {
                setRecordedUri(result.uri);
                const actualDurationMs = result.duration > 0 ? result.duration : fallbackDuration * 1000;
                setFinalDuration(actualDurationMs / 1000);
                setPlaybackDuration(actualDurationMs);
            }
        } else {
            await startRecording();
        }
    };

    const handlePlayPause = async () => {
        if (!recordedUri) return;
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    if (playbackPosition >= playbackDuration && playbackDuration > 0) {
                        await sound.setPositionAsync(0);
                    }
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: false,
                });
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: recordedUri },
                    { shouldPlay: true, volume: 1.0 }
                );
                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded) {
                        setPlaybackPosition(status.positionMillis);
                        setPlaybackDuration(status.durationMillis);
                        setIsPlaying(status.isPlaying);
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            newSound.setPositionAsync(0);
                            setPlaybackPosition(0);
                        }
                    }
                });
                playbackSoundRef.current = newSound;
                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
        }
    };

    const handleSeek = async (evt) => {
        if (!sound || !playbackDuration) return;
        const width = waveformLayout.current?.width || 1;
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / width));
        await sound.setPositionAsync(percent * playbackDuration);
        setPlaybackPosition(percent * playbackDuration);
    };

    const handleDelete = () => {
        setRecordedUri(null);
        setFinalDuration(0);
        setPlaybackPosition(0);
        if (sound) {
            sound.unloadAsync();
            playbackSoundRef.current = null;
            setSound(null);
        }
        setIsPlaying(false);
    };

    const handleSendPress = () => {
        if (!recordedUri) return;
        if (sound) {
            sound.stopAsync();
            sound.unloadAsync();
        }
        onSend({ uri: recordedUri, duration: finalDuration * 1000 });
    };

    const rawPrompt = (challenge?.prompt_text || 'Ready to Soup?').replace(/^#challenge\s*\n?/i, '').trim() || 'Ready to Soup?';
    const parts = rawPrompt.split(/\n+/).filter((p) => p.trim());

    return (
        <View style={styles.card}>
            <View style={styles.column}>
                <View style={styles.contentBlock}>
                    <View style={[styles.questionBlock, isLightBackground && styles.questionBubbleLight]}>
                        {parts.length > 1 ? (
                            <>
                                <Text style={[styles.questionText, isLightBackground && styles.textOnLight]}>
                                    {parts[0]}
                                </Text>
                                <Text style={[styles.translationText, isLightBackground && styles.secondaryTextOnLight]}>
                                    {parts.slice(1).join('\n')}
                                </Text>
                            </>
                        ) : (
                            <Text style={[styles.questionText, isLightBackground && styles.textOnLight]}>
                                {rawPrompt}
                            </Text>
                        )}
                    </View>

                    <View style={styles.phrasesVocabSection}>
                        {hintsLoading && (
                            <View style={styles.hintsLoading}>
                                <ActivityIndicator size="small" color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.8)'} />
                                <Text style={[styles.hintsLoadingText, isLightBackground && styles.textOnLight]}>loading…</Text>
                            </View>
                        )}
                        {!hintsLoading &&
                            (hints?.starter_phrases?.length > 0 || hints?.starter_phrase || hints?.vocab_bank?.length > 0) && (
                                <View style={styles.phrasesVocabRow}>
                                    {(hints?.starter_phrases?.length > 0 || hints?.starter_phrase) && (
                                        <View style={styles.phrasesCol}>
                                            {(() => {
                                                const phrases = hints.starter_phrases?.length
                                                    ? hints.starter_phrases.map((p) => ({ text: p.phrase, translation: p.translation }))
                                                    : [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }];
                                                return phrases.map((item, idx) => {
                                                    const phraseText = item.text;
                                                    return (
                                                        <Pressable
                                                            key={`phrase-${idx}-${normalizeTtsText(phraseText) || idx}`}
                                                            style={[
                                                                styles.phraseCard,
                                                                speakingWord === normalizeTtsText(phraseText) && styles.speakingActive,
                                                                isLightBackground && styles.phraseCardLight,
                                                            ]}
                                                            onPress={() => phraseText && playTts(phraseText)}
                                                            accessibilityLabel="Tap to hear"
                                                            accessibilityRole="button"
                                                        >
                                                            <View style={styles.phraseContent}>
                                                                <Text style={[styles.phraseText, isLightBackground && styles.textOnLight]}>
                                                                    "{phraseText}"
                                                                </Text>
                                                                {item.translation ? (
                                                                    <Text style={[styles.phraseTranslation, isLightBackground && styles.secondaryTextOnLight]}>
                                                                        {item.translation}
                                                                    </Text>
                                                                ) : null}
                                                            </View>
                                                            <View style={[styles.playCircle, isLightBackground && styles.playCircleLight]}>
                                                                {speakingWord === normalizeTtsText(phraseText) ? (
                                                                    <ActivityIndicator size="small" color={isLightBackground ? '#141414' : '#fff'} />
                                                                ) : (
                                                                    <Volume2 size={24} color={SOUP_COLORS.turquoise} />
                                                                )}
                                                            </View>
                                                        </Pressable>
                                                    );
                                                });
                                            })()}
                                        </View>
                                    )}
                                    {hints?.vocab_bank?.length > 0 && (
                                        <View style={styles.vocabCol}>
                                            {hints.vocab_bank.map((item, idx) => {
                                                const word = (item.word ?? item.target_term ?? '').trim();
                                                const translation = (item.translation ?? item.english ?? '').trim();
                                                if (!word) return null;
                                                return (
                                                    <Pressable
                                                        key={`vocab-${idx}-${word}`}
                                                        onPress={() => playTts(word)}
                                                        style={[styles.vocabPill, isLightBackground && styles.vocabPillLight]}
                                                        accessibilityLabel={`Tap to hear ${word}`}
                                                        accessibilityRole="button"
                                                    >
                                                        <Text style={[styles.vocabWord, isLightBackground && styles.textOnLight]}>
                                                            {word}
                                                        </Text>
                                                        {translation ? (
                                                            <Text style={[styles.vocabTranslation, isLightBackground && styles.secondaryTextOnLight]}>
                                                                {' '}· {translation}
                                                            </Text>
                                                        ) : null}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}
                        {!hintsLoading &&
                            (hints?.starter_phrases?.length > 0 || hints?.starter_phrase || hints?.vocab_bank?.length > 0) && (
                                <View style={styles.shuffleWrap}>
                                    <Pressable
                                        onPress={refreshHintsForSession}
                                        disabled={refreshingHints}
                                        style={({ pressed }) => [styles.shuffleBtn, pressed && { opacity: 0.8 }]}
                                        accessibilityLabel={refreshingHints ? 'loading new ideas' : 'other ideas'}
                                        accessibilityRole="button"
                                    >
                                        {refreshingHints ? (
                                            <ActivityIndicator size="small" color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.9)'} />
                                        ) : (
                                            <Shuffle size={28} color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.95)'} />
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        {speakingWord && (
                            <>
                                <TtsLoadingMessage isLightBackground={isLightBackground} />
                                <TtsLoadingFillBar isLightBackground={isLightBackground} complete={ttsLoadComplete} />
                            </>
                        )}
                    </View>
                </View>

                {/* Breathing room: waveforms appear here when recording */}
                <View style={styles.breathingRoom} />

                {/* Bottom section: record + nav — never shrink, always visible */}
                <View style={styles.bottomSection}>
                <View style={styles.recordBlock}>
                    {recordedUri ? (
                        <View style={styles.reviewContainer}>
                            <Pressable
                                style={styles.scrubberContainer}
                                onPress={handleSeek}
                                onLayout={(e) => {
                                    waveformLayout.current = e.nativeEvent.layout;
                                }}
                            >
                                <View style={styles.staticWaveform}>
                                    {barHeights.map((height, i) => {
                                        const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;
                                        const barPos = i / WAVEFORM_BARS;
                                        const isPlayed = progress > barPos;
                                        const barColor = isLightBackground
                                            ? isPlayed ? '#141414' : 'rgba(20, 20, 20, 0.4)'
                                            : isPlayed ? 'white' : 'rgba(255, 255, 255, 0.4)';
                                        return (
                                            <View
                                                key={i}
                                                style={[styles.waveBar, { height: 16 + height * 32, backgroundColor: barColor }]}
                                            />
                                        );
                                    })}
                                </View>
                                <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>
                                    {loadTime(playbackPosition / 1000)} / {loadTime(finalDuration)}
                                </Text>
                            </Pressable>
                            <View style={styles.playbackControls}>
                                <Pressable onPress={handleDelete} style={[styles.controlBtn, styles.deleteBtn]}>
                                    <Trash2 size={24} color="#FF3B30" />
                                </Pressable>
                                <Pressable onPress={handlePlayPause} style={styles.playBtn}>
                                    {isPlaying ? (
                                        <Pause size={26} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} />
                                    ) : (
                                        <Play size={26} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} style={{ marginLeft: 2 }} />
                                    )}
                                </Pressable>
                                <Pressable onPress={handleSendPress} disabled={loading} style={[styles.controlBtn, styles.sendBtn]}>
                                    {loading ? <ActivityIndicator color="white" size="small" /> : <Send size={28} color="white" />}
                                </Pressable>
                            </View>
                            <Text style={[styles.reviewText, isLightBackground && styles.secondaryTextOnLight]}>listen back, then send</Text>
                        </View>
                    ) : (
                        <View style={[styles.recordZone, { paddingBottom: 12 + insets.bottom }]}>
                            <View style={styles.waveformZone}>
                                {isRecording ? (
                                    <View style={styles.waveformWrap}>
                                        <LiveAudioWaveform
                                            metering={metering}
                                            recordingDuration={recordingDuration}
                                            isRecording={isRecording}
                                            color={isLightBackground ? SOUP_COLORS.turquoise : 'white'}
                                        />
                                        <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>
                                            {loadTime(recordingDuration)}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            {onBack && navLabel != null ? (
                                <Text
                                    style={[
                                        styles.progressLabel,
                                        navTextColor != null && { color: navTextColor },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {navLabel}
                                </Text>
                            ) : null}
                            <View style={styles.micNavRow}>
                                {onBack ? (
                                    <Pressable onPress={onBack} style={({ pressed }) => [styles.sideNavBtn, pressed && { opacity: 0.8 }]}>
                                        <Text style={[styles.sideNavBtnText, navTextColor != null && { color: navTextColor }]}>← back</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.sideNavBtn} />
                                )}
                                <Pressable
                                    onPress={handleRecordPress}
                                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                                    style={({ pressed }) => [
                                        styles.micButton,
                                        isLightBackground && styles.micButtonLight,
                                        isRecording && styles.micButtonRecording,
                                        isLightBackground && isRecording && styles.micButtonRecordingLight,
                                        pressed && { opacity: 0.9 },
                                    ]}
                                >
                                    {isRecording ? (
                                        <View style={[styles.stopIcon, isLightBackground && styles.stopIconLight]} />
                                    ) : (
                                        <Mic size={32} color={isLightBackground ? '#fff' : SOUP_COLORS.turquoise} />
                                    )}
                                </Pressable>
                                {onSkip ? (
                                    <Pressable onPress={onSkip} style={({ pressed }) => [styles.sideNavBtn, pressed && { opacity: 0.8 }]}>
                                        <Text style={[styles.sideNavBtnText, navTextColor != null && { color: navTextColor }]}>skip →</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.sideNavBtn} />
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {onBack && recordedUri ? (
                    <View style={[styles.navRow, { paddingBottom: 12 + insets.bottom }]}>
                        <Pressable onPress={onBack} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.8 }]}>
                            <Text style={[styles.navBtnText, navTextColor != null && { color: navTextColor }]}>← back</Text>
                        </Pressable>
                        <View style={styles.navProgressWrap}>
                            {navLabel != null ? (
                                <Text style={[styles.navProgress, navTextColor != null && { color: navTextColor }]}>{navLabel}</Text>
                            ) : null}
                        </View>
                        <Pressable onPress={onSkip} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.8 }]}>
                            <Text style={[styles.navBtnText, navTextColor != null && { color: navTextColor }]}>skip →</Text>
                        </Pressable>
                    </View>
                ) : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        width: '100%',
        minHeight: 0,
        backgroundColor: 'transparent',
    },
    column: {
        flex: 1,
        minHeight: 0,
        paddingHorizontal: 14,
        paddingTop: 22,
        paddingBottom: 0,
    },
    contentBlock: {
        flexShrink: 1,
        minHeight: 0,
    },
    questionBlock: {
        alignSelf: 'stretch',
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
    },
    questionBubbleLight: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    questionText: {
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 32,
        color: '#fff',
        letterSpacing: -0.2,
    },
    translationText: {
        fontSize: 13,
        lineHeight: 18,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 10,
    },
    secondaryText: {
        fontSize: 12,
        lineHeight: 18,
        opacity: 0.95,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 6,
    },
    textOnLight: {
        color: '#141414',
        textShadowColor: 'transparent',
    },
    secondaryTextOnLight: {
        color: '#4a4a4a',
        textShadowColor: 'transparent',
    },
    phrasesVocabSection: {
        paddingTop: 10,
        paddingBottom: 8,
    },
    phrasesVocabRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    phrasesCol: {
        flex: 1,
        minWidth: 0,
    },
    vocabCol: {
        flex: 1,
        minWidth: 0,
    },
    hintsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    hintsLoadingText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    phraseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 6,
        gap: 8,
    },
    phraseCardLight: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    phraseContent: {
        flex: 1,
        minWidth: 0,
    },
    phraseText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    phraseTranslation: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    playCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,174,239,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playCircleLight: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    speakingActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.14)',
        marginBottom: 6,
    },
    vocabPillLight: {
        backgroundColor: 'rgba(20,20,20,0.08)',
    },
    vocabWord: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    vocabTranslation: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
    },
    ttsFillBarTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 2,
    },
    ttsFillBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    ttsLoadingMessage: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    breathingRoom: {
        minHeight: 24,
        flexGrow: 1,
    },
    bottomSection: {
        flexShrink: 0,
        width: '100%',
    },
    recordBlock: {
        width: '100%',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.18)',
    },
    recordZone: {
        alignItems: 'center',
        paddingBottom: 8,
    },
    waveformZone: {
        minHeight: 0,
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformWrap: {
        width: '100%',
        minHeight: 40,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shuffleWrap: {
        marginTop: 16,
        marginBottom: 28,
        alignItems: 'center',
    },
    shuffleBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
        color: 'rgba(255,255,255,0.95)',
    },
    micNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 8,
        gap: 12,
    },
    sideNavBtn: {
        flex: 1,
        maxWidth: 100,
        paddingVertical: 12,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sideNavBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.95)',
    },
    micButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    micButtonLight: {
        backgroundColor: '#141414',
    },
    micButtonRecording: {
        backgroundColor: SOUP_COLORS.pink,
        transform: [{ scale: 1.05 }],
    },
    micButtonRecordingLight: {
        backgroundColor: '#141414',
        transform: [{ scale: 1.05 }],
    },
    stopIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: SOUP_COLORS.turquoise,
    },
    stopIconLight: {
        backgroundColor: '#fff',
    },
    reviewContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    scrubberContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 6,
        minHeight: 40,
    },
    staticWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 36,
        width: '100%',
    },
    waveBar: {
        width: 4,
        borderRadius: 2,
    },
    timerText: {
        fontSize: 13,
        color: 'white',
        fontWeight: '700',
        marginTop: 4,
        fontVariant: ['tabular-nums'],
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        minHeight: 52,
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    playBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E6F7FD',
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtn: {
        backgroundColor: SOUP_COLORS.turquoise,
    },
    deleteBtn: {
        backgroundColor: '#FFF0F0',
    },
    reviewText: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        marginTop: 0,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 4,
        paddingHorizontal: 4,
        gap: 12,
    },
    navProgressWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    navProgress: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.9,
    },
    navBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    navBtnText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
});
