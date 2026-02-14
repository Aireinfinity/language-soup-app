import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Image, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Mic, Play, Pause, Trash2, Send, Volume2 } from 'lucide-react-native';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { AnimatedIdleWaveform } from './AnimatedIdleWaveform';
import AnimatedReanimated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';

const BOWL_ICON = require('../assets/ls-icon-bowl.png');

// Wrapper so the question pops in when challenge changes and "breathes" so it feels dynamic
function TodayQuestionPulseWrapper({ embedInSection, challengeId, isTodayLayout, promptContainerStyle, children }) {
    const scale = useSharedValue(1);
    useEffect(() => {
        if (!embedInSection) return;
        scale.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 1400 }),
                withTiming(1, { duration: 1400 })
            ),
            -1,
            false
        );
    }, [embedInSection]);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    if (!embedInSection) {
        return <View style={promptContainerStyle}>{children}</View>;
    }
    return (
        <AnimatedReanimated.View
            key={challengeId}
            entering={ZoomIn.duration(550).springify().damping(18)}
            style={[promptContainerStyle, animatedStyle]}
        >
            {children}
        </AnimatedReanimated.View>
    );
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

    // Prefetch Helper (Speeds up loading)
    const prefetchAudio = async (text) => {
        if (!text || audioCache[text]) return;
        try {
            const { data } = await supabase.functions.invoke('voice-feedback', {
                body: { text, task: 'pronunciation', language: groupName || 'Multilingual' }
            });
            if (data?.pronunciationUrl) {
                setAudioCache(prev => ({ ...prev, [text]: data.pronunciationUrl }));
            }
        } catch (e) {
            // Silent fail on prefetch is fine
        }
    };

    // Auto-generate hints on mount & Save to DB. Guard so we never apply results for a stale challenge (e.g. tap Farsi then Spanish).
    useEffect(() => {
        const challengeId = challenge?.id;
        const meta = challenge?.metadata;
        const hasCachedHints = meta?.starter_phrase && (meta.starter_phrase || '').trim().split(/\s+/).length <= 10;
        if (hasCachedHints) {
            setHints(meta);
            setHintsLoading(false);
            prefetchAudio(meta.starter_phrase);
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
                if (data?.starter_phrase) {
                    setHints(data);
                    await supabase.from('app_challenges')
                        .update({ metadata: data })
                        .eq('id', challengeId);
                    prefetchAudio(data.starter_phrase);
                }
            } catch (e) {
                if (currentChallengeIdRef.current === challengeId) console.error('Hint generation error:', e);
            } finally {
                if (currentChallengeIdRef.current === challengeId) setHintsLoading(false);
            }
        };
        generate();
    }, [challenge?.id]);

    // TTS pronunciation via OpenAI (Phrases only)
    const [speakingWord, setSpeakingWord] = useState(null);
    const [ttsLoadComplete, setTtsLoadComplete] = useState(false); // so fill bar only reaches 100% when load is done
    const [minimalPhrasesExpanded, setMinimalPhrasesExpanded] = useState(false);

    // Unified TTS Handler (OpenAI with Cache). Only the last tapped phrase plays; rapid taps don't queue stale audio.
    const playTts = async (text) => {
        if (!text) return;

        // Stop any previous playback immediately so only one thing plays
        if (ttsSoundRef.current) {
            try {
                await ttsSoundRef.current.stopAsync();
                await ttsSoundRef.current.unloadAsync();
            } catch (_) {}
            ttsSoundRef.current = null;
        }

        lastTtsRequestRef.current = text;
        setTtsLoadComplete(false);
        setSpeakingWord(text);

        try {
            let audioUrl = audioCache[text];

            // If not cached, fetch from OpenAI
            if (!audioUrl) {
                const { data, error } = await supabase.functions.invoke('voice-feedback', {
                    body: { text, task: 'pronunciation', language: groupName || 'Multilingual' }
                });

                if (error || !data?.pronunciationUrl) throw new Error('No audio generated');

                audioUrl = data.pronunciationUrl;
                setAudioCache(prev => ({ ...prev, [text]: audioUrl }));
            }

            // User tapped another phrase while we were loading — don't play this one
            if (lastTtsRequestRef.current !== text) {
                setSpeakingWord(null);
                return;
            }
            // User went to next card while we were loading — don't play (avoids both cards playing)
            if (currentCardIdRef && currentCardIdRef.current !== challenge?.id) {
                setSpeakingWord(null);
                return;
            }

            // Ensure playback mode so sentence audio actually plays (e.g. after recording mode)
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                interruptionModeIOS: 1,
                shouldDuckAndroid: true,
            });

            const { sound: ttsSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: false, volume: 1.0, rate: 0.9 }
            );

            // Another tap happened while we were creating the sound — don't play
            if (lastTtsRequestRef.current !== text) {
                ttsSound.unloadAsync().catch(() => {});
                setSpeakingWord(null);
                return;
            }
            // User went to next card — don't play (avoids old card + new card both playing)
            if (currentCardIdRef && currentCardIdRef.current !== challenge?.id) {
                ttsSound.unloadAsync().catch(() => {});
                setSpeakingWord(null);
                return;
            }
            ttsSoundRef.current = ttsSound;
            setTtsLoadComplete(true); // bar fills to 100% once, then we play

            ttsSound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    ttsSound.unloadAsync();
                    if (ttsSoundRef.current === ttsSound) ttsSoundRef.current = null;
                    setSpeakingWord(null);
                }
            });

            await ttsSound.playAsync();
        } catch (e) {
            if (lastTtsRequestRef.current === text) {
                console.error('TTS error:', e);
                setSpeakingWord(null);
            }
        }
    };

    // 2. High-Quality OpenAI TTS for Phrase (Phenomenal)


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

    const cardStyle = isCompact ? [styles.card, stylesCompact.card, embedInSection && { width: '100%' }] : [styles.card, embedInSection && { width: '100%' }];
    const promptContainerStyle = isCompact ? [styles.promptContainer, stylesCompact.promptContainer] : styles.promptContainer;
    const groupNameStyle = isCompact ? [styles.groupName, isLightBackground && styles.textOnLight, stylesCompact.groupName] : [styles.groupName, isLightBackground && styles.textOnLight];
    const promptTextStyle = isCompact ? [styles.promptText, isLightBackground && styles.textOnLight, stylesCompact.promptText] : [styles.promptText, isLightBackground && styles.textOnLight];
    const secondaryPromptStyle = isCompact ? [styles.promptText, styles.secondaryPrompt, isLightBackground && styles.secondaryTextOnLight, stylesCompact.secondaryPrompt] : [styles.promptText, styles.secondaryPrompt, isLightBackground && styles.secondaryTextOnLight];
    const hintsContainerStyle = isCompact ? [styles.hintsContainer, stylesCompact.hintsContainer] : styles.hintsContainer;
    const hintsLabelStyle = isCompact ? [styles.hintsLabel, stylesCompact.hintsLabel] : styles.hintsLabel;
    const starterPhraseCardStyle = isCompact ? [styles.starterPhraseCard, stylesCompact.starterPhraseCard] : styles.starterPhraseCard;
    const starterPhraseStyle = isCompact ? [styles.starterPhrase, stylesCompact.starterPhrase] : [styles.starterPhrase];
    const actionContainerStyle = isCompact ? [styles.actionContainer, stylesCompact.actionContainer] : styles.actionContainer;
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
            {!isTodayLayout && (
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
            {/* Challenge Prompt — message-style when Today layout */}
            <View style={[promptContainerStyle, isTodayLayout && styles.todayPromptWrap]}>
                {!isTodayLayout && <Text style={[groupNameStyle, styles.todayGroupName]}>{groupName || 'Soup Group'}</Text>}
                {embedInSection && (
                    <Text style={[styles.todayPromptLabel, isLightBackground && styles.textOnLight]} numberOfLines={1}>today's question</Text>
                )}
                <TodayQuestionPulseWrapper
                    embedInSection={embedInSection}
                    challengeId={challenge?.id}
                    isTodayLayout={isTodayLayout}
                    promptContainerStyle={isTodayLayout ? styles.todayPromptBubble : { alignItems: 'center' }}
                >
                    {(() => {
                        const rawText = challenge?.prompt_text || "Ready to Soup?";
                        // Split by newline to separate multiple languages if present
                        const parts = rawText.split(/\n+/).filter(p => p.trim());

                        if (parts.length > 1) {
                            return (
                                <>
                                    <Text style={promptTextStyle} numberOfLines={isCompact ? 2 : undefined}>
                                        {parts[0]}
                                    </Text>
                                    <Text style={secondaryPromptStyle} numberOfLines={isCompact ? 1 : undefined}>
                                        {parts.slice(1).join('\n')}
                                    </Text>
                                </>
                            );
                        }

                        // Single line case
                        return (
                            <Text style={promptTextStyle} numberOfLines={isCompact ? 2 : undefined}>
                                {rawText}
                            </Text>
                        );
                    })()}
                </TodayQuestionPulseWrapper>

                {/* Inline Ingredients — minimal: one "see phrases" toggle; otherwise full hints */}
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
                    <>
                        {hintsLoading && (
                            <View style={styles.hintsLoading}>
                                <ActivityIndicator size="small" color={isLightBackground ? '#141414' : 'rgba(255,255,255,0.8)'} />
                                <Text style={[styles.hintsLoadingText, isLightBackground && styles.textOnLight]}>{isTodayLayout ? 'loading…' : 'loading hints…'}</Text>
                            </View>
                        )}
                        {!hintsLoading && hints?.starter_phrase && (
                            <View style={[hintsContainerStyle, isTodayLayout && styles.todayPhraseSection]}>
                                {!isTodayLayout && (
                                    <Text style={[hintsLabelStyle, isLightBackground && styles.textOnLight, styles.todaySectionLabel]}>beginner phrase:</Text>
                                )}
                                <Pressable
                                    style={[starterPhraseCardStyle, speakingWord === hints.starter_phrase && styles.speakingActive, isLightBackground && styles.starterCardOnLight, isTodayLayout && styles.todayStarterPhraseCard]}
                                    onPress={() => playTts(hints.starter_phrase)}
                                    accessibilityLabel={isTodayLayout ? 'Tap to hear pronunciation' : 'Tap to hear it'}
                                    accessibilityRole="button"
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[starterPhraseStyle, isLightBackground && styles.textOnLight]}>"{hints.starter_phrase}"</Text>
                                        {hints.starter_phrase_translation ? (
                                            <Text style={[styles.starterTranslation, isLightBackground && styles.secondaryTextOnLight]}>
                                                {hints.starter_phrase_translation}
                                            </Text>
                                        ) : null}
                                        {isTodayLayout && (
                                            <View style={styles.todayHearRow}>
                                                <Volume2 size={14} color={SOUP_COLORS.subtext} />
                                                <Text style={styles.todayHearHint}>tap to hear</Text>
                                            </View>
                                        )}
                                        {!isTodayLayout && !hints.starter_phrase_translation && (
                                            <Text style={[styles.starterTranslation, isLightBackground && styles.secondaryTextOnLight]}>Tap to hear it</Text>
                                        )}
                                    </View>
                                    <View style={[styles.playCircle, isLightBackground && styles.playCircleOnLight, isTodayLayout && styles.todayPlayCircle]}>
                                        {speakingWord === hints.starter_phrase ? (
                                            <ActivityIndicator size="small" color={isLightBackground ? '#141414' : '#fff'} />
                                        ) : (
                                            <Volume2 size={isTodayLayout ? 24 : 20} color={isTodayLayout ? SOUP_COLORS.turquoise : (isLightBackground ? '#141414' : '#fff')} />
                                        )}
                                    </View>
                                </Pressable>
                                {speakingWord === hints.starter_phrase && (
                                    <>
                                        <TtsLoadingMessage isLightBackground={isLightBackground} />
                                        <TtsLoadingFillBar isLightBackground={isLightBackground} complete={ttsLoadComplete} />
                                    </>
                                )}
                                {!hintsLoading && hints?.vocab_bank && hints.vocab_bank.length > 0 && (
                                    <View style={[vocabBlockStyle, isTodayLayout && styles.todayVocabSection]}>
                                        {!isTodayLayout && <Text style={[styles.vocabBlockLabel, isLightBackground && styles.textOnLight]}>{'vocab'}</Text>}
                                        <View style={[styles.vocabRow, isTodayLayout && styles.todayVocabRow]}>
                                            {(hints.vocab_bank.slice(0, isTodayLayout ? 5 : 10)).map((item, idx) => {
                                                const word = (item.word ?? item.target_term ?? '').trim();
                                                const translation = (item.translation ?? item.english ?? '').trim();
                                                if (!word) return null;
                                                return (
                                                    <View key={idx} style={[styles.vocabPill, isLightBackground && styles.vocabPillOnLight, isTodayLayout && styles.todayVocabPill]}>
                                                        <Text style={[styles.vocabWord, isLightBackground && styles.textOnLight, isTodayLayout && styles.todayVocabWord]} numberOfLines={1}>{word}</Text>
                                                        {translation ? <Text style={[styles.vocabTranslation, isLightBackground && styles.secondaryTextOnLight, isTodayLayout && styles.todayVocabTranslation]} numberOfLines={1}> · {translation}</Text> : null}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Interaction Area */}
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
                            {isTodayLayout ? 'lock it in?' : 'Ready to send?'}
                        </Text>
                    </View>
                ) : (
                    // RECORD MODE — Today layout: "record your reply" hero
                    <View style={[recordContainerStyle, isTodayLayout && styles.todayReplyZone]}>
                        {isTodayLayout && (
                            <Text style={[styles.todayRecordLabel, isLightBackground && styles.textOnLight]}>record</Text>
                        )}
                        {!isTodayLayout && !isRecording && communityBubbles.length > 0 && (
                            <View style={[styles.peekingRow, isCompact && stylesCompact.peekingRow]} pointerEvents="none">
                                {communityBubbles.map((user, i) => (
                                    <View key={i} style={[styles.peekingAvatar, styles.peekingAvatarWrap, isCompact && stylesCompact.peekingAvatar, { zIndex: i }]}>
                                        <Image source={{ uri: user.avatar_url }} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
                                        <BlurView intensity={4} tint="dark" style={StyleSheet.absoluteFill} />
                                    </View>
                                ))}
                            </View>
                        )}

                        {isRecording ? (
                            <View style={[waveformContainerStyle, isTodayLayout && styles.todayWaveformWrap]}>
                                <LiveAudioWaveform
                                    metering={metering}
                                    recordingDuration={recordingDuration}
                                    isRecording={isRecording}
                                    color={isLightBackground ? SOUP_COLORS.turquoise : 'white'}
                                />
                                <Text style={[styles.timerText, isLightBackground && styles.textOnLight]}>{loadTime(recordingDuration)}</Text>
                            </View>
                        ) : embedInSection && !recordedUri && !isTodayLayout ? (
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

                        <Pressable
                            onPress={handleRecordPress}
                            style={[
                                recordButtonStyle,
                                isTodayLayout && styles.todayRecordButton,
                                isTodayLayout && !isRecording && styles.todayRecordButtonWaveform,
                                isRecording && styles.recordingActive,
                                isLightBackground && isRecording && styles.recordingActiveOnLight
                            ]}
                        >
                            {isRecording ? (
                                <View style={[styles.stopIcon, isCompact && stylesCompact.stopIcon, isLightBackground ? { backgroundColor: '#fff' } : { backgroundColor: SOUP_COLORS.turquoise }]} />
                            ) : isTodayLayout ? (
                                <AnimatedIdleWaveform
                                    variant="silky"
                                    color={SOUP_COLORS.turquoise}
                                    barCount={28}
                                    barWidth={3}
                                    maxHeight={32}
                                />
                            ) : (
                                <Mic size={isCompact ? 28 : 40} color={isLightBackground ? '#fff' : SOUP_COLORS.turquoise} />
                            )}
                        </Pressable>
                        <Text style={[hintTextStyle, isTodayLayout && !isRecording && styles.todayRecordHint, isLightBackground && styles.textOnLight]}>
                            {isRecording ? "Tap to finish" : "tap to record"}
                        </Text>
                    </View>
                )}
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
        width: 64, // Reduced
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E6F7FD',
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
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
    // Today layout: thread-style (ask → phrases → reply)
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
        marginTop: 28,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    todayWaveformWrap: {
        width: '100%',
        minHeight: 40,
        marginBottom: 8,
    },
    todayRecordButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    todayRecordButtonWaveform: {
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayRecordHint: {
        fontSize: 12,
        opacity: 0.9,
        marginTop: 4,
    },
    todayPhraseSection: {
        marginTop: 20,
        marginBottom: 8,
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
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 20,
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
        marginTop: 24,
        marginBottom: 4,
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
