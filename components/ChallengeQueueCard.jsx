import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Image, Animated, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { BlurView } from 'expo-blur';
import { Mic, Play, Pause, Trash2, Send, Volume2, Shuffle } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { AnimatedIdleWaveform } from './AnimatedIdleWaveform';
import AnimatedReanimated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { pickRandom, NEW_IDEAS_BUTTON_LABELS, NEW_IDEAS_LOADING_LABELS } from '../constants/CopyPhilosophy';

const BOWL_ICON = require('../assets/ls-icon-bowl.png');

// Wrapper: no layout shift when challenge changes — only phrases/vocab content updates
function TodayQuestionPulseWrapper({ embedInSection, challengeId, isTodayLayout, promptContainerStyle, children }) {
    if (!embedInSection) {
        return <View style={promptContainerStyle}>{children}</View>;
    }
    return <View style={promptContainerStyle}>{children}</View>;
}

// Bowl accents — no dark box; pop via opacity + shadow + soft white glow on colored backgrounds.
const BOWL_ACCENTS = [
    { key: 'tl', top: '8%', left: '5%', size: 72, opacity: 0.58 },
    { key: 'tr', top: '22%', right: '4%', size: 72, opacity: 0.54 },
    { key: 'bl', bottom: '26%', left: '8%', size: 72, opacity: 0.56 },
    { key: 'br', bottom: '10%', right: '10%', size: 72, opacity: 0.6 },
];

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    blue: '#00ADEF',
    pink: '#EC008B',
    dark: '#2A2A2A',
    subtext: '#6B7280',
};

const WAVEFORM_BARS = 30;

// Rotating silly messages while TTS loads (no "voice gods")
const TTS_LOADING_MESSAGES = [
    'how do u pronounce that again…',
    'wait what was the word',
    'what language is this',
    'trying our best here',
    'ok don\'t look at me I\'m nervous',
    'one sec, finding the right accent',
    'buffering confidence',
    'almost… almost…',
    'this is fine everything is fine',
    'heating up the vocal cords',
    'loading the correct pronunciation (we hope)',
];

// Fill-up bar: fills at a steady pace (0→100% over 3s); when load completes, finishes to 100%
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

// Random silly message while TTS loads (new random every 1.8s, not same sequence)
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

export function ChallengeQueueCard({ challenge, onSend, loading, groupName, isLightBackground = false, currentCardIdRef, isCompact = false, embedInSection = false, minimal = false }) {
    const {
        isRecording,
        recordingDuration,
        metering,
        startRecording,
        stopRecording,
    } = useVoiceRecorder();

    const [recordedUri, setRecordedUri] = useState(null);
    const [finalDuration, setFinalDuration] = useState(0);
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const ttsSoundRef = useRef(null); // Ref to track TTS sound for cleanup
    const lastTtsRequestRef = useRef(null); // Only play sound if fetch completed for the last tapped phrase (ignore stale)
    const currentChallengeIdRef = useRef(challenge?.id); // So async hint load can skip if user switched challenge
    currentChallengeIdRef.current = challenge?.id;

    // Audio Cache for TTS (Vocab & Phrases)
    const [audioCache, setAudioCache] = useState({});

    // Inline ingredients state. If cached phrase is too long, treat as missing so we regenerate (fixed edge function returns max 8 words).
    const initialHints = (() => {
        const meta = challenge?.metadata;
        if (!meta?.starter_phrase) return null;
        const wordCount = (meta.starter_phrase || '').trim().split(/\s+/).length;
        if (wordCount > 10) return null; // bad cache from before we enforced length
        return meta;
    })();
    const [hints, setHints] = useState(initialHints);
    const [hintsLoading, setHintsLoading] = useState(false);
    const [refreshingHints, setRefreshingHints] = useState(false);

    // Normalize text for TTS: trim and strip surrounding quotes so API gets clean input
    const normalizeTtsText = (t) => {
        if (t == null || typeof t !== 'string') return '';
        let s = t.trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
        return s;
    };

    // Prefetch Helper (Speeds up loading)
    const prefetchAudio = async (text) => {
        const normalized = normalizeTtsText(text);
        if (!normalized || audioCache[normalized]) return;
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text: normalized, task: 'pronunciation', language: groupName || 'Multilingual' }
            });
            if (data?.pronunciationUrl) {
                setAudioCache(prev => ({ ...prev, [normalized]: data.pronunciationUrl }));
            }
        } catch (e) {
            // Silent fail on prefetch is fine
        }
    };

    // Auto-generate hints on mount & Save to DB. Guard so we never apply results for a stale challenge (e.g. tap Farsi then Spanish).
    useEffect(() => {
        const challengeId = challenge?.id;
        const meta = challenge?.metadata;
        const hasPhrases = (meta?.starter_phrases?.length > 0) || (meta?.starter_phrase && (meta.starter_phrase || '').trim().split(/\s+/).length <= 10);
        if (hasPhrases) {
            setHints(meta);
            setHintsLoading(false);
            if (meta.starter_phrases?.length) {
                meta.starter_phrases.forEach(p => p?.phrase && prefetchAudio(p.phrase));
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
                    body: { task: 'generate_hints', prompt: promptText, language: groupName || 'Target Language', challengeId }
                });

                if (error) throw error;

                // Only apply if user hasn't switched to another challenge (avoid Farsi then Spanish flash)
                if (currentChallengeIdRef.current !== challengeId) return;
                if (data?.starter_phrases?.length || data?.starter_phrase) {
                    setHints(data);
                    await supabase.from('app_challenges')
                        .update({ metadata: data })
                        .eq('id', challengeId);
                    if (data.starter_phrases?.length) {
                        data.starter_phrases.forEach(p => p?.phrase && prefetchAudio(p.phrase));
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

    // Regenerate phrases/vocab for this session only (no DB save) — "other ideas"
    const refreshHintsForSession = async () => {
        const promptText = challenge?.prompt_text;
        if (!promptText || refreshingHints || hintsLoading) return;
        const challengeId = challenge?.id;
        setRefreshingHints(true);
        try {
            const { data, error } = await supabase.functions.invoke('voice-feedback', {
                body: { task: 'generate_hints', prompt: promptText, language: groupName || 'Target Language', challengeId, variation: true }
            });
            if (error) throw error;
            if (currentChallengeIdRef?.current !== challengeId) return;
            if (data?.starter_phrases?.length || data?.starter_phrase) {
                setHints(data);
                if (data.starter_phrases?.length) {
                    data.starter_phrases.forEach(p => p?.phrase && prefetchAudio(p.phrase));
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

    // TTS pronunciation via OpenAI (Phrases only)
    const [speakingWord, setSpeakingWord] = useState(null);
    const [ttsLoadComplete, setTtsLoadComplete] = useState(false); // so fill bar only reaches 100% when load is done
    const [minimalPhrasesExpanded, setMinimalPhrasesExpanded] = useState(false);

    // Tap to hear: OpenAI TTS via voice-feedback (nice voice). Card language passed so it lands on the right language. Fallback to expo-speech if API fails.
    // Important: we use only the `text` argument for the request so the audio always matches what was clicked.
    const playTts = async (text) => {
        if (text == null || typeof text !== 'string') return;
        const normalized = normalizeTtsText(text);
        if (!normalized) return;

        if (ttsSoundRef.current) {
            try { await ttsSoundRef.current.unloadAsync(); } catch (_) {}
            ttsSoundRef.current = null;
        }
        Speech.stop();
        lastTtsRequestRef.current = normalized;
        setSpeakingWord(normalized);
        setTtsLoadComplete(false);

        const cardLanguage = groupName || 'Multilingual';

        const playUrl = async (url) => {
            if (lastTtsRequestRef.current !== normalized) return;
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
            });
            const { sound: s } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true, volume: 1.0 }
            );
            if (lastTtsRequestRef.current !== normalized) {
                s.unloadAsync().catch(() => {});
                return;
            }
            try { await s.setRateAsync(0.85, true); } catch (_) {}
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
            const lang = (cardLanguage || '').toLowerCase();
            const code = lang.includes('farsi') || lang.includes('persian') ? 'fa' : lang.includes('spanish') ? 'es' : lang.includes('french') ? 'fr' : lang.includes('portuguese') ? 'pt' : lang.includes('italian') ? 'it' : undefined;
            Speech.speak(normalized, {
                language: code,
                rate: 0.85,
                onDone: () => { if (lastTtsRequestRef.current === normalized) setSpeakingWord(null); },
                onStopped: () => setSpeakingWord(null),
                onError: () => setSpeakingWord(null),
            });
            setTtsLoadComplete(true);
        };

        // Only use cache if it's for this exact request (avoid playing wrong phrase)
        const cachedUrl = audioCache[normalized];
        if (cachedUrl && lastTtsRequestRef.current === normalized) {
            playUrl(cachedUrl).catch(() => fallbackSpeech());
            return;
        }
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text: normalized, task: 'pronunciation', language: cardLanguage }
            });
            if (data?.pronunciationUrl) {
                setAudioCache(prev => ({ ...prev, [normalized]: data.pronunciationUrl }));
                await playUrl(data.pronunciationUrl);
            } else {
                fallbackSpeech();
            }
        } catch (_) {
            fallbackSpeech();
        }
    };


    // Playback Progress
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    // Waveform Heights (Static random for now)
    const [barHeights] = useState(() => Array.from({ length: WAVEFORM_BARS }, () => Math.random() * 0.5 + 0.3));

    // Cleanup sound on unmount/change
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    // Stop TTS when leaving this card (back/skip/close) so nothing keeps playing
    useEffect(() => {
        return () => {
            const tts = ttsSoundRef.current;
            if (tts) {
                tts.unloadAsync().catch(() => {});
                ttsSoundRef.current = null;
            }
            lastTtsRequestRef.current = null;
        };
    }, []);

    // Community Bubbles Logic
    const [communityBubbles, setCommunityBubbles] = useState([]);
    useEffect(() => {
        const fetchCommunity = async () => {
            // Fetch recent active users with avatars
            const { data } = await supabase
                .from('app_users')
                .select('avatar_url')
                .not('avatar_url', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data && data.length > 0) {
                // 1. STRICTLY Real Photos (Filter like community tab: jpg, jpeg, google, fab)
                const realPhotos = data.filter(u => {
                    const url = u.avatar_url?.toLowerCase();
                    return url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('googleusercontent') || url.includes('fbsbx.com'));
                });

                // Pick 7 random photos for a neat row
                const shuffled = realPhotos.sort(() => 0.5 - Math.random()).slice(0, 7);
                setCommunityBubbles(shuffled); // Just store user objects
            }
        };
        fetchCommunity();
    }, []);

    const handleRecordPress = async () => {
        // STOP ALL AUDIO before recording to prevent "Retry failed" errors
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
            // Capture current duration as fallback before stopping (which resets it)
            const fallbackDuration = recordingDuration;
            const result = await stopRecording();

            if (result?.uri) {
                setRecordedUri(result.uri);
                // Fix: Use fallback if reported duration is 0
                const actualDurationMs = result.duration > 0 ? result.duration : (fallbackDuration * 1000);

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
                // Use speaker and full volume so playback is audible (like normal phone volume)
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

                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Playback error:', error);
        }
    };

    const handleSeek = async (evt) => {
        if (!sound || !playbackDuration) return;

        // Calculate seek position
        const width = waveformLayout.current?.width || 1;
        const x = evt.nativeEvent.locationX;
        const percent = Math.max(0, Math.min(1, x / width));
        const seekPos = percent * playbackDuration;

        await sound.setPositionAsync(seekPos);
        setPlaybackPosition(seekPos);
    };

    const handleDelete = () => {
        setRecordedUri(null);
        setFinalDuration(0);
        setPlaybackPosition(0);
        if (sound) {
            sound.unloadAsync();
            setSound(null);
        }
        setIsPlaying(false);
    };

    const handleSendPress = () => {
        if (!recordedUri) return;
        // Clean up sound before sending to avoid leaks
        if (sound) {
            sound.stopAsync();
            sound.unloadAsync();
        }
        onSend({ uri: recordedUri, duration: finalDuration * 1000 }); // Pass ms
    };

    // Track layout for seeking
    const waveformLayout = useRef({ width: 0 });
    const onWaveformLayout = (event) => {
        waveformLayout.current = event.nativeEvent.layout;
    };

    const cardStyle = isCompact
        ? [styles.card, stylesCompact.card, embedInSection && { width: '100%', flex: 1, minHeight: 0, padding: 0, justifyContent: 'flex-start' }]
        : [styles.card, embedInSection && { width: '100%', flex: 1, minHeight: 0, padding: 0, justifyContent: 'flex-start' }];
    const promptContainerStyle = isCompact ? [styles.promptContainer, stylesCompact.promptContainer] : styles.promptContainer;
    const groupNameStyle = isCompact ? [styles.groupName, isLightBackground && styles.textOnLight, stylesCompact.groupName] : [styles.groupName, isLightBackground && styles.textOnLight];
    const promptTextStyle = isCompact ? [styles.promptText, isLightBackground && styles.textOnLight, stylesCompact.promptText] : [styles.promptText, isLightBackground && styles.textOnLight];
    const secondaryPromptStyle = isCompact ? [styles.promptText, styles.secondaryPrompt, isLightBackground && styles.secondaryTextOnLight, stylesCompact.secondaryPrompt] : [styles.promptText, styles.secondaryPrompt, isLightBackground && styles.secondaryTextOnLight];
    const hintsContainerStyle = isCompact ? [styles.hintsContainer, stylesCompact.hintsContainer] : styles.hintsContainer;
    const hintsLabelStyle = isCompact ? [styles.hintsLabel, stylesCompact.hintsLabel] : styles.hintsLabel;
    const starterPhraseCardStyle = isCompact ? [styles.starterPhraseCard, stylesCompact.starterPhraseCard] : styles.starterPhraseCard;
    const starterPhraseStyle = isCompact ? [styles.starterPhrase, stylesCompact.starterPhrase] : [styles.starterPhrase];
    const actionContainerStyle = embedInSection
        ? [styles.embedActionBlock, styles.todayCardSectionRecord]
        : isCompact ? [styles.actionContainer, stylesCompact.actionContainer] : [styles.actionContainer];
    const recordContainerStyle = isCompact ? [styles.recordContainer, stylesCompact.recordContainer] : styles.recordContainer;
    const recordButtonStyle = isCompact ? [styles.recordButton, isLightBackground && styles.recordButtonOnLight, stylesCompact.recordButton] : [styles.recordButton, isLightBackground && styles.recordButtonOnLight];
    const hintTextStyle = isCompact ? [styles.hintText, stylesCompact.hintText] : styles.hintText;
    const reviewContainerStyle = isCompact ? [styles.reviewContainer, stylesCompact.reviewContainer] : styles.reviewContainer;
    const controlButtonStyle = isCompact ? [styles.controlButton, stylesCompact.controlButton] : styles.controlButton;
    const playButtonStyle = isCompact ? [styles.playButton, stylesCompact.playButton] : styles.playButton;
    const scrubberContainerStyle = isCompact ? [styles.scrubberContainer, stylesCompact.scrubberContainer] : styles.scrubberContainer;
    const waveformContainerStyle = isCompact ? [styles.waveformContainer, stylesCompact.waveformContainer] : styles.waveformContainer;
    const vocabBlockStyle = isCompact ? [styles.vocabBlock, stylesCompact.vocabBlock] : styles.vocabBlock;

    // Today layout: thread-style (ask → phrases → reply). No bowls.
    const isTodayLayout = isCompact && isLightBackground;

    return (
        <View style={cardStyle}>
            {!isTodayLayout && !embedInSection && (
            <View style={styles.bowlBackground} pointerEvents="none">
                {BOWL_ACCENTS.map(({ key, size, opacity, ...pos }) => (
                    <View
                        key={key}
                        style={[
                            styles.bowlBgIconAccent,
                            { width: size, height: size, ...pos },
                            isLightBackground ? styles.bowlAccentShadow : styles.bowlAccentShadowWithGlow
                        ]}
                    >
                        {!isLightBackground && (
                            <Image
                                source={BOWL_ICON}
                                style={[StyleSheet.absoluteFill, { width: size, height: size, opacity: 0.22 }]}
                                resizeMode="contain"
                            />
                        )}
                        <Image
                            source={BOWL_ICON}
                            style={[StyleSheet.absoluteFill, { width: size, height: size, opacity }]}
                            resizeMode="contain"
                        />
                    </View>
                ))}
            </View>
            )}
            {/* Card boundary when embed: visible edge + padding so content fits inside */}
            <View style={[embedInSection && styles.embedCardBoundary, { flex: 1, minHeight: 0 }]}>
            {/* Challenge content — embed: three sections = question | phrases+vocab | record */}
            <View style={[promptContainerStyle, (isTodayLayout || embedInSection) && styles.todayPromptWrap, embedInSection && styles.embedPromptOuter]}>
                {embedInSection ? (
                    <View style={styles.embedContent}>
                        {/* Section 1: Challenge question */}
                        <View style={[styles.todayCardSection, styles.todayCardSectionQuestion]}>
                            <TodayQuestionPulseWrapper
                                embedInSection={embedInSection}
                                challengeId={challenge?.id}
                                isTodayLayout={isTodayLayout}
                                promptContainerStyle={[(isTodayLayout || embedInSection) ? styles.todayPromptBubble : { alignItems: 'center' }, embedInSection && styles.embedPromptBubble]}
                            >
                                {(() => {
                                    const raw = (challenge?.prompt_text || "Ready to Soup?").replace(/^#challenge\s*\n?/i, '').trim();
                                    const rawText = raw || "Ready to Soup?";
                                    const parts = rawText.split(/\n+/).filter(p => p.trim());
                                    const promptNumLines = embedInSection ? 4 : (isCompact ? 2 : undefined);
                                    const secondaryNumLines = embedInSection ? 3 : (isCompact ? 1 : undefined);
                                    const questionStyle = [promptTextStyle, (isTodayLayout || embedInSection) && styles.todayQuestionText, embedInSection && styles.embedPromptText];
                                    const secondaryStyle = [secondaryPromptStyle, embedInSection && styles.embedSecondaryPrompt];

                                    if (parts.length > 1) {
                                        return (
                                            <>
                                                <Text style={questionStyle} numberOfLines={promptNumLines}>
                                                    {parts[0]}
                                                </Text>
                                                <Text style={secondaryStyle} numberOfLines={secondaryNumLines}>
                                                    {parts.slice(1).join('\n')}
                                                </Text>
                                            </>
                                        );
                                    }
                                    return (
                                        <Text style={questionStyle} numberOfLines={promptNumLines}>
                                            {rawText}
                                        </Text>
                                    );
                                })()}
                            </TodayQuestionPulseWrapper>
                        </View>

                        {/* Section 2: Phrases and vocab */}
                        {minimal ? (
                            (hintsLoading || hints?.starter_phrase) && (
                                <Pressable
                                    style={({ pressed }) => [styles.minimalPhrasesToggle, pressed && { opacity: 0.8 }]}
                                    onPress={() => setMinimalPhrasesExpanded(!minimalPhrasesExpanded)}
                                >
                                    <Text style={[styles.minimalPhrasesToggleText, isLightBackground && styles.textOnLight]}>
                                        {minimalPhrasesExpanded ? 'hide phrases' : 'see phrases'}
                                    </Text>
                                </Pressable>
                            )
                        ) : null}
                        {minimal && !minimalPhrasesExpanded ? null : (
                            <View style={[styles.todayCardSection, styles.todayCardSectionPhrasesVocab]}>
                    <View style={styles.embedHintsWrap}>
                        {hintsLoading && (
                            <View style={styles.hintsLoading}>
                                <ActivityIndicator size="small" color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.8)'} />
                                <Text style={[styles.hintsLoadingText, isLightBackground && styles.textOnLight]}>{(isTodayLayout || embedInSection) ? 'loading…' : 'loading hints…'}</Text>
                            </View>
                        )}
                        {!hintsLoading && (hints?.starter_phrases?.length > 0 || hints?.starter_phrase) && (
                            <View style={[hintsContainerStyle, (isTodayLayout || embedInSection) && styles.todayPhraseSection, embedInSection && styles.embedPhraseBlock]}>
                                {!isTodayLayout && !embedInSection && (
                                    <Text style={[hintsLabelStyle, isLightBackground && styles.textOnLight, styles.todaySectionLabel]}>beginner phrases:</Text>
                                )}
                                {(() => {
                                    const phrases = hints.starter_phrases?.length
                                        ? hints.starter_phrases.map(p => ({ text: p.phrase, translation: p.translation }))
                                        : [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }];
                                    return (
                                        <View style={[styles.phraseListWrap, embedInSection && styles.embedPhraseListRow]}>
                                    {phrases.map((item, idx) => {
                                        const phraseText = item.text;
                                        return (
                                        <Pressable
                                            key={`phrase-${idx}-${normalizeTtsText(phraseText) || idx}`}
                                            style={[starterPhraseCardStyle, speakingWord === normalizeTtsText(phraseText) && styles.speakingActive, isLightBackground && styles.starterCardOnLight, (isTodayLayout || embedInSection) && styles.todayStarterPhraseCard, embedInSection && styles.embedStarterPhraseCard]}
                                            onPress={() => { if (phraseText) playTts(phraseText); }}
                                            accessibilityLabel="Tap to hear"
                                            accessibilityRole="button"
                                        >
                                                    <View style={{ flex: 1 }}>
                                                <Text style={[starterPhraseStyle, isLightBackground && styles.textOnLight]}>"{phraseText}"</Text>
                                                {item.translation ? (
                                                    <Text style={[styles.starterTranslation, isLightBackground && styles.secondaryTextOnLight]}>
                                                        {item.translation}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View style={[styles.playCircle, isLightBackground && styles.playCircleOnLight, (isTodayLayout || embedInSection) && styles.todayPlayCircle]}>
{speakingWord === normalizeTtsText(phraseText) ? (
                                            <ActivityIndicator size="small" color={isLightBackground ? '#141414' : '#fff'} />
                                        ) : (
                                            <Volume2 size={(isTodayLayout || embedInSection) ? 24 : 20} color={(isTodayLayout || embedInSection) ? SOUP_COLORS.turquoise : (isLightBackground ? '#141414' : '#fff')} />
                                        )}
                                    </View>
                                        </Pressable>
                                    );
                                    })}
                                        </View>
                                    );
                                })()}
                                {speakingWord && (
                                    <>
                                        <TtsLoadingMessage isLightBackground={isLightBackground} />
                                        <TtsLoadingFillBar isLightBackground={isLightBackground} complete={ttsLoadComplete} />
                                    </>
                                )}
                                {!hintsLoading && hints?.vocab_bank && hints.vocab_bank.length > 0 && (
                                    <View style={[vocabBlockStyle, (isTodayLayout || embedInSection) && styles.todayVocabSection, embedInSection && styles.embedVocabBlock]}>
                                        {!isTodayLayout && !embedInSection && <Text style={[styles.vocabBlockLabel, isLightBackground && styles.textOnLight]}>{'vocab'}</Text>}
                                        <View style={[styles.vocabRow, (isTodayLayout || embedInSection) && styles.todayVocabRow]}>
                                            {(hints.vocab_bank.slice(0, (embedInSection || isTodayLayout) ? 3 : 10)).map((item, idx) => {
                                                const word = (item.word ?? item.target_term ?? '').trim();
                                                const translation = (item.translation ?? item.english ?? '').trim();
                                                if (!word) return null;
                                                return (
                                                    <Pressable
                                                        key={`vocab-${idx}-${word}`}
                                                        onPress={() => playTts(word)}
                                                        style={({ pressed }) => [styles.vocabPill, isLightBackground && styles.vocabPillOnLight, (isTodayLayout || embedInSection) && styles.todayVocabPill, embedInSection && styles.embedVocabPill, pressed && { opacity: 0.8 }]}
                                                        accessibilityLabel={`Tap to hear ${word}`}
                                                        accessibilityRole="button"
                                                    >
                                                        <Text style={[styles.vocabWord, isLightBackground && styles.textOnLight, (isTodayLayout || embedInSection) && styles.todayVocabWord, embedInSection && styles.embedVocabWord]} numberOfLines={1}>{word}</Text>
                                                        {translation ? <Text style={[styles.vocabTranslation, isLightBackground && styles.secondaryTextOnLight, (isTodayLayout || embedInSection) && styles.todayVocabTranslation]} numberOfLines={1}> · {translation}</Text> : null}
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                                {embedInSection && !hintsLoading && (hints?.starter_phrases?.length > 0 || hints?.starter_phrase) && (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.newIdeasButton,
                                            {
                                                backgroundColor: 'rgba(255,255,255,0.28)',
                                                paddingVertical: 10,
                                                paddingHorizontal: 14,
                                                borderRadius: 22,
                                                borderWidth: 1,
                                                borderColor: 'rgba(255,255,255,0.35)',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            },
                                            pressed && { opacity: 0.8 },
                                        ]}
                                        onPress={refreshHintsForSession}
                                        disabled={refreshingHints}
                                        accessibilityLabel={refreshingHints ? 'loading new ideas' : 'shuffle phrases and vocab'}
                                        accessibilityRole="button"
                                    >
                                        {refreshingHints ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Shuffle size={20} color="#fff" strokeWidth={2.2} />
                                        )}
                                    </Pressable>
                                )}
                            </View>
                                )}
                            </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <>
                        {!isTodayLayout && <Text style={[groupNameStyle, styles.todayGroupName]}>{groupName || 'Soup Group'}</Text>}
                        <TodayQuestionPulseWrapper embedInSection={embedInSection} challengeId={challenge?.id} isTodayLayout={isTodayLayout} promptContainerStyle={isTodayLayout ? styles.todayPromptBubble : { alignItems: 'center' }}>
                            {(() => {
                                const raw = (challenge?.prompt_text || "Ready to Soup?").replace(/^#challenge\s*\n?/i, '').trim();
                                const rawText = raw || "Ready to Soup?";
                                const parts = rawText.split(/\n+/).filter(p => p.trim());
                                const qStyle = [promptTextStyle, isTodayLayout && styles.todayQuestionText];
                                if (parts.length > 1) return (<><Text style={qStyle} numberOfLines={isCompact ? 2 : undefined}>{parts[0]}</Text><Text style={secondaryPromptStyle} numberOfLines={isCompact ? 1 : undefined}>{parts.slice(1).join('\n')}</Text></>);
                                return <Text style={qStyle} numberOfLines={isCompact ? 2 : undefined}>{rawText}</Text>;
                            })()}
                        </TodayQuestionPulseWrapper>
                        {minimal ? (hintsLoading || hints?.starter_phrases?.length > 0 || hints?.starter_phrase) && <Pressable style={({ pressed }) => [styles.minimalPhrasesToggle, pressed && { opacity: 0.8 }]} onPress={() => setMinimalPhrasesExpanded(!minimalPhrasesExpanded)}><Text style={[styles.minimalPhrasesToggleText, isLightBackground && styles.textOnLight]}>{minimalPhrasesExpanded ? 'hide phrases' : 'see phrases'}</Text></Pressable> : null}
                        {minimal && !minimalPhrasesExpanded ? null : (
                            <>
                                {hintsLoading && <View style={styles.hintsLoading}><ActivityIndicator size="small" color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.8)'} /><Text style={[styles.hintsLoadingText, isLightBackground && styles.textOnLight]}>{(isTodayLayout || embedInSection) ? 'loading…' : 'loading hints…'}</Text></View>}
                                {!hintsLoading && (hints?.starter_phrases?.length > 0 || hints?.starter_phrase) && (
                                    <View style={[hintsContainerStyle, isTodayLayout && styles.todayPhraseSection]}>
                                        {!isTodayLayout && !embedInSection && <Text style={[hintsLabelStyle, isLightBackground && styles.textOnLight, styles.todaySectionLabel]}>beginner phrases:</Text>}
                                        {(() => {
                                            const phrases = hints.starter_phrases?.length ? hints.starter_phrases.map(p => ({ text: p.phrase, translation: p.translation })) : [{ text: hints.starter_phrase, translation: hints.starter_phrase_translation }];
                                            return phrases.map((item, idx) => {
                                                const phraseText = item.text;
                                                return (
                                                <Pressable key={`phrase-${idx}-${normalizeTtsText(phraseText) || idx}`} style={[starterPhraseCardStyle, speakingWord === normalizeTtsText(phraseText) && styles.speakingActive, isLightBackground && styles.starterCardOnLight, isTodayLayout && styles.todayStarterPhraseCard]} onPress={() => { if (phraseText) playTts(phraseText); }} accessibilityLabel="Tap to hear" accessibilityRole="button">
                                                    <View style={{ flex: 1 }}><Text style={[starterPhraseStyle, isLightBackground && styles.textOnLight]}>"{phraseText}"</Text>{item.translation ? <Text style={[styles.starterTranslation, isLightBackground && styles.secondaryTextOnLight]}>{item.translation}</Text> : null}{!isTodayLayout && !item.translation && <Text style={[styles.starterTranslation, isLightBackground && styles.secondaryTextOnLight]}>Tap to hear</Text>}</View>
                                                    <View style={[styles.playCircle, isLightBackground && styles.playCircleOnLight, isTodayLayout && styles.todayPlayCircle]}>{speakingWord === normalizeTtsText(phraseText) ? <ActivityIndicator size="small" color={isLightBackground ? '#141414' : '#fff'} /> : <Volume2 size={isTodayLayout ? 24 : 20} color={isTodayLayout ? SOUP_COLORS.turquoise : (isLightBackground ? '#141414' : '#fff')} />}</View>
                                                </Pressable>
                                            );
                                            });
                                        })()}
                                        {speakingWord && <><TtsLoadingMessage isLightBackground={isLightBackground} /><TtsLoadingFillBar isLightBackground={isLightBackground} complete={ttsLoadComplete} /></>}
                                        {hints?.vocab_bank && hints.vocab_bank.length > 0 && (
                                            <View style={[vocabBlockStyle, isTodayLayout && styles.todayVocabSection]}>
                                                {!isTodayLayout && !embedInSection && <Text style={[styles.vocabBlockLabel, isLightBackground && styles.textOnLight]}>{'vocab'}</Text>}
                                                <View style={[styles.vocabRow, isTodayLayout && styles.todayVocabRow]}>
                                                    {(hints.vocab_bank.slice(0, isTodayLayout ? 3 : 10)).map((item, idx) => {
                                                        const word = (item.word ?? item.target_term ?? '').trim();
                                                        const translation = (item.translation ?? item.english ?? '').trim();
                                                        if (!word) return null;
                                                        return (
                                                            <Pressable key={`vocab-${idx}-${word}`} onPress={() => playTts(word)} style={({ pressed }) => [styles.vocabPill, isLightBackground && styles.vocabPillOnLight, isTodayLayout && styles.todayVocabPill, pressed && { opacity: 0.8 }]} accessibilityLabel={`Tap to hear ${word}`} accessibilityRole="button">
                                                                <Text style={[styles.vocabWord, isLightBackground && styles.textOnLight, isTodayLayout && styles.todayVocabWord]} numberOfLines={1}>{word}</Text>
                                                                {translation ? <Text style={[styles.vocabTranslation, isLightBackground && styles.secondaryTextOnLight, isTodayLayout && styles.todayVocabTranslation]} numberOfLines={1}> · {translation}</Text> : null}
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </>
                        )}
                    </>
                )}
            </View>

            {/* Record sits at bottom; prompt gets all space above */}
            {/* Section 3: Record — when embed: sits at very bottom above "1 of 7" */}
            <View style={actionContainerStyle}>
                {recordedUri ? (
                    // REVIEW MODE
                    <View style={reviewContainerStyle}>
                        {/* Playback Visualization (Scrubbable) */}
                        <Pressable
                            style={scrubberContainerStyle}
                            onPress={handleSeek}
                            onLayout={onWaveformLayout}
                        >
                            <View style={styles.staticWaveform}>
                                {barHeights.map((height, i) => {
                                    const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;
                                    const barPos = i / WAVEFORM_BARS;
                                    const isPlayed = progress > barPos;
                                    const barColor = isLightBackground
                                        ? (isPlayed ? '#141414' : 'rgba(20, 20, 20, 0.4)')
                                        : (isPlayed ? 'white' : 'rgba(255, 255, 255, 0.4)');

                                    return (
                                        <View
                                            key={i}
                                            style={[
                                                styles.waveBar,
                                                {
                                                    height: 16 + (height * 32),
                                                    backgroundColor: barColor,
                                                    opacity: 1
                                                }
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                            <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>
                                {loadTime(playbackPosition / 1000)} / {loadTime(finalDuration)}
                            </Text>
                        </Pressable>

                        <View style={styles.playbackControls}>
                            <Pressable
                                onPress={handleDelete}
                                style={[controlButtonStyle, styles.deleteButton]}
                            >
                                <Trash2 size={isCompact ? 18 : 24} color="#FF3B30" />
                            </Pressable>

                            <Pressable
                                onPress={handlePlayPause}
                                style={[playButtonStyle]}
                            >
                                {isPlaying ? (
                                    <Pause size={isCompact ? 24 : 32} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} />
                                ) : (
                                    <Play size={isCompact ? 24 : 32} color={SOUP_COLORS.turquoise} fill={SOUP_COLORS.turquoise} style={{ marginLeft: 4 }} />
                                )}
                            </Pressable>

                            <Pressable
                                onPress={handleSendPress}
                                disabled={loading}
                                style={[controlButtonStyle, styles.sendButton]}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" size={isCompact ? 'small' : 'small'} />
                                ) : (
                                    <Send size={isCompact ? 20 : 28} color="white" />
                                )}
                            </Pressable>
                        </View>
                        <Text style={[styles.reviewText, isLightBackground && styles.secondaryTextOnLight]}>
                            {isTodayLayout ? 'listen back, then send' : 'Ready to send?'}
                        </Text>
                    </View>
                ) : (
                    // RECORD MODE — Today layout: waveform zone (space above button) then record button
                    <View style={[recordContainerStyle, (isTodayLayout || embedInSection) && styles.todayReplyZone, embedInSection && styles.embedReplyZone, embedInSection && styles.embedRecordArea]}>
                        {!embedInSection && !isTodayLayout && !isRecording && communityBubbles.length > 0 && (
                            <View style={[styles.peekingRow, isCompact && stylesCompact.peekingRow]} pointerEvents="none">
                                {communityBubbles.map((user, i) => (
                                    <View key={i} style={[styles.peekingAvatar, styles.peekingAvatarWrap, isCompact && stylesCompact.peekingAvatar, { zIndex: i }]}>
                                        <Image source={{ uri: user.avatar_url }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
                                        <BlurView intensity={4} tint="dark" style={StyleSheet.absoluteFill} />
                                    </View>
                                ))}
                            </View>
                        )}

                        {embedInSection ? (
                            <View style={styles.todayCardWaveformZone}>
                                {isRecording ? (
                                    <View style={[waveformContainerStyle, styles.todayWaveformWrap, styles.embedWaveformWrap]}>
                                        <LiveAudioWaveform
                                            metering={metering}
                                            recordingDuration={recordingDuration}
                                            isRecording={isRecording}
                                            color={isLightBackground ? SOUP_COLORS.turquoise : 'white'}
                                        />
                                        <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>{loadTime(recordingDuration)}</Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : isRecording ? (
                            <View style={[waveformContainerStyle, (isTodayLayout || embedInSection) && styles.todayWaveformWrap, embedInSection && styles.embedWaveformWrap]}>
                                <LiveAudioWaveform
                                    metering={metering}
                                    recordingDuration={recordingDuration}
                                    isRecording={isRecording}
                                    color={isLightBackground ? SOUP_COLORS.turquoise : 'white'}
                                />
                                <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>{loadTime(recordingDuration)}</Text>
                            </View>
                        ) : !embedInSection && !recordedUri ? (
                            <View style={[styles.idleWaveformWrap, styles.idleWaveformWrapSilky]}>
                                <AnimatedIdleWaveform
                                    variant="silky"
                                    color={isLightBackground ? SOUP_COLORS.turquoise : 'rgba(255,255,255,0.95)'}
                                    barCount={32}
                                    barWidth={4}
                                    maxHeight={36}
                                />
                            </View>
                        ) : null}

                        <View style={embedInSection ? styles.embedRecordButtonWrap : undefined}>
                        <Pressable
                            onPress={handleRecordPress}
                            style={({ pressed }) => [
                                recordButtonStyle,
                                (isTodayLayout || embedInSection) && styles.todayRecordButton,
                                embedInSection && styles.embedRecordButton,
                                (isTodayLayout || embedInSection) && !isRecording && styles.todayRecordButtonWaveform,
                                isRecording && styles.recordingActive,
                                isLightBackground && isRecording && styles.recordingActiveOnLight,
                                pressed && { opacity: 0.9 }
                            ]}
                        >
                            {isRecording ? (
                                <View style={[styles.stopIcon, isCompact && stylesCompact.stopIcon, isLightBackground ? { backgroundColor: '#fff' } : { backgroundColor: SOUP_COLORS.turquoise }]} />
                            ) : (
                                <Mic size={embedInSection ? 32 : (isCompact ? 28 : 40)} color={isLightBackground ? '#fff' : SOUP_COLORS.turquoise} />
                            )}
                        </Pressable>
                        </View>
                        {!(isTodayLayout && !isRecording) && !embedInSection && (
                            <Text style={[hintTextStyle, (isTodayLayout || embedInSection) && styles.todayRecordHint, embedInSection && styles.embedRecordHint, isLightBackground && styles.textOnLight]}>
                                {isRecording ? "Tap to finish" : "tap to record"}
                            </Text>
                        )}
                    </View>
                )}
            </View>
            </View>
        </View>
    );
}

function loadTime(seconds) {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 40,
        width: Dimensions.get('window').width,
        backgroundColor: 'transparent',
    },
    bowlBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    bowlBgIconAccent: {
        position: 'absolute',
    },
    bowlAccentShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
    },
    bowlAccentShadowWithGlow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    peekingAvatarWrap: {
        overflow: 'hidden',
    },
    promptContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupName: {
        fontSize: 14, // Reduced from 16
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16, // Reduced from 32
    },
    // Cream background: warm black for readability + color theory (cream is warm, so warm dark text matches).
    textOnLight: {
        color: '#141414',
        textShadowColor: 'transparent',
    },
    secondaryTextOnLight: {
        color: '#4a4a4a',
        textShadowColor: 'transparent',
    },
    starterCardOnLight: {
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    playCircleOnLight: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    recordButtonOnLight: {
        backgroundColor: '#141414',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    recordingActiveOnLight: {
        backgroundColor: '#141414',
        transform: [{ scale: 1.05 }],
    },
    inspirationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        marginBottom: 20,
    },
    inspirationText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    promptText: {
        fontSize: 28, // Reduced from 34
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 34, // Reduced from 42
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    secondaryPrompt: {
        fontSize: 20, // Reduced from 22
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 12, // Reduced from 16
        lineHeight: 26,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    actionContainer: {
        minHeight: 140, // Reduced from 180
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordContainer: {
        alignItems: 'center',
        gap: 12, // Reduced from 16
        width: '100%',
    },
    recordButton: {
        width: 80, // Reduced from 96
        height: 80, // Reduced from 96
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    recordingActive: {
        backgroundColor: SOUP_COLORS.pink,
        transform: [{ scale: 1.1 }],
    },
    stopIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    hintText: {
        fontSize: 14, // Reduced from 16
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        marginTop: 4,
    },
    waveformContainer: {
        height: 32, // Reduced from 40
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    idleWaveformWrap: {
        height: 36,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    idleWaveformWrapHero: {
        height: 56,
        marginBottom: 12,
        minHeight: 56,
    },
    idleWaveformWrapSilky: {
        height: 44,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrubberContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    staticWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 40,
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
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    reviewContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    controlButton: {
        width: 48, // Reduced
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E6F7FD',
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: SOUP_COLORS.turquoise,
    },
    deleteButton: {
        backgroundColor: '#FFF0F0',
    },
    reviewText: {
        fontSize: 13,
        color: '#999',
        fontWeight: '600',
    },
    // Inline Ingredients
    hintsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 8,
    },
    hintsLoadingText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    hintsContainer: {
        marginTop: 12, // Reduced
        marginBottom: 8,
        gap: 6,
        width: '100%',
        alignItems: 'center',
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
        maxWidth: '100%',
    },
    starterPhraseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        width: '100%',
    },
    playCircle: {
        width: 36, // Reduced from 44
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    speakingActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    hintsLabel: {
        fontSize: 10, // Reduced
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginBottom: 2,
        alignSelf: 'flex-start',
    },
    starterPhrase: {
        fontSize: 16, // Reduced
        fontWeight: '700',
        color: '#fff',
        lineHeight: 22,
    },
    starterTranslation: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
        fontStyle: 'italic',
    },
    vocabBlock: {
        width: '100%',
        marginTop: 10,
        gap: 6,
    },
    vocabBlockLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginBottom: 2,
    },
    vocabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
    },
    vocabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingRight: 12,
        paddingLeft: 4, // Reduce left padding since container has width
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    vocabIconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vocabWord: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    vocabTranslation: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
    },
    vocabPillOnLight: {
        backgroundColor: 'rgba(20,20,20,0.08)',
    },
    // Peeking Row
    peekingRow: {
        position: 'absolute',
        bottom: -60, // Moved down further
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: '100%',
        height: 60,
    },
    peekingAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        marginLeft: -10,
    },
});

const stylesCompact = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: '100%',
        padding: 8,
        paddingBottom: 12,
    },
    promptContainer: {
        minHeight: 0,
    },
    groupName: {
        fontSize: 10,
        marginBottom: 6,
        letterSpacing: 1,
    },
    promptText: {
        fontSize: 16,
        lineHeight: 20,
    },
    secondaryPrompt: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    hintsContainer: {
        marginTop: 6,
        marginBottom: 4,
        gap: 4,
    },
    hintsLabel: {
        fontSize: 9,
        marginBottom: 2,
    },
    starterPhraseCard: {
        padding: 8,
        gap: 6,
        borderRadius: 8,
    },
    starterPhrase: {
        fontSize: 12,
        lineHeight: 16,
    },
    actionContainer: {
        minHeight: 80,
    },
    recordContainer: {
        gap: 6,
    },
    recordButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    hintText: {
        fontSize: 11,
        marginTop: 2,
    },
    reviewContainer: {
        gap: 8,
    },
    controlButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrubberContainer: {
        paddingVertical: 4,
    },
    waveformContainer: {
        height: 24,
        marginBottom: 4,
    },
    vocabBlock: {
        marginTop: 6,
        gap: 4,
    },
    stopIcon: {
        width: 16,
        height: 16,
        borderRadius: 2,
    },
    peekingRow: {
        position: 'relative',
        bottom: undefined,
        height: 32,
        marginBottom: 4,
    },
    peekingAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginLeft: -6,
    },
    embedCardBoundary: {
        flex: 1,
        minHeight: 0,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
    },
    embedPromptOuter: {
        flex: 1,
        minHeight: 0,
    },
    embedContent: {
        flex: 1,
        minHeight: 0,
        paddingTop: 12,
        paddingBottom: 0,
    },
    todayCardSection: {
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
    todayCardSectionQuestion: {
        flex: 0,
        paddingBottom: 20,
    },
    todayCardSectionPhrasesVocab: {
        flex: 1,
        minHeight: 0,
        paddingTop: 8,
        paddingBottom: 20,
    },
    todayCardSectionRecord: {
        flex: 0,
        paddingTop: 20,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.18)',
    },
    todayCardWaveformZone: {
        minHeight: 44,
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    embedPromptBlock: {
        flex: 0.4,
        minHeight: 0,
    },
    embedPhrasesVocabBlock: {
        flex: 0.3,
        minHeight: 0,
    },
    embedPhrasesVocabInner: {
        flex: 1,
    },
    embedPhraseListRow: {
        flexDirection: 'row',
        gap: 8,
    },
    embedHintsWrap: {
        flex: 1,
        minHeight: 0,
    },
    embedLanguageLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 4,
    },
    embedPromptBubble: {
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
    todayQuestionText: {
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 26,
        letterSpacing: -0.2,
    },
    embedPromptText: {
        fontSize: 17,
        lineHeight: 24,
        letterSpacing: -0.1,
    },
    embedSecondaryPrompt: {
        fontSize: 13,
        lineHeight: 19,
        opacity: 0.95,
    },
    embedPhraseBlock: {
        marginTop: 18,
        marginBottom: 14,
    },
    phraseListWrap: {
        gap: 10,
    },
    embedStarterPhraseCard: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    embedVocabBlock: {
        marginTop: 16,
        marginBottom: 0,
    },
    newIdeasButton: {
        alignSelf: 'flex-start',
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 18,
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 22,
    },
    newIdeasButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.95)',
    },
    embedActionBlock: {
        flex: 0,
        minHeight: 0,
        justifyContent: 'flex-end',
    },
    embedReplyZone: {
        marginTop: 0,
        paddingTop: 6,
    },
    embedRecordArea: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 6,
    },
    embedRecordButtonWrap: {
        alignSelf: 'center',
    },
    embedWaveformWrap: {
        minHeight: 44,
        marginBottom: 10,
    },
    embedRecordButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    embedHearRow: {
        marginTop: 2,
    },
    embedHearHint: {
        fontSize: 11,
    },
    embedVocabPill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    embedVocabWord: {
        fontSize: 12,
    },
    embedRecordHint: {
        fontSize: 10,
        marginTop: 0,
    },
    todayPromptWrap: {
        alignItems: 'stretch',
    },
    todayGroupName: {
        fontSize: 11,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    todayPromptLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        opacity: 0.85,
        marginBottom: 6,
        color: 'rgba(255,255,255,0.9)',
    },
    todayPromptBubble: {
        alignSelf: 'stretch',
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.turquoise,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 0,
        borderTopRightRadius: 14,
        borderBottomRightRadius: 14,
    },
    todayReplyZone: {
        marginTop: 0,
        paddingTop: 0,
        borderTopWidth: 0,
        borderTopColor: 'transparent',
    },
    todayWaveformWrap: {
        width: '100%',
        minHeight: 40,
        marginBottom: 8,
    },
    todayRecordBlockFixed: {
        minHeight: 160,
        width: '100%',
    },
    todayWaveformAreaFixed: {
        width: '100%',
        height: 56,
        minHeight: 56,
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayWaveformAsButton: {
        alignSelf: 'stretch',
    },
    todayRecordButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    todayRecordHint: {
        fontSize: 12,
        opacity: 0.9,
        marginTop: 8,
    },
    todayPhraseSection: {
        marginTop: 16,
        marginBottom: 10,
    },
    todaySectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
        opacity: 0.9,
    },
    todayStarterPhraseCard: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 16,
        borderWidth: 0,
    },
    todayHearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    todayHearHint: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
    },
    todayPlayCircle: {
        backgroundColor: 'rgba(0,174,239,0.12)',
    },
    todayVocabSection: {
        marginTop: 16,
        marginBottom: 12,
    },
    todayVocabTapHint: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'lowercase',
        marginBottom: 6,
    },
    todayVocabRow: {
        flexWrap: 'wrap',
        gap: 8,
    },
    todayVocabPill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    todayVocabWord: {
        fontSize: 13,
    },
    todayVocabTranslation: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    todayRecordLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        opacity: 0.85,
    },
    minimalPhrasesToggle: {
        marginTop: 12,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    minimalPhrasesToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'lowercase',
    },
});
